from __future__ import annotations

import json
import unittest

import httpx

from control import GatewaySettings, GatewayStore


async def token() -> str:
    # Cache parser accepts opaque test tokens; production uses metadata JWTs.
    return "test.identity.token"


class GatewayTests(unittest.IsolatedAsyncioTestCase):
    async def test_status_and_job_round_trip(self) -> None:
        job_gets = 0

        async def handler(request: httpx.Request) -> httpx.Response:
            nonlocal job_gets
            self.assertEqual(
                request.headers.get("authorization"),
                "Bearer test.identity.token",
            )

            if request.url.path.endswith("/gateway/status"):
                self.assertEqual(
                    request.url.params.get("bridgeId"),
                    "f33c8b25e563f1fe",
                )
                return httpx.Response(200, json={
                    "ok": True,
                    "local_machine_connected": True,
                    "machine": {"status": "online"},
                })

            if request.url.path.endswith("/gateway/jobs") and request.method == "POST":
                body = json.loads(request.content)
                self.assertEqual(body["tool"], "git.status")
                return httpx.Response(202, json={
                    "ok": True,
                    "job": {"id": "11111111-1111-4111-8111-111111111111"},
                })

            if request.url.path.endswith(
                "/gateway/jobs/11111111-1111-4111-8111-111111111111"
            ):
                job_gets += 1
                return httpx.Response(200, json={
                    "id": "11111111-1111-4111-8111-111111111111",
                    "status": "succeeded",
                    "result": {"branch": "main", "dirty": False},
                    "duration_ms": 12,
                    "completed_at": "2026-10-03T14:00:00Z",
                })

            raise AssertionError(f"unexpected request {request.method} {request.url}")

        settings = GatewaySettings(
            control_plane_url=(
                "https://cnkddxxhcfceokxzaaot.supabase.co/functions/v1/"
                "knoux-bridge-control"
            ),
            bridge_id="f33c8b25e563f1fe",
            poll_interval_seconds=0.001,
        )
        store = GatewayStore(
            settings,
            transport=httpx.MockTransport(handler),
            token_provider=token,
        )
        try:
            status = await store.gateway_status()
            result = await store.run_readonly_tool("git.status")
        finally:
            await store.aclose()

        self.assertTrue(status["local_machine_connected"])
        self.assertTrue(result["ok"])
        self.assertEqual(result["result"]["branch"], "main")
        self.assertGreaterEqual(job_gets, 1)

    async def test_rejects_non_allowlisted_tool(self) -> None:
        settings = GatewaySettings(
            control_plane_url="https://example.test/control",
            bridge_id="f33c8b25e563f1fe",
        )
        store = GatewayStore(settings, token_provider=token)
        try:
            with self.assertRaisesRegex(Exception, "not allowlisted"):
                await store.run_readonly_tool("exec.run")
        finally:
            await store.aclose()


if __name__ == "__main__":
    unittest.main()
