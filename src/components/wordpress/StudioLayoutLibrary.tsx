'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import {
  BLOCK_TYPES, ComposerDocument, DEFAULT_BLOCKS, readComposerBlocks, saveComposerBlocks,
  STARTING_LAYOUT, type Block,
} from './journeys/ComposerDocument';
import s from './journeys/journeys.module.css';

export function StudioLayoutLibrary({ mode }: Readonly<{ mode: 'starter-sites' | 'blocks' }>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const isStarter = mode === 'starter-sites';
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState<'saved' | 'failed' | null>(null);
  const entries = isStarter ? [
    { name: t('Site introduction', 'مقدمة الموقع'), blocks: DEFAULT_BLOCKS },
    { name: t('Contact layout', 'تخطيط التواصل'), blocks: STARTING_LAYOUT },
  ] : BLOCK_TYPES.map((type) => ({
    name: t(type.en, type.ar),
    blocks: [{ key: 1, type: type.id, align: 'center', gap: 16 } satisfies Block],
  }));
  const preview = entries[selected];

  function addToDraft() {
    const existing = readComposerBlocks([]);
    const lastKey = existing.reduce((last, block) => Number.isSafeInteger(block.key) ? Math.max(last, block.key) : last, 0);
    const blocks = preview.blocks.map((block, index) => ({ ...block, key: lastKey + index + 1 }));
    const saved = saveComposerBlocks([...existing, ...blocks]);
    setResult(saved ? 'saved' : 'failed');
    cueAtmosphere(saved ? 'confirm' : 'error');
  }

  return (
    <section className={s.studioLibrary} aria-labelledby="studio-library-title">
      <nav className={s.deviceRail} aria-label={t('Studio library destinations', 'وجهات مكتبة الاستوديو')}>
        <Link className={s.deviceChip} href="/wordpress/starter-sites" aria-current={isStarter ? 'page' : undefined}>{t('Starter Sites')}</Link>
        <Link className={s.deviceChip} href="/wordpress/blocks" aria-current={!isStarter ? 'page' : undefined}>{t('Blocks')}</Link>
        <Link className={s.deviceChip} href="/wordpress/patterns">{t('Patterns')}</Link>
      </nav>
      <header className={s.libraryHead}>
        <h2 id="studio-library-title" className={s.panelTitle}>{t('Studio layout library', 'مكتبة تخطيطات الاستوديو')}</h2>
        <a className={s.ghostAction} href="/wordpress#launch">{t('Open composer', 'فتح محرر الموقع')} ↗</a>
      </header>
      <div role="region" className={s.studioLibraryPreview} aria-label={t('Layout preview', 'معاينة التخطيط')}>
        <div className={s.frameChrome}><span>{preview.name}</span></div>
        <ComposerDocument blocks={preview.blocks} />
      </div>
      <div className={s.paletteGrid} role="group" aria-label={isStarter ? t('Starter Sites') : t('Blocks')}>
        {entries.map(({ name }, index) => (
          <button key={name} className={s.paletteItem} type="button" aria-pressed={selected === index} onClick={() => {
            if (index !== selected) cueAtmosphere('settle');
            setSelected(index);
            setResult(null);
          }}>{name}</button>
        ))}
      </div>
      <div className={s.actions}>
        <button className={s.primaryAction} type="button" onClick={addToDraft}>{t('Add to draft', 'أضف إلى المسودة')}</button>
        {result === 'saved' && <p role="status">{t('Added to your composer draft.', 'أُضيف إلى مسودة محرر الموقع.')}</p>}
        {result === 'failed' && <p role="alert">{t('Browser storage is unavailable. Your changes are still in this preview.')}</p>}
      </div>
    </section>
  );
}
