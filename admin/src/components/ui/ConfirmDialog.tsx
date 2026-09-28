'use client';

import type { ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation for destructive actions. */
export default function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md" dismissible={!busy}>
      <div className="space-y-3 text-[14px] text-ink-2">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="btn btn-tinted">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-danger min-w-24">
          {busy ? <Spinner className="h-4 w-4" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
