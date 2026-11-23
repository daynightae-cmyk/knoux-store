'use client';

/**
 * 04 · Site Identity Setup — reference 83382, rendered as a real design tool.
 *
 * Brand controls (name, tagline, style), mark placement, typography pairing,
 * color controls with live hex readouts, page structure and content modules —
 * all feeding a live hero preview built from the canonical KNOuX particle mark
 * and CSS light, never a raster. An inspector reads the computed spacing,
 * radius and glow back out. Everything is a draft held in this tab; the
 * "request" action composes the identity into a real contact request. Nothing
 * is published, and the tool says so.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from '../WordPressCosmicMark';
import studioStyles from '../WordPressStudio.module.css';
import s from './journeys.module.css';

const STYLES = [
  { id: 'minimal', en: 'Minimal', ar: 'بسيط', tracking: '.14em', weight: 400 },
  { id: 'modern', en: 'Modern', ar: 'عصري', tracking: '.04em', weight: 500 },
  { id: 'premium', en: 'Premium', ar: 'فاخر', tracking: '.26em', weight: 300 },
] as const;

const FONTS = [
  { id: 'sans', label: 'System Sans', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'serif', label: 'Editorial Serif', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Technical Mono', stack: 'ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace' },
] as const;

const PAGES = ['Home', 'Products', 'Category', 'About', 'Contact'] as const;
const MODULES = ['Hero', 'Banner', 'Products', 'Features', 'Testimonials', 'CTA'] as const;

const STORAGE_KEY = 'knoux-wp-identity-draft';
type Panel = 'brand' | 'structure' | 'inspector';

type Draft = {
  name: string; tagline: string; style: (typeof STYLES)[number]['id'];
  placement: 'start' | 'center' | 'end';
  headingFont: (typeof FONTS)[number]['id']; bodyFont: (typeof FONTS)[number]['id'];
  primary: string; secondary: string; backdrop: string;
  pages: string[]; modules: string[]; activePage: string;
};

const DEFAULT_DRAFT: Draft = {
  name: '', tagline: '', style: 'modern', placement: 'center',
  headingFont: 'sans', bodyFont: 'sans',
  primary: '#a855f7', secondary: '#d8b4fe', backdrop: '#0b0716',
  pages: ['Home'], modules: ['Hero'], activePage: 'Home',
};

function readDraft(): Draft {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed = JSON.parse(raw) as Partial<Draft> | null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_DRAFT;
    const pages = Array.isArray(parsed.pages) ? PAGES.filter((page) => parsed.pages?.includes(page)) : DEFAULT_DRAFT.pages;
    const modules = Array.isArray(parsed.modules) ? MODULES.filter((module) => parsed.modules?.includes(module)) : DEFAULT_DRAFT.modules;
    const visiblePages = pages.length ? pages : DEFAULT_DRAFT.pages;
    return {
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 40) : DEFAULT_DRAFT.name,
      tagline: typeof parsed.tagline === 'string' ? parsed.tagline.slice(0, 60) : DEFAULT_DRAFT.tagline,
      style: STYLES.find(({ id }) => id === parsed.style)?.id ?? DEFAULT_DRAFT.style,
      placement: parsed.placement === 'start' || parsed.placement === 'end' ? parsed.placement : DEFAULT_DRAFT.placement,
      headingFont: FONTS.find(({ id }) => id === parsed.headingFont)?.id ?? DEFAULT_DRAFT.headingFont,
      bodyFont: FONTS.find(({ id }) => id === parsed.bodyFont)?.id ?? DEFAULT_DRAFT.bodyFont,
      primary: typeof parsed.primary === 'string' && HEX.test(parsed.primary) ? parsed.primary : DEFAULT_DRAFT.primary,
      secondary: typeof parsed.secondary === 'string' && HEX.test(parsed.secondary) ? parsed.secondary : DEFAULT_DRAFT.secondary,
      backdrop: typeof parsed.backdrop === 'string' && HEX.test(parsed.backdrop) ? parsed.backdrop : DEFAULT_DRAFT.backdrop,
      pages: visiblePages,
      modules,
      activePage: parsed.activePage && visiblePages.includes(parsed.activePage) ? parsed.activePage : visiblePages[0],
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function persistDraft(draft: Draft) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function SiteIdentity() {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  // Server and client render the default draft first; the stored draft is
  // read after mount so hydration always agrees (same pattern as the studio's
  // intent handoff).
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [panel, setPanel] = useState<Panel>('brand');
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'invalid' | 'unavailable'>('idle');
  const dialog = useRef<HTMLDialogElement>(null);
  const nameField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(readDraft()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function patch(part: Partial<Draft>, cue: 'settle' | 'confirm' = 'settle') {
    cueAtmosphere(cue);
    const next = { ...draft, ...part };
    setDraft(next);
    setSaveState('idle');
    persistDraft(next);
  }

  function openPanel(selected: Panel) {
    setPanel(selected);
    dialog.current?.showModal();
  }

  function saveDraft() {
    const name = draft.name.trim();
    if (!name) {
      setSaveState('invalid');
      openPanel('brand');
      window.requestAnimationFrame(() => nameField.current?.focus());
      return;
    }
    const next = { ...draft, name, tagline: draft.tagline.trim() };
    setDraft(next);
    const saved = persistDraft(next);
    setSaveState(saved ? 'saved' : 'unavailable');
    cueAtmosphere(saved ? 'success' : 'settle');
  }

  function togglePage(page: string) {
    const pages = toggleIn(draft.pages, page);
    if (!pages.length) return;
    const activePage = pages.includes(draft.activePage) ? draft.activePage : pages[0];
    patch({ pages, activePage }, 'confirm');
  }

  const style = STYLES.find((entry) => entry.id === draft.style) ?? STYLES[1];
  const headingFont = FONTS.find((entry) => entry.id === draft.headingFont) ?? FONTS[0];
  const bodyFont = FONTS.find((entry) => entry.id === draft.bodyFont) ?? FONTS[0];
  const displayName = draft.name.trim() || 'KNOuX Store';
  const displayTagline = draft.tagline.trim() || t('Digital Headquarters', 'المقر الرقمي');

  const requestHref = useMemo(() => `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: [
      `Site identity draft — name: ${displayName}`,
      `tagline: ${displayTagline}`,
      `style: ${style.en}`,
      `mark placement: ${draft.placement}`,
      `type: ${headingFont.label} / ${bodyFont.label}`,
      `palette: ${draft.primary} / ${draft.secondary} on ${draft.backdrop}`,
      `pages: ${draft.pages.join(', ') || 'to be agreed'}`,
      `modules: ${draft.modules.join(', ') || 'to be agreed'}`,
    ].join('; '),
  }).toString()}`, [displayName, displayTagline, style.en, draft, headingFont.label, bodyFont.label]);

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  const panelTitle = panel === 'brand' ? t('Brand Controls', 'ضوابط العلامة')
    : panel === 'structure' ? t('Page Structure', 'بنية الصفحات')
    : t('Inspector', 'الفاحص');

  return (
    <section className={s.identityJourney} aria-label={t('Site Identity Setup')}>
      <div className={s.identityToolbar}>
        <div role="group" aria-label={t('Identity controls', 'أدوات الهوية')}>
          <button type="button" onClick={() => openPanel('brand')}>{t('Brand Controls', 'ضوابط العلامة')}</button>
          <button type="button" onClick={() => openPanel('structure')}>{t('Page Structure', 'بنية الصفحات')}</button>
          <button type="button" onClick={() => openPanel('inspector')}>{t('Inspector', 'الفاحص')}</button>
        </div>
        <button type="button" className={s.primaryAction} onClick={saveDraft}>{t('Save draft', 'احفظ المسودة')}</button>
        {saveState === 'saved' && <span role="status">{t('Identity draft saved in this tab.', 'تم حفظ مسودة الهوية في هذا التبويب.')}</span>}
        {saveState === 'unavailable' && <span role="alert">{t('Browser storage is unavailable. Your changes are still in this preview.', 'تخزين المتصفح غير متاح. التعديلات ما زالت ظاهرة في المعاينة.')}</span>}
      </div>

      <div className={s.identityStage}>
        <div
          className={s.identityPreview}
          data-placement={draft.placement}
          style={{
            ['--id-primary' as string]: HEX.test(draft.primary) ? draft.primary : '#a855f7',
            ['--id-secondary' as string]: HEX.test(draft.secondary) ? draft.secondary : '#d8b4fe',
            ['--id-backdrop' as string]: HEX.test(draft.backdrop) ? draft.backdrop : '#0b0716',
            ['--id-heading-font' as string]: headingFont.stack,
            ['--id-body-font' as string]: bodyFont.stack,
            ['--id-tracking' as string]: style.tracking,
            ['--id-weight' as string]: style.weight,
          }}
        >
          <div className={s.frameChrome} aria-hidden="true"><i /><i /><i /><span>{displayName} · {t(draft.activePage)}</span></div>
          <nav className={s.identityPageNav} aria-label={t('Preview pages', 'صفحات المعاينة')}>
            {draft.pages.map((page) => (
              <button key={page} type="button" aria-current={draft.activePage === page ? 'page' : undefined}
                onClick={() => { if (draft.activePage !== page) patch({ activePage: page }, 'confirm'); }}>{t(page)}</button>
            ))}
          </nav>
          <div className={s.previewBody}>
            <span className={s.previewOrbit} aria-hidden="true" />
            <span className={s.previewOrbitB} aria-hidden="true" />
            {draft.modules.includes('Hero') && <WordPressCosmicMark className={s.previewMark} label={t('KNOuX mark placement preview')} />}
            <p className={s.previewName}>{displayName}</p>
            <p className={s.previewTagline}>{displayTagline}</p>
            <span className={s.previewHorizon} aria-hidden="true" />
          </div>
          {draft.modules.some((module) => module !== 'Hero') && (
            <ul className={s.identityModulePreview} aria-label={t('Modules in the draft', 'وحدات المسودة')}>
              {draft.modules.filter((module) => module !== 'Hero').map((module) => <li key={module}>{t(module)}</li>)}
            </ul>
          )}
        </div>
      </div>

      <dialog ref={dialog} className={studioStyles.contextPanel} aria-labelledby="identity-panel-title">
        <header>
          <h3 id="identity-panel-title">{panelTitle}</h3>
          <button type="button" onClick={() => dialog.current?.close()}>{t('Close', 'إغلاق')}</button>
        </header>
        {panel === 'brand' && (
          <div className={s.identityControls}>
            <div className={s.panel}>
              <h3 className={s.panelTitle}>{t('Brand Controls', 'ضوابط العلامة')}</h3>
              <label className={s.fieldLabel} htmlFor="identity-name">{t('Brand name', 'اسم العلامة')}</label>
              <input ref={nameField} id="identity-name" aria-invalid={saveState === 'invalid' || undefined} aria-describedby={saveState === 'invalid' ? 'identity-name-error' : undefined} className={s.textField} type="text" value={draft.name} maxLength={40}
                placeholder="KNOuX Store" onChange={(event) => patch({ name: event.target.value })} />
              {saveState === 'invalid' && <p id="identity-name-error" role="alert">{t('Enter a brand name to save the draft.', 'اكتب اسم العلامة لحفظ المسودة.')}</p>}
              <label className={s.fieldLabel} htmlFor="identity-tagline">{t('Tagline', 'الشعار الفرعي')}</label>
              <input id="identity-tagline" className={s.textField} type="text" value={draft.tagline} maxLength={60}
                placeholder={t('Digital Headquarters', 'المقر الرقمي')} onChange={(event) => patch({ tagline: event.target.value })} />
              <span className={s.fieldLabel}>{t('Brand style', 'طراز العلامة')}</span>
              <div className={s.segmented} role="group" aria-label={t('Brand style')}>
                {STYLES.map((entry) => (
                  <button key={entry.id} type="button" aria-pressed={draft.style === entry.id}
                    onClick={() => patch({ style: entry.id }, 'confirm')}>
                    {t(entry.en, entry.ar)}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.panel}>
              <h3 className={s.panelTitle}>{t('Logo Placement', 'موضع الشعار')}</h3>
              <div className={s.segmented} role="group" aria-label={t('Logo placement')}>
                {(['start', 'center', 'end'] as const).map((placement) => (
                  <button key={placement} type="button" aria-pressed={draft.placement === placement}
                    onClick={() => patch({ placement }, 'confirm')}>
                    {t(placement === 'start' ? 'Leading' : placement === 'end' ? 'Trailing' : 'Centered',
                      placement === 'start' ? 'بداية' : placement === 'end' ? 'نهاية' : 'وسط')}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.panel}>
              <h3 className={s.panelTitle}>{t('Typography', 'الخطوط')}</h3>
              <label className={s.fieldLabel} htmlFor="identity-heading-font">{t('Headings', 'العناوين')}</label>
              <select id="identity-heading-font" className={s.themeSelect} value={draft.headingFont}
                onChange={(event) => patch({ headingFont: event.target.value as Draft['headingFont'] }, 'confirm')}>
                {FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
              </select>
              <span className={s.fontSpecimen} style={{ fontFamily: headingFont.stack }} aria-hidden="true">Aa</span>
              <label className={s.fieldLabel} htmlFor="identity-body-font">{t('Body text', 'النص')}</label>
              <select id="identity-body-font" className={s.themeSelect} value={draft.bodyFont}
                onChange={(event) => patch({ bodyFont: event.target.value as Draft['bodyFont'] }, 'confirm')}>
                {FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
              </select>
              <span className={s.fontSpecimen} style={{ fontFamily: bodyFont.stack }} aria-hidden="true">Aa</span>
            </div>

            <div className={s.panel}>
              <h3 className={s.panelTitle}>{t('Color Controls', 'الألوان')}</h3>
              <div className={s.colorRow}>
                {([
                  ['primary', t('Primary', 'أساسي')],
                  ['secondary', t('Secondary', 'ثانوي')],
                  ['backdrop', t('Background', 'الخلفية')],
                ] as const).map(([key, label]) => (
                  <label key={key} className={s.colorField}>
                    <span>{label}</span>
                    <input type="color" value={draft[key]} onChange={(event) => patch({ [key]: event.target.value })} />
                    <code>{draft[key].toUpperCase()}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        {panel === 'structure' && (
          <div className={s.identityBottom}>
            <div className={s.panel}>
              <h3 className={s.panelTitle}>{t('Page Structure', 'هيكل الصفحات')}</h3>
              <div className={s.moduleRow} role="group" aria-label={t('Pages in the draft')}>
                {PAGES.map((page) => (
                  <button key={page} type="button" className={s.moduleChip} aria-pressed={draft.pages.includes(page)}
                    disabled={draft.pages.length === 1 && draft.pages.includes(page)} onClick={() => togglePage(page)}>
                    {t(page)}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.panel}>
              <h3 className={s.panelTitle}>{t('Content Modules', 'وحدات المحتوى')}</h3>
              <div className={s.moduleRow} role="group" aria-label={t('Modules in the draft')}>
                {MODULES.map((module) => (
                  <button key={module} type="button" className={s.moduleChip} aria-pressed={draft.modules.includes(module)}
                    onClick={() => patch({ modules: toggleIn(draft.modules, module) }, 'confirm')}>
                    {t(module)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {panel === 'inspector' && (
          <aside className={`${s.panel} ${s.inspector}`} aria-label={t('Identity inspector')}>
            <h3 className={s.panelTitle}>{t('Inspector', 'الفاحص')}</h3>
            <ul className={s.breakpoints}>
              <li><span>{t('Style', 'الطراز')}</span><b>{t(style.en, style.ar)}</b></li>
              <li><span>{t('Tracking', 'التباعد')}</span><b>{style.tracking}</b></li>
              <li><span>{t('Placement', 'الموضع')}</span><b>{draft.placement}</b></li>
              <li><span>{t('Pages', 'الصفحات')}</span><b>{draft.pages.length}</b></li>
              <li><span>{t('Modules', 'الوحدات')}</span><b>{draft.modules.length}</b></li>
              <li><span>{t('Draft', 'المسودة')}</span><b>{t('This tab only', 'هذا التبويب فقط')}</b></li>
            </ul>
            <div className={s.actions}>
              <a className={s.primaryAction} href={requestHref} onClick={() => cueAtmosphere('success')}>
                {t('Request this identity', 'اطلب هذه الهوية')} →
              </a>
            </div>
            <p className={s.boundary}>
              {t('A live draft, stored only in this tab. Nothing is published from the studio — KNOuX implements the identity after scope is agreed.', 'مسودة حية محفوظة في هذا التبويب فقط. لا يُنشر شيء من الاستوديو — تنفّذ KNOuX الهوية بعد الاتفاق على النطاق.')}
            </p>
          </aside>
        )}
      </dialog>
    </section>
  );
}
