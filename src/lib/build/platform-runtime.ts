/**
 * One Platform — runtime truth for the constellation.
 *
 * The reference screen (NSIS 82227 / 82236) is a composition: a particle core
 * and eight glass cards. The eight cards are real navigation, but navigation is
 * only half a platform. A "Services" door that opens onto nothing is a drawing,
 * not a service.
 *
 * This module derives one measured reading per door from the canonical
 * workspace state — the same state the header, the status rail and every inner
 * surface read. It never fetches, never guesses, and never promotes an unknown
 * value to a healthy one. The vocabulary is deliberately small:
 *
 *   - `measured`      every capability the door needs is `available`;
 *   - `blocked`       a policy or this environment forbids the operation;
 *   - `unconfigured`  the workspace is readable, but something the door needs is
 *                     not set up (a credential, a runtime, an adapter);
 *   - `not-run`       the door works but the measured operation has not been
 *                     asked for in this session (for example, no preview opened);
 *   - `refused`       the deployment would not read the workspace for this
 *                     visitor — signing in is the only next step;
 *   - `unmeasured`    the reading has not arrived in this session yet.
 *
 * Presence is not readiness. A configured key is never `measured` until the
 * door's own capability is `available`, and an environment variable that exists
 * is not a working integration.
 *
 * When capabilities disagree the weakest signal wins, because a door is only
 * as usable as its most restrictive dependency:
 *
 *   refused > unmeasured > blocked > unconfigured > not-run
 *
 * `unmeasured` outranks a known absence: a request that has not returned is not
 * evidence that the thing is missing.
 */

import type {
  BuildCapability,
  CapabilityStatus,
} from './types';
import type { BuildWorkspaceState } from './workspace-state';

/** The eight doors of the reference constellation, in composition order. */
export const PLATFORM_DOORS = [
  'apps',
  'discovery',
  'routing',
  'providers',
  'docs',
  'services',
  'deployments',
  'control',
] as const;

export type PlatformDoor = (typeof PLATFORM_DOORS)[number];

export type PlatformReading =
  | 'measured'
  | 'unconfigured'
  | 'blocked'
  | 'refused'
  | 'not-run'
  | 'unmeasured';

export type PlatformService = {
  door: PlatformDoor;
  /** One word: the card's status chip. Never a sentence fragment. */
  reading: PlatformReading;
  /**
   * The measured count, `<available>/<required>`; null when the reading is an
   * access refusal or has not arrived, so a card cannot show `0/4` as if it had
   * measured four absences through a refused request.
   */
  value: string | null;
  /** The measured fact, or the exact thing that must change. */
  detail: string;
  /** The capabilities this door actually depends on. */
  requires: readonly BuildCapability[];
  /** Capabilities whose statuses produce the count. */
  measuredBy: readonly BuildCapability[];
};

/** Every door's evidence, declared once so no surface can invent its own. */
const DOORS: readonly Omit<PlatformService, 'reading' | 'value' | 'detail'>[] = [
  {
    door: 'apps',
    requires: ['project.read', 'project.files'],
    measuredBy: ['project.read', 'project.files'],
  },
  {
    door: 'discovery',
    requires: ['provider.probe'],
    measuredBy: ['provider.probe'],
  },
  {
    door: 'routing',
    requires: ['provider.execute'],
    measuredBy: ['provider.execute'],
  },
  {
    door: 'providers',
    requires: ['provider.execute', 'provider.probe'],
    measuredBy: ['provider.execute', 'provider.probe'],
  },
  {
    door: 'docs',
    requires: ['project.read', 'project.files'],
    measuredBy: ['project.read', 'project.files'],
  },
  {
    door: 'services',
    requires: ['command.allowlisted', 'test.run'],
    measuredBy: ['command.allowlisted', 'test.run'],
  },
  {
    door: 'deployments',
    requires: ['deploy.history', 'runtime.manage'],
    measuredBy: ['deploy.history', 'runtime.manage'],
  },
  {
    door: 'control',
    requires: ['diagnostics.read', 'git.read'],
    measuredBy: ['diagnostics.read', 'git.read'],
  },
];

/** Weakest-first. A door is never stronger than its most restrictive dependency. */
const PRIORITY: readonly PlatformReading[] = ['refused', 'unmeasured', 'blocked', 'unconfigured', 'not-run'];

