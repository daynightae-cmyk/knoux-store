import type { DiscoverableEntity, EntityStatus } from '@/lib/entities';

/**
 * KNOuX Software Universe.
 *
 * Every entry below is traceable to a public repository owned by
 * `daynightae-cmyk` and to a specific artefact inside it (README section,
 * `VERSION` file, `package.json`, or the repository's own declared
 * deployment URL). The audit date is recorded because repository state moves.
 *
 * Optional fields are absent when the repository does not establish them.
 * A version number is published only when a file in the repository states it.
 * Capabilities are stated as the repository states them, including the
 * repository's own hedges about what is not yet runtime-verified.
 */

export const softwareAuditDate = '2026-09-28';
export const softwareAuditOwner = 'daynightae-cmyk';

/** How a repository is treated by the institution. */
export type RepositoryClass =
  | 'CANONICAL PRODUCT'
  | 'LAB'
  | 'PLACEHOLDER'
  | 'DUPLICATE'
  | 'STORE / INFRASTRUCTURE'
  | 'EXTERNAL / CLIENT / NON-KNOUX';

export type SoftwareProduct = {
  id: string;
  code: string;
  slug: string;
  name: string;
  shortName: string;
  index: string;
  family: string;
  discipline: string;
  status: EntityStatus;
  tagline: string;
  statement: string;
  /** Only present when a repository file declares it. */
  version?: string;
  versionSource?: string;
  license?: string;
  repository: string;
  /** The repository's own declared public URL, when it has one. */
  liveUrl?: string;
  platform: string;
  /** Stated implementation, in the repository's own terms. */
  capabilities: string[];
  /** Stated constraints. Published so visitors can judge the product honestly. */
  limitations: string[];
  technologies: string[];
  /** Intent phrases a visitor would actually type. Evidence-linked only. */
  searchTerms: string[];
  evidence: { source: string; note: string }[];
  relatedIds: string[];
  topology: { orbit: 1 | 2 | 3; angleDeg: number };
};

