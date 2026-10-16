import test from 'node:test';
import assert from 'node:assert/strict';
import { PtyPreloadBuffer, DEFAULT_PRELOAD_LIMIT_BYTES } from '../src/lib/build/pty-preload.ts';

/**
 * Pre-render PTY output buffering — behavioural.
 *
 * The failure this guards against is quiet: the bridge sends real output, the
 * renderer is not ready, the bytes are written nowhere, and the operator sees a
 * command that appears to produce no result. That is indistinguishable from a
 * command that genuinely printed nothing, which is why it needs a test rather
 * than a code review.
 *
 * Every case runs against the real buffer. `String.length` is the trap this
 * suite is most concerned with: it counts UTF-16 code units, so a byte ceiling
 * expressed in units is not a byte ceiling, and the Arabic and emoji output
 * this workspace renders would silently overshoot it.
 */

const encoder = new TextEncoder();

test('output received before the renderer exists is preserved in order', () => {
  const buffer = new PtyPreloadBuffer(1024);
  buffer.push('PS C:\\> ');
  buffer.push('Get-ChildItem\r\n');
  buffer.push('    Directory\r\n');

  const drained = buffer.drain();
  assert.equal(
    drained.text,
    'PS C:\\> Get-ChildItem\r\n    Directory\r\n',
    'pre-render output must reach the renderer exactly as the bridge sent it',
  );
  assert.equal(drained.bytes, encoder.encode(drained.text).byteLength);
  assert.equal(drained.droppedBytes, 0);
  assert.equal(drained.droppedChunks, 0);
});

test('nothing is invented when no output was received', () => {
  const buffer = new PtyPreloadBuffer(1024);
  const drained = buffer.drain();
  assert.equal(drained.text, '', 'an empty buffer must not produce a placeholder transcript');
  assert.equal(drained.bytes, 0);
});

test('draining empties the buffer so output cannot be replayed', () => {
  const buffer = new PtyPreloadBuffer(1024);
  buffer.push('first');

  assert.equal(buffer.drain().text, 'first');
  const second = buffer.drain();
  assert.equal(second.text, '', 'a second flush must not redraw output the terminal already has');
  assert.equal(buffer.pendingChunks, 0);
  assert.equal(buffer.pendingBytes, 0);
});

test('the limit is enforced in encoded bytes, not UTF-16 code units', () => {
  // 512 bytes of budget, filled with 4-byte characters: 128 of them.
  const buffer = new PtyPreloadBuffer(512);
  const chunk = '\u{1F680}'.repeat(128); // 512 bytes, 128 code units.
  assert.ok(
    chunk.length < 512,
    'the chunk must be under the limit when counted as UTF-16 units, so only byte counting can catch it',
  );

  buffer.push(chunk);
  buffer.push('\u{1F680}'.repeat(128)); // A second 512-byte chunk must not fit.

  assert.ok(
    buffer.pendingBytes <= 512,
    `byte budget exceeded: ${buffer.pendingBytes}`,
  );
});

test('overflow drops the oldest chunks and keeps the newest output', () => {
  const buffer = new PtyPreloadBuffer(64);
  buffer.push('A'.repeat(40));
  buffer.push('B'.repeat(40));
  buffer.push('C'.repeat(40));

  const drained = buffer.drain();
  assert.ok(drained.bytes <= 64, 'the retained buffer must stay inside the budget');
  assert.ok(drained.droppedBytes > 0, 'discarded bytes must be counted, not hidden');
  // Whatever survived must be a suffix: the most recent output, in order.
  assert.ok(
    drained.text.includes('C'.repeat(40)),
    'the newest output must survive an overflow',
  );
  assert.ok(
    !drained.text.includes('A'.repeat(40)),
    'the oldest output is what an overflowing pre-render buffer gives up',
  );
});

