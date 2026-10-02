'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function WorkspaceDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current; const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="dev-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}><header><span className="dev-mini-label">KNOuX / WORKSPACE</span><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></header><h2>{title}</h2>{children}</dialog>;
}
