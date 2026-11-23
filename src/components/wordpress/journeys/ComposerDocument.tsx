'use client';

import { useState } from 'react';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from '../WordPressCosmicMark';
import s from './journeys.module.css';

export const BLOCK_TYPES = [
  { id: 'hero', en: 'Hero', ar: 'واجهة' },
  { id: 'features', en: 'Features', ar: 'مزايا' },
  { id: 'gallery', en: 'Gallery', ar: 'معرض' },
  { id: 'text', en: 'Text', ar: 'نص' },
  { id: 'testimonials', en: 'Testimonials', ar: 'آراء' },
  { id: 'cta', en: 'Call to action', ar: 'دعوة لإجراء' },
  { id: 'contact', en: 'Contact', ar: 'تواصل' },
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number]['id'];
export type Block = { key: number; type: BlockType; align: 'start' | 'center' | 'end'; gap: number };

export const STORAGE_KEY = 'knoux-wp-composer-draft';

export const STARTING_LAYOUT: readonly Block[] = [
  { key: 1, type: 'hero', align: 'start', gap: 24 },
  { key: 2, type: 'text', align: 'start', gap: 12 },
  { key: 3, type: 'contact', align: 'start', gap: 12 },
];

export const DEFAULT_BLOCKS: Block[] = [
  { key: 1, type: 'hero', align: 'center', gap: 16 },
  { key: 2, type: 'features', align: 'center', gap: 16 },
  { key: 3, type: 'cta', align: 'center', gap: 16 },
];

export function readComposerBlocks(): Block[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BLOCKS;
    const parsed = JSON.parse(raw) as Block[];
    if (!Array.isArray(parsed)) return DEFAULT_BLOCKS;
    if (!parsed.length) return [];
    const valid = parsed.filter((block) => block && BLOCK_TYPES.some((type) => type.id === block.type));
    return valid.length ? valid : DEFAULT_BLOCKS;
  } catch {
    return DEFAULT_BLOCKS;
  }
}

export function label(type: BlockType, t: (en: string, ar?: string) => string) {
  const entry = BLOCK_TYPES.find((candidate) => candidate.id === type);
  return entry ? t(entry.en, entry.ar) : type;
}

export function ComposerDocument({ blocks, selectedKey, onSelect, alignment }: Readonly<{
  blocks: readonly Block[];
  selectedKey?: number;
  onSelect?: (key: number) => void;
  alignment?: Block['align'];
}>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [expandedKey, setExpandedKey] = useState<number | null>(null);

  return (
    <div className={s.composerPreview}>
      {blocks.map((block) => {
        const align = alignment ?? block.align;
        const style = {
          alignItems: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
          gap: `${block.gap}px`,
        };
        const content = (
          <>
            <span className={s.composedTag}>{label(block.type, t)}</span>
            {block.type === 'hero' && (
              <>
                <WordPressCosmicMark className={s.composedMark} label="" />
                <span className={s.composedTitle} data-preview-title>{t('Your website, composed.', 'موقعك، مُركَّباً.')}</span>
              </>
            )}
            {['features', 'gallery', 'testimonials'].includes(block.type) && (
              <span className={s.composedCards} aria-hidden="true"><i /><i /><i /></span>
            )}
            {block.type === 'text' && <span className={s.composedLines} aria-hidden="true"><i /><i /><i /></span>}
            {(block.type === 'cta' || block.type === 'contact') && (
              <span className={s.composedButton}>{block.type === 'cta' ? t('Get started', 'ابدأ الآن') : t('Contact', 'تواصل')}</span>
            )}
          </>
        );
        return onSelect ? (
          <button key={block.key} type="button" className={s.composedBlock} data-type={block.type}
            data-selected={selectedKey === block.key} style={style} onClick={() => onSelect(block.key)}>
            {content}
          </button>
        ) : (
          <section key={block.key} className={s.composedBlock} data-type={block.type} style={style}>
            {content}
            {block.type === 'hero' && (
              <>
                <button type="button" aria-expanded={expandedKey === block.key} className={s.ghostAction}
                  onClick={() => setExpandedKey(expandedKey === block.key ? null : block.key)}>{t('About this preview', 'عن المعاينة')}</button>
                {expandedKey === block.key && <span>{t('This page shows the sections in your layout draft.', 'تعرض هذه الصفحة أقسام مسودة التخطيط.')}</span>}
              </>
            )}
          </section>
        );
      })}
      {!blocks.length && <p className={s.empty}>{t('Add sections to see the page take shape.', 'أضف أقساماً لترى الصفحة تتشكل.')}</p>}
    </div>
  );
}
