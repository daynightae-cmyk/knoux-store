from __future__ import annotations

import asyncio
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx


READ_TOOLS: dict[str, dict[str, Any]] = {
    "bridge.handshake": {"scopes": ["terminal:open"]},
    "git.status": {"scopes": ["git:read"]},
    "metrics.read": {"scopes": ["metrics:read"]},
    "proc.list": {"scopes": ["proc:list"]},
    "logs.read": {"scopes": ["logs:read"]},
    "fs.list": {"scopes": ["fs:read"]},
    "fs.read": {"scopes": ["fs:read"]},
}

TERMINAL_JOB_STATES = {"succeeded", "failed", "cancelled", "expired"}


class GatewayConfigurationError(RuntimeError):
    pass


class GatewayJobError(RuntimeError):
    pass


def parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


@dataclass(frozen=True)
class GatewaySettings:
    supabase_url: str
    service_role_key: str
    bridge_id: str
    owner_id: str | None = None
    online_window_seconds: int = 90
    job_timeout_seconds: float = 30.0
    poll_interval_seconds: float = 0.5

    @classmethod
    def from_env(cls) -> "GatewaySettings":
        url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        bridge_id = os.getenv("KNOUX_ALLOWED_BRIDGE_ID", "").strip().lower()
        owner_id = os.getenv("KNOUX_ALLOWED_OWNER_ID", "").strip() or None

        missing = [
            name
            for name, value in (
                ("SUPABASE_URL", url),
                ("SUPABASE_SERVICE_ROLE_KEY", key),
                ("KNOUX_ALLOWED_BRIDGE_ID", bridge_id),
            )
            if not value
        ]
        if missing:
            raise GatewayConfigurationError(
                "Missing gateway configuration: " + ", ".join(missing)
            )

        if not (
            16 <= len(bridge_id) <= 64
            and all(ch in "0123456789abcdef" for ch in bridge_id)
        ):
            raise GatewayConfigurationError(
                "KNOUX_ALLOWED_BRIDGE_ID has an invalid format."
            )

        def bounded_int(name: str, default: int, low: int, high: int) -> int:
            raw = os.getenv(name, "").strip()
            if not raw:
                return default
            try:
                value = int(raw)
            except ValueError as exc:
                raise GatewayConfigurationError(
                    f"{name} must be an integer."
                ) from exc
            return max(low, min(high, value))

        return cls(
            supabase_url=url,
            service_role_key=key,
            bridge_id=bridge_id,
            owner_id=owner_id,
            online_window_seconds=bounded_int(
                "KNOUX_MACHINE_ONLINE_WINDOW_SECONDS", 90, 30, 600
            ),
            job_timeout_seconds=float(
                bounded_int("KNOUX_JOB_TIMEOUT_SECONDS", 30, 5, 120)
            ),
            poll_interval_seconds=0.5,
        )


