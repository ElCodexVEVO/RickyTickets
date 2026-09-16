import { Menu } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur lg:hidden">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-200 bg-white text-ink-700"
        aria-label="Abrir menú"
      >
        <Menu className="h-4.5 w-4.5" size={18} />
      </button>
      <div>
        <p className="font-display text-sm font-semibold text-ink-900">Danny Transfers</p>
        <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500">RickyTickets</p>
      </div>
    </header>
  );
}
