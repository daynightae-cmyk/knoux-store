export function createUI(steps, config, state, handlers) {
  const el = {
    hero: document.getElementById('handoff-hero'),
    card: document.getElementById('hf-card'),
    icon: document.getElementById('hf-icon'),
    team: document.getElementById('hf-team'),
    stageLabel: document.getElementById('hf-stage-label'),
    index: document.getElementById('hf-index'),
    title: document.getElementById('hf-title'),
    body: document.getElementById('hf-body'),
    handoff: document.getElementById('hf-handoff'),
    handoffValue: document.getElementById('hf-handoff-value'),
    counter: document.getElementById('hf-counter'),
    list: document.getElementById('hf-steps'),
    prev: document.getElementById('hf-prev'),
    next: document.getElementById('hf-next'),
    auto: document.getElementById('hf-autoplay'),
    autoGlyph: document.getElementById('hf-autoplay-glyph'),
    hint: document.getElementById('hf-hint')
  };

  const pad = (n) => String(n + 1).padStart(2, '0');
  let timer = null;
  let locked = false;

  steps.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'hf-step';
    li.dataset.index = String(i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hf-step-btn';
    btn.setAttribute('aria-label', `Stage ${i + 1}: ${s.team}`);
    btn.innerHTML = `<span class="hf-step-num">${pad(i)}</span><span class="hf-step-name">${s.team}</span>`;
    btn.addEventListener('click', () => goTo(i));
    li.appendChild(btn);
    el.list.appendChild(li);
  });

  function paint(i) {
    const s = steps[i];
    el.icon.textContent = s.icon || '◆';
    el.team.textContent = s.team;
    el.stageLabel.textContent = `Stage ${pad(i)}`;
    el.index.textContent = pad(i);
    el.title.textContent = s.title;
    el.body.textContent = s.body;
    el.counter.textContent = `${pad(i)} / ${pad(steps.length - 1)}`;

    const last = i === steps.length - 1;
    el.handoff.classList.toggle('is-final', last);
    el.handoffValue.textContent = last
      ? `${s.team} → ${config.finalLabel}`
      : `${s.team} → ${steps[i + 1].team}`;

    [...el.list.children].forEach((li, k) => {
      li.classList.toggle('is-active', k === i);
      li.classList.toggle('is-done', k < i);
      li.querySelector('button').setAttribute('aria-current', k === i ? 'step' : 'false');
    });

    el.prev.disabled = i === 0;
    el.next.disabled = i === steps.length - 1 && !config.loop;
  }

  function render(i) { paint(i); }

  function goTo(next, viaAuto) {
    if (locked) return;
    next = Math.max(0, Math.min(steps.length - 1, next));
    if (next === state.index) return;
    const prev = state.index;
    state.index = next;
    locked = true;

    el.card.classList.add('is-out');
    handlers.onChange(next, prev);

    const delay = state.reduced ? 120 : 380;
    setTimeout(() => {
      paint(next);
      el.card.classList.remove('is-out');
      locked = false;
    }, delay);

    if (!viaAuto) restartTimer();
    el.hint.classList.add('is-hidden');
  }

  function step(dir) { 
    let n = state.index + dir;
    if (n >= steps.length) n = config.loop ? 0 : steps.length - 1;
    if (n < 0) n = 0;
    goTo(n, true);
  }

  function restartTimer() {
    if (!state.autoplay) return;
    clearInterval(timer);
    timer = setInterval(() => step(1), config.autoplayDelay);
  }

  function setAutoplay(on) {
    state.autoplay = on;
    el.auto.setAttribute('aria-pressed', String(on));
    el.autoGlyph.textContent = on ? '❚❚' : '▶';
    clearInterval(timer);
    if (on) timer = setInterval(() => step(1), config.autoplayDelay);
  }

  el.prev.addEventListener('click', () => goTo(state.index - 1));
  el.next.addEventListener('click', () => {
    const n = state.index + 1;
    goTo(n >= steps.length && config.loop ? 0 : n);
  });
  el.auto.addEventListener('click', () => setAutoplay(!state.autoplay));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(state.index + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(state.index - 1); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(steps.length - 1); }
  });

  if (config.scrollNav) {
    let wheelLock = 0;
    el.hero.addEventListener('wheel', (e) => {
      const t = performance.now();
      if (t - wheelLock < 700) { e.preventDefault(); return; }
      if (Math.abs(e.deltaY) < 12) return;
      const atStart = state.index === 0 && e.deltaY < 0;
      const atEnd = state.index === steps.length - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      wheelLock = t;
      goTo(state.index + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    let touchY = null;
    el.hero.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
    el.hero.addEventListener('touchend', (e) => {
      if (touchY === null) return;
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) goTo(state.index + (dy > 0 ? 1 : -1));
      touchY = null;
    }, { passive: true });
  }

  el.hero.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const n = state.index + 1;
    goTo(n >= steps.length && config.loop ? 0 : n);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else restartTimer();
  });

  if (config.autoplay && !state.reduced) setAutoplay(true);

  return { render, goTo };
}