export const softwareProducts: readonly SoftwareProduct[] = [
  {
    id: 'sw-one',
    code: 'SW-01',
    slug: 'knoux-one',
    name: 'KNOUX ONE',
    shortName: 'ONE',
    index: '01',
    family: 'Windows Intelligence',
    discipline: 'Systems',
    status: 'active',
    tagline: 'Windows Intelligence & Developer Suite',
    statement:
      'A Windows desktop workspace that keeps one shell over nineteen modules and refuses to claim a service it cannot prove. Its own evidence baseline separates statically verified native paths from planned ones, and browser preview returns desktop_runtime_unavailable rather than inventing a host reading.',
    license: 'Not declared',
    repository: 'https://github.com/daynightae-cmyk/KNOUX-ONE',
    liveUrl: 'https://knoux-one.vercel.app',
    platform: 'Windows 10/11 x64 desktop (Tauri 2) with a browser preview that declines desktop operations',
    capabilities: [
      'Registry-driven desktop shell covering nineteen modules with grouped navigation and Arabic/English search',
      'Typed Rust-to-renderer command allowlist with no arbitrary shell endpoint',
      'Native workspaces for setup, cleanup, duplicates, storage, startup, performance, repair, network and a developer studio',
      'Cross-volume quarantine that copies, flushes, verifies a BLAKE3 digest, and only then removes a source',
      'Developer Studio restricted to recognised cache paths and refusing credential payloads',
    ],
    limitations: [
      'Its own baseline reports 74 statically verified native paths, 6 partial, 110 planned, and 0 runtime-verified on Windows in repository evidence',
      'Modules M09 to M14 and M16 to M19 are planned and expose no handler',
      'Permanent purge does not claim guaranteed SSD secure erasure',
    ],
    technologies: ['Tauri 2', 'Rust', 'React 19', 'TypeScript', 'Vite'],
    searchTerms: [
      'windows intelligence',
      'windows system tool',
      'system maintenance desktop',
      'developer workspace windows',
      'rust tauri app',
      'windows cleanup',
      'startup manager',
      'system monitoring',
    ],
    evidence: [
      { source: 'README.md', note: 'Product title, stack, module and service evidence matrix, safety boundaries' },
      { source: 'REAL_IMPLEMENTATION_MATRIX.md', note: 'Referenced as the service evidence authority' },
      { source: 'docs/services/service-reality-baseline.md', note: 'Generated evidence baseline referenced by the README' },
      { source: '.github/workflows/m03-native-validation.yml', note: 'Windows Rust formatting, Clippy and native test workflow' },
      { source: 'repository homepage field', note: 'https://knoux-one.vercel.app' },
    ],
    relatedIds: ['sw-forge', 'sw-repair'],
    topology: { orbit: 1, angleDeg: 330 },
  },
  {
    id: 'sw-forge',
    code: 'SW-02',
    slug: 'kforge',
    name: 'KNOuX Forge',
    shortName: 'Forge',
    index: '02',
    family: 'Engineering Tooling',
    discipline: 'Development',
    status: 'active',
    tagline: 'Local-first engineering command center',
    statement:
      'A React workspace over an Express API for discovering repositories, reading code evidence and running trusted project workflows. It reports unconfigured capabilities explicitly instead of fabricating remote, CI, registry, AI or release state, and it refuses to promote missing external-provider evidence to success.',
    license: 'MIT',
    repository: 'https://github.com/daynightae-cmyk/KForge',
    platform: 'Node.js local server with a React workspace, packaged as a Windows x64 desktop application',
    capabilities: [
      'Local project discovery with collections, trust, health, problems and bounded scans',
      'Language-aware analysis of files, imports, symbols, routes, APIs, dependencies, cycles and architecture evidence',
      'Release and Distribution Center keeping local artifacts, package identity, CI provenance and remote state independent',
      'Marketplace that exposes provenance, permissions, compatibility and truthful unavailable states',
      'Global search across real local product entities with visible coverage and safety limits',
      'Preview Experience topology orchestration with owned process lifecycle, port evidence and service-scoped logs',
    ],
    limitations: [
      'Starts in Offline Mode; remote, CI, registry, preview and cloud AI surfaces stay unconfigured until a real adapter and action supply evidence',
      'No trustworthy remote extension package adapter is configured, so remote install claims remain blocked rather than simulated',
      'The Windows installer is an unsigned development and release artifact and makes no trusted-publisher claim',
      'Its newest recorded green gate is run 271 on 2026-09-08, not a claim about current HEAD',
    ],
    technologies: ['React 18', 'Express', 'TypeScript', 'Zod', 'Vite', 'Vitest', 'Playwright'],
    searchTerms: [
      'developer workspace',
      'engineering command center',
      'code evidence',
      'repository analysis tool',
      'ci verification',
      'release automation',
      'local first developer tool',
      'project health',
    ],
    evidence: [
      { source: 'README.md', note: 'Product description, reference verification baseline, architecture map, truthful limitations' },
      { source: 'docs/KFORGE-CAPABILITY-MATRIX.md', note: 'Capability-level status evidence' },
      { source: 'docs/DESKTOP_ARCHITECTURE_DECISION.md', note: 'Architecture and trust boundaries' },
      { source: 'docs/SIGNING.md', note: 'Release modes and the CI signing contract' },
      { source: 'repository metadata', note: 'License MIT' },
    ],
    relatedIds: ['sw-one', 'sw-repair'],
    topology: { orbit: 1, angleDeg: 30 },
  },
  {
    id: 'sw-repair',
    code: 'SW-03',
    slug: 'knoux-repair',
    name: 'KNOuX Repair',
    shortName: 'Repair',
    index: '03',
    family: 'System Maintenance',
    discipline: 'Utilities',
    status: 'active',
    tagline: 'Diagnostics, repair and recovery workstation',
    statement:
      'A local-first Windows workstation exposing eighteen service categories through a web UI, an Electron shell, a Windows desktop build, a PowerShell console and a loopback execution bridge that runs only registered tools. Every registered tool carries risk metadata and destructive paths require explicit confirmation.',
    version: '2.0.2',
    versionSource: 'VERSION',
    license: 'Not declared',
    repository: 'https://github.com/daynightae-cmyk/knoux-Repair',
    platform: 'Windows workstation: web UI, Electron desktop, native desktop, and a PowerShell console',
    capabilities: [
      'Eighteen service categories covering maintenance, cleanup, network, programs, duplicates, disk space, services, performance, security, diagnostics, backup, developer tools, privacy, drivers, monitoring, environment, post-install and project analysis',
      'Risk classes of READ_ONLY, SAFE_CLEANUP, SYSTEM_REPAIR, DESTRUCTIVE and REBOOT_REQUIRED with confirmation before destructive execution',
      'A loopback execution bridge that allowlists registered KNOuX tools and bounds scan and input ranges',
      'An explicit UAC boundary: an unelevated bridge rejects admin-required tools with 403 ELEVATION_REQUIRED',
      'Optional local authentication through GitHub OAuth or Microsoft Entra ID with loopback HttpOnly session cookies',
    ],
    limitations: [
      'Manual real-machine validation is still required for destructive end-to-end flows, reboot flows, rollback and hardware telemetry',
      'The authoritative service map is Docs/SERVICE-INVENTORY.md; historical 100-tool documents describe an earlier console baseline',
    ],
    technologies: ['TypeScript', 'React 18', 'Vite', 'Electron', 'PowerShell', '.NET'],
    searchTerms: [
      'repair windows',
      'fix my computer',
      'windows diagnostics',
      'pc cleanup',
      'duplicate files',
      'disk space',
      'system repair tool',
      'windows performance',
      'registry cleanup',
    ],
    evidence: [
      { source: 'README-EN.md', note: 'Product surfaces, service map, safety model, authentication, CI gate' },
      { source: 'VERSION', note: 'Version 2.0.2' },
      { source: 'Docs/SERVICE-INVENTORY.md', note: 'Authoritative current service and tool maturity matrix' },
      { source: 'Docs/SAFETY-MODEL.md', note: 'Execution, UAC, quarantine and protection boundaries' },
      { source: 'Docs/TOOLS-MANIFEST.json', note: 'Registered execution inventory' },
      { source: '.github/workflows/ci.yml', note: 'Windows quality gate' },
    ],
    relatedIds: ['sw-one', 'sw-organizer'],
    topology: { orbit: 2, angleDeg: 150 },
  },
  {
    id: 'sw-organizer',
    code: 'SW-04',
    slug: 'knoux-smartorganizer',
    name: 'KNOuX SmartOrganizer',
    shortName: 'Organizer',
    index: '04',
    family: 'File Management',
    discipline: 'Organization',
    status: 'active',
    tagline: 'Local-first file organization utility',
    statement:
      'A Windows desktop utility whose renderer cannot run commands or reach Node.js. Cleanup is a read-only preview by design, and the build explicitly refuses to claim deletion, registry changes or automation it has not implemented.',
    license: 'Not declared',
    repository: 'https://github.com/daynightae-cmyk/Knoux-SmartOrganizer',
    platform: 'Windows desktop (Electron main process with a React and Vite renderer)',
    capabilities: [
      'Storage and file tools covering disks, large files, SHA-256 duplicate detection, empty folders, Downloads inventory and file hashes',
      'Smart Scan producing read-only disk, large-file and temporary-file review findings',
      'System health for CPU, RAM, system drive, uptime and battery where Windows exposes it',
      'Tool execution lifecycle from queued through preflight, running, progress, result, completed, cancelled and failed',
      'Arabic and English with Arabic default and full document direction switching to RTL',
      'Versioned local settings for language, appearance, scan, cleanup, privacy and performance defaults',
    ],
    limitations: [
      'Cleanup is a read-only temporary-file preview; the build performs no automatic cleanup',
      'It claims no file deletion, registry changes, startup toggling, service manipulation, repair actions, scheduled automation, update downloads, usage statistics or AI assistance',
      'Unsigned development build unless a signing certificate is configured in the build environment',
    ],
    technologies: ['Electron', 'React', 'TypeScript', 'Vite', 'NSIS'],
    searchTerms: [
      'organize files',
      'sort my downloads',
      'find duplicate files',
      'clean up disk space',
      'file organizer windows',
      'empty folders',
      'file hash',
      'storage analyzer',
    ],
    evidence: [
      { source: 'README.md', note: 'Implemented-capability table, intentionally-unavailable list, privacy model, architecture' },
      { source: 'docs/FORENSIC_BASELINE_AUDIT.md', note: 'Detailed baseline findings referenced by the README' },
    ],
    relatedIds: ['sw-repair', 'sw-rec'],
    topology: { orbit: 2, angleDeg: 210 },
  },
  {
    id: 'sw-rec',
    code: 'SW-05',
    slug: 'knoux-rec',
    name: 'KNOuX REC',
    shortName: 'REC',
    index: '05',
    family: 'Capture & Media',
    discipline: 'Media',
    status: 'active',
    tagline: 'Local screen recorder and non-destructive recording workspace',
    statement:
      'A Windows-first screen recorder that separates implemented from fully runtime-verified, and says so. Recordings are disk-backed incrementally so a crash does not destroy the take, and verification is carried by FFmpeg and FFprobe rather than by assertion.',
    license: 'Not declared',
    repository: 'https://github.com/daynightae-cmyk/knoux-rec',
    platform: 'Windows desktop (hardened Electron shell with React and TypeScript)',
    capabilities: [
      'Screen, window and constrained region capture with camera picture-in-picture composition',
      'Incremental disk-backed recording with low-disk guards and local recording recovery',
      'FFmpeg and FFprobe backed media verification and export, plus versioned .knouxrec projects and trimmed project export',
      'Manual captions with SRT export, local thumbnails, library search and sorting, and timeline zoom controls',
      'A native WASAPI helper and sandboxed renderer with a narrow typed preload bridge and validated IPC input',
    ],
    limitations: [
      'The product distinguishes implemented from fully runtime-verified; several capabilities remain partial pending real-device, long-session, multi-DPI, failure-recovery and installer acceptance gates',
    ],
    technologies: ['Electron', 'React', 'TypeScript', 'FFmpeg', 'FFprobe', 'WASAPI'],
    searchTerms: [
      'record screen',
      'screen recording',
      'record my pc',
      'screen recorder windows',
      'record a window',
      'video capture desktop',
      'add captions to video',
      'export recording',
    ],
    evidence: [
      { source: 'README.md', note: 'Current product reality, security boundaries, verification commands' },
      { source: 'docs/CURRENT_BASELINE.md', note: 'Declared current authority for product behaviour' },
      { source: 'docs/PRODUCTION_STATUS.md', note: 'Detailed status matrix' },
      { source: 'docs/PROJECT_FORMAT.md', note: '.knouxrec project format' },
    ],
    relatedIds: ['sw-player-x', 'sw-clipboard'],
    topology: { orbit: 1, angleDeg: 120 },
  },
  {
    id: 'sw-player-x',
    code: 'SW-06',
    slug: 'knoux-x',
    name: 'KNOuX Player X',
    shortName: 'Player X',
    index: '06',
    family: 'Capture & Media',
    discipline: 'Media',
    status: 'active',
    tagline: 'Desktop media player with FFmpeg inspection and OpenRouter models',
    statement:
      'An Electron media player combining hardware-accelerated playback with static FFprobe and FFmpeg stream inspection, an equalizer and DSP chain, subtitle handling, and optional OpenRouter model integration for chat and playlist work.',
    version: '2.0.0',
    versionSource: 'README.md version badge and "What\'s New in v2.0.0" section',
    license: 'MIT',
    repository: 'https://github.com/daynightae-cmyk/knoux-x',
    liveUrl: 'https://knoux-x.vercel.app',
    platform: 'Windows desktop (Electron 28) with a React 18 renderer',
    capabilities: [
      'Video and audio playback with hardware-accelerated decoding and 4K HDR rendering',
      'Static FFprobe and FFmpeg stream analysis for metadata and container inspection',
      'Neural DSP stage with a ten-band equalizer, presets and audio effects',
      'Subtitle handling for SRT, VTT, ASS and SSA with custom styling',
      'Optional OpenRouter integration for chat, model selection and playlist generation',
      'Documented keyboard control surface including seek, volume, mute, fullscreen, loop, shuffle and subtitles',
    ],
    limitations: [
      'The AI features require a user-supplied OpenRouter API key and are not active without one',
      'The repository README links to a knoux.dev documentation site that the repository itself does not evidence as KNOuX-operated, so it is not published as a KNOuX URL',
    ],
    technologies: ['Electron 28', 'React 18', 'TypeScript', 'FFmpeg Static', 'Zustand', 'Framer Motion'],
    searchTerms: [
      'media player',
      'video player desktop',
      'play mkv',
      'video metadata',
      'ffmpeg inspect',
      'equalizer',
      'subtitle player',
      'openrouter player',
    ],
    evidence: [
      { source: 'README.md', note: 'Feature set, tech stack table, project structure, keyboard shortcuts, version badge' },
      { source: 'LICENSE', note: 'MIT' },
      { source: 'repository homepage field', note: 'https://knoux-x.vercel.app' },
    ],
    relatedIds: ['sw-rec', 'sw-clipboard'],
    topology: { orbit: 2, angleDeg: 90 },
  },
  {
    id: 'sw-clipboard',
    code: 'SW-07',
    slug: 'knoux-clipboard-ai',
    name: 'KNOuX Clipboard AI',
    shortName: 'Clipboard',
    index: '07',
    family: 'Developer Productivity',
    discipline: 'Productivity',
    status: 'release-candidate',
    tagline: 'Clipboard workspace with guarded AI actions',
    statement:
      'A local-first clipboard workspace whose release status is stated plainly in its own README as a release candidate under verification. Sensitive input is blocked before transport, the renderer never receives the provider credential, and services without a real runner are demoted to guarded automatically.',
    license: 'MIT',
    repository: 'https://github.com/daynightae-cmyk/knoux_ai_clipboard_pro',
    liveUrl: 'https://knoux-ai-clipboard-pro.vercel.app',
    platform: 'Windows desktop (Electron 43.4.1) with a React and Vite renderer; Node.js 22.x',
    capabilities: [
      'Local clipboard history with a renderer that never receives the OpenRouter credential',
      'Local pre-transport scanning that blocks credential-like values, keys, tokens, JWTs, private keys, SSH keys, emails, phone numbers and card-like values',
      'Vault IPC using AES-256-GCM with a random 16-byte salt, a 12-byte IV and a scrypt-derived key in knoux:v2 payloads',
      'A service truth model that marks a service active only when it resolves through a verified executable runner',
      'Developer Studio and barcode and QR utilities, with Arabic and English interface support',
    ],
    limitations: [
      'The repository states its own status as release candidate under verification and asks that catalog metadata not be treated as production evidence',
      'Local transformer inference is intentionally guarded because its former dependency chain was not verified for the release baseline',
      'Live AI requires OpenRouter configuration; the offline fallback is labelled fallback and never ready',
    ],
    technologies: ['Electron 43.4.1', 'React', 'TypeScript', 'Vite', 'Vitest', 'NSIS'],
    searchTerms: [
      'clipboard manager',
      'clipboard history',
      'ai clipboard',
      'copy paste history',
      'barcode scanner',
      'qr code reader',
      'developer clipboard',
      'secret scanning',
    ],
    evidence: [
      { source: 'README.md', note: 'Status, runtime baseline table, security boundaries, CI gates, service truth model' },
      { source: '.nvmrc', note: 'Node.js 22.x baseline' },
      { source: 'docs/audit/FINAL-RELEASE-GATE.md', note: 'Named as the release evidence record' },
      { source: 'LICENSE', note: 'MIT' },
      { source: 'repository homepage field', note: 'https://knoux-ai-clipboard-pro.vercel.app' },
    ],
    relatedIds: ['sw-organizer', 'sw-forge'],
    topology: { orbit: 2, angleDeg: 270 },
  },
];

