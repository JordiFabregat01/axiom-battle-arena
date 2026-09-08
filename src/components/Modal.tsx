import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  closable?: boolean;
}

/** Native <dialog> modal with entry/exit transitions defined in CSS. */
export function Modal({ open, onClose, children, wide, closable = true }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); if (closable) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape' && closable) { e.preventDefault(); onClose(); } }}
      onClick={(e) => { if (closable && e.target === ref.current) onClose(); }}
    >
      <div className="modal-body">{open && children}</div>
      {closable && (
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
      )}
    </dialog>
  );
}