test('a chunk larger than the whole budget is dropped whole, never truncated', () => {
  const buffer = new PtyPreloadBuffer(128);
  // An escape sequence whose meaning depends on the bytes that follow it.
  const huge = `\u001b[38;5;${'1'.repeat(64)}m${'x'.repeat(4096)}`;

  buffer.push(huge);
  const drained = buffer.drain();

  assert.equal(drained.text, '', 'a truncated escape sequence is a command the operator never typed');
  assert.equal(drained.droppedChunks, 1);
  assert.equal(drained.droppedBytes, encoder.encode(huge).byteLength);
  assert.ok(drained.bytes === 0);
});

test('reset clears output and drop counters for the next session', () => {
  const buffer = new PtyPreloadBuffer(64);
  buffer.push('A'.repeat(40));
  buffer.push('B'.repeat(40)); // Overflows, so there is something to clear.
  assert.ok(buffer.pendingChunks > 0);

  buffer.reset();

  const drained = buffer.drain();
  assert.equal(drained.text, '', 'a replaced session must not inherit earlier output');
  assert.equal(drained.droppedBytes, 0, 'drop counters belong to the session that caused them');
  assert.equal(buffer.pendingBytes, 0);
});

test('output buffered for a closed session never reaches the next terminal', () => {
  // The sequence a fast operator produces: open, receive output before xterm
  // loads, close, open again.
  const first = new PtyPreloadBuffer(1024);
  first.push('session-one-secret-token');
  first.reset(); // closeSession / onExit / unmount.

  const second = new PtyPreloadBuffer(1024);
  second.push('session-two-output');

  assert.equal(
    second.drain().text,
    'session-two-output',
    'the second session must show only its own output',
  );
  assert.ok(!second.drain().text.includes('session-one'));
});

test('multibyte output is counted and replayed without corruption', () => {
  const buffer = new PtyPreloadBuffer(4096);
  const arabic = 'مخرجاتaja';
  buffer.push(arabic);

  const drained = buffer.drain();
  assert.equal(drained.text, arabic, 'multibyte text must round-trip unchanged');
  assert.equal(
    drained.bytes,
    encoder.encode(arabic).byteLength,
    'byte accounting must reflect the real UTF-8 length',
  );
});

test('empty and non-string chunks are ignored rather than buffered', () => {
  const buffer = new PtyPreloadBuffer(1024);
  buffer.push('');
  buffer.push(undefined);
  buffer.push(null);
  buffer.push(42);

  const drained = buffer.drain();
  assert.equal(drained.text, '');
  assert.equal(drained.bytes, 0);
  assert.equal(drained.droppedChunks, 0);
});

test('rapid interleaved pushing preserves arrival order', () => {
  // The budget is sized for the whole burst, so this measures ordering rather
  // than the overflow policy — which the tests above already pin down.
  const lines = [];
  for (let i = 0; i < 200; i += 1) lines.push(`line-${String(i).padStart(3, '0')}\r\n`);
  const expected = lines.join('');
  const buffer = new PtyPreloadBuffer(encoder.encode(expected).byteLength);

  for (const line of lines) buffer.push(line);

  const drained = buffer.drain();
  assert.equal(drained.text, expected, 'every chunk must be replayed in arrival order');
  assert.equal(drained.droppedBytes, 0, 'output within budget must not be discarded');
});

test('the default budget is the documented 128 KiB', () => {
  assert.equal(DEFAULT_PRELOAD_LIMIT_BYTES, 128 * 1024);
});

test('a buffer constructed with no limit uses the default and stays bounded', () => {
  const buffer = new PtyPreloadBuffer();
  for (let i = 0; i < 400; i += 1) buffer.push('x'.repeat(2048));

  assert.ok(
    buffer.pendingBytes <= DEFAULT_PRELOAD_LIMIT_BYTES,
    `default budget exceeded: ${buffer.pendingBytes}`,
  );
});

test('a nonsensical limit is rejected at construction', () => {
  assert.throws(() => new PtyPreloadBuffer(0), RangeError);
  assert.throws(() => new PtyPreloadBuffer(-1), RangeError);
  assert.throws(() => new PtyPreloadBuffer(Number.NaN), RangeError);
});
