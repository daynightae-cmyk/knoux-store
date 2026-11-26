'use client';

import { useEffect, useRef, useState } from 'react';
import { listStudioDrafts, openStudioDraft, WordPressStudioRequestError, writeStudioDraft } from '@/lib/wordpress/studio-client';
import { isWordPressDraftId, type WordPressDraft, type WordPressDraftDocument, type WordPressDraftSummary } from '@/lib/wordpress/site-drafts';

const SESSION_DRAFT = 'knoux-wordpress-active-draft';

export function StudioDraftControls({ visible, title, snapshot, onRestore }: {
  visible: boolean;
  title: string | (() => string);
  snapshot: (previous: WordPressDraftDocument | undefined) => WordPressDraftDocument;
  onRestore: (draft: WordPressDraft) => void;
}) {
  const [draft, setDraft] = useState<WordPressDraft>();
  const [items, setItems] = useState<WordPressDraftSummary[]>([]);
  const [offset, setOffset] = useState<number | null>(0);
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState(true);
  const creationId = useRef<string | undefined>(undefined);
  const busy = useRef(false);

  useEffect(() => {
    let id: string | null;
    try { id = sessionStorage.getItem(SESSION_DRAFT); } catch { id = null; }
    if (!isWordPressDraftId(id)) {
      void Promise.resolve().then(() => setRestoring(false));
      return;
    }
    const controller = new AbortController();
    void openStudioDraft(id, controller.signal).then((saved) => {
      if (controller.signal.aborted) return;
      setDraft(saved);
      onRestore(saved);
      setMessage('Saved draft restored.');
    }).catch((error) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Draft could not be restored.');
    }).finally(() => {
      if (!controller.signal.aborted) setRestoring(false);
    });
    return () => controller.abort();
  }, [onRestore]);

  function select(saved: WordPressDraft, restore: boolean) {
    setDraft(saved);
    if (restore) onRestore(saved);
    setConflict(false);
    try { sessionStorage.setItem(SESSION_DRAFT, saved.id); } catch { /* Tab persistence is optional. */ }
  }

  async function run(operation: () => Promise<void>) {
    if (busy.current || restoring) return;
    busy.current = true;
    setPending(true);
    setMessage('');
    try { await operation(); } catch (error) {
      if (error instanceof WordPressStudioRequestError && error.status === 409) setConflict(true);
      setMessage(error instanceof Error ? error.message : 'Draft operation could not be confirmed.');
    } finally { busy.current = false; setPending(false); }
  }

  function save() {
    void run(async () => {
      const payload = { id: draft?.id ?? (creationId.current ??= crypto.randomUUID()), title: typeof title === 'function' ? title() : title, document: snapshot(draft?.document) };
      const saved = await writeStudioDraft(draft ? { ...payload, expectedRevision: draft.revision } : payload);
      select(saved, false);
      setMessage('Draft saved.');
    });
  }

  function load(id: string) {
    void run(async () => {
      select(await openStudioDraft(id), true);
      setMessage('Saved draft restored.');
    });
  }

  function list(start: number) {
    void run(async () => {
      const collection = await listStudioDrafts(start);
      setItems((previous) => start === 0 ? collection.drafts : [...previous, ...collection.drafts]);
      setOffset(collection.nextOffset);
      if (start === 0 && !collection.drafts.length) setMessage('No saved drafts.');
    });
  }

  return (
    <section hidden={!visible} aria-label="WordPress draft storage">
      <button type="button" disabled={pending || restoring || conflict} onClick={save}>Save site draft</button>
      <button type="button" disabled={pending || restoring} onClick={() => list(0)}>List saved drafts</button>
      {items.map((item) => (
        <button key={item.id} type="button" disabled={pending} onClick={() => load(item.id)}>Open {item.title}</button>
      ))}
      {offset ? <button type="button" disabled={pending} onClick={() => list(offset)}>More drafts</button> : null}
      {conflict && draft ? (
        <button type="button" disabled={pending} onClick={() => load(draft.id)}>Discard local changes and reload saved draft</button>
      ) : null}
      <p role="status">{pending ? 'Working with draft storage…' : message}</p>
    </section>
  );
}
