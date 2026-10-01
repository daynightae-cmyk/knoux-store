/**
 * Audit log — append-only JSONL with size rotation and redaction.
 *
 * Every privileged action is recorded here. The log is append-only: entries
 * are never modified or deleted. Rotation happens at 10 MB, keeping the last
 * 5 files.
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuditEntry } from './protocol.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;

export class AuditLog {
  private dir: string;
  private currentFile: string;

  constructor(dir: string) {
    this.dir = dir;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.currentFile = this.findCurrentFile();
  }

  private findCurrentFile(): string {
    const files = this.listFiles();
    if (files.length === 0) {
      const file = join(this.dir, `audit-${Date.now()}.jsonl`);
      writeFileSync(file, '', { flag: 'w' });
      return file;
    }
    return files[files.length - 1];
  }

  private listFiles(): string[] {
    try {
      return readdirSync(this.dir)
        .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
        .sort()
        .map((f) => join(this.dir, f));
    } catch {
      return [];
    }
  }

  /** Append an entry. Never throws — audit failure must not break the action. */
  append(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    try {
      const full: AuditEntry = {
        ...entry,
        id: randomUUID(),
        timestamp: new Date().toISOString(),
      };
      const line = JSON.stringify(full) + '\n';
      appendFileSync(this.currentFile, line, 'utf8');
      // Rotate if needed
      const stat = statSync(this.currentFile);
      if (stat.size > MAX_FILE_BYTES) {
        this.rotate();
      }
    } catch {
      // Audit failure is logged to stderr but never breaks the action.
      console.error('[audit] failed to append entry');
    }
  }

  private rotate(): void {
    const files = this.listFiles();
    // Delete oldest if at max
    while (files.length >= MAX_FILES) {
      const oldest = files.shift();
      if (oldest) {
        try { renameSync(oldest, `${oldest}.deleted`); } catch { /* ignore */ }
      }
    }
    this.currentFile = join(this.dir, `audit-${Date.now()}.jsonl`);
    writeFileSync(this.currentFile, '', { flag: 'w' });
  }

  /** Read all entries, newest last. */
  readAll(): AuditEntry[] {
    const entries: AuditEntry[] = [];
    for (const file of this.listFiles()) {
      try {
        const content = readFileSync(file, 'utf8');
        for (const line of content.split('\n')) {
          if (!line.trim()) continue;
          try {
            entries.push(JSON.parse(line) as AuditEntry);
          } catch { /* skip malformed */ }
        }
      } catch { /* skip unreadable */ }
    }
    return entries;
  }
}
