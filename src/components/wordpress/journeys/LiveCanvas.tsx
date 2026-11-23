'use client';

/**
 * 06 · Live Responsive Canvas — reference 83381, rendered as code.
 *
 * The reference's instrument panel around a truthful core: device visibility
 * toggles, a scale slider, breakpoint readouts and the three device frames
 * standing side by side on a glass podium. What is inside the frames is the
 * theme author's official screenshot resized to each viewport — labelled as
 * exactly that, never claimed to be a live responsive render.
 */
import { useState } from 'react';
import type { ExternalItem } from '@/lib/wordpress/external';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { DeviceFrame, DEVICE_SPECS, type PreviewDevice } from './DeviceFrame';
import s from './journeys.module.css';

const DEVICES: PreviewDevice[] = ['desktop', 'tablet', 'mobile'];
const SCALES = [50, 75, 100, 125, 150] as const;

export function LiveCanvas({ themes, selectedSlug, onSelect }: Readonly<{
  themes: Readonly<ExternalItem[]>;
  selectedSlug: string;
  onSelect: (slug: string) => void;
}>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [visible, setVisible] = useState<Record<PreviewDevice, boolean>>({ desktop: true, tablet: true, mobile: true });
  const [scale, setScale] = useState(100);
  const theme = themes.find((item) => item.slug === selectedSlug) ?? themes[0];

  function toggle(device: PreviewDevice) {
    cueAtmosphere('confirm');
    setVisible((current) => {
      const next = { ...current, [device]: !current[device] };
      // At least one frame stays on the podium.
      if (!next.desktop && !next.tablet && !next.mobile) return current;
      return next;
    });
  }

  if (!theme) {
    return (
      <section className={s.panel}>
        <h3 className={s.panelTitle}>{t('Live Responsive Canvas')}</h3>
        <p className={s.empty} role="status">{t('The official theme directory is unavailable this visit, so there is no screenshot to compare.')}</p>
      </section>
    );
  }

  const shown = DEVICES.filter((device) => visible[device]);

  return (
    <section className={s.canvasJourney} aria-label={t('Live Responsive Canvas')}>
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
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Theme')}</h3>
          <label className={s.visuallyHidden} htmlFor="canvas-theme">{t('Theme to preview')}</label>
          <select id="canvas-theme" className={s.themeSelect} value={theme.slug} onChange={(event) => { cueAtmosphere('confirm'); onSelect(event.target.value); }}>
            {themes.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </div>
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
            {t('Comparison view · one official screenshot, three viewports')}
          </p>
        </div>
      </div>

      <div className={s.podiumWrap}>
        <div className={s.podium} style={{ ['--canvas-scale' as string]: scale / 100 }}>
          {shown.map((device) => (
            <figure key={device} className={s.podiumItem}>
              <DeviceFrame device={device} theme={theme} />
              <figcaption>
                {t(device[0].toUpperCase() + device.slice(1))} · {DEVICE_SPECS[device].width} × {DEVICE_SPECS[device].height}
              </figcaption>
            </figure>
          ))}
          <span className={s.podiumRing} aria-hidden="true" />
          <span className={s.podiumRingB} aria-hidden="true" />
        </div>
        <p className={s.boundary}>
          {t('Official screenshot resized for comparison — not a live responsive site. Install and responsive QA happen in the real build.')}
        </p>
      </div>
    </section>
  );
}
