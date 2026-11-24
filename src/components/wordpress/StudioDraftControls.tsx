'use client';

import { useEffect, useRef, useState } from 'react';
import { listStudioDrafts, openStudioDraft, WordPressStudioRequestError, writeStudioDraft } from '@/lib/wordpress/studio-client';
import { isWordPressDraftId, type WordPressDraft, type WordPressDraftDocument, type WordPressDraftSummary } from '@/lib/wordpress/site-drafts';

const SESSION_DRAFT = 'knoux-wordpress-active-draft';

export function StudioDraftControls({ visible, title, snapshot, onRestore }: {
  visible: boolean;
  title: string;
  snapshot: (previous: WordPressDraftDocument | undefined) => WordPressDraftDocument;
  onRestore: (draft: WordPressDraft) => void;
}) {
  const [draft, setDraft] = useState<WordPressDraft>();
  const [items, setItems] = useState<WordPressDraftSummary[]>([]);
  const [offset, setOffset] = useState<number | null>(0);
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const creationId = useRef<string | undefined>(undefined);

  useEffect(() => {
    let id: string | null;
    try { id = sessionStorage.getItem(SESSION_DRAFT); } catch { return; }
    if (!isWordPressDraftId(id)) return;
    const controller = new AbortController();
    void openStudioDraft(id, controller.signal).then((saved) => {
      if (controller.signal.aborted) return;
      setDraft(saved);
      onRestore(saved);
      setMessage('Saved draft restored.');
    }).catch((error) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Draft could not be restored.');
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
    if (pending) return;
    setPending(true);
    setMessage('');
    try { await operation(); } catch (error) {
      if (error instanceof WordPressStudioRequestError && error.status === 409) setConflict(true);
      setMessage(error instanceof Error ? error.message : 'Draft operation could not be confirmed.');
    } finally { setPending(false); }
  }

  function save() {
    const payload = { id: draft?.id ?? (creationId.current ??= crypto.randomUUID()), title, document: snapshot(draft?.document) };
    void run(async () => {
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
      <button type="button" disabled={pending || conflict} onClick={save}>Save site draft</button>
      <button type="button" disabled={pending} onClick={() => list(0)}>List saved drafts</button>
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
