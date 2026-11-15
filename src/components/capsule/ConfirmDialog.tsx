"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ds";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/** Asks before anything is removed from the device. */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onOpenChange }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-navy/60" />
        <AlertDialog.Popup style={{ background: "color-mix(in srgb, var(--navy) 92%, transparent)" }}
          className="glass fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-panel p-6 outline-none">
          <AlertDialog.Title className="text-lg font-medium text-cream">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-cream">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Close render={<Button variant="quiet" />}>Cancel</AlertDialog.Close>
            <Button
              variant="primary"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
