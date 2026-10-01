from __future__ import annotations

import json
import unittest
from datetime import datetime, timedelta, timezone

import httpx

from control import (
    GatewayJobError,
    GatewaySettings,
    GatewayStore,
)


BRIDGE_ID = "a1b2c3d4e5f60708"


def machine_row(*, age_seconds: int = 0) -> dict:
    return {
        "id": "11111111-1111-4111-8111-111111111111",
        "owner_id": "22222222-2222-4222-8222-222222222222",
        "bridge_id": BRIDGE_ID,
        "hostname": "DESKTOP-FCJJB5O",
        "platform": "win32",
        "arch": "x64",
        "bridge_version": "0.1.0",
        "capabilities": {"git": True, "metrics": True},
        "status": "online",
        "last_seen_at": (
            datetime.now(timezone.utc) - timedelta(seconds=age_seconds)
        ).isoformat(),
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }


def settings(**overrides) -> GatewaySettings:
    values = {
        "supabase_url": "https://example.supabase.co",
        "service_role_key": "test-service-role",
        "bridge_id": BRIDGE_ID,
        "online_window_seconds": 90,
        "job_timeout_seconds": 2.0,
        "poll_interval_seconds": 0.01,
    }
    values.update(overrides)
    return GatewaySettings(**values)


class GatewayStoreTests(unittest.IsolatedAsyncioTestCase):
    async def test_status_is_derived_from_fresh_heartbeat(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.method, "GET")
            self.assertEqual(
                request.url.path,
                "/rest/v1/knoux_bridge_machines",
            )
            return httpx.Response(
                200,
                json=[machine_row(age_seconds=10)],
            )

        store = GatewayStore(
            settings(),
            transport=httpx.MockTransport(handler),
        )
        try:
            status = await store.gateway_status()
        finally:
            await store.aclose()

        self.assertTrue(status["ok"])
        self.assertTrue(status["local_machine_connected"])
        self.assertEqual(
            status["machine"]["hostname"],
            "DESKTOP-FCJJB5O",
        )
        self.assertEqual(
            status["mode"],
            "OUTBOUND_CONTROL_PLANE",
        )

    async def test_stale_heartbeat_is_offline(self) -> None:
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json=[machine_row(age_seconds=180)],
            )

        store = GatewayStore(
            settings(),
            transport=httpx.MockTransport(handler),
        )
        try:
            status = await store.gateway_status()
        finally:
            await store.aclose()

        self.assertFalse(status["local_machine_connected"])
        self.assertEqual(status["machine"]["status"], "offline")

    async def test_readonly_job_round_trip(self) -> None:
        seen_job = None

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal seen_job

            if (
                request.method == "GET"
                and request.url.path
                == "/rest/v1/knoux_bridge_machines"
            ):
                return httpx.Response(
                    200,
                    json=[machine_row(age_seconds=1)],
                )

            if (
                request.method == "POST"
                and request.url.path
                == "/rest/v1/knoux_bridge_jobs"
            ):
                seen_job = json.loads(request.content)
                return httpx.Response(
                    201,
                    json=[{"id": "job-1"}],
                )

            if (
                request.method == "GET"
                and request.url.path
                == "/rest/v1/knoux_bridge_jobs"
            ):
                return httpx.Response(
                    200,
                    json=[{
                        "id": "job-1",
                        "status": "succeeded",
                        "result": {
                            "branch": "feat/local-bridge-registration",
                            "dirty": False,
                        },
                        "error": None,
                        "duration_ms": 42,
                        "completed_at": datetime.now(
                            timezone.utc
                        ).isoformat(),
                    }],
                )

            raise AssertionError(
                f"Unexpected request: {request.method} {request.url}"
            )

        store = GatewayStore(
            settings(),
            transport=httpx.MockTransport(handler),
        )
        try:
            result = await store.run_readonly_tool(
                "git.status",
            )
        finally:
            await store.aclose()

        self.assertTrue(result["ok"])
        self.assertEqual(
            result["result"]["branch"],
            "feat/local-bridge-registration",
        )
        self.assertIsNotNone(seen_job)
        self.assertEqual(seen_job["tool"], "git.status")
        self.assertFalse(seen_job["mutating"])
        self.assertEqual(
            seen_job["required_scopes"],
            ["git:read"],
        )

    async def test_offline_machine_refuses_job_creation(self) -> None:
        post_seen = False

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal post_seen
            if request.method == "POST":
                post_seen = True
            return httpx.Response(
                200,
                json=[machine_row(age_seconds=300)],
            )

        store = GatewayStore(
            settings(),
            transport=httpx.MockTransport(handler),
        )
        try:
            with self.assertRaisesRegex(
                GatewayJobError,
                "offline",
            ):
                await store.run_readonly_tool("git.status")
        finally:
            await store.aclose()

        self.assertFalse(post_seen)


if __name__ == "__main__":
    unittest.main()
