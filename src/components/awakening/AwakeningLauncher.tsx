'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AWAKENING_EVENT, AWAKENING_QUERY } from '@/lib/awakening/machine';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import { ForgeSentinel } from './ForgeSentinel';
import './knoux-awakening-trigger.css';

type LauncherVariant = 'hero' | 'header' | 'menu';

/**
 * Activation controls.
 *
 * The hero dock is the discoverable, tactile entry point; the header key is the
 * persistent one. Both dispatch the same custom event, so there is exactly one
 * owner of the stage. On every other route the header key routes to
 * `/?awaken=1`, and the homepage stage consumes and cleans that parameter once.
 *
 * `K` is a real shortcut only on the homepage, never while an input, dialog or
 * the stage itself has focus. The button remains the keyboard-accessible path
 * everywhere.
 */
export function AwakeningLauncher({
  variant = 'hero',
  onActivate,
}: {
  variant?: LauncherVariant;
  onActivate?: () => void;
}) {
  const language = useSiteLanguage();
  const t = (text: string) => translatedSiteCopy(text, language);
  const pathname = usePathname();
  const router = useRouter();

  const activate = useCallback(() => {
    onActivate?.();
    if (pathname !== '/') {
      router.push(`/?${AWAKENING_QUERY}=1`);
      return;
    }
    window.dispatchEvent(new CustomEvent(AWAKENING_EVENT, { detail: { source: variant } }));
  }, [onActivate, pathname, router, variant]);

  useEffect(() => {
    if (variant !== 'header' || pathname !== '/') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.documentElement.dataset.awakening === 'open') return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      activate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activate, pathname, variant]);

  if (variant === 'header') {
    return (
      <button
        type="button"
        className="awakening-header"
        onClick={activate}
        aria-label={t('Activate the KNOuX awakening')}
      >
        <span className="awakening-header__key" aria-hidden="true">
          K
        </span>
        <span className="awakening-header__label">{t('AWAKEN')}</span>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button type="button" className="awakening-menu" onClick={activate}>
        <span>00</span>
        {t('The Awakening')}
        <span aria-hidden="true">K ↗</span>
      </button>
    );
  }

  return (
    <div className="awakening-dock">
      <span className="awakening-dock__orbit" aria-hidden="true" />
      <span className="awakening-dock__figure">
        <ForgeSentinel phase="idle" />
      </span>
      <button
        type="button"
        className="awakening-key"
        onClick={activate}
        aria-label={t('Activate the KNOuX awakening')}
      >
        <span className="awakening-key__halo" aria-hidden="true" />
        <span className="awakening-key__rim" aria-hidden="true" />
        <span className="awakening-key__surface">
          <span className="awakening-key__cursor" aria-hidden="true">
            ↖
          </span>
          <span className="awakening-key__legend" aria-hidden="true">
            K
          </span>
          <span className="awakening-key__sub" aria-hidden="true">
            {t('AWAKEN')}
          </span>
        </span>
      </button>
      <span className="awakening-dock__copy">
        <span className="awakening-dock__eyebrow">
          <span className="awakening-dock__dot" aria-hidden="true" />
          {t('Sentinel access')}
        </span>
        <strong>{t('The Awakening')}</strong>
        <span className="awakening-dock__hint">
          {t('Click to play')} <span aria-hidden="true">·</span> {t('Press K')}
        </span>
      </span>
    </div>
  );
}