const CAPABILITY_LABELS: Partial<Record<BuildCapability, string>> = {
  'project.read': 'project read',
  'project.files': 'file listing',
  'project.write': 'file write',
  'project.delete': 'file delete',
  'command.allowlisted': 'allowlisted commands',
  'command.arbitrary': 'arbitrary commands',
  'terminal.interactive': 'interactive terminal',
  'terminal.powershell': 'PowerShell',
  'runtime.manage': 'process supervision',
  'git.read': 'Git read',
  'git.write': 'Git write',
  'preview.live': 'live preview',
  'preview.inspect': 'preview inspection',
  'database.read': 'database read',
  'database.write': 'database write',
  'provider.execute': 'provider execution',
  'provider.probe': 'provider probing',
  'diagnostics.read': 'diagnostics',
  'test.run': 'test execution',
  'deploy.trigger': 'deployment trigger',
  'deploy.history': 'deployment history',
  'metrics.read': 'metrics',
  'fs.watch': 'filesystem watch',
};

export function capabilityLabel(capability: BuildCapability): string {
  return CAPABILITY_LABELS[capability] ?? capability;
}

function labelList(capabilities: readonly BuildCapability[]): string {
  const labels = capabilities.map(capabilityLabel);
  return labels.length <= 1 ? (labels[0] ?? 'capability') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * Aggregate per-capability statuses into one door reading. Never upgrades.
 *
 * A capability that is `unavailable` is a refusal state that has actually been
 * observed (`not-run`); a capability with no entry yet is `unmeasured`.
 */
export function aggregateReading(
  capabilities: Partial<Record<BuildCapability, CapabilityStatus>>,
  requires: readonly BuildCapability[],
  measuredBy: readonly BuildCapability[] = requires,
): { reading: PlatformReading; available: number; total: number } {
  const signals = new Set<PlatformReading>();
  let available = 0;
  let total = 0;

  for (const capability of requires) {
    total += 1;
    const status = capabilities[capability] ?? 'unknown';
    if (measuredBy.includes(capability) && status === 'available') available += 1;

    if (status === 'available') signals.add('measured');
    else if (status === 'unknown') signals.add('unmeasured');
    else if (status === 'blocked') signals.add('blocked');
    else if (status === 'unconfigured') signals.add('unconfigured');
    else signals.add('not-run'); // 'unavailable'
  }

  const reading = PRIORITY.find((candidate) => signals.has(candidate)) ?? (total === 0 ? 'unmeasured' : 'measured');
  return { reading, available, total };
}

function doorDetail(
  base: (typeof DOORS)[number],
  capabilities: Partial<Record<BuildCapability, CapabilityStatus>>,
  blockers: Partial<Record<BuildCapability, string>>,
  reading: PlatformReading,
): string {
  switch (reading) {
    case 'refused':
      return 'Sign in with a KNOuX Build account to read the workspace. Nothing is inferred while the reading is withheld.';
    case 'unmeasured':
      return 'The workspace reading has not arrived in this session yet. This card shows no assumed value.';
    case 'measured':
      // State exactly what the capability reading means, never "online" or "ready".
      return `Measured: ${labelList(base.measuredBy)} are available in this environment. This is a capability report, not a successful run.`;
    case 'blocked':
    case 'unconfigured':
    case 'not-run': {
      const missing = base.requires.filter((capability) => capabilities[capability] !== 'available');
      const primary = missing.find((capability) => (capabilities[capability] ?? 'unknown') === reading) ?? missing[0];
      if (!primary) return 'One required capability is not available in this environment.';
      const reason = blockers[primary] ?? 'No measured reason was reported.';
      return `${capabilityLabel(primary)}: ${reason}`;
    }
  }
}

/** Derive one reading per door; the composition renders in `PLATFORM_DOORS` order. */
export function platformRuntime(state: BuildWorkspaceState): readonly PlatformService[] {
  // A refusal of the workspace read is not a set of five missing capabilities.
  // Until the request is answered, no door may report a count at all.
  const refused = state.access === 'refused';
  const pending = state.access === 'unknown' && state.status !== 'ready' && state.status !== 'error';

  return DOORS.map((base) => {
    if (refused) {
      return {
        ...base,
        reading: 'refused' as const,
        value: null,
        detail: doorDetail(base, {}, {}, 'refused'),
      };
    }
    if (pending) {
      return {
        ...base,
        reading: 'unmeasured' as const,
        value: null,
        detail: doorDetail(base, {}, {}, 'unmeasured'),
      };
    }

    const summary = aggregateReading(state.adapter.capabilities, base.requires, base.measuredBy);
    return {
      ...base,
      reading: summary.reading,
      value: summary.reading === 'unmeasured' ? null : `${summary.available}/${summary.total}`,
      detail: doorDetail(base, state.adapter.capabilities, state.adapter.blockers, summary.reading),
    };
  });
}

/** Labels are the operator's words, not the adapter's enum. */
export function platformReadingLabel(reading: PlatformReading): string {
  return reading === 'not-run' ? 'NOT RUN' : reading.toUpperCase();
}

/** True only when every door was measured and every dependency is available. */
export function platformFullyMeasured(services: readonly PlatformService[]): boolean {
  return services.every((service) => service.reading === 'measured');
}