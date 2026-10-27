import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";

interface ComposerProps {
  value: string;
  isGenerating: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
}

const MAX_INPUT_LENGTH = 8000;

export default function Composer({
  value,
  isGenerating,
  disabled = false,
  onChange,
  onSubmit,
  onStop,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea with content, up to a sensible cap.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const canSend = !disabled && !isGenerating && value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <div className="border-t border-navy/10 bg-ivory px-4 pb-4 pt-3 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div
          className={`flex items-end gap-2 rounded-2xl border bg-white p-2 pl-4 shadow-[0_2px_6px_rgba(16,29,50,0.06),0_14px_34px_-20px_rgba(16,29,50,0.25)] transition focus-within:border-gold/60 focus-within:shadow-[0_2px_6px_rgba(16,29,50,0.06),0_16px_38px_-18px_rgba(197,161,93,0.45)] ${
            disabled ? "opacity-60" : ""
          }`}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, MAX_INPUT_LENGTH))}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask any question about Indian law…"
            aria-label="Message NyayaBot"
            disabled={disabled}
            className="max-h-[180px] min-h-[24px] flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-relaxed text-charcoal outline-none placeholder:text-charcoal/40"
          />
          {isGenerating ? (
            <button
              onClick={onStop}
              title="Stop generating"
              aria-label="Stop generating"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-burgundy/40 bg-burgundy-soft text-burgundy transition hover:bg-burgundy hover:text-white"
            >
              <Square className="h-3.5 w-3.5" strokeWidth={2.5} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSend}
              title="Send message (Enter)"
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-gold shadow-[0_2px_10px_rgba(16,29,50,0.3)] transition enabled:hover:bg-charcoal enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.4} />
            </button>
          )}
        </div>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-charcoal/45">
          NyayaBot provides general legal information, not legal advice. For your specific situation,
          please consult a qualified advocate.
        </p>
      </div>
    </div>
  );
}
