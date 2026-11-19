'use client';
import { useEffect, useState } from 'react';
import s from './provider-hero.module.css';

export function ProviderAuthFeedback({celebration}: {celebration: {name: string; sequence: number} | null}) {
  const [dismissed, setDismissed] = useState(0);
  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setDismissed(celebration.sequence), 3200);
    return () => window.clearTimeout(timer);
  }, [celebration]);
  if (!celebration || celebration.sequence === dismissed) return null;
  return <div key={celebration.sequence} className={s.authFeedback} data-provider-auth-feedback role="status">
    <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path className={s.boltHalo} d="M850 0 704 115 736 141 575 219 616 242 500 350 M704 115 650 91 604 100 M575 219 493 188 438 205 M616 242 697 287 735 282"/>
      <path className={s.boltLine} d="M850 0 704 115 736 141 575 219 616 242 500 350 M704 115 650 91 604 100 M575 219 493 188 438 205 M616 242 697 287 735 282"/>
    </g></svg><div className={s.authReceipt}><strong>{celebration.name} verified</strong><span>Authentication &amp; model discovery confirmed. Generation not tested.</span></div>
  </div>;
}
