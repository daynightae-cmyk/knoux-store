/** Neutral line icons; route identity remains in the canonical area registry. */
export function CommandIcon({ code }: { code: string }) {
  const paths: Record<string, string> = {
    '01': 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    '02': 'M4 20V10 M12 20V4 M20 20v-7 M2 21h20',
    '03': 'M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13z M9 9a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    '04': 'M5 2h10l4 4v16H5z M9 10h6 M9 14h6 M9 18h4',
    '05': 'M8 10a4 4 0 1 0 0-8a4 4 0 1 0 0 8 M1 22v-4a7 7 0 0 1 14 0v4 M17 3a4 4 0 0 1 0 8 M18 15a6 6 0 0 1 5 6',
    '06': 'M3 10l18-7v18L3 14z M7 15l2 7h4l-2-8',
    '07': 'M3 4h18v14h-7l-5 4v-4H3z M7 9h10 M7 13h6',
    '08': 'M3 3h18v18H3z M3 17l6-6 5 5 3-3 4 4 M15 7h2',
    '09': 'M3 5h18v17H3z M7 2v6 M17 2v6 M3 11h18 M7 15h3 M14 18h3',
    '10': 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 1v5 M12 18v5 M1 12h5 M18 12h5 M4 4l4 4 M16 16l4 4 M4 20l4-4 M16 8l4-4',
    '11': 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    '12': 'M13 2L4 14h7l-1 8 10-13h-7z',
    '13': 'M9 15l6-6 M8 17l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0 M16 7l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0',
    '14': 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[code] ?? paths['01']} /></svg>;
}
