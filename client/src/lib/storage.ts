import type { Conversation, GeminiConfigStatus } from "./types";

const STORAGE_KEY = "nyayabot.conversations.v1";

const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export interface PersistedState {
  conversations: Conversation[];
  activeId: string | null;
}

export function emptyState(): PersistedState {
  return { conversations: [], activeId: null };
}

function isValidConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<Conversation>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    typeof c.title === "string" &&
    typeof c.createdAt === "number" &&
    typeof c.updatedAt === "number" &&
    Array.isArray(c.messages) &&
    c.messages.every(
      (m) =>
        !!m &&
        typeof m.id === "string" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
  );
}

function clampConversation(c: Conversation): Conversation {
  const messages = c.messages.length > MAX_MESSAGES_PER_CONVERSATION
    ? c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION)
    : c.messages;
  return { ...c, messages };
}

/**
 * Loads conversations from localStorage. Any malformed or tampered data
 * results in a clean empty state instead of crashing the app.
 */
export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyState();

    const data = parsed as { conversations?: unknown; activeId?: unknown };
    const conversations = Array.isArray(data.conversations)
      ? data.conversations.filter(isValidConversation).map(clampConversation)
      : [];
    const activeId =
      typeof data.activeId === "string" &&
      conversations.some((c) => c.id === data.activeId)
        ? data.activeId
        : (conversations[0]?.id ?? null);
    return { conversations, activeId };
  } catch {
    return emptyState();
  }
}

/** Persists the state, trimming old conversations to protect localStorage. */
export function saveState(state: PersistedState): void {
  try {
    const trimmed: PersistedState = {
      ...state,
      conversations: state.conversations.slice(0, MAX_CONVERSATIONS),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage may be full or blocked (private mode) — the app still works in-memory.
  }
}

export interface ApiHealth {
  ok: boolean;
  service: string;
  configured: GeminiConfigStatus;
}
