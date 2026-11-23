'use client';

/**
 * 07 · Visual Website Composer — reference 83375, rendered as a real tool.
 *
 * A working block composer: a palette of section types, an ordered layer
 * list, a live preview that renders exactly the composed blocks, and an
 * inspector whose alignment and spacing controls actually change the
 * preview. The draft lives in this tab; "request this layout" composes the
 * block list into a real contact request. There is no publish button that
 * pretends — publishing happens in the real build after scope is agreed.
 */
import { useEffect, useState } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { BLOCK_TYPES, DEFAULT_BLOCKS, STORAGE_KEY, ComposerDocument, readComposerBlocks, label, type Block, type BlockType } from './ComposerDocument';
import s from './journeys.module.css';

let blockKey = 100;

export function VisualComposer() {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_BLOCKS);
  const [selectedKey, setSelectedKey] = useState<number>(DEFAULT_BLOCKS[0].key);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const restored = readComposerBlocks();
      blockKey = Math.max(blockKey, ...restored.map((block) => block.key)) + 1;
      setBlocks(restored);
      setSelectedKey(restored[0]?.key ?? 0);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  function commit(next: Block[], cue: 'settle' | 'confirm' | 'success' = 'settle') {
    cueAtmosphere(cue);
    setBlocks(next);
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* memory-only draft */ }
  }

  function addBlock(type: BlockType) {
    const block: Block = { key: blockKey++, type, align: 'center', gap: 16 };
    commit([...blocks, block], 'confirm');
    setSelectedKey(block.key);
  }

  function removeBlock(key: number) {
    const next = blocks.filter((block) => block.key !== key);
    commit(next, 'confirm');
    if (selectedKey === key) setSelectedKey(next[0]?.key ?? 0);
  }

  function moveBlock(key: number, delta: -1 | 1) {
    const index = blocks.findIndex((block) => block.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next, 'settle');
  }

  function patchSelected(part: Partial<Block>) {
    commit(blocks.map((block) => (block.key === selectedKey ? { ...block, ...part } : block)));
  }

  const selected = blocks.find((block) => block.key === selectedKey) ?? null;
  const requestHref = `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: `Composed layout draft: ${blocks.map((block, index) => `${index + 1}. ${block.type} (${block.align}, gap ${block.gap}px)`).join('; ') || 'empty'}; visual composer draft, scope to be agreed`,
  }).toString()}`;

  return (
    <section className={s.composerJourney} aria-label={t('Visual Website Composer')}>
      <div className={s.composerPalette}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Components', 'المكوّنات')}</h3>
          <div className={s.paletteGrid} role="group" aria-label={t('Add a section')}>
            {BLOCK_TYPES.map((type) => (
              <button key={type.id} type="button" className={s.paletteItem} onClick={() => addBlock(type.id)}>
                <span aria-hidden="true">＋</span>{t(type.en, type.ar)}
              </button>
            ))}
          </div>
        </div>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Layers', 'الطبقات')}</h3>
          {blocks.length ? (
            <ol className={s.layerList}>
              {blocks.map((block, index) => (
                <li key={block.key}>
                  <button type="button" className={s.layerRow} aria-pressed={selectedKey === block.key}
                    onClick={() => { if (selectedKey !== block.key) cueAtmosphere('settle'); setSelectedKey(block.key); }}>
                    <span className={s.serviceCode}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={s.serviceName}>{label(block.type, t)}</span>
                  </button>
                  <span className={s.layerTools}>
                    <button type="button" aria-label={t('Move up')} disabled={index === 0} onClick={() => moveBlock(block.key, -1)}>↑</button>
                    <button type="button" aria-label={t('Move down')} disabled={index === blocks.length - 1} onClick={() => moveBlock(block.key, 1)}>↓</button>
                    <button type="button" aria-label={t('Remove section')} onClick={() => removeBlock(block.key)}>✕</button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={s.empty} role="status">{t('The canvas is empty. Add a section from the palette.', 'اللوحة فارغة. أضف قسماً من المكوّنات.')}</p>
          )}
        </div>
      </div>

      <div className={s.composerCanvas} aria-label={t('Composed preview')} aria-live="polite">
        <div className={s.frameChrome} aria-hidden="true"><i /><i /><i /><span>{t('Layout draft', 'مسودة التخطيط')} · {blocks.length} {t('sections', 'أقسام')}</span></div>
        <ComposerDocument blocks={blocks} selectedKey={selectedKey} onSelect={(key) => {
          if (selectedKey !== key) cueAtmosphere('settle');
          setSelectedKey(key);
        }} />
      </div>

      <aside className={`${s.panel} ${s.composerInspector}`} aria-label={t('Section inspector')}>
        <h3 className={s.panelTitle}>{t('Inspector', 'الفاحص')}</h3>
        {selected ? (
          <>
            <p className={s.empty}><b>{label(selected.type, t)}</b></p>
            <span className={s.fieldLabel}>{t('Alignment', 'المحاذاة')}</span>
            <div className={s.segmented} role="group" aria-label={t('Alignment')}>
              {(['start', 'center', 'end'] as const).map((align) => (
                <button key={align} type="button" aria-pressed={selected.align === align} onClick={() => patchSelected({ align })}>
                  {t(align === 'start' ? 'Start' : align === 'end' ? 'End' : 'Center', align === 'start' ? 'بداية' : align === 'end' ? 'نهاية' : 'وسط')}
                </button>
              ))}
            </div>
            <label className={s.scaleRow} htmlFor="composer-gap">
              <span>{t('Gap', 'التباعد')}</span>
              <output htmlFor="composer-gap">{selected.gap}px</output>
            </label>
            <input id="composer-gap" className={s.scaleSlider} type="range" min={4} max={48} step={4}
              value={selected.gap}
              onChange={(event) => patchSelected({ gap: Number(event.target.value) })}
              onPointerUp={() => cueAtmosphere('settle')} />
            <ul className={s.breakpoints}>
              <li><span>{t('Sections', 'الأقسام')}</span><b>{blocks.length}</b></li>
              <li><span>{t('Draft', 'المسودة')}</span><b>{t('This tab only', 'هذا التبويب فقط')}</b></li>
            </ul>
          </>
        ) : (
          <p className={s.empty}>{t('Select a section to inspect it.', 'اختر قسماً لفحصه.')}</p>
        )}
        <div className={s.actions}>
          <a className={s.primaryAction} href={requestHref} onClick={() => cueAtmosphere('success')}>
            {t('Request this layout', 'اطلب هذا التخطيط')} →
          </a>
        </div>
        <p className={s.boundary}>{t('A real draft of the page structure. Publishing happens in the build, after scope is agreed — nothing goes live from here.', 'مسودة حقيقية لهيكل الصفحة. النشر يتم في البناء بعد الاتفاق على النطاق — لا شيء يُنشر من هنا.')}</p>
      </aside>
    </section>
  );
}
