'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { compileBuildIntent } from '@/lib/build/intent';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';

/**
 * Entry gate.
 *
 * Mechanics only — a full-screen overlay, a staged reveal, an input that
 * appears after the opening beat, Enter to confirm, and a graceful transition
 * out. The subject matter is KNOuX: no globe, no climate, no narrative.
 *
 * The gate never calls a provider. It trims the sentence and hands it to the
 * deterministic intent compiler, which is the same function the workspace
 * composer uses.
 */

const STORAGE_KEY = 'knoux-dev-entry-intent';
const REPLAY_PARAM = 'intro';

export function BuildEntryGate() {
  const { dispatch } = useBuildWorkspace();
  const [phase, setPhase] = useState<'closed' | 'open' | 'leaving'>('closed');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const gateClosed = phase === 'closed';

  const openGate = useCallback(() => {
    setValue('');
    setPhase('open');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const replay = params.get(REPLAY_PARAM) === '1';

    if (replay) {
      window.setTimeout(openGate, 0);
      return;
    }

    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    if (stored && stored.trim()) {
      // A prior session in this tab already answered the gate. Rehydrate the
      // compiled intent rather than asking again.
      dispatch({ type: 'intent/compiled', intent: compileBuildIntent(stored) });
      return;
    }

    window.setTimeout(openGate, 0);
  }, [dispatch, openGate]);

  // The field only accepts pointer and keyboard input once the reveal has run.
  useEffect(() => {
    if (phase !== 'open') return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (gateClosed) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let child: HTMLElement = dialog;
    while (child.parentElement) {
      for (const sibling of Array.from(child.parentElement.children)) {
        if (sibling !== child && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      child = child.parentElement;
      if (child === document.body) break;
    }
    return () => {
      for (const sibling of siblings) sibling.element.inert = sibling.inert;
      if (previous?.isConnected && previous !== document.body) previous.focus();
      else document.getElementById('dev-intent-input')?.focus();
    };
  }, [gateClosed]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = window.setTimeout(() => setPhase('closed'), 420);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const confirm = useCallback(
    (raw: string) => {
      const intent = raw.trim();
      if (!intent) {
        inputRef.current?.focus();
        return;
      }
      try {
        window.sessionStorage.setItem(STORAGE_KEY, intent);
      } catch {
        // A blocked storage API must not block entry; the intent still compiles.
      }
      dispatch({ type: 'intent/compiled', intent: compileBuildIntent(intent) });
      setPhase('leaving');
    },
    [dispatch]
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      confirm(value);
    },
    [confirm, value]
  );

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // Escape must never dismiss a required intent. Only the pointer or Enter
    // can leave the gate.
    if (event.key === 'Escape') event.preventDefault();
    if (event.key === 'Tab') {
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? []);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
    }
  }, []);

  if (phase === 'closed') return null;

  const settled = phase === 'leaving';

  return (
    <div
      className="dev-entry"
      ref={dialogRef}
      data-leaving={settled}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-entry-title"
      aria-describedby="dev-entry-lede"
    >
      <div className="dev-entry__beat" aria-hidden="true" />

      <div className="dev-entry__centre">
        <p className="dev-entry__eyebrow">KNOuX DEV / DIGITAL HEADQUARTERS</p>
        <h2 id="dev-entry-title">What are you here to build?</h2>
        <p className="dev-entry__lede" id="dev-entry-lede">
          Describe the product, system, automation, service, or experience you want to create.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="dev-entry-input">Your intent</label>
          <div className="dev-entry__field">
            <input
              id="dev-entry-input"
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Describe your intent…"
              autoComplete="off"
              spellCheck={false}
              tabIndex={settled ? -1 : 0}
              disabled={settled}
            />
            <button type="submit" className="dev-btn dev-btn--primary" disabled={settled} aria-disabled={settled || !value.trim()}>
              Enter workspace
            </button>
          </div>
        </form>
      </div>

      <p className="dev-entry__foot">
        <span>KN / DEV — 001</span>
        <span>CREATE. RUN. PREVIEW. DEPLOY.</span>
      </p>
    </div>
  );
}

/** Clears the remembered intent and reopens the gate. */
export function replayEntryGate() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  const url = new URL(window.location.href);
  url.searchParams.set(REPLAY_PARAM, '1');
  window.location.assign(url.toString());
}
