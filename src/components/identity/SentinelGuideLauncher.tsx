'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { isSentinelQuiet, setSentinelQuiet, subscribeSentinelQuiet } from './sentinel-preferences';
import styles from './SentinelGuide.module.css';

const Panel = dynamic(() => import('./SentinelGuidePanel'), { ssr: false });
export function SentinelGuideLauncher() {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const quiet = useSyncExternalStore(subscribeSentinelQuiet, isSentinelQuiet, () => false);
  useEffect(() => {
    // The modal makes the launcher inert until React removes the dialog.
    if (wasOpen.current && !open) launcher.current?.focus();
    wasOpen.current = open;
  }, [open]);
  const close = () => setOpen(false);
  return <>
    <div className={styles.launcher} data-sentinel-launcher>
      <button ref={launcher} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'sentinel-guide-panel' : undefined} onClick={() => setOpen(true)}>Sentinel <span lang="ar">دليل</span></button>
      <button type="button" aria-pressed={quiet} aria-label="Quiet mode / الوضع الهادئ" onClick={() => setSentinelQuiet(!quiet)}>{quiet ? '◌' : '✧'}</button>
    </div>
    {open && <Panel onClose={close} />}
  </>;
}
