import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;

  // Se monta en un portal para escapar de cualquier stacking context de sus
  // ancestros (topbar sticky, animaciones de transición de página, etc.) y
  // así garantizar que siempre quede por encima de todo.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-carbon-950/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] w-full ${width} flex-col rounded-2xl bg-white shadow-xl animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cream-200 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-cream-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-cream-200 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
