import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../config.js";
import type { ServerChatMessage } from "../middleware/validateChat.js";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export class GeminiConfigError extends GeminiError {
  constructor(message: string) {
    super(message, 503);
    this.name = "GeminiConfigError";
  }
}

export const SYSTEM_INSTRUCTION = `You are NyayaBot, an AI-powered Indian legal information assistant. Your purpose is to help users genuinely understand Indian law — rights, procedures, legal concepts, and documents — in simple, clear language.

HOW TO ANSWER
- Give genuine, open-ended explanations. Use short headings, bullet points, numbered steps for procedures, and a small everyday example when it aids understanding.
- Explain legal jargon in plain English the first time you use it (e.g., "bail", "FIR", "writ", "mens rea").
- Maintain context across follow-up questions; do not repeat your previous answer verbatim. Refer back to what was already discussed.
- Ask one brief clarifying question when key facts or the user's state/jurisdiction are missing — but still provide useful general information in the same reply.
- Keep answers focused and readable; prefer 150–400 words unless the user asks for more depth.

ACCURACY AND HONESTY (critical)
- Laws in India depend on facts, jurisdiction (Central vs State), and the relevant date. Note this when it materially affects the answer.
- Refer to specific statutes (e.g., Constitution of India, Bharatiya Nyaya Sanhita 2023, Bharatiya Nagarik Suraksha Sanhita 2023, Code of Civil Procedure 1908) only when you are reasonably confident of the reference. NEVER invent section numbers, judgments, case citations, deadlines, or precedents.
- If you are unsure of a specific provision, say so plainly and describe the general legal position instead.
- Never claim you have checked the current law or official sources; suggest verifying through official sources such as the India Code website, e-Courts portal, or a qualified advocate.
- Provide official website links only when you are confident they are real and reliable; otherwise name the source instead of fabricating a URL.

SCOPE
- You focus on Indian law. If a question concerns another country's law, say you focus on India and, if straightforward, briefly note that the general concept may differ there.
- You provide general legal information and education — NOT legal advice, representation, or a substitute for a qualified advocate. When giving a substantive answer, add one short line reminding the user of this; do not refuse ordinary educational questions because of it.
- For urgent situations (arrest, police confrontation, violence, imminent court deadlines): first give brief, practical safety-and-priorities guidance including contacting a lawyer or free legal aid (District Legal Services Authority / NALSA) immediately, then continue with relevant general information.
- Politely decline to draft documents promising legal outcomes or to predict how a court will rule, while explaining the relevant general process instead.

Always respond in Markdown with clean structure.`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new GeminiConfigError(
      "Gemini is not configured on the server. Add GEMINI_API_KEY to the project's .env.local file and restart the backend.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return client;
}

/** Builds the Gemini request config. Attempt 0 may disable "thinking" for speed. */
const MODEL_LIKELY_THINKING = /2\.5|3\.\d/.test(GEMINI_MODEL);

function configFor(attempt: number) {
  const base = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.6,
    maxOutputTokens: 2048,
  };
  // 2.5-series models spend thinking tokens before answering — disabling the
  // budget makes replies dramatically faster. If the model rejects the
  // setting, withRetry falls back to attempt 1+ without it.
  if (attempt === 0 && MODEL_LIKELY_THINKING) {
    return { ...base, thinkingConfig: { thinkingBudget: 0 } };
  }
  return base;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientError(err: unknown): boolean {
  const status = statusOf(err);
  const msg = messageOf(err).toLowerCase();
  return status === 503 || status === 429 || /overloaded|unavailable|internal error/.test(msg);
}

/** Retries transient Gemini failures (overload / rate limit) with backoff. */
async function withRetry<T>(fn: (attempt: number) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const status = statusOf(err);
      // Some models reject thinkingConfig (or thinkingBudget: 0) — retry once
      // without it before giving up.
      const thinkingRejected =
        status === 400 &&
        /thinking|thinking_config|unknown name|unsupported field|invalid value/i.test(
          messageOf(err),
        );
      if (thinkingRejected && attempt === 0) continue; // retry once without thinkingConfig
      if (attempt === 2 || !isTransientError(err)) throw err;
      await sleep(attempt === 0 ? 900 : 2200);
    }
  }
  throw lastErr;
}

/** Converts validated chat history into Gemini `contents` format. */
export function toContents(messages: ServerChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));
}

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; code?: unknown; response?: { status?: unknown } } | null;
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  if (typeof e?.response?.status === "number") return e.response.status;
  return undefined;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Maps any Gemini/SDK failure to a safe, user-facing GeminiError (no secrets leaked). */
export function mapGeminiError(err: unknown): GeminiError {
  if (err instanceof GeminiError) return err;
  const status = statusOf(err);
  const msg = messageOf(err).toLowerCase();

  if (status === 429 || /quota|rate limit|resource_exhausted|rate_limit/.test(msg)) {
    return new GeminiError(
      "Gemini rate limit or free-tier quota reached. Please wait about a minute and try again.",
      429,
    );
  }
  if (
    status === 401 ||
    status === 403 ||
    /api key not valid|api_key_invalid|unauthenticated|permission denied|api_key_service_blocked/.test(msg)
  ) {
    return new GeminiError(
      "The configured Gemini API key is missing or invalid. Fix GEMINI_API_KEY in .env.local and restart the backend.",
      401,
    );
  }
  if (status === 404 || /not found .*model|model .*not found|is not supported/.test(msg)) {
    return new GeminiError(
      `The configured Gemini model "${GEMINI_MODEL}" is not available for this API key. Update GEMINI_MODEL in .env.local to a supported model.`,
      404,
    );
  }
  if (status === 503 || /overloaded|unavailable|internal error/.test(msg)) {
    return new GeminiError("Gemini is temporarily busy or overloaded. Please try again in a moment.", 503);
  }
  if (/safety|blocked|prohibited/.test(msg)) {
    return new GeminiError("The response was blocked by content safety filters. Try rephrasing your question.", 400);
  }
  if (status === 400) {
    return new GeminiError("Gemini rejected the request. Please rephrase your question and try again.", 400);
  }
  return new GeminiError("Gemini request failed. Please try again in a moment.", 502);
}

/** Non-streaming generation. Returns the full markdown reply. */
export async function generateReply(messages: ServerChatMessage[]): Promise<string> {
  const ai = getClient();
  try {
    const text = await withRetry(async (attempt) => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: toContents(messages),
        config: configFor(attempt),
      });
      const body = (response.text ?? "").trim();
      if (!body) {
        throw new GeminiError("Gemini returned an empty response. Please try again.", 502);
      }
      return body;
    });
    return text;
  } catch (err) {
    throw mapGeminiError(err);
  }
}

/** Streaming generation. Yields markdown text deltas as they arrive. */
export async function* streamReply(messages: ServerChatMessage[]): AsyncGenerator<string> {
  const ai = getClient();
  let stream: Awaited<ReturnType<typeof ai.models.generateContentStream>>;
  try {
    stream = await withRetry(async (attempt) =>
      ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: toContents(messages),
        config: configFor(attempt),
      }),
    );
  } catch (err) {
    throw mapGeminiError(err);
  }

  let emitted = 0;
  try {
    for await (const chunk of stream) {
      const text = (chunk.text ?? "").trim();
      if (text) {
        emitted += text.length;
        yield text;
      }
    }
  } catch (err) {
    throw mapGeminiError(err);
  }
  if (emitted === 0) {
    throw new GeminiError("Gemini returned an empty response. Please try again.", 502);
  }
}
