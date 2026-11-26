'use client';

/**
 * Device frames for theme previews — reference 83381 vocabulary drawn in
 * code: a monitor with a stand, a tablet slab and a phone with a notch, all
 * glassy violet chrome on the shared cosmic sky. Inside each frame is the
 * theme author's own official screenshot through the allowlisted proxy —
 * resized for comparison, honestly labelled, never presented as a live site.
 */
import type { ExternalItem } from '@/lib/wordpress/external';
import { useState, type ReactNode } from 'react';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import s from './journeys.module.css';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export const DEVICE_SPECS: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};

function Screen({ theme, eager }: Readonly<{ theme: ExternalItem; eager: boolean }>) {
  const language = useSiteLanguage();
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  if (!theme.screenshotUrl) {
    return <p className={s.screenEmpty}>{t('This theme has no official screenshot.')}</p>;
  }
  return (
    <>
      {status !== 'ready' && <p role="status" className={s.screenEmpty}>
        {status === 'loading' ? t('Loading official screenshot…') : t('Official screenshot unavailable.')}
      </p>}
      {status !== 'unavailable' && (
      // eslint-disable-next-line @next/next/no-img-element -- unmodified official image through the existing allowlisted proxy
      <img
        className={s.screenImg}
        src={`/api/wp-image?u=${encodeURIComponent(theme.screenshotUrl)}`}
        alt={`${theme.name} · WordPress.org`}
        loading={eager ? 'eager' : 'lazy'}
        data-pending={status === 'loading' || undefined}
        aria-hidden={status === 'loading' || undefined}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('unavailable')}
      />
      )}
    </>
  );
}

type FrameContent = { theme: ExternalItem; children?: never; title?: never }
  | { theme?: never; children: ReactNode; title: string };

export function DeviceFrame({ device, theme, children, title, chrome = true, eager = false }: Readonly<{
  device: PreviewDevice;
  chrome?: boolean;
  eager?: boolean;
}> & FrameContent) {
  return (
    <div className={s.frameStage} data-device={device}>
      <div className={`${s.frame} ${s[`frame_${device}`]}`}>
        {chrome ? (
          <div className={s.frameChrome} aria-hidden="true">
            <i /><i /><i />
            <span>{theme?.name ?? title}</span>
          </div>
        ) : null}
        <div className={theme ? s.screen : s.draftScreen}>
          {theme ? <Screen key={theme.screenshotUrl ?? theme.slug} theme={theme} eager={eager} /> : children}
        </div>
        {device === 'mobile' ? <span className={s.notch} aria-hidden="true" /> : null}
        {device === 'desktop' ? <span className={s.stand} aria-hidden="true" /> : null}
      </div>
      <span className={s.frameShadow} aria-hidden="true" />
    </div>
  );
}
