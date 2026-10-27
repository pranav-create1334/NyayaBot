import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, Conversation } from "../lib/types";
import { loadState, saveState, type PersistedState } from "../lib/storage";
import { uid } from "../lib/uid";

function titleFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "New Chat";
}

function bump(conversation: Conversation): Conversation {
  return { ...conversation, updatedAt: Date.now() };
}

/**
 * Owns all conversation state and localStorage persistence.
 * Every mutation immediately re-persists, so a refresh always restores
 * the exact state the user left behind.
 */
export function useConversations() {
  const [state, setState] = useState<PersistedState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeConversation = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state],
  );

  const createConversation = useCallback((): string => {
    const conversation: Conversation = {
      id: uid(),
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setState((s) => ({
      conversations: [conversation, ...s.conversations],
      activeId: conversation.id,
    }));
    return conversation.id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setState((s) => (s.activeId === id ? s : { ...s, activeId: id }));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setState((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      const activeId =
        s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
      return { conversations, activeId };
    });
  }, []);

  const clearActiveMessages = useCallback(() => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === s.activeId
          ? { ...c, messages: [], title: "New Chat", updatedAt: Date.now() }
          : c,
      ),
    }));
  }, []);

  const appendMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const hasUserMessage = c.messages.some((m) => m.role === "user" && !m.error);
        const title =
          message.role === "user" && !hasUserMessage && (c.title === "New Chat" || !c.title)
            ? titleFromText(message.content)
            : c.title;
        return bump({ ...c, title, messages: [...c.messages, message] });
      }),
    }));
  }, []);

  const updateMessage = useCallback(
    (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? bump({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, ...patch } : m,
                ),
              })
            : c,
        ),
      }));
    },
    [],
  );

  const removeMessage = useCallback((conversationId: string, messageId: string) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? bump({ ...c, messages: c.messages.filter((m) => m.id !== messageId) })
          : c,
      ),
    }));
  }, []);

  /** Keeps messages[0..keepIndex] and drops everything after it. */
  const truncateMessagesAfter = useCallback(
    (conversationId: string, keepIndex: number) => {
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? bump({ ...c, messages: c.messages.slice(0, keepIndex + 1) })
            : c,
        ),
      }));
    },
    [],
  );

  return {
    conversations: state.conversations,
    activeId: state.activeId,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    clearActiveMessages,
    appendMessage,
    updateMessage,
    removeMessage,
    truncateMessagesAfter,
  };
}
