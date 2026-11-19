'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from './HomeCinema.module.css';

const VIDEO_ID = 'NOhO02YeGg4';
const FILM_EMBED_URL = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&playsinline=1&rel=0&controls=1`;
const FILM_WATCH_URL = `https://youtu.be/${VIDEO_ID}`;

const copy = {
  en: ['Original brand film', 'The Awakening', 'Your digital headquarters.', 'One ecosystem. One vision. A cinematic introduction to KNOuX.', 'Play the film', 'Close film', 'Watch on YouTube', 'Explore Build', 'Playing loads YouTube. Playback and captions are available in the player.'],
  ar: ['الفيلم الرسمي', 'الانطلاقة', 'مقرك الرقمي.', 'منظومة واحدة. رؤية واحدة. مقدمة سينمائية لعالم KNOuX.', 'شغّل الفيلم', 'أغلق الفيلم', 'شاهد على YouTube', 'استكشف Build', 'عند التشغيل يتم تحميل YouTube. أدوات التشغيل والترجمة داخل المشغل.'],
  ur: ['اصل برانڈ فلم', 'ایک نئی ابتدا', 'آپ کا ڈیجیٹل ہیڈکوارٹر۔', 'ایک نظام، ایک وژن۔ KNOuX کا سنیماٹک تعارف۔', 'فلم چلائیں', 'فلم بند کریں', 'YouTube پر دیکھیں', 'Build دریافت کریں', 'چلانے پر YouTube لوڈ ہوگا۔ پلے بیک اور سب ٹائٹل کنٹرول پلیئر میں ہیں۔'],
} as const;

export function HomeCinema() {
  const language = useSiteLanguage();
  const [label, title, sub, desc, playLabel, closeLabel, watchLabel, buildLabel, privacy] = copy[language];
  const [playing, setPlaying] = useState(false);
  const play = useRef<HTMLButtonElement>(null);
  const player = useRef<HTMLIFrameElement>(null);
  const restorePlayFocus = useRef(false);

  useEffect(() => {
    if (playing) {
      const frame = requestAnimationFrame(() => player.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    if (restorePlayFocus.current) {
      restorePlayFocus.current = false;
      play.current?.focus();
    }
  }, [playing]);

  const openFilm = () => setPlaying(true);
  const closeFilm = () => {
    restorePlayFocus.current = true;
    setPlaying(false);
  };

  return (
    <section id="knoux-film" className={styles.section} aria-labelledby="home-cinema-heading">
      <div className={styles.inner}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}><span className={styles.dot} /> KNOuX / {label}</p>
            <h2 id="home-cinema-heading">{title}<span>.</span></h2>
            <p className={styles.subtitle}>{sub}</p>
          </div>
          <p className={styles.description}>{desc}</p>
        </header>

        <div className={styles.theatre}>
          <div className={styles.rail} dir="ltr">
            <span><span className={styles.dot} /> KNOuX STORE</span>
            <span>ORIGINAL FILM / 01 · 00:30</span>
          </div>

          <div className={styles.screen} dir="ltr">
            {playing ? (
              <iframe
                ref={player}
                className={styles.player}
                title={`KNOuX Store — ${title}`}
                src={FILM_EMBED_URL}
                allow="autoplay; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={0}
              />
            ) : (
              <button type="button" ref={play} className={styles.poster} onClick={openFilm} aria-label={playLabel}>
                <span className={styles.orbit} aria-hidden="true" />
                <span className={styles.playControl}>
                  <span className={styles.playIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                  </span>
                  <span className={styles.playLabel}>{playLabel}</span>
                </span>
              </button>
            )}
          </div>

          <div className={styles.rail}>
            <span>{label}</span>
            <div className={styles.actions}>
              {playing && <button type="button" className={styles.control} onClick={closeFilm}>{closeLabel}</button>}
              <a className={styles.control} href={FILM_WATCH_URL} target="_blank" rel="noopener noreferrer">
                {watchLabel} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>{privacy}</p>
          <Link className={styles.control} href="/build">{buildLabel} <span aria-hidden="true">↗</span></Link>
        </footer>
      </div>
    </section>
  );
}
