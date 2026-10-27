import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Copy, RotateCcw, Scale, User } from "lucide-react";
import type { ChatMessage } from "../lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
  onRetry: () => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1" role="status" aria-label="NyayaBot is thinking">
      <span className="typing-dot h-2 w-2 rounded-full bg-gold" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-gold" style={{ animationDelay: "160ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-gold" style={{ animationDelay: "320ms" }} />
      <span className="ml-1 text-xs font-medium text-charcoal/50">NyayaBot is thinking…</span>
    </div>
  );
}

const markdownComponents = {
  a: ({ node, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-gold underline decoration-gold/50 underline-offset-2" />
  ),
};

function MessageBubbleInner({
  message,
  isLastAssistant,
  isGenerating,
  onRegenerate,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isError = message.error === true;
  const showTyping = message.pending && !message.content;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const ta = document.createElement("textarea");
        ta.value = message.content;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable — ignore silently.
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-2.5 sm:max-w-[75%]">
          <div className="rounded-2xl rounded-tr-md border border-navy/20 bg-navy px-4 py-3 text-[14px] leading-relaxed text-ivory shadow-[0_2px_10px_rgba(16,29,50,0.18)]">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-navy/15 bg-parchment">
            <User className="h-3.5 w-3.5 text-navy/70" strokeWidth={2} />
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-burgundy/30 bg-burgundy-soft">
          <AlertTriangle className="h-3.5 w-3.5 text-burgundy" strokeWidth={2} />
        </span>
        <div className="max-w-[85%] flex-1 rounded-2xl rounded-tl-md border border-burgundy/30 bg-burgundy-soft px-4 py-3 sm:max-w-[80%]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-burgundy">
            Request failed
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-charcoal/85">{message.content}</p>
          {!isGenerating && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-burgundy/40 bg-white px-3 py-1.5 text-xs font-semibold text-burgundy transition hover:bg-burgundy hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-navy">
        <Scale className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
      </span>
      <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
        <div className="rounded-2xl rounded-tl-md border border-gold/25 border-l-[3px] border-l-gold bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,29,50,0.05),0_8px_24px_-16px_rgba(16,29,50,0.2)]">
          {showTyping ? (
            <TypingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none text-charcoal prose-headings:font-display prose-headings:text-navy prose-headings:font-semibold prose-p:leading-relaxed prose-strong:text-navy prose-code:rounded prose-code:bg-parchment prose-code:px-1 prose-code:py-0.5 prose-code:text-[13px] prose-pre:bg-navy prose-pre:text-ivory prose-li:marker:text-gold prose-blockquote:border-l-gold prose-blockquote:text-charcoal/70">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {message.pending && message.content && (
            <span className="ml-0.5 inline-block h-3.5 w-2 animate-pulse rounded-sm bg-gold align-middle" />
          )}
        </div>

        {/* Message actions */}
        {!message.pending && message.content && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={handleCopy}
              title="Copy response"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-charcoal/55 transition hover:bg-navy/5 hover:text-navy"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" strokeWidth={2.4} /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" strokeWidth={2} /> Copy
                </>
              )}
            </button>
            {isLastAssistant && !isGenerating && (
              <button
                onClick={onRegenerate}
                title="Regenerate response"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-charcoal/55 transition hover:bg-navy/5 hover:text-navy"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleInner);
export default MessageBubble;
