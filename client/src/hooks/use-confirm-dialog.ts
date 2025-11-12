import { useState, useCallback } from "react";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: "",
    description: "",
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    setOptions({
      confirmLabel: "Confirmar",
      cancelLabel: "Cancelar",
      ...opts,
    });
    setIsOpen(true);
    setIsResolved(false);
    
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (isResolved || !resolvePromise) return;
    
    setIsOpen(false);
    setIsResolved(true);
    resolvePromise(true);
    setResolvePromise(null);
  }, [resolvePromise, isResolved]);

  const handleCancel = useCallback(() => {
    if (isResolved || !resolvePromise) return;
    
    setIsOpen(false);
    setIsResolved(true);
    resolvePromise(false);
    setResolvePromise(null);
  }, [resolvePromise, isResolved]);

  return {
    confirm,
    isOpen,
    options,
    handleConfirm,
    handleCancel,
  };
}
