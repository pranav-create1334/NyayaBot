import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, KeyRound, RefreshCw } from "lucide-react";
import { ApiError, checkHealth, sendChatMessage } from "./lib/api";
import type { ChatMessage } from "./lib/types";
import { uid } from "./lib/uid";
import { useConversations } from "./hooks/useConversations";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Welcome from "./components/Welcome";
import MessageList from "./components/MessageList";
import Composer from "./components/Composer";
import InfoModal from "./components/InfoModal";

type BackendState =
  | { state: "checking" }
  | { state: "ok"; geminiKey: boolean; geminiModel: string }
  | { state: "down" };

function lastIndexOfUserMessage(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && !messages[i].error) return i;
  }
  return -1;
}

export default function App() {
  const {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    clearActiveMessages,
    appendMessage,
    updateMessage,
    removeMessage,
    truncateMessagesAfter,
  } = useConversations();

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [backend, setBackend] = useState<BackendState>({ state: "checking" });

  const abortRef = useRef<AbortController | null>(null);
  const messages = activeConversation?.messages ?? [];

  // Check backend health and configuration status on load (no secrets exposed).
  useEffect(() => {
    const controller = new AbortController();
    checkHealth(controller.signal)
      .then((health) =>
        setBackend({
          state: "ok",
          geminiKey: health.configured.geminiKey,
          geminiModel: health.configured.geminiModel,
        }),
      )
      .catch(() => setBackend({ state: "down" }));
    return () => controller.abort();
  }, []);

  /** Streams a completion for the given conversation and history. */
  const runCompletion = useCallback(
    async (conversationId: string, history: ChatMessage[]) => {
      const placeholderId = uid();
      appendMessage(conversationId, {
        id: placeholderId,
        role: "assistant",
        content: "",
        pending: true,
      });

      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      let accumulated = "";
      const applyAccumulated = () =>
        updateMessage(conversationId, placeholderId, { content: accumulated });

      try {
        await sendChatMessage({
          history,
          signal: controller.signal,
          onDelta: (text) => {
            accumulated += text;
            applyAccumulated();
          },
        });
        if (!accumulated.trim()) {
          updateMessage(conversationId, placeholderId, {
            content: "Received an empty response from the AI. Please try again.",
            error: true,
            pending: false,
          });
        } else {
          updateMessage(conversationId, placeholderId, { pending: false });
        }
      } catch (err) {
        if (controller.signal.aborted) {
          // User pressed Stop — keep whatever was generated, drop empty placeholders.
          if (accumulated.trim()) {
            updateMessage(conversationId, placeholderId, { pending: false });
          } else {
            removeMessage(conversationId, placeholderId);
          }
        } else {
          const message =
            err instanceof ApiError
              ? err.message
              : "Something went wrong while contacting the server. Please try again.";
          if (accumulated.trim()) {
            updateMessage(conversationId, placeholderId, { pending: false });
            appendMessage(conversationId, {
              id: uid(),
              role: "assistant",
              content: message,
              error: true,
            });
          } else {
            updateMessage(conversationId, placeholderId, {
              content: message,
              error: true,
              pending: false,
            });
          }
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [appendMessage, updateMessage, removeMessage],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating || backend.state === "down") return;

      let conversationId = activeConversation?.id ?? null;
      const priorMessages = activeConversation?.messages ?? [];
      if (!conversationId) conversationId = createConversation();

      const userMessage: ChatMessage = { id: uid(), role: "user", content: trimmed };
      appendMessage(conversationId, userMessage);
      setInput("");

      // History = snapshot before this turn + the new user message.
      const history = [...priorMessages, userMessage];
      await runCompletion(conversationId, history);
    },
    [activeConversation, backend.state, createConversation, appendMessage, isGenerating, runCompletion],
  );

  /** Removes everything after the last user message and regenerates the reply. */
  const handleRegenerate = useCallback(async () => {
    if (isGenerating || !activeConversation) return;
    const conversationId = activeConversation.id;
    const lastUserIndex = lastIndexOfUserMessage(activeConversation.messages);
    if (lastUserIndex === -1) return;

    const history = activeConversation.messages.slice(0, lastUserIndex + 1);
    truncateMessagesAfter(conversationId, lastUserIndex);
    await runCompletion(conversationId, history);
  }, [activeConversation, isGenerating, runCompletion, truncateMessagesAfter]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleNewChat = useCallback(() => {
    if (isGenerating) abortRef.current?.abort();
    setSidebarOpen(false);
    createConversation();
  }, [createConversation, isGenerating]);

  const handleSelect = useCallback(
    (id: string) => {
      if (isGenerating) abortRef.current?.abort();
      selectConversation(id);
      setSidebarOpen(false);
    },
    [selectConversation, isGenerating],
  );

  const handleClear = useCallback(() => {
    if (isGenerating) abortRef.current?.abort();
    clearActiveMessages();
  }, [clearActiveMessages, isGenerating]);

  const showWelcome = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-ivory">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onDelete={deleteConversation}
          onOpenInfo={() => setInfoOpen(true)}
        />
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 mobile-drawer shadow-2xl">
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={handleSelect}
              onNewChat={handleNewChat}
              onDelete={(id) => {
                deleteConversation(id);
              }}
              onOpenInfo={() => {
                setSidebarOpen(false);
                setInfoOpen(true);
              }}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={activeConversation?.title ?? "NyayaBot"}
          canClear={messages.length > 0}
          onOpenMenu={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
          onClear={handleClear}
          onOpenInfo={() => setInfoOpen(true)}
        />

        {/* Configuration / connectivity banners */}
        {backend.state === "down" && (
          <div className="flex items-center gap-2.5 border-b border-burgundy/30 bg-burgundy-soft px-4 py-2.5 text-[12.5px] text-charcoal sm:px-6">
            <AlertTriangle className="h-4 w-4 shrink-0 text-burgundy" strokeWidth={2} />
            <span className="min-w-0 flex-1">
              Cannot reach the NyayaBot server. Start the backend with{" "}
              <code className="rounded bg-navy/10 px-1 py-0.5 font-mono text-[11px]">npm run dev</code>{" "}
              and refresh.
            </span>
            <button
              onClick={() => window.location.reload()}
              className="flex shrink-0 items-center gap-1 rounded-md border border-burgundy/40 px-2 py-1 text-[11px] font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
            >
              <RefreshCw className="h-3 w-3" strokeWidth={2.2} /> Refresh
            </button>
          </div>
        )}
        {backend.state === "ok" && !backend.geminiKey && (
          <div className="flex items-center gap-2.5 border-b border-gold/40 bg-gold/10 px-4 py-2.5 text-[12.5px] text-charcoal sm:px-6">
            <KeyRound className="h-4 w-4 shrink-0 text-gold" strokeWidth={2} />
            <span className="min-w-0 flex-1">
              Gemini API key is not configured on the server. Add{" "}
              <code className="rounded bg-navy/10 px-1 py-0.5 font-mono text-[11px]">GEMINI_API_KEY</code>{" "}
              to <code className="rounded bg-navy/10 px-1 py-0.5 font-mono text-[11px]">.env.local</code>{" "}
              and restart the backend.
            </span>
          </div>
        )}

        {showWelcome ? (
          <Welcome onSuggestion={handleSend} />
        ) : (
          <MessageList
            messages={messages}
            isGenerating={isGenerating}
            conversationId={activeConversation?.id ?? ""}
            onRegenerate={handleRegenerate}
            onRetry={handleRegenerate}
          />
        )}

        <Composer
          value={input}
          isGenerating={isGenerating}
          disabled={backend.state === "down"}
          onChange={setInput}
          onSubmit={() => void handleSend(input)}
          onStop={handleStop}
        />
      </div>

      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
