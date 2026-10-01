#!/usr/bin/env node
/**
 * KNOuX Build Bridge — CLI entry point.
 *
 * Commands:
 *   init            create the identity keypair and print a pairing code
 *   start           run the bridge server
 *   pair-status     show the bridge's identity and pairing state
 *   unpair          drop all trusted issuers and kill all sessions
 *   doctor          probe this host and report what is actually available
 *   install-service print the Windows service setup (does not install)
 */

import { loadOrCreateIdentity, loadIdentity } from './identity.js';
import { loadConfig } from './config.js';
import { AuditLog } from './audit.js';
import { SessionManager } from './pty/session.js';
import { ProcessRegistry } from './proc/registry.js';
import { BridgeServer } from './server.js';
import { createControlPlaneWorker, controlPlaneUrlFromEnv } from './control-plane.js';
import { createHash, randomInt } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const VERSION = '0.1.0';
/** A pairing code is valid for 15 minutes. */
const CODE_TTL_MS = 15 * 60_000;

/**
 * Cryptographically random pairing code.
 * Ambiguous glyphs (0/O, 1/I) are excluded so it can be read aloud.
 */
export function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[randomInt(chars.length)];
  return code;
}

/** Pairing codes are ephemeral but must survive a restart mid-pairing. */
function codeStorePath(): string {
  return join(homedir(), '.knoux', 'bridge', 'pending-codes.json');
}

function loadPendingCodes(): Map<string, { code: string; expiresAt: number; issuerPublicKey: string }> {
  const map = new Map<string, { code: string; expiresAt: number; issuerPublicKey: string }>();
  if (!existsSync(codeStorePath())) return map;
  try {
    const raw = JSON.parse(readFileSync(codeStorePath(), 'utf8')) as Array<{
      code: string; expiresAt: number; issuerPublicKey: string;
    }>;
    const now = Date.now();
    for (const entry of raw) {
      if (entry && typeof entry.code === 'string' && entry.expiresAt > now) {
        map.set(entry.code, entry);
      }
    }
  } catch { /* treat a corrupt store as empty */ }
  return map;
}

function savePendingCodes(codes: Map<string, { code: string; expiresAt: number; issuerPublicKey: string }>): void {
  const path = codeStorePath();
  try {
    mkdirSync(join(homedir(), '.knoux', 'bridge'), { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify([...codes.values()], null, 2), { mode: 0o600 });
  } catch {
    // Pairing degrades to in-memory only rather than failing the server.
  }
}

/** Trusted issuer keys, keyed by fingerprint, persisted so pairing survives a restart. */
function trustStorePath(): string {
  return join(homedir(), '.knoux', 'bridge', 'trust.json');
}

function loadTrustedIssuers(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(trustStorePath())) return map;
  try {
    const raw = JSON.parse(readFileSync(trustStorePath(), 'utf8')) as Record<string, string>;
    for (const [fingerprint, pem] of Object.entries(raw)) {
      if (typeof pem === 'string' && pem.includes('BEGIN')) map.set(fingerprint, pem);
    }
  } catch { /* treat as empty */ }
  return map;
}

