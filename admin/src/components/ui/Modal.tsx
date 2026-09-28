'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  /** false while a request is in flight: Esc and backdrop clicks are ignored. */
  dismissible?: boolean;
}

/** Native <dialog>: focus trap, Esc to close and top-layer stacking for free. */
export default function Modal({ open, onClose, title, children, width = 'max-w-lg', dismissible = true }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => !dismissible && e.preventDefault()}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(e) => dismissible && e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={`sheet m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${width} rounded-card border-0 p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-pop-in`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-[19px] font-semibold tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} disabled={!dismissible} className="icon-btn -mr-2 -mt-1" aria-label="Close">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