class GatewayStore:
    def __init__(
        self,
        settings: GatewaySettings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings
        self.client = httpx.AsyncClient(
            base_url=settings.supabase_url,
            headers={
                "apikey": settings.service_role_key,
                "authorization": f"Bearer {settings.service_role_key}",
                "accept": "application/json",
                "content-type": "application/json",
            },
            timeout=httpx.Timeout(10.0),
            transport=transport,
        )

    async def aclose(self) -> None:
        await self.client.aclose()

    @staticmethod
    def _ensure_ok(response: httpx.Response) -> None:
        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise GatewayJobError(
                "KNOuX Store control-plane request failed."
            ) from exc

    async def get_machine(self) -> dict[str, Any]:
        params: dict[str, str] = {
            "select": (
                "id,owner_id,bridge_id,hostname,platform,arch,bridge_version,"
                "capabilities,status,last_seen_at,registered_at"
            ),
            "bridge_id": f"eq.{self.settings.bridge_id}",
            "limit": "2",
        }
        if self.settings.owner_id:
            params["owner_id"] = f"eq.{self.settings.owner_id}"

        response = await self.client.get(
            "/rest/v1/knoux_bridge_machines",
            params=params,
        )
        self._ensure_ok(response)
        rows = response.json()

        if not isinstance(rows, list) or len(rows) == 0:
            raise GatewayJobError(
                "The configured KNOuX Store machine is not registered."
            )
        if len(rows) != 1:
            raise GatewayJobError(
                "The configured bridge identity is ambiguous."
            )

        machine = rows[0]
        if not isinstance(machine, dict):
            raise GatewayJobError(
                "The KNOuX Store machine record is malformed."
            )
        return machine

    def machine_is_online(
        self,
        machine: dict[str, Any],
    ) -> tuple[bool, float]:
        if machine.get("status") == "revoked":
            return False, float("inf")

        last_seen = machine.get("last_seen_at")
        if not isinstance(last_seen, str):
            return False, float("inf")

        try:
            age = max(
                0.0,
                (
                    datetime.now(timezone.utc)
                    - parse_timestamp(last_seen)
                ).total_seconds(),
            )
        except ValueError:
            return False, float("inf")

        return age <= self.settings.online_window_seconds, age

    async def gateway_status(self) -> dict[str, Any]:
        try:
            machine = await self.get_machine()
        except GatewayJobError as exc:
            return {
                "ok": True,
                "service": "knoux-store-mcp-gateway",
                "product": "KNOuX Store",
                "mode": "OUTBOUND_CONTROL_PLANE",
                "local_machine_connected": False,
                "machine": None,
                "reason": str(exc),
                "changes_made": False,
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            }

        online, age = self.machine_is_online(machine)
        return {
            "ok": True,
            "service": "knoux-store-mcp-gateway",
            "product": "KNOuX Store",
            "mode": "OUTBOUND_CONTROL_PLANE",
            "local_machine_connected": online,
            "machine": {
                "bridge_id": machine.get("bridge_id"),
                "hostname": machine.get("hostname"),
                "platform": machine.get("platform"),
                "arch": machine.get("arch"),
                "version": machine.get("bridge_version"),
                "status": "online" if online else "offline",
                "last_seen_at": machine.get("last_seen_at"),
                "last_seen_age_seconds": (
                    round(age, 3) if age != float("inf") else None
                ),
                "capabilities": machine.get("capabilities") or {},
            },
            "changes_made": False,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    async def run_readonly_tool(
        self,
        tool: str,
        args: dict[str, Any] | None = None,
    ) -> Any:
        spec = READ_TOOLS.get(tool)
        if spec is None:
            raise GatewayJobError(
                "The requested tool is not allowlisted by KNOuX Store."
            )

        machine = await self.get_machine()
        online, _ = self.machine_is_online(machine)
        if not online:
            raise GatewayJobError(
                "The KNOuX Store local bridge is offline."
            )

        machine_id = machine.get("id")
        owner_id = machine.get("owner_id")
        if not isinstance(machine_id, str) or not isinstance(owner_id, str):
            raise GatewayJobError(
                "The KNOuX Store machine identity is incomplete."
            )

        payload = {
            "owner_id": owner_id,
            "machine_id": machine_id,
            "tool": tool,
            "args": args or {},
            "required_scopes": spec["scopes"],
            "mutating": False,
            "idempotency_key": str(uuid.uuid4()),
            "expires_at": (
                datetime.now(timezone.utc) + timedelta(minutes=5)
            ).isoformat(),
        }

        response = await self.client.post(
            "/rest/v1/knoux_bridge_jobs",
            headers={"prefer": "return=representation"},
            json=payload,
        )
        self._ensure_ok(response)
        created = response.json()

        if not isinstance(created, list) or len(created) != 1:
            raise GatewayJobError(
                "The control plane did not create exactly one job."
            )

        job_id = created[0].get("id")
        if not isinstance(job_id, str):
            raise GatewayJobError(
                "The control plane returned a malformed job id."
            )

        deadline = (
            asyncio.get_running_loop().time()
            + self.settings.job_timeout_seconds
        )

        while asyncio.get_running_loop().time() < deadline:
            result_response = await self.client.get(
                "/rest/v1/knoux_bridge_jobs",
                params={
                    "select": (
                        "id,status,result,error,duration_ms,completed_at"
                    ),
                    "id": f"eq.{job_id}",
                    "limit": "1",
                },
            )
            self._ensure_ok(result_response)
            rows = result_response.json()

            if isinstance(rows, list) and len(rows) == 1:
                job = rows[0]
                state = job.get("status")
                if state in TERMINAL_JOB_STATES:
                    if state == "succeeded":
                        return {
                            "ok": True,
                            "job_id": job_id,
                            "tool": tool,
                            "result": job.get("result"),
                            "duration_ms": job.get("duration_ms"),
                            "completed_at": job.get("completed_at"),
                        }
                    raise GatewayJobError(
                        str(
                            job.get("error")
                            or f"The local job ended as {state}."
                        )
                    )

            await asyncio.sleep(
                self.settings.poll_interval_seconds
            )

        raise GatewayJobError(
            f"The local bridge did not finish {tool} within "
            f"{self.settings.job_timeout_seconds:.0f}s."
        )
