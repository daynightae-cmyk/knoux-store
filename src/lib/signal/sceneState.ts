export type SignalPhase =
  | 'idle'
  | 'input'
  | 'validating'
  | 'ready'
  | 'submitting'
  | 'searching'
  | 'resolving'
  | 'partial'
  | 'result'
  | 'not_found'
  | 'opted_out'
  | 'rate_limited'
  | 'error'
  | 'resetting';

export type SignalVisualMode =
  | 'idle'
  | 'input'
  | 'ready'
  | 'searching'
  | 'resolved'
  | 'sparse';

export type LookupOutcome =
  | { kind: 'result' }
  | { kind: 'partial'; failedStages: string[] }
  | { kind: 'not_found' }
  | { kind: 'opted_out' }
  | { kind: 'rate_limited' }
  | { kind: 'error'; message: string };

export function visualModeForPhase(phase: SignalPhase): SignalVisualMode {
  switch (phase) {
    case 'ready':
      return 'ready';
    case 'input':
    case 'validating':
      return 'input';
    case 'submitting':
    case 'searching':
      return 'searching';
    case 'resolving':
    case 'partial':
    case 'result':
      return 'resolved';
    case 'not_found':
      return 'sparse';
    default:
      return 'idle';
  }
}

export function phaseStatusCopy(phase: SignalPhase): string {
  switch (phase) {
    case 'ready': return 'NUMBER READY';
    case 'submitting':
    case 'searching': return 'RESOLVING EVIDENCE';
    case 'resolving': return 'SETTLING EVIDENCE';
    case 'partial': return 'PARTIAL EVIDENCE';
    case 'result': return 'EVIDENCE RESOLVED';
    case 'not_found': return 'NO SUPPORTED EVIDENCE';
    case 'opted_out': return 'COMMUNITY EVIDENCE OPTED OUT';
    case 'rate_limited': return 'RATE LIMITED';
    case 'error': return 'LOOKUP INTERRUPTED';
    case 'resetting': return 'RELEASING FIELD';
    case 'validating':
    case 'input': return 'LISTENING';
    default: return 'LISTENING';
  }
}

const ALLOWED: Record<SignalPhase, readonly SignalPhase[]> = {
  idle: ['input', 'ready', 'resetting'],
  input: ['idle', 'validating', 'ready', 'submitting'],
  validating: ['input', 'ready'],
  ready: ['input', 'submitting', 'searching', 'resetting'],
  submitting: ['searching', 'rate_limited', 'error'],
  searching: ['resolving', 'partial', 'result', 'not_found', 'opted_out', 'rate_limited', 'error'],
  resolving: ['partial', 'result', 'not_found', 'error'],
  partial: ['resetting', 'input', 'ready'],
  result: ['resetting', 'input', 'ready'],
  not_found: ['resetting', 'input', 'ready'],
  opted_out: ['resetting', 'input', 'ready'],
  rate_limited: ['resetting', 'input', 'ready', 'submitting', 'searching'],
  error: ['resetting', 'input', 'ready', 'submitting', 'searching'],
  resetting: ['idle', 'input', 'ready'],
};

export function canTransition(from: SignalPhase, to: SignalPhase): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}
