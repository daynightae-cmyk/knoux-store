'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { mountFounderPortrait } from '@/lib/founderPortrait';
import styles from './FounderPortrait.module.css';

export function FounderPortrait() {
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [photograph, setPhotograph] = useState(false);

  useEffect(() => {
    const surface = canvas.current;
    const source = image.current;
    const container = frame.current;
    if (!loaded || photograph || !surface || !source || !container) return;
    const dispose = mountFounderPortrait(surface, source);
    if (!dispose) return;
    container.dataset.particlesReady = 'true';
    return () => { dispose(); delete container.dataset.particlesReady; };
  }, [loaded, photograph]);

  return (
    <figure className={styles.portrait}>
      <div className={styles.frame} ref={frame} data-portrait-mode={photograph ? 'photograph' : 'particles'}>
        <Image ref={image} src="/founder/sadek-elgazar.jpg" alt="Sadek Elgazar, founder and software developer at KNOuX"
          width={460} height={460} unoptimized className={styles.image} onLoad={() => setLoaded(true)} />
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <span className={styles.coordinates} aria-hidden="true">KNOuX / SIGNATURE 05</span>
      </div>
      <figcaption className={styles.caption}>
        <span>ONE PERSON. CONNECTED SYSTEMS.</span>
        <button type="button" aria-pressed={photograph} onClick={() => setPhotograph(value => !value)}>
          {photograph ? 'View particle portrait' : 'View photograph'} <span aria-hidden="true">↗</span>
        </button>
      </figcaption>
    </figure>
  );
}
