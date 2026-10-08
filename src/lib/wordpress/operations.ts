/** Structured executor contract. No command, path, URL or credential is accepted from a browser. */
export const WORDPRESS_ACTIONS = ['site.probe', 'version', 'plugins.list', 'plugin.install', 'plugin.activate', 'plugin.update', 'themes.list', 'theme.install', 'theme.activate', 'core.update', 'backup', 'restore', 'migration', 'cache.flush', 'health', 'deploy'] as const;
export type WordPressAction = (typeof WORDPRESS_ACTIONS)[number];
export type WordPressOperationState = 'NOT_CONFIGURED' | 'EXECUTOR_NOT_CONNECTED' | 'AUTH_REQUIRED' | 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED';
export type WordPressOperation = { siteId: string; action: WordPressAction; slug?: string; reference?: string; activate?: boolean; requestId: string; confirmation?: string };

export function isWordPressMutation(action: WordPressAction) { return !['site.probe', 'version', 'plugins.list', 'themes.list', 'health'].includes(action); }
export function confirmationFor(operation: Pick<WordPressOperation, 'siteId' | 'action' | 'slug' | 'reference'>) { return `${operation.action}:${operation.siteId}:${operation.slug ?? operation.reference ?? ''}`; }

export function validateWordPressOperation(raw: unknown, siteIds: readonly string[]): WordPressOperation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Expected a structured operation.');
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => !['siteId', 'action', 'slug', 'reference', 'activate', 'requestId', 'confirmation'].includes(key))) throw new Error('Unsupported operation field.');
  if (typeof value.siteId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.siteId) || !siteIds.includes(value.siteId)) throw new Error('Select a configured site.');
  if (!WORDPRESS_ACTIONS.includes(value.action as WordPressAction)) throw new Error('Operation is not allowlisted.');
  if (typeof value.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.requestId)) throw new Error('A unique operation request ID is required.');
  const operation: WordPressOperation = { siteId: value.siteId, action: value.action as WordPressAction, requestId: value.requestId };
  if (/^(plugin|theme)\./.test(operation.action)) {
    if (typeof value.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.slug)) throw new Error('Choose a valid WordPress.org slug.');
    operation.slug = value.slug;
  } else if (value.slug !== undefined) throw new Error('This operation accepts no slug.');
  if (['restore', 'migration', 'deploy'].includes(operation.action)) {
    if (typeof value.reference !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(value.reference)) throw new Error('Choose a trusted executor reference. Paths and URLs are not accepted.');
    operation.reference = value.reference;
  } else if (value.reference !== undefined) throw new Error('This operation accepts no reference.');
  if (value.activate !== undefined) {
    if (operation.action !== 'plugin.install' || typeof value.activate !== 'boolean') throw new Error('Activation applies only to plugin installation.');
    operation.activate = value.activate;
  }
  if (isWordPressMutation(operation.action)) {
    if (value.confirmation !== confirmationFor(operation)) throw new Error('Review and explicitly confirm this exact operation.');
    operation.confirmation = value.confirmation;
  }
  return operation;
}
