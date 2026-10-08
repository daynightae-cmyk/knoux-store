import { execFile } from 'node:child_process';
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const TOOLS = [
  ['opencode', 'OpenCode', 'agent'], ['codex', 'Codex CLI', 'agent'], ['claude', 'Claude Code', 'agent'], ['gemini', 'Gemini CLI', 'agent'],
  ['qwen', 'Qwen Code', 'agent'], ['droid', 'Droid', 'agent'], ['cursor', 'Cursor', 'agent'], ['copilot', 'Copilot', 'agent'], ['kiro', 'Kiro', 'agent'], ['kilo', 'Kilo Code', 'agent'], ['kimi', 'Kimi', 'agent'], ['amp', 'Amp', 'agent'], ['pi', 'Pi', 'agent'], ['hermes', 'Hermes Agent', 'agent'],
  ['powershell', 'Windows PowerShell', 'runtime'], ['wsl', 'WSL', 'runtime'], ['google-chrome', 'Chrome', 'runtime'], ['msedge', 'Edge', 'runtime'],
  ['git', 'Git', 'runtime'], ['node', 'Node.js', 'runtime'], ['npm', 'npm', 'runtime'], ['pnpm', 'pnpm', 'runtime'], ['yarn', 'yarn', 'runtime'], ['bun', 'Bun', 'runtime'], ['python', 'Python', 'runtime'], ['pwsh', 'PowerShell', 'runtime'], ['docker', 'Docker', 'runtime'], ['java', 'Java', 'runtime'],
] as const;
export async function detectTools() {
  return Promise.all(TOOLS.map(async ([id, label, category]) => {
    let binary: string | null = null;
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      if (!path.isAbsolute(dir)) continue;
      for (const extension of extensions) { const candidate = path.join(dir, id + extension); try { if (!(await stat(candidate)).isFile()) continue; await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK); binary = candidate; break; } catch { /* absent */ } }
      if (binary) break;
    }
    let version: string | null = null;
    // Windows command shims are detected but never interpreted through a shell.
    if (binary && !/\.(cmd|bat)$/i.test(binary)) {
      version = await new Promise<string | null>((resolve) => execFile(/* turbopackIgnore: true */ binary!, [id === 'java' ? '-version' : '--version'], { timeout: 4000, windowsHide: true, maxBuffer: 4096 }, (error, stdout, stderr) => resolve(error ? null : (stdout || stderr).trim().split('\n')[0]?.slice(0, 160) || null)));
    }
    return { id, label, category, available: binary !== null, binary, version, source: binary ? 'PATH' : null, arguments: [id === 'java' ? '-version' : '--version'], state: binary ? 'DETECTED' : 'UNAVAILABLE', authenticated: 'UNTESTED', measuredAt: new Date().toISOString() };
  }));
}
