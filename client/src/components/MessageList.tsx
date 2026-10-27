import { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  conversationId: string;
  onRegenerate: () => void;
  onRetry: () => void;
}

export default function MessageList({
  messages,
  isGenerating,
  conversationId,
  onRegenerate,
  onRetry,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Re-stick when the conversation changes.
  useEffect(() => {
    stickToBottom.current = true;
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
  }, [conversationId]);

  // Auto-scroll to the newest content, unless the user scrolled up to read.
  useEffect(() => {
    if (stickToBottom.current) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
    }
  }, [messages]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant" && !m.error)?.id;

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 scrollbar-thin"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {messages.map((message, index) => (
          <div key={message.id} className="animate-fade-up">
            <MessageBubble
              message={message}
              isLastAssistant={message.id === lastAssistantId && index === messages.length - 1}
              isGenerating={isGenerating}
              onRegenerate={onRegenerate}
              onRetry={onRetry}
            />
          </div>
        ))}
        <div className="h-1 shrink-0" />
      </div>
    </div>
  );
}
