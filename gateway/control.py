from __future__ import annotations

import asyncio
import base64
import json
import os
from dataclasses import dataclass
from typing import Any, Awaitable, Callable
from urllib.parse import urljoin

import httpx


READ_TOOLS = {
    "bridge.handshake",
    "git.status",
    "metrics.read",
    "proc.list",
    "logs.read",
    "fs.list",
    "fs.read",
}
TERMINAL = {"succeeded", "failed", "cancelled", "expired"}
TokenProvider = Callable[[], Awaitable[str]]


class GatewayConfigurationError(RuntimeError):
    pass


class GatewayJobError(RuntimeError):
    pass


@dataclass(frozen=True)
class GatewaySettings:
    control_plane_url: str
    bridge_id: str
    google_audience: str = "knoux-store-supabase-bridge-control"
    job_timeout_seconds: float = 30.0
    poll_interval_seconds: float = 0.5

    @classmethod
    def from_env(cls) -> "GatewaySettings":
        control = os.getenv("KNOUX_CONTROL_PLANE_URL", "").strip().rstrip("/")
        bridge = os.getenv("KNOUX_ALLOWED_BRIDGE_ID", "").strip().lower()
        audience = os.getenv(
            "KNOUX_GOOGLE_IDENTITY_AUDIENCE",
            "knoux-store-supabase-bridge-control",
        ).strip()

        if not control:
            raise GatewayConfigurationError("KNOUX_CONTROL_PLANE_URL is required.")
        if not control.startswith("https://"):
            raise GatewayConfigurationError("The control plane must use HTTPS.")
        if not (
            16 <= len(bridge) <= 64
            and all(ch in "0123456789abcdef" for ch in bridge)
        ):
            raise GatewayConfigurationError(
                "KNOUX_ALLOWED_BRIDGE_ID has an invalid format."
            )

        timeout = max(
            5,
            min(120, int(os.getenv("KNOUX_JOB_TIMEOUT_SECONDS", "30"))),
        )
        return cls(
            control_plane_url=control,
            bridge_id=bridge,
            google_audience=audience,
            job_timeout_seconds=float(timeout),
        )


def _jwt_exp(token: str) -> int:
    try:
        payload = token.split(".")[1]
        payload += "=" * ((4 - len(payload) % 4) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload.encode()))
        return int(data.get("exp", 0))
    except Exception:
        return 0


class GatewayStore:
    def __init__(
        self,
        settings: GatewaySettings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        token_provider: TokenProvider | None = None,
    ) -> None:
        self.settings = settings
        self.client = httpx.AsyncClient(
            base_url=settings.control_plane_url + "/",
            timeout=httpx.Timeout(10.0),
            transport=transport,
        )
        self._token_provider = token_provider or self._metadata_identity_token
        self._cached_token: str | None = None
        self._cached_exp = 0
        self._token_lock = asyncio.Lock()

    async def aclose(self) -> None:
        await self.client.aclose()

    async def _metadata_identity_token(self) -> str:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            response = await client.get(
                "http://metadata.google.internal/computeMetadata/v1/"
                "instance/service-accounts/default/identity",
                params={
                    "audience": self.settings.google_audience,
                    "format": "full",
                },
                headers={"Metadata-Flavor": "Google"},
            )
            response.raise_for_status()
            token = response.text.strip()
            if token.count(".") != 2:
                raise GatewayConfigurationError(
                    "Google metadata returned an invalid identity token."
                )
            return token

    async def _identity_token(self) -> str:
        import time

        now = int(time.time())
        if self._cached_token and self._cached_exp > now + 60:
            return self._cached_token

        async with self._token_lock:
            now = int(time.time())
            if self._cached_token and self._cached_exp > now + 60:
                return self._cached_token
            token = await self._token_provider()
            self._cached_token = token
            self._cached_exp = _jwt_exp(token)
            return token

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> httpx.Response:
        token = await self._identity_token()
        headers = dict(kwargs.pop("headers", {}))
        headers["authorization"] = f"Bearer {token}"
        headers["accept"] = "application/json"
        response = await self.client.request(
            method,
            path.lstrip("/"),
            headers=headers,
            **kwargs,
        )
        return response

    @staticmethod
    def _json_or_error(response: httpx.Response) -> Any:
        try:
            data = response.json()
        except Exception as exc:
            raise GatewayJobError(
                f"Control plane returned HTTP {response.status_code}."
            ) from exc

        if response.is_error:
            message = (
                data.get("error")
                if isinstance(data, dict)
                else f"HTTP {response.status_code}"
            )
            raise GatewayJobError(str(message))
        return data

    async def gateway_status(self) -> dict[str, Any]:
        response = await self._request(
            "GET",
            "gateway/status",
            params={"bridgeId": self.settings.bridge_id},
        )
        data = self._json_or_error(response)
        if not isinstance(data, dict):
            raise GatewayJobError("Malformed gateway status response.")
        return data

    async def run_readonly_tool(
        self,
        tool: str,
        args: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if tool not in READ_TOOLS:
            raise GatewayJobError(
                "The requested tool is not allowlisted by KNOuX Store."
            )

        create = await self._request(
            "POST",
            "gateway/jobs",
            json={
                "bridgeId": self.settings.bridge_id,
                "tool": tool,
                "args": args or {},
            },
        )
        created = self._json_or_error(create)
        job = created.get("job") if isinstance(created, dict) else None
        job_id = job.get("id") if isinstance(job, dict) else None
        if not isinstance(job_id, str):
            raise GatewayJobError("Control plane returned no job id.")

        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.settings.job_timeout_seconds

        while loop.time() < deadline:
            response = await self._request(
                "GET",
                f"gateway/jobs/{job_id}",
            )
            state = self._json_or_error(response)
            if not isinstance(state, dict):
                raise GatewayJobError("Malformed job result.")

            status = state.get("status")
            if status in TERMINAL:
                if status == "succeeded":
                    return {
                        "ok": True,
                        "job_id": job_id,
                        "tool": tool,
                        "result": state.get("result"),
                        "duration_ms": state.get("duration_ms"),
                        "completed_at": state.get("completed_at"),
                    }
                raise GatewayJobError(
                    str(
                        state.get("error")
                        or f"The local job ended as {status}."
                    )
                )
            await asyncio.sleep(self.settings.poll_interval_seconds)

        raise GatewayJobError(
            f"The local bridge did not finish {tool} within "
            f"{self.settings.job_timeout_seconds:.0f}s."
        )
