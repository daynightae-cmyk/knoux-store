// Sphinx Code — story mode.
//
// A passive hero state: the instrument walks itself through the sixteen
// positions, A to P, dwelling on each long enough to be read. Any interaction
// pauses the walk; after a period of stillness it resumes from where it left.
//
// Enabled with ?story=1, or toggled from the STORY chip in standalone mode.

const DWELL = 7.2;        // seconds held on each position
const RESUME_AFTER = 11;  // seconds of stillness before the walk resumes

export class StoryMode {
  constructor(letters, onSelect, onClear) {
    this.letters = letters;
    this.onSelect = onSelect;
    this.onClear = onClear;

    this.enabled = false;   // is story mode switched on at all
    this.running = false;   // is the walk currently advancing
    this.index = -1;
    this.timer = 0;
    this.pausedAt = 0;
    this.progress = 0;

    this._buildUI();
  }

  _buildUI() {
    const bar = document.createElement('div');
    bar.id = 'sc-story-bar';
    bar.innerHTML = `
      <div class="sc-story-track"><div class="sc-story-fill"></div></div>
      <div class="sc-story-meta">
        <span class="sc-story-state">Sequence</span>
        <span class="sc-story-count">&mdash;</span>
      </div>
    `;
    document.body.appendChild(bar);
    this.bar = bar;
    this.fill = bar.querySelector('.sc-story-fill');
    this.state = bar.querySelector('.sc-story-state');
    this.count = bar.querySelector('.sc-story-count');

    const chip = document.createElement('button');
    chip.id = 'sc-story-chip';
    chip.type = 'button';
    chip.innerHTML = `<span class="sc-chip-dot"></span><span class="sc-chip-text">Story</span>`;
    chip.addEventListener('click', () => this.toggle());
    document.body.appendChild(chip);
    this.chip = chip;
  }

  showChip(v) {
    this.chip.style.display = v ? '' : 'none';
  }

  toggle() {
    this.enabled ? this.stop() : this.start();
    return this.enabled;
  }

  start(fromIndex) {
    this.enabled = true;
    this.running = true;
    this.index = typeof fromIndex === 'number' ? fromIndex - 1 : this.index;
    this.timer = DWELL; // advance immediately on the next update
    this.bar.classList.add('is-on');
    this.chip.classList.add('is-on');
  }

  stop() {
    this.enabled = false;
    this.running = false;
    this.progress = 0;
    this.bar.classList.remove('is-on', 'is-paused');
    this.chip.classList.remove('is-on');
    this.fill.style.transform = 'scaleX(0)';
    if (this.onClear) this.onClear();
  }

  // Called whenever the visitor touches anything.
  interrupt(letterIndex) {
    if (!this.enabled) return;
    this.running = false;
    this.pausedAt = 0;
    this.bar.classList.add('is-paused');
    this.state.textContent = 'Paused';
    if (typeof letterIndex === 'number' && letterIndex >= 0) this.index = letterIndex;
  }

  // Returns { pos: 1-8, total: 8, pyramid: 'Incarnation' | 'Soul' } for the
  // current index, so the counter can read "04 / 08 · Incarnation".
  _pyramidPos() {
    const i = this.index < 0 ? 0 : this.index;
    const half = Math.floor(this.letters.length / 2); // 8
    const inSoul = i >= half;
    return {
      pos: inSoul ? i - half + 1 : i + 1,
      total: half,
      pyramid: inSoul ? 'Soul' : 'Incarnation',
    };
  }

  update(dt, idleSince) {
    if (!this.enabled) return;

    if (!this.running) {
      // Resume only after genuine stillness.
      if (idleSince > RESUME_AFTER) {
        this.running = true;
        this.timer = DWELL * 0.55;
        this.bar.classList.remove('is-paused');
      } else {
        const p = Math.min(idleSince / RESUME_AFTER, 1);
        this.fill.style.transform = `scaleX(${p})`;
        this.count.textContent = 'Resuming…';
        return;
      }
    }

    this.timer += dt;
    if (this.timer >= DWELL) {
      this.timer = 0;
      const prevLetter = this.index >= 0 ? this.letters[this.index] : null;
      this.index = (this.index + 1) % this.letters.length;
      const nextLetter = this.letters[this.index];

      // Mark the crossing between the two pyramids (H -> I, and the P -> A
      // wrap back into Incarnation) so the walk reads as two movements.
      if (this.onCross) this.onCross(prevLetter, nextLetter);

      this.onSelect(nextLetter, this.index);
    }

    this.progress = this.timer / DWELL;
    this.fill.style.transform = `scaleX(${this.progress})`;

    // Counter: "04 / 08 · Incarnation" — two movements of eight.
    const { pos, total, pyramid } = this._pyramidPos();
    this.state.textContent = pyramid + ' Pyramid';
    this.count.textContent =
      String(pos).padStart(2, '0') + '\u202F/\u202F' + String(total).padStart(2, '0');
  }
}
