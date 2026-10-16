/**
 * Pre-render PTY output buffer.
 *
 * The terminal renderer is loaded on demand, so genuine bridge output can
 * arrive between a session going live and xterm being ready to draw. Writing
 * into a renderer that does not exist yet would drop those bytes: the command
 * ran, the bridge sent its real output, and the operator never sees it. This
 * buffer holds that output until the renderer can take it.
 *
 * Three properties are the reason this is a module rather than an inline array,
 * and each is testable on its own:
 *
 *  - **Bounded, by encoded bytes rather than characters.** `String.length`
 *    counts UTF-16 code units, so a run of astral-plane characters — or any
 *    non-Latin text, which this workspace serves in Arabic — reports far fewer
 *    units than the bytes actually held. Counting units would let the real
 *    allocation grow well past the intended ceiling. Bytes are counted with
 *    `TextEncoder`, which is what `Buffer.byteLength` does for UTF-8.
 *
 *  - **Lossy at the front, in order.** Terminal scrollback already discards the
 *    oldest rows once it is full, and a half-written escape sequence at the
 *    front is more harmful than a missing one: xterm would act on it. So the
 *    oldest complete chunks are dropped first, and a chunk that is on its own
 *    larger than the whole budget is dropped entirely rather than truncated,
 *    because a truncated escape sequence is a command the operator never typed.
 *    Nothing is ever invented, reordered or synthesised.
 *
 *  - **Scoped to one session.** `reset()` drops the buffer, so output buffered
 *    for a session that has been closed or replaced can never be flushed into
 *    the next session's terminal.
 *
 * Bytes are counted per chunk and the total is tracked incrementally, so the
 * cost of appending is proportional to the chunk rather than to the buffer.
 */

/** Bytes retained before the oldest chunks are dropped. */
export const DEFAULT_PRELOAD_LIMIT_BYTES = 128 * 1024;

export interface PtyPreloadSnapshot {
  /** Buffered text, in arrival order, ready to hand to a renderer. */
  text: string;
  /** Bytes currently held. */
  bytes: number;
  /** Total bytes discarded since the last `reset`, oldest first. */
  droppedBytes: number;
  /** Chunks discarded since the last `reset`. */
  droppedChunks: number;
}

export class PtyPreloadBuffer {
  private readonly encoder = new TextEncoder();
  private readonly limitBytes: number;
  private chunks: string[] = [];
  private bytes = 0;
  private droppedBytes = 0;
  private droppedChunks = 0;

  constructor(limitBytes: number = DEFAULT_PRELOAD_LIMIT_BYTES) {
    if (!Number.isFinite(limitBytes) || limitBytes <= 0) {
      throw new RangeError('The preload limit must be a positive number of bytes.');
    }
    this.limitBytes = limitBytes;
  }

  get pendingBytes(): number {
    return this.bytes;
  }

  get pendingChunks(): number {
    return this.chunks.length;
  }

  /**
   * Buffer one chunk of real bridge output.
   *
   * Returns nothing: whether the chunk was kept or dropped is reported by the
   * snapshot, so a caller cannot mistake a drop for a successful write.
   */
  push(chunk: string): void {
    if (typeof chunk !== 'string' || chunk.length === 0) return;

    const size = this.encoder.encode(chunk).byteLength;

    // A single chunk larger than the entire budget cannot be kept whole, and a
    // truncated one would end mid-escape-sequence. Dropping it loses bytes that
    // the bridge has already counted as delivered, which the drop counters
    // record rather than hiding.
    if (size > this.limitBytes) {
      this.droppedBytes += size;
      this.droppedChunks += 1;
      return;
    }

    this.chunks.push(chunk);
    this.bytes += size;

    // Drop from the front, whole chunks only, until inside the budget.
    while (this.bytes > this.limitBytes && this.chunks.length > 0) {
      const oldest = this.chunks.shift();
      if (oldest === undefined) break;
      const oldestSize = this.encoder.encode(oldest).byteLength;
      this.bytes -= oldestSize;
      this.droppedBytes += oldestSize;
      this.droppedChunks += 1;
    }
  }

  /**
   * Take everything buffered, leaving the buffer empty.
   *
   * Draining rather than reading is what makes a double flush impossible: the
   * second call returns an empty string instead of replaying the same output
   * into a renderer that has already drawn it.
   */
  drain(): PtyPreloadSnapshot {
    const text = this.chunks.length > 0 ? this.chunks.join('') : '';
    const snapshot: PtyPreloadSnapshot = {
      text,
      bytes: this.bytes,
      droppedBytes: this.droppedBytes,
      droppedChunks: this.droppedChunks,
    };
    this.chunks = [];
    this.bytes = 0;
    this.droppedBytes = 0;
    this.droppedChunks = 0;
    return snapshot;
  }

  /**
   * Drop everything, including the drop counters.
   *
   * Called when a session ends, is replaced, or the component unmounts. After
   * this the buffer is indistinguishable from a newly constructed one, so no
   * earlier session's output can reach a later terminal.
   */
  reset(): void {
    this.chunks = [];
    this.bytes = 0;
    this.droppedBytes = 0;
    this.droppedChunks = 0;
  }
}
