import { redactSecrets } from '@/lib/security/redact';

export type PreviewObservation = { id: number; kind: 'log' | 'warn' | 'error' | 'resource'; message: string; at: string };
export function safePreviewText(value: unknown): string {
  // Do not serialize objects (request objects and errors can carry credentials).
  const text = typeof value === 'string' ? value : value === null ? 'null' : typeof value === 'number' || typeof value === 'boolean' ? String(value) : '[object withheld]';
  // Redact before truncating, so a credential that straddles the cut is still removed.
  return redactSecrets(text).slice(0, 400);
}
export function domName(element: Element): string {
  const label = element.getAttribute('aria-label'); if (label) return safePreviewText(label);
  const ids = element.getAttribute('aria-labelledby')?.split(/\s+/);
  if (ids?.length) return safePreviewText(ids.map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '').join(' ').trim());
  const labels = (element as HTMLInputElement).labels;
  if (labels?.length) return safePreviewText(Array.from(labels).map((l) => l.textContent).join(' ').trim());
  return safePreviewText(element.getAttribute('alt') ?? element.getAttribute('title') ?? element.textContent?.trim().slice(0, 160) ?? '');
}
export function domRole(element: Element): string {
  return element.getAttribute('role') ?? ({ A: element.hasAttribute('href') ? 'link' : 'generic', BUTTON: 'button', MAIN: 'main', NAV: 'navigation', HEADER: 'banner', FOOTER: 'contentinfo', H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading', INPUT: 'input', SELECT: 'combobox', TEXTAREA: 'textbox', IMG: 'img' } as Record<string, string>)[element.tagName] ?? 'generic';
}
/** Browser-only instrumentation, installed after load and restored when leaving Preview. */
export function observePreview(view: Window, report: (entry: PreviewObservation) => void): () => void {
  let sequence = 0;
  const emit = (kind: PreviewObservation['kind'], message: string) => report({ id: ++sequence, kind, message: safePreviewText(message), at: new Date().toISOString() });
  const console = (view as Window & { console: Console }).console;
  const originals = { log: console.log, warn: console.warn, error: console.error };
  const wrappers = Object.fromEntries((['log', 'warn', 'error'] as const).map((kind) => [kind, (...args: unknown[]) => { emit(kind, args.map(safePreviewText).join(' ')); originals[kind].apply(console, args); }])) as typeof originals;
  for (const kind of ['log', 'warn', 'error'] as const) console[kind] = wrappers[kind];
  const failure = (event: Event) => {
    if (event.target !== view && event.target instanceof (view as unknown as { Element: typeof Element }).Element) {
      const element = event.target as Element;
      // Report path only; URL query strings can carry credentials.
      const url = element.getAttribute('src') ?? element.getAttribute('href');
      let path = 'URL withheld'; try { if (url) path = new URL(url, view.location.href).pathname; } catch { /* unknown */ }
      emit('resource', `${element.tagName.toLowerCase()} failed to load: ${path}`);
    } else emit('error', (event as ErrorEvent).message || 'Browser error (details withheld)');
  };
  const rejection = () => emit('error', 'Unhandled promise rejection (details withheld)');
  view.addEventListener('error', failure, true); view.addEventListener('unhandledrejection', rejection);
  return () => { for (const kind of ['log', 'warn', 'error'] as const) if (console[kind] === wrappers[kind]) console[kind] = originals[kind]; view.removeEventListener('error', failure, true); view.removeEventListener('unhandledrejection', rejection); };
}
