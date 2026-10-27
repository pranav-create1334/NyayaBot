import type { ChatMessage } from "./types";

/**
 * API base URL. In development the Vite dev server proxies /api to the
 * Express backend, so no URL is hardcoded here. For production builds set
 * VITE_API_URL (without a trailing slash) at build time.
 */
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiHealth {
  ok: boolean;
  configured: { geminiKey: boolean; geminiModel: string };
}

export interface SendChatOptions {
  /** Validated message history to send to the backend. */
  history: ChatMessage[];
  /** Called with incremental (or, for the fallback, one full) text chunk. */
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

/** Fetches backend health/configuration status. */
export async function checkHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const res = await fetch(`${API_BASE}/api/health`, { signal });
  if (!res.ok) throw new ApiError(`Health check failed (${res.status})`, res.status);
  return (await res.json()) as ApiHealth;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let message = `Request failed (HTTP ${res.status})`;
  try {
    const data = (await res.json()) as { error?: string };
    if (data && typeof data.error === "string" && data.error.trim()) message = data.error;
  } catch {
    // Response was not JSON — keep the generic message.
  }
  return new ApiError(message, res.status);
}

/** Builds the server payload: only real (non-error) messages, bounded in size. */
function historyPayload(messages: ChatMessage[]) {
  return messages
    .filter((m) => !m.error && m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-24);
}

async function streamChat(
  payload: { messages: Array<{ role: string; content: string }> },
  options: SendChatOptions,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch (err) {
    if (options.signal?.aborted) throw err;
    throw new ApiError("Could not reach the NyayaBot server. Is the backend running?", 0);
  }

  if (!res.ok) throw await parseErrorResponse(res);
  if (!res.body) throw new ApiError("Streaming is not supported in this browser.", 0);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let received = false;
  let sawDone = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const line = event
        .split("\n")
        .find((l) => l.startsWith("data: "));
      if (!line) continue;
      let data: { type?: string; text?: string; message?: string };
      try {
        data = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      if (data.type === "delta" && typeof data.text === "string") {
        received = true;
        options.onDelta(data.text);
      } else if (data.type === "error") {
        throw new ApiError(data.message || "Gemini request failed.", 500);
      } else if (data.type === "done") {
        sawDone = true;
      }
    }
  }

  if (!received && !sawDone) {
    throw new ApiError("The server closed the connection unexpectedly. Please try again.", 0);
  }
}

async function plainChat(
  payload: { messages: Array<{ role: string; content: string }> },
  options: SendChatOptions,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch (err) {
    if (options.signal?.aborted) throw err;
    throw new ApiError("Could not reach the NyayaBot server. Is the backend running?", 0);
  }
  if (!res.ok) throw await parseErrorResponse(res);

  const data = (await res.json()) as { reply?: unknown };
  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new ApiError("Received an empty response from the AI. Please try again.", 502);
  }
  options.onDelta(data.reply);
}

/**
 * Sends the conversation to the backend and streams the reply.
 * Primary path is the SSE stream; on a transport-level failure (not a server
 * reported error) it falls back to the plain JSON endpoint once.
 */
export async function sendChatMessage(options: SendChatOptions): Promise<void> {
  const payload = { messages: historyPayload(options.history) };
  let receivedAny = false;
  const onDelta = (text: string) => {
    receivedAny = true;
    options.onDelta(text);
  };
  try {
    await streamChat(payload, { ...options, onDelta });
  } catch (err) {
    const transportFailure = err instanceof ApiError && err.status === 0;
    // Fall back to the plain endpoint only for a pre-content transport failure,
    // never for server-reported errors or a mid-stream drop (which would
    // duplicate already-rendered content).
    if (options.signal?.aborted || !transportFailure || receivedAny) throw err;
    await plainChat(payload, { ...options, onDelta });
  }
}
