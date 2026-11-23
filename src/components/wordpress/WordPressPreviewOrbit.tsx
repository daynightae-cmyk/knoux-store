'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { ComposerDocument, DEFAULT_BLOCKS, readComposerBlocks, STARTING_LAYOUT, STORAGE_KEY, type Block } from './journeys/ComposerDocument';
import s from './WordPressStudio.module.css';

export function WordPressPreviewOrbit({ onCustomize, onSwitch, primary, t }: Readonly<{
  onCustomize: () => void;
  onSwitch: (preview: 'draft' | 'starter') => void;
  primary: 'draft' | 'starter';
  t: (english: string, arabic?: string) => string;
}>) {
  const [draft, setDraft] = useState<Block[]>(DEFAULT_BLOCKS);
  const inspector = useRef<HTMLDialogElement>(null);
  const switchButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const swipeHandled = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(readComposerBlocks()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const previews = [
    { id: 'draft', label: t('Layout draft', 'مسودة التخطيط'), blocks: draft },
    { id: 'starter', label: t('Starting layout', 'التخطيط الأساسي'), blocks: STARTING_LAYOUT },
  ] as const;
  const draftHero = draft.find((block) => block.type === 'hero');

  function swap() {
    onSwitch(primary === 'draft' ? 'starter' : 'draft');
    cueAtmosphere('confirm');
  }

  function detectSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx < 45 || dx < dy * 1.3) return;
    gesture.current = null;
    swipeHandled.current = true;
    swap();
  }

  function updateAlignment(value: Block['align']) {
    if (!draftHero) return;
    const next = draft.map((block) => block.key === draftHero.key ? { ...block, align: value } : block);
    setDraft(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The editable preview continues in memory if storage is unavailable.
    }
    cueAtmosphere('settle');
  }

  return (
    <div className={s.orbitWorkspace}>
      <div className={s.orbit} data-preview-orbit
        onPointerDown={(event) => {
          if (!event.isPrimary) return;
          swipeHandled.current = false;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={detectSwipe}
        onPointerUp={(event) => {
          detectSwipe(event);
          gesture.current = null;
        }}
        onPointerCancel={() => { gesture.current = null; }}
        onClickCapture={(event) => {
          if (!swipeHandled.current) return;
          event.preventDefault();
          event.stopPropagation();
          swipeHandled.current = false;
        }}>
        <div className={s.orbitTrack} aria-hidden="true" />
        {previews.map(({ id, label, blocks }) => (
          <article key={id} className={s.orbitCard} data-orbit-preview={id} data-orbit-active={primary === id}
            aria-label={label}>
            <header>{label}</header>
            <div className={s.orbitDocument} inert={primary !== id}>
              <ComposerDocument blocks={blocks} />
            </div>
            {primary !== id && (
              <button className={s.promotePreview} type="button" onClick={() => { swap(); switchButton.current?.focus(); }}
                aria-label={`${t('Show', 'عرض')} ${label}`}>
                {t('Show', 'عرض')}
              </button>
            )}
          </article>
        ))}
      </div>
      <div className={s.orbitActions} role="group" aria-label={t('Preview controls', 'أدوات المعاينة')}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          swap();
        }}>
        <button ref={switchButton} type="button" onClick={swap} aria-label={t('Switch preview', 'تبديل المعاينة')}>↔</button>
        <span role="status">{previews.find(({ id }) => id === primary)?.label}</span>
        <button type="button" onClick={onCustomize}>{t('Open composer', 'فتح محرر الموقع')}</button>
        {primary === 'draft' && <button type="button" onClick={() => inspector.current?.showModal()}>
          {t('Inspector', 'الفاحص')}
        </button>}
      </div>
      <dialog ref={inspector} className={s.contextPanel} aria-labelledby="wordpress-preview-inspector">
        <header>
          <h3 id="wordpress-preview-inspector">{t('Inspector', 'الفاحص')}</h3>
          <button type="button" onClick={() => inspector.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        {draftHero ? (
          <label className={s.selectLabel}>
            {t('Hero alignment', 'محاذاة الواجهة')}
            <select value={draftHero.align} onChange={(event) => updateAlignment(event.target.value as Block['align'])}>
              <option value="start">{t('Start', 'بداية')}</option>
              <option value="center">{t('Center', 'وسط')}</option>
              <option value="end">{t('End', 'نهاية')}</option>
            </select>
          </label>
        ) : <p>{t('Add a Hero section in the composer to edit its alignment.', 'أضف قسم واجهة في محرر الموقع لتعديل محاذاته.')}</p>}
      </dialog>
    </div>
  );
}
