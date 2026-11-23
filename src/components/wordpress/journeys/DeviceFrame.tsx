'use client';

/**
 * Device frames for theme previews — reference 83381 vocabulary drawn in
 * code: a monitor with a stand, a tablet slab and a phone with a notch, all
 * glassy violet chrome on the shared cosmic sky. Inside each frame is the
 * theme author's own official screenshot through the allowlisted proxy —
 * resized for comparison, honestly labelled, never presented as a live site.
 */
import type { ExternalItem } from '@/lib/wordpress/external';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import s from './journeys.module.css';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export const DEVICE_SPECS: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};

function Screen({ theme }: Readonly<{ theme: ExternalItem }>) {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  if (!theme.screenshotUrl) {
    return <p className={s.screenEmpty}>{t('This theme has no official screenshot.')}</p>;
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy */}
      <img
        className={s.screenImg}
        src={`/api/wp-image?u=${encodeURIComponent(theme.screenshotUrl)}`}
        alt={`${theme.name} · WordPress.org`}
        loading="lazy"
      />
    </>
  );
}

export function DeviceFrame({ device, theme, chrome = true }: Readonly<{
  device: PreviewDevice;
  theme: ExternalItem;
  chrome?: boolean;
}>) {
  return (
    <div className={s.frameStage} data-device={device}>
      <div className={`${s.frame} ${s[`frame_${device}`]}`}>
        {chrome ? (
          <div className={s.frameChrome} aria-hidden="true">
            <i /><i /><i />
            <span>{theme.name}</span>
          </div>
        ) : null}
        <div className={s.screen}>
          <Screen theme={theme} />
        </div>
        {device === 'mobile' ? <span className={s.notch} aria-hidden="true" /> : null}
        {device === 'desktop' ? <span className={s.stand} aria-hidden="true" /> : null}
      </div>
      <span className={s.frameShadow} aria-hidden="true" />
    </div>
  );
}
