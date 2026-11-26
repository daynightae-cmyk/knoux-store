import type { ReactNode } from 'react';
import { WordPressCosmos } from '@/components/wordpress/WordPressCosmos';
import { WordPressMasthead } from '@/components/wordpress/WordPressMasthead';
import './wordpress-cosmos.css';

/**
 * Every WordPress surface shares the Build universe: one living sky (stars,
 * nebula banks, drifting worlds, storms, real-clock day/night) fixed behind
 * the whole division, plus the same event pulses when the visitor does
 * something real. The canvas is decorative and click-through; content keeps
 * its own glass panels and legibility.
 */
export default function WordPressLayout({ children }: { children: ReactNode }) {
  return (
    <div className="wp-cosmos">
      <WordPressCosmos />
      <WordPressMasthead />
      {children}
    </div>
  );
}
