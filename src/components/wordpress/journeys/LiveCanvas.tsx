'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { DeviceFrame, DEVICE_SPECS, type PreviewDevice } from './DeviceFrame';
import { ComposerDocument, DEFAULT_BLOCKS, readComposerBlocks, type Block } from './ComposerDocument';
import s from './journeys.module.css';

const DEVICES: PreviewDevice[] = ['desktop', 'tablet', 'mobile'];
const SCALES = [50, 75, 100, 125, 150] as const;

function DraftViewport({ device, draft, scale, title }: Readonly<{
  device: PreviewDevice;
  draft: readonly Block[];
  scale: number;
  title: string;
}>) {
  const viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const { width, height } = DEVICE_SPECS[device];

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      // The visible workspace, not the space the preview's own scrollbar leaves
      // behind: scaling the preview must not shrink the space it is scaled into,
      // or the scale control would resolve differently on platforms that draw
      // classic scrollbars.
      const box = entry.borderBoxSize?.[0]?.inlineSize;
      setAvailable(box && box > 0 ? box : entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const zoom = Math.min(available / width, 1) * scale / 100;
  return (
    <div ref={viewport} className={s.draftViewport} role="region" aria-label={title} tabIndex={0}
      style={{ aspectRatio: `${width} / ${height}` }}>
      {available > 0 && (
        <div className={s.responsiveDocument} data-logical-width={width} style={{ width, minHeight: height, zoom }}>
          <ComposerDocument blocks={draft} />
        </div>
      )}
    </div>
  );
}

export function LiveCanvas({ themes, selectedSlug, onSelect, onEdit }: Readonly<{
  themes: Readonly<ExternalItem[]>;
  selectedSlug: string;
  onSelect: (slug: string) => void;
}> & { onEdit: () => void }) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [visible, setVisible] = useState<Record<PreviewDevice, boolean>>({ desktop: true, tablet: true, mobile: true });
  const [scale, setScale] = useState(100);
  const [mode, setMode] = useState<'draft' | 'screenshot'>('draft');
  const [draft, setDraft] = useState<Block[]>(DEFAULT_BLOCKS);
  const theme = themes.find((item) => item.slug === selectedSlug) ?? themes[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(readComposerBlocks()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggle(device: PreviewDevice) {
    cueAtmosphere('confirm');
    setVisible((current) => {
      const next = { ...current, [device]: !current[device] };
      // At least one frame stays on the podium.
      if (!next.desktop && !next.tablet && !next.mobile) return current;
      return next;
    });
  }

  const shown = DEVICES.filter((device) => visible[device]);

  return (
    <section className={s.canvasJourney} aria-label={t('Live Responsive Canvas')}>
      <div className={s.canvasMode} role="group" aria-label={t('Preview mode')}>
        <button type="button" className={s.ghostAction} aria-pressed={mode === 'draft'} onClick={() => setMode('draft')}>{t('Live draft')}</button>
        <button type="button" className={s.ghostAction} aria-pressed={mode === 'screenshot'} onClick={() => setMode('screenshot')}>{t('Official theme screenshot')}</button>
        <button type="button" className={s.primaryAction} onClick={onEdit}>{t('Edit draft')}</button>
      </div>
      <div className={s.canvasSide}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Device Preview')}</h3>
          {DEVICES.map((device) => (
            <button key={device} type="button" className={s.toggleRow} role="switch" aria-checked={visible[device]} onClick={() => toggle(device)}>
              <span>{t(device[0].toUpperCase() + device.slice(1))}</span>
              <i className={s.switch} data-on={visible[device]} aria-hidden="true" />
            </button>
          ))}
        </div>
        {mode === 'screenshot' && theme && <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Theme')}</h3>
          <label className={s.visuallyHidden} htmlFor="canvas-theme">{t('Theme to preview')}</label>
          <select id="canvas-theme" className={s.themeSelect} value={theme.slug} onChange={(event) => { cueAtmosphere('confirm'); onSelect(event.target.value); }}>
            {themes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </div>}
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Scaling & Canvas')}</h3>
          <label className={s.scaleRow} htmlFor="canvas-scale">
            <span>{t('Scale')}</span>
            <output htmlFor="canvas-scale">{scale}%</output>
          </label>
          <input
            id="canvas-scale"
            className={s.scaleSlider}
            type="range"
            min={50}
            max={150}
            step={5}
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
            onPointerUp={() => cueAtmosphere('settle')}
            onKeyUp={() => cueAtmosphere('settle')}
          />
          <div className={s.scalePresets} role="group" aria-label={t('Scale presets')}>
            {SCALES.map((value) => (
              <button key={value} type="button" aria-pressed={scale === value} onClick={() => { if (scale !== value) cueAtmosphere('settle'); setScale(value); }}>
                {value}%
              </button>
            ))}
          </div>
        </div>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Breakpoints')}</h3>
          <ul className={s.breakpoints}>
            <li><span>{t('Desktop')}</span><b>≥ 1280px</b></li>
            <li><span>{t('Tablet')}</span><b>768 – 1279px</b></li>
            <li><span>{t('Mobile')}</span><b>≤ 767px</b></li>
          </ul>
          <p className={s.syncStatus}>
            <i aria-hidden="true" />
            {mode === 'draft' ? t('Same draft across devices') : t('Comparison view · one official screenshot, three viewports')}
          </p>
        </div>
      </div>

      <div className={s.podiumWrap}>
        <div className={s.podium} data-preview-mode={mode} style={{ ['--canvas-scale' as string]: mode === 'draft' ? 1 : scale / 100 }}>
          {mode === 'screenshot' && !theme
            ? <p className={s.empty} role="status">{t('The official theme directory is unavailable this visit, so there is no screenshot to compare.')}</p>
            : shown.map((device) => {
              const title = t(device[0].toUpperCase() + device.slice(1));
              return (
                <figure key={device} className={s.podiumItem} data-preview-device={device}>
                  {mode === 'screenshot' && theme ? <DeviceFrame device={device} theme={theme} /> : (
                    <DeviceFrame device={device} title={t('Layout draft')}>
                      <DraftViewport device={device} draft={draft} scale={scale} title={title} />
                    </DeviceFrame>
                  )}
                  <figcaption>{title} · {DEVICE_SPECS[device].width} × {DEVICE_SPECS[device].height}</figcaption>
                </figure>
              );
            })}
          <span className={s.podiumRing} aria-hidden="true" />
          <span className={s.podiumRingB} aria-hidden="true" />
        </div>
        {mode === 'screenshot' && <p className={s.boundary}>
          {t('Official screenshot resized for comparison — not a live responsive site. Install and responsive QA happen in the real build.')}
        </p>}
      </div>
    </section>
  );
}
