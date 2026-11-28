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
  ar: ['╪º┘ä┘ü┘è┘ä┘à ╪º┘ä╪▒╪│┘à┘è', '╪º┘ä╪º┘å╪╖┘ä╪º┘é╪⌐', '┘à┘é╪▒┘â ╪º┘ä╪▒┘é┘à┘è.', '┘à┘å╪╕┘ê┘à╪⌐ ┘ê╪º╪¡╪»╪⌐. ╪▒╪ñ┘è╪⌐ ┘ê╪º╪¡╪»╪⌐. ┘à┘é╪»┘à╪⌐ ╪│┘è┘å┘à╪º╪ª┘è╪⌐ ┘ä╪╣╪º┘ä┘à KNOuX.', '╪┤╪║┘æ┘ä ╪º┘ä┘ü┘è┘ä┘à', '╪ú╪║┘ä┘é ╪º┘ä┘ü┘è┘ä┘à', '╪┤╪º┘ç╪» ╪╣┘ä┘ë YouTube', '╪º╪│╪¬┘â╪┤┘ü Build', '╪╣┘å╪» ╪º┘ä╪¬╪┤╪║┘è┘ä ┘è╪¬┘à ╪¬╪¡┘à┘è┘ä YouTube. ╪ú╪»┘ê╪º╪¬ ╪º┘ä╪¬╪┤╪║┘è┘ä ┘ê╪º┘ä╪¬╪▒╪¼┘à╪⌐ ╪»╪º╪«┘ä ╪º┘ä┘à╪┤╪║┘ä.'],
  ur: ['╪º╪╡┘ä ╪¿╪▒╪º┘å┌ê ┘ü┘ä┘à', '╪º█î┌⌐ ┘å╪ª█î ╪º╪¿╪¬╪»╪º', '╪ó┘╛ ┌⌐╪º ┌ê█î╪¼█î┘╣┘ä █ü█î┌ê┌⌐┘ê╪º╪▒┘╣╪▒█ö', '╪º█î┌⌐ ┘å╪╕╪º┘à╪î ╪º█î┌⌐ ┘ê┌ÿ┘å█ö KNOuX ┌⌐╪º ╪│┘å█î┘à╪º┘╣┌⌐ ╪¬╪╣╪º╪▒┘ü█ö', '┘ü┘ä┘à ┌å┘ä╪º╪ª█î┌║', '┘ü┘ä┘à ╪¿┘å╪» ┌⌐╪▒█î┌║', 'YouTube ┘╛╪▒ ╪»█î┌⌐┌╛█î┌║', 'Build ╪»╪▒█î╪º┘ü╪¬ ┌⌐╪▒█î┌║', '┌å┘ä╪º┘å█Æ ┘╛╪▒ YouTube ┘ä┘ê┌ê █ü┘ê┌»╪º█ö ┘╛┘ä█Æ ╪¿█î┌⌐ ╪º┘ê╪▒ ╪│╪¿ ┘╣╪º╪ª┘╣┘ä ┌⌐┘å┘╣╪▒┘ê┘ä ┘╛┘ä█î╪ª╪▒ ┘à█î┌║ █ü█î┌║█ö'],
} as const;

export function HomeCinema() {
  const language = useSiteLanguage();
  const [label, title, sub, desc, playLabel, closeLabel, watchLabel, buildLabel, privacy] = copy[language];
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const play = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const restorePlayFocus = useRef(false);

  useEffect(() => {
    if (playing) {
      // Keep an immediate keyboard exit outside the cross-origin player.
      // The next Tab enters YouTube's native controls in document order.
      const frame = requestAnimationFrame(() => close.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    if (restorePlayFocus.current) {
      restorePlayFocus.current = false;
      play.current?.focus();
    }
  }, [playing]);

  const openFilm = () => {
    setPlayerReady(false);
    setPlaying(true);
  };
  const closeFilm = () => {
    restorePlayFocus.current = true;
    setPlayerReady(false);
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
            {playing
              ? <button ref={close} type="button" className={styles.control} onClick={closeFilm}>{closeLabel}</button>
              : <span>ORIGINAL FILM / 01 ┬╖ 00:30</span>}
          </div>

          <div className={styles.screen} dir="ltr">
            {playing ? (
              <>
                <span
                  className={styles.still}
                  data-film-still=""
                  data-ready={playerReady}
                  aria-hidden="true"
                />
                <iframe
                  className={styles.player}
                  title={`KNOuX Store - ${title}`}
                  src={FILM_EMBED_URL}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  tabIndex={0}
                  onLoad={() => setPlayerReady(true)}
                />
              </>
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
              <a className={styles.control} href={FILM_WATCH_URL} target="_blank" rel="noopener noreferrer">
                {watchLabel} <span aria-hidden="true">Γåù</span>
              </a>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>{privacy}</p>
          <Link className={styles.control} href="/build">{buildLabel} <span aria-hidden="true">Γåù</span></Link>
        </footer>
      </div>
    </section>
  );
}
