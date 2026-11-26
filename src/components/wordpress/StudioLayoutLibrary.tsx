'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from './WordPressCosmicMark';
import {
  BLOCK_TYPES, ComposerDocument, DEFAULT_BLOCKS, label, readComposerBlocks, saveComposerBlocks,
  STARTING_LAYOUT, type Block,
} from './journeys/ComposerDocument';
import s from './journeys/journeys.module.css';
import styles from './StudioLayoutLibrary.module.css';

const copy = {
  en: { contents: 'Included sections', confirm: 'Confirm addition', cancel: 'Cancel', undo: 'Undo addition', undone: 'The addition was undone.', conflict: 'Those blocks have changed in the composer. Review them there before removing them.', session: 'Added for this tab. Browser storage is unavailable.', undoSession: 'Undone for this tab. The saved draft could not be updated.', full: 'The draft cannot hold more blocks. Remove a section in the composer before adding another.' },
  ar: { contents: 'الأقسام المتضمَّنة', confirm: 'أكّد الإضافة', cancel: 'إلغاء', undo: 'تراجع عن الإضافة', undone: 'تم التراجع عن الإضافة.', conflict: 'البلوكات دي اتغيّرت في المحرر. راجعها هناك قبل الحذف.', session: 'اتضافت في التبويب ده. تخزين المتصفح غير متاح.', undoSession: 'تم التراجع في التبويب ده. تعذّر تحديث المسودة المحفوظة.', full: 'المسودة وصلت للحد الأقصى. احذف قسم من المحرر قبل الإضافة.' },
  ur: { contents: 'شامل حصے', confirm: 'اضافے کی تصدیق کریں', cancel: 'منسوخ کریں', undo: 'اضافہ واپس لیں', undone: 'اضافہ واپس لے لیا گیا۔', conflict: 'یہ بلاکس ایڈیٹر میں تبدیل ہو چکے ہیں۔ ہٹانے سے پہلے وہیں دیکھیں۔', session: 'اس ٹیب میں شامل کر دیا گیا۔ براؤزر اسٹوریج دستیاب نہیں۔', undoSession: 'اس ٹیب میں واپس لے لیا گیا۔ محفوظ مسودہ اپ ڈیٹ نہیں ہو سکا۔', full: 'مسودے میں مزید بلاکس کی گنجائش نہیں۔ ایڈیٹر سے ایک حصہ ہٹائیں۔' },
};

const libraryCopy = {
  en: {
    starters: 'Starter Sites', blocks: 'Blocks', patterns: 'Patterns',
    starterDescription: 'Preview a starting layout and add its sections to your Studio draft.',
    blockDescription: 'Preview Studio blocks and browse the official WordPress.org directory.',
  },
  ar: {
    starters: 'المواقع المبدئية', blocks: 'الكتل', patterns: 'الأنماط',
    starterDescription: 'عاين تخطيط مبدئي وأضف أقسامه لمسودة الاستوديو.',
    blockDescription: 'عاين كتل الاستوديو وتصفّح دليل WordPress.org الرسمي.',
  },
  ur: {
    starters: 'ابتدائی سائٹس', blocks: 'بلاکس', patterns: 'پیٹرن',
    starterDescription: 'ابتدائی ترتیب دیکھیں اور اس کے حصے اسٹوڈیو کے مسودے میں شامل کریں۔',
    blockDescription: 'اسٹوڈیو بلاکس دیکھیں اور WordPress.org کی سرکاری ڈائریکٹری براؤز کریں۔',
  },
};

export function StudioLibraryIntro({ mode }: Readonly<{ mode: 'starter-sites' | 'blocks' }>) {
  const ui = libraryCopy[useSiteLanguage()];
  const isStarter = mode === 'starter-sites';
  return (
    <section className="shell wp-catalogue-intro">
      <WordPressCosmicMark label="" />
      <h1>{isStarter ? ui.starters : ui.blocks}</h1>
      <p>{isStarter ? ui.starterDescription : ui.blockDescription}</p>
    </section>
  );
}

