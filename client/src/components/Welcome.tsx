import { BookOpen, FileText, Landmark, Scale, ShieldCheck, type LucideIcon } from "lucide-react";

interface WelcomeProps {
  onSuggestion: (text: string) => void;
}

interface Suggestion {
  icon: LucideIcon;
  title: string;
  description: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: ShieldCheck,
    title: "Understand My Legal Rights",
    description: "Fundamental rights every Indian should know",
    prompt: "What are my basic rights under Indian law? Explain with everyday examples.",
  },
  {
    icon: BookOpen,
    title: "Explain an Indian Law",
    description: "IPC vs Bharatiya Nyaya Sanhita, simply",
    prompt: "Explain the difference between the IPC and the Bharatiya Nyaya Sanhita in simple English.",
  },
  {
    icon: FileText,
    title: "Understand an FIR",
    description: "Step-by-step FIR filing procedure",
    prompt:
      "What is the procedure for filing an FIR in India? What can I do if the police refuse to register it?",
  },
  {
    icon: Landmark,
    title: "Civil and Criminal Law",
    description: "How the two systems actually differ",
    prompt: "Explain the difference between a civil case and a criminal case, with examples.",
  },
];

export default function Welcome({ onSuggestion }: WelcomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 scrollbar-thin">
      <div className="w-full max-w-2xl">
        {/* Crest */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/50 bg-navy shadow-[0_10px_30px_-10px_rgba(16,29,50,0.45)]">
            <Scale className="h-8 w-8 text-gold" strokeWidth={1.5} />
            <span className="absolute -bottom-1.5 h-px w-10 bg-gold/60" />
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-4xl">
            Understand the Law.
            <br />
            <span className="text-gold">Know Your Rights.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-charcoal/70">
            NyayaBot is your AI guide to Indian legal information. Ask about your rights, legal
            procedures, or any law in plain language — and get clear, structured answers instantly.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/70">
              Powered by Google Gemini · Indian Legal Focus
            </span>
          </div>
        </div>

        {/* Suggestion cards */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUGGESTIONS.map(({ icon: Icon, title, description, prompt }) => (
            <button
              key={title}
              onClick={() => onSuggestion(prompt)}
              className="group flex items-start gap-3.5 rounded-xl border border-navy/10 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,29,50,0.05),0_10px_28px_-18px_rgba(16,29,50,0.18)] transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_2px_4px_rgba(16,29,50,0.06),0_14px_32px_-14px_rgba(16,29,50,0.25)] active:translate-y-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition group-hover:bg-gold group-hover:text-navy">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-navy">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-charcoal/60">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
