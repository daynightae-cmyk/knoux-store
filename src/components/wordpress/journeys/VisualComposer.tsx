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
import { useEffect, useRef, useState } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { BLOCK_TYPES, DEFAULT_BLOCKS, ComposerDocument, readComposerBlocks, saveComposerBlocks, label, type Block, type BlockType } from './ComposerDocument';
import { EcosystemComposer } from '../EcosystemComposer';
import studioStyles from '../WordPressStudio.module.css';
import s from './journeys.module.css';

let blockKey = 100;
type Pane = 'components' | 'layers' | 'inspector' | 'scope';
type DraftHistory = { previous: Block[][]; current: Block[]; next: Block[][] };

export function VisualComposer({ onPreview }: Readonly<{ onPreview: () => void }>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [history, setHistory] = useState<DraftHistory>({ previous: [], current: DEFAULT_BLOCKS, next: [] });
  const blocks = history.current;
  const [pane, setPane] = useState<Pane>('components');
  const [saved, setSaved] = useState<boolean | null>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const dragging = useRef<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<number>(DEFAULT_BLOCKS[0].key);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = readComposerBlocks();
      blockKey = Math.max(blockKey, ...restored.map((block) => block.key)) + 1;
      setHistory({ previous: [], current: restored, next: [] });
      setSelectedKey(restored[0]?.key ?? 0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openPane(next: Pane) {
    setPane(next);
    panel.current?.showModal();
  }

  function apply(next: DraftHistory) {
    setHistory(next);
    setSaved(saveComposerBlocks(next.current));
    if (!next.current.some((block) => block.key === selectedKey)) {
      setSelectedKey(next.current[0]?.key ?? 0);
    }
  }

  function commit(next: Block[], cue: 'settle' | 'confirm' = 'settle') {
    cueAtmosphere(cue);
    apply({ previous: [...history.previous, blocks].slice(-40), current: next, next: [] });
  }

  function undo() {
    const previous = history.previous.at(-1);
    if (!previous) return;
    apply({ previous: history.previous.slice(0, -1), current: previous, next: [blocks, ...history.next] });
    cueAtmosphere('settle');
  }

  function redo() {
    const [next, ...remaining] = history.next;
    if (!next) return;
    apply({ previous: [...history.previous, blocks], current: next, next: remaining });
    cueAtmosphere('settle');
  }

  function addBlock(type: BlockType) {
    const block: Block = { key: blockKey++, type, align: 'center', gap: 16 };
    commit([...blocks, block], 'confirm');
    setSelectedKey(block.key);
  }

  function removeBlock(key: number) {
    const next = blocks.filter((block) => block.key !== key);
    commit(next, 'confirm');
  }

  function moveBlock(key: number, target: number) {
    const index = blocks.findIndex((block) => block.key === key);
    if (index < 0 || target < 0 || target >= blocks.length || index === target) return;
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(target, 0, block);
    commit(next, 'settle');
  }

  function patchSelected(part: Partial<Block>) {
    if (!selected || (part.align === selected.align || part.gap === selected.gap)) return;
    commit(blocks.map((block) => (block.key === selectedKey ? { ...block, ...part } : block)));
  }

  const selected = blocks.find((block) => block.key === selectedKey) ?? null;
  const draftDescription = `Composed layout draft: ${blocks.map((block, index) => `${index + 1}. ${block.type} (${block.align}, gap ${block.gap}px)`).join('; ') || 'empty'}`;
  const panels: Record<Pane, string> = {
    components: t('Components', 'المكوّنات'),
    layers: t('Layers', 'الطبقات'),
    inspector: t('Inspector', 'الفاحص'),
    scope: t('Project scope', 'نطاق المشروع'),
  };

  return (
    <section className={s.composerJourney} aria-label={t('Visual Website Composer')}>
      <div className={s.composerToolbar}>
        <div role="group" aria-label={t('Composer tools', 'أدوات محرر الموقع')}>
          {(['components', 'layers', 'inspector'] as const).map((tool) => (
            <button key={tool} className={s.ghostAction} type="button" onClick={() => openPane(tool)}>{panels[tool]}</button>
          ))}
          <button className={s.ghostAction} type="button" disabled={!history.previous.length} onClick={undo}>{t('Undo', 'تراجع')}</button>
          <button className={s.ghostAction} type="button" disabled={!history.next.length} onClick={redo}>{t('Redo', 'أعد الإجراء')}</button>
          <button className={s.ghostAction} type="button" onClick={onPreview}>{t('Preview on devices')}</button>
        </div>
        <button className={s.primaryAction} type="button" onClick={() => openPane('scope')}>{t('Request this layout', 'اطلب هذا التخطيط')}</button>
        {saved === true && <span role="status">{t('Layout draft saved in this tab.', 'تم حفظ مسودة التخطيط في هذا التبويب.')}</span>}
        {saved === false && <span role="alert">{t('Browser storage is unavailable. Your changes are still in this preview.')}</span>}
      </div>

      <div role="region" className={s.composerCanvas} aria-label={t('Composed preview')} aria-live="polite">
        <div className={s.frameChrome} aria-hidden="true"><i /><i /><i /><span>{t('Layout draft', 'مسودة التخطيط')} · {blocks.length} {t('sections', 'أقسام')}</span></div>
        <ComposerDocument blocks={blocks} selectedKey={selectedKey} onSelect={(key) => {
          if (selectedKey !== key) cueAtmosphere('settle');
          setSelectedKey(key);
        }} />
      </div>

      <dialog ref={panel} className={studioStyles.contextPanel} aria-labelledby="wp-composer-panel">
        <header>
          <h3 id="wp-composer-panel">{panels[pane]}</h3>
          <button type="button" onClick={() => panel.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        {pane === 'components' && (
        <div className={s.panel}>
          <div className={s.paletteGrid} role="group" aria-label={t('Add a section')}>
            {BLOCK_TYPES.map((type) => (
              <button key={type.id} type="button" className={s.paletteItem} onClick={() => addBlock(type.id)}>
                <span aria-hidden="true">＋</span>{t(type.en, type.ar)}
              </button>
            ))}
          </div>
        </div>
        )}
        {pane === 'layers' && (
        <div className={s.panel}>
          {blocks.length ? (
            <ol className={s.layerList}>
              {blocks.map((block, index) => (
                <li key={block.key} draggable
                onDragStart={(event) => {
                  dragging.current = block.key;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(block.key));
                }}
                onDragOver={(event) => { if (dragging.current !== null) event.preventDefault(); }}
                onDragEnd={() => { dragging.current = null; }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging.current !== null) moveBlock(dragging.current, index);
                  dragging.current = null;
                }}>
                  <button type="button" className={s.layerRow} aria-pressed={selectedKey === block.key}
                    onClick={() => { if (selectedKey !== block.key) cueAtmosphere('settle'); setSelectedKey(block.key); }}>
                    <span className={s.serviceCode}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={s.serviceName}>{label(block.type, t)}</span>
                  </button>
                  <span className={s.layerTools}>
                    <button type="button" aria-label={t('Move up')} disabled={index === 0} onClick={() => moveBlock(block.key, index - 1)}>↑</button>
                    <button type="button" aria-label={t('Move down')} disabled={index === blocks.length - 1} onClick={() => moveBlock(block.key, index + 1)}>↓</button>
                    <button type="button" aria-label={t('Remove section')} onClick={() => removeBlock(block.key)}>✕</button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={s.empty} role="status">{t('The canvas is empty. Add a section from the palette.', 'اللوحة فارغة. أضف قسماً من المكوّنات.')}</p>
          )}
        </div>
        )}
        {pane === 'inspector' && (
      <div className={s.panel}>
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
      </div>
        )}
        <div hidden={pane !== 'scope'}>
          <EcosystemComposer layoutDescription={draftDescription} />
        </div>
      </dialog>
    </section>
  );
}
