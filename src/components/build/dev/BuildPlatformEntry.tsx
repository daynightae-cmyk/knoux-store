'use client';

/**
 * The preserved One Platform constellation (NSIS 82227), reachable at
 * /build/platform. It shares the entry chrome rules with the Welcome page:
 * while the constellation is on screen the workspace rail, status rail and
 * the shell's second particle mark rest.
 */
import { useEffect } from 'react';
import { OnePlatformPage } from './OnePlatformPage';

export function BuildPlatformEntry() {
  useEffect(() => {
    document.documentElement.setAttribute('data-build-constellation', '');
    window.dispatchEvent(new Event('knoux:build-surface'));
    return () => document.documentElement.removeAttribute('data-build-constellation');
  }, []);
  return <OnePlatformPage />;
}
