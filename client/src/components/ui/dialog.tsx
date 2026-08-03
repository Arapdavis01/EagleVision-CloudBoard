import React, { Fragment, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, children, className }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div ref={overlayRef} className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-xl bg-gray-900 p-6 shadow-2xl border border-gray-800',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};
