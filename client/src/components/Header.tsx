import { Eraser, Info, Menu, Scale } from "lucide-react";

interface HeaderProps {
  title: string;
  canClear: boolean;
  onOpenMenu: () => void;
  onNewChat: () => void;
  onClear: () => void;
  onOpenInfo: () => void;
}

export default function Header({
  title,
  canClear,
  onOpenMenu,
  onNewChat,
  onClear,
  onOpenInfo,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-navy/10 bg-ivory/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="rounded-lg p-2 text-charcoal/70 transition hover:bg-navy/5 hover:text-navy lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <Scale className="h-4 w-4 text-gold" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-[15px] font-semibold tracking-wide text-navy">
          {title}
        </h2>
      </div>

      {canClear && (
        <button
          onClick={onClear}
          title="Clear this conversation"
          className="hidden items-center gap-1.5 rounded-lg border border-navy/12 px-3 py-1.5 text-xs font-medium text-charcoal/70 transition hover:border-burgundy/40 hover:bg-burgundy-soft hover:text-burgundy sm:flex"
        >
          <Eraser className="h-3.5 w-3.5" strokeWidth={2} />
          Clear
        </button>
      )}
      <button
        onClick={onNewChat}
        title="Start a new chat"
        className="hidden items-center gap-1.5 rounded-lg border border-gold/60 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-gold/20 sm:flex"
      >
        New Chat
      </button>
      <button
        onClick={onOpenInfo}
        aria-label="About and legal disclaimer"
        title="About & Legal Disclaimer"
        className="rounded-lg p-2 text-charcoal/60 transition hover:bg-navy/5 hover:text-navy"
      >
        <Info className="h-4 w-4" strokeWidth={2} />
      </button>
    </header>
  );
}