/**
 * Repository ledger.
 *
 * The full KNOuX-branded audit result, including repositories that are not
 * products. It is published so the classification is inspectable rather than
 * hidden. Client and non-KNOuX repositories owned by the same account are
 * deliberately absent: they are not part of this catalogue and are not
 * presented as KNOuX output.
 */
export type RepositoryRecord = {
  repository: string;
  name: string;
  classification: RepositoryClass;
  /** Why it landed in that class, in audit terms. */
  basis: string;
  published: boolean;
};

export const repositoryLedger: readonly RepositoryRecord[] = [
  { repository: 'KNOUX-ONE', name: 'KNOUX ONE', classification: 'CANONICAL PRODUCT', basis: 'Branded product, active evidence baseline, workflow, declared preview URL', published: true },
  { repository: 'KForge', name: 'KNOuX Forge', classification: 'CANONICAL PRODUCT', basis: 'Branded product, MIT license, verification gate, architecture and limitation documents', published: true },
  { repository: 'knoux-Repair', name: 'KNOuX Repair', classification: 'CANONICAL PRODUCT', basis: 'Branded product, VERSION file, service inventory, Windows CI gate', published: true },
  { repository: 'Knoux-SmartOrganizer', name: 'KNOuX SmartOrganizer', classification: 'CANONICAL PRODUCT', basis: 'Branded product, implemented-capability table, stated unavailable list', published: true },
  { repository: 'knoux-rec', name: 'KNOuX REC', classification: 'CANONICAL PRODUCT', basis: 'Branded product, current baseline document, hardened shell declarations', published: true },
  { repository: 'knoux-x', name: 'KNOuX Player X', classification: 'CANONICAL PRODUCT', basis: 'Branded product, MIT license, feature and stack documentation, declared preview URL', published: true },
  { repository: 'knoux_ai_clipboard_pro', name: 'KNOuX Clipboard AI', classification: 'CANONICAL PRODUCT', basis: 'Branded product, MIT license, explicit release-candidate gate record', published: true },
  { repository: 'KnouxCrypt', name: 'KNOuX Crypt', classification: 'LAB', basis: 'Branded but a design document, not a verified build', published: true },
  { repository: 'Knoux-Quill', name: 'KNOuX Quill', classification: 'LAB', basis: 'Branded writing research application, no published deployment evidence', published: true },
  { repository: 'knoux', name: 'knoux', classification: 'PLACEHOLDER', basis: 'Default AI Studio scaffold README, no product identity', published: false },
  { repository: 'knoux-security', name: 'knoux-security', classification: 'PLACEHOLDER', basis: 'Default AI Studio scaffold README, 124 KB repository, no product identity', published: false },
  { repository: 'knoux-x-Pro', name: 'knoux-x-Pro', classification: 'PLACEHOLDER', basis: 'README only, AI Studio banner, 1 KB repository', published: false },
  { repository: 'knoux-Repair-X', name: 'knoux-Repair-X', classification: 'PLACEHOLDER', basis: 'Empty repository, no README, no root contents', published: false },
  { repository: 'Knouxrec', name: 'Knouxrec', classification: 'DUPLICATE', basis: 'Overlap with knoux-rec, older push, superseded by the maintained repository', published: false },
  { repository: 'KnouxSmartOrganizer', name: 'KnouxSmartOrganizer', classification: 'DUPLICATE', basis: 'Overlap with Knoux-SmartOrganizer, older push, superseded by the maintained repository', published: false },
  { repository: 'knoux-store', name: 'knoux-store', classification: 'STORE / INFRASTRUCTURE', basis: 'This site. Infrastructure, not a catalogue item', published: false },
];