function saveTrustedIssuers(map: Map<string, string>): void {
  try {
    mkdirSync(join(homedir(), '.knoux', 'bridge'), { recursive: true, mode: 0o700 });
    writeFileSync(trustStorePath(), JSON.stringify(Object.fromEntries(map), null, 2), { mode: 0o600 });
  } catch (err) {
    console.error(`[bridge] could not persist the trust store: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}

function cmdInit(): void {
  const identity = loadOrCreateIdentity();
  const code = generatePairingCode();
  const codes = loadPendingCodes();
  const now = Date.now();
  for (const [key, value] of codes) {
    if (value.expiresAt <= now) codes.delete(key);
  }
  // The issuer key is unknown at init time — the bridge records the code and
  // the server fills in the issuer key when the web app presents it.
  codes.set(code, { code, expiresAt: now + CODE_TTL_MS, issuerPublicKey: '' });
  savePendingCodes(codes);

  console.log('KNOuX Bridge identity initialized.');
  console.log(`  Bridge ID:  ${identity.fingerprint.slice(0, 16)}`);
  console.log(`  Fingerprint: ${identity.fingerprint}`);
  console.log('');
  console.log(`  Pairing code: ${code}`);
  console.log(`  Valid for 15 minutes, single use.`);
  console.log('');
  console.log('Next:');
  console.log('  1. knoux-bridge start');
  console.log('  2. Enter this code in the DEV workspace settings page.');
}

async function cmdStart(): Promise<void> {
  const config = loadConfig();
  const identity = loadOrCreateIdentity();
  const bridgeId = identity.fingerprint.slice(0, 16);

  const loopback = config.host === '127.0.0.1' || config.host === 'localhost' || config.host === '::1';

  // Refuse to expose the bridge on a routable interface without TLS. This
  // bridge speaks plain HTTP, so a non-loopback bind is refused outright.
  if (!loopback) {
    console.error('');
    console.error(`ERROR: refusing to bind ${config.host}.`);
    console.error('The bridge serves plain HTTP and is only safe on loopback.');
    console.error('Set host to 127.0.0.1 in bridge.config.json.');
    process.exit(1);
  }

  const audit = new AuditLog(join(homedir(), '.knoux', 'bridge', 'audit'));

  const sessions = new SessionManager({
    limits: config.limits,
    onSessionEnd: (session) => {
      audit.append({
        action: 'terminal.close',
        actor: 'system',
        target: session.id,
        outcome: 'success',
        detail: `reason=${session.killReason ?? 'unknown'} in=${session.bytesIn}B out=${session.bytesOut}B`,
        approvalId: null,
      });
    },
  });

  const processes = new ProcessRegistry({
    cwd: config.root,
    onAudit: (action, target, outcome, detail) => {
      audit.append({ action, actor: 'system', target, outcome, detail, approvalId: null });
    },
  });

  for (const [name, profile] of Object.entries(config.processProfiles)) {
    processes.register(name, profile);
  }

  const trustedIssuers = loadTrustedIssuers();
  const pendingCodes = loadPendingCodes();

  const server = new BridgeServer({
    config,
    identity,
    audit,
    sessions,
    processes,
    bridgeId,
    trustedIssuers,
    pendingCodes,
  });

  // Mirror pairing state to disk so a restart does not silently unpair.
  const persistPairing = (): void => {
    saveTrustedIssuers(trustedIssuers);
    savePendingCodes(pendingCodes);
  };

  console.log(`KNOuX Bridge ${VERSION} starting`);
  console.log(`  Bridge ID:  ${bridgeId}`);
  console.log(`  Root:       ${config.root}`);
  console.log(`  Listening:  http://${config.host}:${config.port}`);
  console.log(`  Platform:   ${process.platform} (node ${process.version})`);
  console.log(`  Issuers:    ${trustedIssuers.size} trusted`);
  console.log(`  Allowlisted tasks: ${Object.keys(config.allowlistedTasks).join(', ') || 'none'}`);
  console.log(`  Processes:  ${Object.keys(config.processProfiles).join(', ') || 'none'}`);

  await server.listen(config.port, config.host);

  let controlPlane: ReturnType<typeof createControlPlaneWorker> | null = null;
  const controlPlaneUrl = controlPlaneUrlFromEnv();
  if (controlPlaneUrl) {
    controlPlane = createControlPlaneWorker({
      baseUrl: controlPlaneUrl,
      bridgeId,
      version: VERSION,
      identity,
      config,
      onIssuerTrust: (fingerprint, publicKey) => {
        trustedIssuers.set(fingerprint, publicKey);
        saveTrustedIssuers(trustedIssuers);
      },
      onAudit: (action, outcome, detail) => {
        audit.append({
          action,
          actor: 'control-plane',
          target: bridgeId,
          outcome,
          detail,
          approvalId: null,
        });
      },
    });
    controlPlane.start();
    console.log('  Control plane: ' + controlPlaneUrl + ' (outbound-only)');
  } else {
    console.log('  Control plane: disabled (set KNOUX_CONTROL_PLANE_URL to enable)');
  }

  audit.append({
    action: 'bridge.start',
    actor: 'system',
    target: bridgeId,
    outcome: 'success',
    detail: `listening on ${config.host}:${config.port}`,
    approvalId: null,
  });

  console.log('');
  console.log('Bridge is listening. Pair it from the DEV workspace settings page.');
  console.log('Press Ctrl+C to stop.');

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}. Shutting down...`);
    audit.append({
      action: 'bridge.stop',
      actor: 'system',
      target: bridgeId,
      outcome: 'success',
      detail: `signal=${signal}`,
      approvalId: null,
    });
    persistPairing();
    if (controlPlane) await controlPlane.stop();
    processes.stopAll();
    sessions.dispose();
    await server.close();
    console.log('Bridge stopped.');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error(`[bridge] uncaught exception: ${err.message}`);
    audit.append({
      action: 'bridge.crash',
      actor: 'system',
      target: bridgeId,
      outcome: 'failure',
      detail: err.message.slice(0, 500),
      approvalId: null,
    });
  });
}

function cmdPairStatus(): void {
  const identity = loadIdentity();
  if (!identity) {
    console.log('No bridge identity. Run `knoux-bridge init` first.');
    return;
  }
  const issuers = loadTrustedIssuers();
  const codes = loadPendingCodes();
  console.log(`Bridge ID:    ${identity.fingerprint.slice(0, 16)}`);
  console.log(`Fingerprint:  ${identity.fingerprint}`);
  console.log(`Trusted issuers: ${issuers.size}`);
  for (const fingerprint of issuers.keys()) {
    console.log(`  - ${fingerprint.slice(0, 32)}`);
  }
  console.log(`Pending pairing codes: ${codes.size}`);
  for (const entry of codes.values()) {
    const minutes = Math.max(0, Math.round((entry.expiresAt - Date.now()) / 60_000));
    console.log(`  - ${entry.code} (${minutes}m remaining, key ${entry.issuerPublicKey ? 'bound' : 'unbound'})`);
  }
}

function cmdUnpair(): void {
  const issuers = loadTrustedIssuers();
  if (issuers.size === 0) {
    console.log('No trusted issuers. Nothing to unpair.');
  } else {
    saveTrustedIssuers(new Map());
    savePendingCodes(new Map());
    console.log(`Removed ${issuers.size} trusted issuer(s) and all pending pairing codes.`);
  }
  console.log('Restart the bridge to drop live sessions.');
}

async function cmdDoctor(): Promise<void> {
  const config = loadConfig();
  const identity = loadIdentity();

  console.log('KNOuX Bridge diagnostics');
  console.log('=========================');
  console.log(`Platform:     ${process.platform} (${process.arch})`);
  console.log(`Node:         ${process.version}`);
  console.log(`Root:         ${config.root}`);
  console.log(`Listen:       ${config.host}:${config.port}`);
  console.log(`Identity:     ${identity ? 'present' : 'missing'}`);
  if (identity) console.log(`Fingerprint:  ${identity.fingerprint}`);

  console.log('');
  console.log('Shell profiles:');
  const { discoverProfiles, getExecutionPolicy, getPowerShellVersion, isElevated, currentUser } = await import('./pty/profiles.js');
  const profiles = discoverProfiles();
  if (profiles.length === 0) {
    console.log('  none found — a terminal session cannot be opened on this host');
  }
  for (const p of profiles) {
    console.log(`  ${p.id}: ${p.path} (version ${p.version})`);
  }
  if (process.platform === 'win32') {
    const policy = getExecutionPolicy();
    console.log(`PowerShell:   ${getPowerShellVersion() ?? 'not found'}`);
    console.log(`Exec policy:  ${policy ?? 'unknown'}`);
  }
  console.log(`User:         ${currentUser()}${isElevated() ? ' (elevated)' : ''}`);

  console.log('');
  console.log('Allowlisted tasks:');
  for (const [task, command] of Object.entries(config.allowlistedTasks)) {
    console.log(`  ${task}: ${command.join(' ')}`);
  }
  if (Object.keys(config.allowlistedTasks).length === 0) {
    console.log('  none — exec is disabled');
  }

  console.log('');
  console.log('Process profiles:');
  for (const [name, profile] of Object.entries(config.processProfiles)) {
    console.log(`  ${name}: ${profile.cmd} ${profile.args.join(' ')}${profile.port ? ` (port ${profile.port})` : ''}`);
  }
  if (Object.keys(config.processProfiles).length === 0) {
    console.log('  none — runtime management is disabled');
  }

  console.log('');
  console.log('Network counters:');
  const { readNetworkCounters } = await import('./net.js');
  const counters = readNetworkCounters();
  console.log(counters
    ? `  available (rx ${counters.rxBytes} B, tx ${counters.txBytes} B cumulative)`
    : '  unavailable on this platform — metrics will report null, not zero');

  console.log('');
  console.log('Metrics sample:');
  const { sampleMetrics } = await import('./metrics.js');
  // System CPU and network rates are differences between two readings, so the
  // first sample cannot produce them. Take a second so `doctor` reports what
  // the bridge actually measures rather than an empty first reading.
  const m = sampleMetrics(config.root);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const second = sampleMetrics(config.root);
  const measured = {
    ...second,
    cpuPercent: m.cpuPercent ?? second.cpuPercent,
    systemCpuPercent: second.systemCpuPercent ?? m.systemCpuPercent,
  };
  // A percentage or a rate that could not be measured prints as "not measured"
  // rather than as a zero, which would read as a healthy idle machine.
  const percent = (value: number | null): string => (value === null ? 'not measured' : `${value}%`);
  const mib = (bytes: number | null): string => (bytes === null ? 'not measured' : `${Math.round(bytes / 1048576)} MiB`);
  const rate = (bytes: number | null): string => (bytes === null ? 'not measured' : `${bytes} B/s`);
  console.log(`  cpu:            ${percent(measured.cpuPercent)} (process), ${percent(measured.systemCpuPercent)} (system)`);
  console.log(`  memory:         ${mib(measured.memoryUsedBytes)} / ${mib(measured.memoryTotalBytes)}`);
  console.log(`  disk free:      ${mib(measured.diskFreeBytes)}`);
  console.log(`  network rx/tx:  ${rate(measured.networkRxBytesPerSec)} / ${rate(measured.networkTxBytesPerSec)}`);
  if (measured.systemCpuPercent === null || measured.networkRxBytesPerSec === null) {
    console.log('                    (a value that could not be measured stays "not measured", never 0)');
  }
  console.log('');
  console.log(`Trust store:     ${loadTrustedIssuers().size} issuer(s)`);
  console.log(`Hash of config:  ${createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 16)}`);
}

function cmdInstallService(): void {
  if (process.platform !== 'win32') {
    console.log('Service installation is only supported on Windows.');
    console.log('On other platforms, run `knoux-bridge start` under the supervisor of your choice.');
    return;
  }
  console.log('To run the KNOuX Bridge as a Windows service:');
  console.log('');
  console.log('1. Get NSSM from https://nssm.cc/download');
  console.log('2. From an elevated prompt:');
  console.log('   nssm install KNOuXBridge "C:\\Program Files\\nodejs\\node.exe"');
  console.log('   nssm set KNOuXBridge AppDirectory "C:\\path\\to\\bridge"');
  console.log('   nssm set KNOuXBridge AppParameters "dist\\main.js start"');
  console.log('   nssm set KNOuXBridge Start SERVICE_AUTO_START');
  console.log('3. nssm start KNOuXBridge');
  console.log('');
  console.log('The service must run as your user account, not LocalSystem, so the');
  console.log('shell inherits your PATH and profile. That is a real trade-off: a');
  console.log('service running as your user has your credentials. Bind the bridge');
  console.log('to loopback only.');
}

function usage(): void {
  console.log('Usage: knoux-bridge <command>');
  console.log('');
  console.log('  init             create the identity and print a pairing code');
  console.log('  start            run the bridge server');
  console.log('  pair-status      show identity, trusted issuers and pending codes');
  console.log('  unpair           remove all trusted issuers and pending codes');
  console.log('  doctor           probe this host and report measured capabilities');
  console.log('  install-service  print Windows service setup instructions');
}

const command = process.argv[2] ?? 'start';

switch (command) {
  case 'init':
    cmdInit();
    break;
  case 'start':
    await cmdStart();
    break;
  case 'pair-status':
    cmdPairStatus();
    break;
  case 'unpair':
    cmdUnpair();
    break;
  case 'doctor':
    await cmdDoctor();
    break;
  case 'install-service':
    cmdInstallService();
    break;
  case '--help':
  case '-h':
  case 'help':
    usage();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}