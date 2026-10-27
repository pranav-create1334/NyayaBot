import { Plus, Scale, Trash2, Info, MessageSquare, X } from "lucide-react";
import type { Conversation } from "../lib/types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onOpenInfo: () => void;
  onClose?: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onOpenInfo,
  onClose,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[290px] shrink-0 flex-col border-r border-gold/15 bg-navy text-ivory">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-gold/15 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-navy-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Scale className="h-5 w-5 text-gold" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-wide text-ivory">
            Nyaya<span className="text-gold">Bot</span>
          </h1>
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-ivory/50">
            Understand the Law.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-ivory/60 transition hover:bg-white/10 hover:text-ivory lg:hidden"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* New chat */}
      <div className="px-4 pt-4">
        <button
          onClick={onNewChat}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-[0_2px_12px_rgba(197,161,93,0.25)] transition hover:bg-gold-light hover:shadow-[0_4px_16px_rgba(197,161,93,0.35)] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4 transition group-hover:rotate-90" strokeWidth={2.4} />
          New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="mt-5 flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-ivory/40">
          Recent Conversations
        </p>
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-ivory/40">
            No conversations yet.
            <br />
            Ask your first legal question.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeId;
              return (
                <li key={conversation.id} className="group relative">
                  <button
                    onClick={() => onSelect(conversation.id)}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive
                        ? "border-l-2 border-gold bg-white/[0.07]"
                        : "border-l-2 border-transparent hover:bg-white/[0.05]"
                    }`}
                  >
                    <MessageSquare
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isActive ? "text-gold" : "text-ivory/35"}`}
                      strokeWidth={2}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] font-medium ${isActive ? "text-ivory" : "text-ivory/75"}`}
                      >
                        {conversation.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-ivory/35">
                        {formatRelativeTime(conversation.updatedAt)} · {conversation.messages.length}{" "}
                        {conversation.messages.length === 1 ? "msg" : "msgs"}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(conversation.id)}
                    aria-label={`Delete conversation: ${conversation.title}`}
                    title="Delete conversation"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ivory/40 opacity-0 transition hover:bg-burgundy/30 hover:text-burgundy-soft focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gold/15 p-4">
        <button
          onClick={onOpenInfo}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-ivory/60 transition hover:bg-white/[0.06] hover:text-ivory"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
          About &amp; Legal Disclaimer
        </button>
        <p className="mt-1 px-3 text-[10px] leading-relaxed text-ivory/30">
          General legal information only — not legal advice.
        </p>
      </div>
    </aside>
  );
}