/** Research items surfaced on /labs rather than in the product universe. */
export type LabExperiment = {
  id: string;
  code: string;
  name: string;
  repository: string;
  status: EntityStatus;
  statement: string;
  evidence: string;
  stack: string;
};

export const labExperiments: readonly LabExperiment[] = [
  {
    id: 'lab-quill',
    code: 'LAB-01',
    name: 'KNOuX Quill',
    repository: 'https://github.com/daynightae-cmyk/Knoux-Quill',
    status: 'research',
    statement:
      'A Streamlit writing application routing six specialised models across fiction, courses, characters, academic prose, poetry and proofreading, with JSON templates for structured output and an Arabic and English shell.',
    evidence: 'replit.md documents the architecture, the six model roles, the template system and a Python 3.11 target.',
    stack: 'Python, Streamlit, OpenAI client, JSON templates',
  },
  {
    id: 'lab-crypt',
    code: 'LAB-02',
    name: 'KNOuX Crypt',
    repository: 'https://github.com/daynightae-cmyk/KnouxCrypt',
    status: 'research',
    statement:
      'A local encryption concept written up in Arabic, proposing offline operation, DiskCryptor or VeraCrypt integration, layered ciphers and USB-held keys. The document is a design, not a build.',
    evidence: 'README.md states intended features, stack and project structure; no release or test evidence is present.',
    stack: 'Concept document; React and Electron Builder proposed, not established',
  },
];

