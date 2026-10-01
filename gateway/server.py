from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import Any

from fastmcp import FastMCP

from control import (
    GatewayConfigurationError,
    GatewayJobError,
    GatewaySettings,
    GatewayStore,
)


logging.basicConfig(
    format="[%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

mcp = FastMCP("KNOuX Store MCP Gateway")
_store_instance: GatewayStore | None = None


def store() -> GatewayStore:
    global _store_instance
    if _store_instance is None:
        _store_instance = GatewayStore(
            GatewaySettings.from_env()
        )
    return _store_instance


def safe_error(exc: Exception) -> dict[str, Any]:
    if isinstance(
        exc,
        (GatewayConfigurationError, GatewayJobError, ValueError),
    ):
        message = str(exc)[:800]
    else:
        message = "The KNOuX Store gateway encountered an internal error."

    return {
        "ok": False,
        "error": type(exc).__name__,
        "message": message,
        "changes_made": False,
    }


@mcp.tool()
async def gateway_status() -> dict[str, Any]:
    """Return measured KNOuX Store gateway and local-machine connectivity."""
    try:
        return await store().gateway_status()
    except Exception as exc:
        return safe_error(exc)


@mcp.tool()
async def machine_git_status() -> dict[str, Any]:
    """Read the real git status from the enrolled KNOuX Store machine."""
    try:
        return await store().run_readonly_tool(
            "git.status"
        )
    except Exception as exc:
        return safe_error(exc)


@mcp.tool()
async def machine_metrics() -> dict[str, Any]:
    """Read measured machine and bridge metrics from the enrolled machine."""
    try:
        return await store().run_readonly_tool(
            "metrics.read"
        )
    except Exception as exc:
        return safe_error(exc)


@mcp.tool()
async def machine_processes() -> dict[str, Any]:
    """List supervised KNOuX Store processes. Read-only."""
    try:
        return await store().run_readonly_tool(
            "proc.list"
        )
    except Exception as exc:
        return safe_error(exc)


@mcp.tool()
async def machine_list_files(
    path: str = ".",
) -> dict[str, Any]:
    """List files under the KNOuX Store bridge root."""
    try:
        if (
            not isinstance(path, str)
            or not path
            or len(path) > 4096
            or "\x00" in path
        ):
            raise GatewayJobError(
                "The requested path is invalid."
            )
        return await store().run_readonly_tool(
            "fs.list",
            {"path": path},
        )
    except Exception as exc:
        return safe_error(exc)


@mcp.tool()
async def machine_read_file(
    path: str,
) -> dict[str, Any]:
    """Read one file under the KNOuX Store bridge root."""
    try:
        if (
            not isinstance(path, str)
            or not path
            or len(path) > 4096
            or "\x00" in path
        ):
            raise GatewayJobError(
                "The requested path is invalid."
            )
        return await store().run_readonly_tool(
            "fs.read",
            {"path": path},
        )
    except Exception as exc:
        return safe_error(exc)


@mcp.tool()
async def machine_logs(
    name: str,
    since: int = 0,
    limit: int = 200,
) -> dict[str, Any]:
    """Read bounded output from one supervised process."""
    try:
        if not re.fullmatch(
            r"[A-Za-z0-9._-]{1,64}",
            name or "",
        ):
            raise GatewayJobError(
                "The supervised process name is invalid."
            )

        safe_limit = max(
            1,
            min(500, int(limit)),
        )
        safe_since = max(0, int(since))

        return await store().run_readonly_tool(
            "logs.read",
            {
                "name": name,
                "since": safe_since,
                "limit": safe_limit,
            },
        )
    except Exception as exc:
        return safe_error(exc)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    logger.info(
        "Starting KNOuX Store MCP Gateway on port %s",
        port,
    )
    asyncio.run(
        mcp.run_async(
            transport="streamable-http",
            host="0.0.0.0",
            port=port,
        )
    )
