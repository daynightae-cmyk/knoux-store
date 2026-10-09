/** Trusted-local metadata inspection only. No agent execution and no credential reads. */
import { readdir, realpath, stat, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { detectTools } from './tools.js';
import { execFile } from 'node:child_process';
const permissions = ['READ_PROJECT', 'WRITE_PROJECT', 'RUN_TESTS', 'TERMINAL', 'BROWSER', 'GIT_READ', 'GIT_WRITE', 'COMMIT', 'PUSH', 'NETWORK', 'MCP', 'PLUGINS', 'SKILLS', 'WORKTREES', 'SUBAGENTS'];
const safeName = (value: string) => /^[\w .:@/-]{1,160}$/.test(value);
async function inside(root: string, target: string): Promise<string | null> {
    try {
        const resolvedRoot = await realpath(root), resolved = await realpath(target), relative = path.relative(resolvedRoot, resolved);
        return relative.startsWith('..') || path.isAbsolute(relative) ? null : resolved;
    }
    catch {
        return null;
    }
}
async function json(root: string, target: string): Promise<Record<string, unknown> | null> {
    const resolved = await inside(root, target);
    if (!resolved)
        return null;
    try {
        const handle = await open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        try {
            const metadata = await handle.stat();
            if (!metadata.isFile() || metadata.size > 128 * 1024)
                return null;
            // Check/read the same opened object and bound reads even if it grows.
            const buffer = Buffer.alloc(128 * 1024 + 1);
            let length = 0;
            while (length < buffer.length) {
                const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
                if (!bytesRead)
                    break;
                length += bytesRead;
            }
            if (length > 128 * 1024)
                return null;
            const value = JSON.parse(buffer.subarray(0, length).toString('utf8'));
            return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        }
        finally { await handle.close(); }
    }
    catch {
        return null;
    }
}
export async function providerInventory(root: string) {
    const measuredAt = new Date().toISOString();
    const tools = await detectTools();
    let installed: Record<string, unknown> = {};
    try {
        const config = JSON.parse(process.env.KNOUX_PROVIDER_AGENT_BINARIES ?? '{}');
        if (config && typeof config === 'object' && !Array.isArray(config))
            installed = config;
    }
    catch { /* Invalid host policy never authorizes a path. */ }
    const configured = new Map<string, {
        binary: string;
        source: 'BUNDLED' | 'CUSTOM';
        version: string | null;
    }>();
    for (const tool of tools.filter(tool => tool.category === 'agent')) {
        const entry = installed[tool.id];
        if (!entry || typeof entry !== 'object')
            continue;
        const { binary, source } = entry as Record<string, unknown>;
        if (typeof binary !== 'string' || binary.length > 1000 || !path.isAbsolute(binary) || !['BUNDLED', 'CUSTOM'].includes(String(source)))
            continue;
        try {
            const resolved = await realpath(binary);
            if (!(await stat(resolved)).isFile())
                continue;
            if (source === 'BUNDLED' && !await inside(root, resolved))
                continue;
            let version: string | null = null;
            if (!/\.(cmd|bat)$/i.test(resolved))
                version = await new Promise(resolve => execFile(resolved, ['--version'], { timeout: 4000, windowsHide: true, maxBuffer: 4096 }, (error, stdout, stderr) => resolve(error ? null : (stdout || stderr).match(/\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/)?.[0] ?? null)));
            configured.set(tool.id, { binary: resolved, source: source as 'BUNDLED' | 'CUSTOM', version });
        }
        catch { /* Absent executable remains absent. */ }
    }
    const agents = tools.filter(tool => tool.category === 'agent').map(tool => ({
        id: `agent:${tool.id}`, name: tool.label, binary: configured.get(tool.id)?.binary ?? tool.binary, source: configured.get(tool.id)?.source ?? tool.source,
        version: configured.get(tool.id)?.version ?? tool.version?.match(/\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/)?.[0] ?? null,
        detected: tool.available || configured.has(tool.id), authenticated: 'UNTESTED', executable: false,
        state: tool.available || configured.has(tool.id) ? 'EXECUTOR_NOT_CONNECTED' : 'CLI_NOT_FOUND', measuredAt,
        capabilities: permissions.map(id => ({ id, supported: 'UNKNOWN', allowed: 'DENY', currentlyAvailable: false, reason: 'Inventory detection does not install an agent executor or establish its capabilities.' })),
    }));
    const inventory: Array<{
        id: string;
        name: string;
        kind: string;
        source: string;
        state: string;
        measuredAt: string;
        environmentNames: string[];
    }> = [];
    const mcp = await json(root, path.join(root, '.mcp.json'));
    if (mcp?.mcpServers && typeof mcp.mcpServers === 'object')
        for (const [name, value] of Object.entries(mcp.mcpServers).slice(0, 100)) {
            if (!safeName(name) || !value || typeof value !== 'object')
                continue;
            const entry = value as Record<string, unknown>;
            const environmentNames = entry.env && typeof entry.env === 'object' ? Object.keys(entry.env).filter(key => /^[A-Z_][A-Z0-9_]{0,127}$/i.test(key)).slice(0, 100) : [];
            inventory.push({ id: `mcp:${name}`, name, kind: 'MCP', source: 'PROJECT_MCP_CONFIG', state: entry.disabled === true ? 'DISABLED' : 'UNTESTED', measuredAt, environmentNames });
        }
    // Only conventional, operator-owned project installation directories are inspected.
    for (const [directory, kind, marker] of [['.claude/skills', 'SKILL', 'SKILL.md'], ['.codex/skills', 'SKILL', 'SKILL.md'], ['.knoux/plugins', 'PLUGIN', 'plugin.json']] as const) {
        const base = await inside(root, path.join(root, directory));
        if (!base)
            continue;
        const entries = await readdir(base, { withFileTypes: true }).catch(() => []);
        for (const entry of entries.slice(0, 100)) {
            if (!entry.isDirectory() || !safeName(entry.name))
                continue;
            const file = await inside(root, path.join(base, entry.name, marker));
            if (!file)
                continue;
            inventory.push({ id: `${kind.toLowerCase()}:${directory}:${entry.name}`, name: entry.name, kind, source: 'PROJECT_INSTALLATION', state: 'AVAILABLE', measuredAt, environmentNames: [] });
        }
    }
    return { agents, inventory };
}
