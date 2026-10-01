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