/** Labs are discoverable as experiments, never as released software. */
export function labEntities(): DiscoverableEntity[] {
  return labExperiments.map((experiment) => ({
    id: experiment.id,
    kind: 'experiment',
    division: 'labs',
    code: experiment.code,
    slug: experiment.id,
    name: experiment.name,
    shortName: experiment.name.replace(/^KNOuX /i, ''),
    summary: experiment.statement,
    status: experiment.status,
    route: `/labs#${experiment.id}`,
    categories: ['research', 'experiment'],
    searchTerms: [experiment.name, experiment.statement, experiment.stack],
    capabilities: [],
    relatedIds: [],
  }));
}

export function findSoftwareProduct(slug: string): SoftwareProduct | undefined {
  return softwareProducts.find((product) => product.slug === slug);
}

/** Discovery projection shared by search, the Composer and cross-navigation. */
export function softwareEntities(): DiscoverableEntity[] {
  return softwareProducts.map((product) => ({
    id: product.id,
    kind: 'product',
    division: 'software',
    code: product.code,
    slug: product.slug,
    name: product.name,
    shortName: product.shortName,
    summary: product.tagline,
    status: product.status,
    route: `/products/${product.slug}`,
    categories: [product.family, product.discipline],
    searchTerms: [...product.searchTerms, product.name, product.family, product.discipline],
    capabilities: [],
    relatedIds: product.relatedIds,
  }));
}
