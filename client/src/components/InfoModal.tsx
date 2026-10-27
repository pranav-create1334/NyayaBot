import { Scale, X } from "lucide-react";

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InfoModal({ open, onClose }: InfoModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="About NyayaBot"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gold/30 bg-ivory p-6 shadow-2xl scrollbar-thin sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/40 bg-navy">
              <Scale className="h-5 w-5 text-gold" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-navy">About NyayaBot</h2>
              <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal/50">
                Understand the Law. Know Your Rights.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-charcoal/60 transition hover:bg-navy/5 hover:text-navy"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="prose prose-sm max-w-none text-charcoal">
          <p>
            <strong className="text-navy">NyayaBot</strong> is an AI-powered assistant for Indian
            legal <em>information and education</em>. It answers questions about rights, procedures,
            laws, and legal concepts in simple language, powered by Google Gemini.
          </p>

          <h3 className="text-navy">Important Legal Disclaimer</h3>
          <ul>
            <li>
              NyayaBot provides <strong>general legal information</strong>, not legal advice. It is
              not a substitute for a qualified advocate, and it does not create an
              attorney–client relationship.
            </li>
            <li>
              Applicable laws depend on your <strong>facts, jurisdiction, and the relevant
              date</strong>. Information may be incomplete or out of date — always verify important
              matters through official sources (such as the India Code website, e-Courts portal, or
              government legal services websites) or a qualified advocate.
            </li>
            <li>
              NyayaBot avoids inventing statutory sections or judgments, but AI responses can still
              contain mistakes. Double-check anything you rely on.
            </li>
            <li>
              In an <strong>urgent situation</strong> (arrest, police confrontation, violence, or an
              imminent deadline), contact a lawyer or free legal aid — the District Legal Services
              Authority (DLSA) or the National Legal Services Authority (NALSA) — immediately.
            </li>
          </ul>

          <h3 className="text-navy">How It Works</h3>
          <ul>
            <li>
              Conversations are stored only in <strong>your browser</strong> (localStorage). There
              is no database and nothing is uploaded to a third-party server.
            </li>
            <li>
              Your messages are sent to the NyayaBot backend, which forwards them to the Google
              Gemini API to generate answers. The API key is stored securely on the backend only.
            </li>
            <li>
              Clearing a conversation or deleting it from the sidebar permanently removes it from
              your browser.
            </li>
          </ul>

          <p className="text-xs text-charcoal/50">
            NyayaBot is a college project prototype built for educational demonstration purposes.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-gold/50 bg-gold py-2.5 text-sm font-semibold text-navy transition hover:bg-gold-light"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