export function StudioLayoutLibrary({ mode }: Readonly<{ mode: 'starter-sites' | 'blocks' }>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const ui = copy[language];
  const navigation = libraryCopy[language];
  const isStarter = mode === 'starter-sites';
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [added, setAdded] = useState<readonly Block[]>([]);
  const [result, setResult] = useState<'saved' | 'session' | 'undone' | 'undoSession' | 'conflict' | 'full' | null>(null);
  const entries = isStarter ? [
    { id: 'intro', name: t('Site introduction', 'مقدمة الموقع'), blocks: DEFAULT_BLOCKS },
    { id: 'contact', name: t('Contact layout', 'تخطيط التواصل'), blocks: STARTING_LAYOUT },
  ] : BLOCK_TYPES.map((type) => ({
    id: type.id,
    name: t(type.en, type.ar),
    blocks: [{ key: 1, type: type.id, align: 'center', gap: 16 } satisfies Block],
  }));
  const preview = entries[selected];

  function addToDraft() {
    setConfirming(false);
    const existing = readComposerBlocks([]);
    const lastKey = existing.reduce((last, block) => Number.isSafeInteger(block.key) ? Math.max(last, block.key) : last, 0);
    if (existing.length + preview.blocks.length > 100 || !Number.isSafeInteger(lastKey + preview.blocks.length)) {
      setResult('full');
      return;
    }
    const blocks = preview.blocks.map((block, index) => ({ ...block, key: lastKey + index + 1 }));
    const saved = saveComposerBlocks([...existing, ...blocks]);
    setAdded(blocks);
    setResult(saved ? 'saved' : 'session');
    cueAtmosphere(saved ? 'confirm' : 'error');
  }

  function undoAddition() {
    const existing = readComposerBlocks([]);
    const additions = new Map(added.map((block) => [block.key, block]));
    const intact = existing.filter((block) => {
      const original = additions.get(block.key);
      return original && original.type === block.type && original.align === block.align && original.gap === block.gap;
    });
    if (intact.length !== additions.size) {
      setResult('conflict');
      return;
    }
    const saved = saveComposerBlocks(existing.filter((block) => !additions.has(block.key)));
    setAdded([]);
    setResult(saved ? 'undone' : 'undoSession');
  }

  const message = result === 'saved' ? t('Added to your composer draft.', 'أُضيف إلى مسودة محرر الموقع.') : result ? ui[result] : null;

  return (
    <section className={`${s.studioLibrary} ${styles.library}`} aria-labelledby="studio-library-title">
      <nav className={s.deviceRail} aria-label={t('Studio library destinations', 'وجهات مكتبة الاستوديو')}>
        <Link className={s.deviceChip} href="/wordpress/starter-sites" aria-current={isStarter ? 'page' : undefined}>{navigation.starters}</Link>
        <Link className={s.deviceChip} href="/wordpress/blocks" aria-current={!isStarter ? 'page' : undefined}>{navigation.blocks}</Link>
        <Link className={s.deviceChip} href="/wordpress/patterns">{navigation.patterns}</Link>
      </nav>
      <header className={s.libraryHead}>
        <h2 id="studio-library-title" className={s.panelTitle}>{t('Studio layout library', 'مكتبة تخطيطات الاستوديو')}</h2>
        <a className={s.ghostAction} href="/wordpress#launch">{t('Open composer', 'فتح محرر الموقع')} ↗</a>
      </header>
      <div className={styles.workspace}>
        <div className={styles.choices} role="group" aria-label={isStarter ? navigation.starters : navigation.blocks}>
          {entries.map(({ id, name, blocks }, index) => (
            <button key={id} className={styles.choice} type="button" aria-pressed={selected === index} aria-controls="studio-library-preview" onClick={() => {
              if (index !== selected) cueAtmosphere('settle');
              setSelected(index);
              setConfirming(false);
              setResult(null);
            }}>
              <span className={styles.miniature} aria-hidden="true">
                {blocks.map((block) => <span key={block.key} data-layout-block={block.type} />)}
              </span>
              {name}
            </button>
          ))}
        </div>
        <div role="region" id="studio-library-preview" className={`${s.studioLibraryPreview} ${styles.preview}`} aria-label={t('Layout preview', 'معاينة التخطيط')} tabIndex={0}>
          <div className={s.frameChrome}><span>{preview.name}</span></div>
          <ComposerDocument blocks={preview.blocks} />
        </div>
        <div className={styles.inspector}>
          <h3>{ui.contents}</h3>
          <ol>{preview.blocks.map((block) => <li key={block.key}>{label(block.type, t)}</li>)}</ol>
          <button className={s.primaryAction} type="button" aria-expanded={confirming} onClick={() => setConfirming(!confirming)}>{t('Add to draft', 'أضف إلى المسودة')}</button>
          {confirming && <div className={styles.confirmation}>
            <button className={s.primaryAction} type="button" onClick={addToDraft}>{ui.confirm}</button>
            <button className={s.ghostAction} type="button" onClick={() => setConfirming(false)}>{ui.cancel}</button>
          </div>}
          {added.length > 0 && <button className={s.ghostAction} type="button" onClick={undoAddition}>{ui.undo}</button>}
          {message && <p role={result === 'conflict' || result === 'full' ? 'alert' : 'status'}>{message}</p>}
        </div>
      </div>
    </section>
  );
}
