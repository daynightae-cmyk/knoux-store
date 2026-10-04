// Pyramid transition marker.
//
// The sixteen positions are two distinct movements: the Incarnation Pyramid
// (A–H, what was inherited and conditioned) and the Soul Pyramid (I–P, what
// is evolved and transformed). When story mode walks across the boundary at
// H -> I, we mark the crossing so the two halves read as separate arcs of the
// blueprint rather than one continuous list of sixteen items.

const COPY = {
  toSoul: { from: 'Movement I\u2002·\u2002Incarnation Pyramid', to: 'Movement II\u2002·\u2002Soul Pyramid' },
  toInc:  { from: 'Movement II\u2002·\u2002Soul Pyramid',        to: 'Movement I\u2002·\u2002Incarnation Pyramid' },
};

export class PyramidMarker {
  constructor() {
    const el = document.createElement('div');
    el.id = 'sc-pyr-marker';
    el.innerHTML = `
      <div class="sc-pyr-from"></div>
      <div class="sc-pyr-arrow"></div>
      <div class="sc-pyr-glyph"></div>
      <div class="sc-pyr-to"></div>
    `;
    document.body.appendChild(el);

    this.el = el;
    this.from = el.querySelector('.sc-pyr-from');
    this.to = el.querySelector('.sc-pyr-to');
    this.glyph = el.querySelector('.sc-pyr-glyph');
    this.timer = null;
  }

  // dir: 'toSoul' flips the glyph to point up (ascending), 'toInc' points down.
  show(dir) {
    const copy = COPY[dir] || COPY.toSoul;
    this.from.textContent = copy.from;
    this.to.textContent = copy.to;

    // The glyph mirrors the pyramid being entered: Soul ascends, Incarnation
    // descends. A CSS triangle built from borders, rotated to suit.
    this.glyph.style.transform = dir === 'toSoul' ? 'rotate(0deg)' : 'rotate(180deg)';

    // Restart the animation cleanly if one is already running.
    this.el.classList.remove('is-on');
    void this.el.offsetWidth;
    this.el.classList.add('is-on');

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('is-on'), 3500);
  }

  hide() {
    clearTimeout(this.timer);
    this.el.classList.remove('is-on');
  }

  setVisible(v) {
    this.el.style.display = v ? '' : 'none';
  }
}

// Which pyramid a letter belongs to.
export function pyramidOf(letter) {
  return letter >= 'I' ? 'soul' : 'incarnation';
}

// Returns a direction key when the step crosses the boundary, else null.
export function crossingDirection(prevLetter, nextLetter) {
  if (!prevLetter || !nextLetter) return null;
  const a = pyramidOf(prevLetter);
  const b = pyramidOf(nextLetter);
  if (a === b) return null;
  return b === 'soul' ? 'toSoul' : 'toInc';
}
