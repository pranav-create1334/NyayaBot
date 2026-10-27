import { Router } from "express";
import type { Request, Response } from "express";
import { validateChatRequest, type ServerChatMessage } from "../middleware/validateChat.js";
import {
  GeminiConfigError,
  GeminiError,
  generateReply,
  streamReply,
} from "../services/gemini.js";

export const chatRouter = Router();

interface RequestWithChat extends Request {
  chat?: { messages: ServerChatMessage[] };
}

function sendChatError(res: Response, err: unknown): void {
  if (err instanceof GeminiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  // Unexpected failure: log server-side, return a generic safe message.
  console.error("[nyayabot] unexpected chat error:", err);
  res.status(500).json({ error: "Unexpected server error. Please try again." });
}

/**
 * POST /api/chat
 * Body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
 * Returns: { reply: string } — full markdown response from Gemini.
 */
chatRouter.post("/chat", validateChatRequest, async (req: RequestWithChat, res) => {
  try {
    const reply = await generateReply(req.chat!.messages);
    res.json({ reply });
  } catch (err) {
    sendChatError(res, err);
  }
});

/**
 * POST /api/chat/stream
 * Same request body as /api/chat, but responds with Server-Sent Events:
 *   data: {"type":"delta","text":"..."}   (many times)
 *   data: {"type":"error","message":"..."} (on failure)
 *   data: {"type":"done"}
 */
chatRouter.post("/chat/stream", validateChatRequest, async (req: RequestWithChat, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (payload: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Detect client disconnect via the response socket (req "close" fires early
  // once the JSON body has been consumed, so it cannot be used here).
  let closed = false;
  res.on("close", () => {
    closed = true;
  });

  try {
    for await (const delta of streamReply(req.chat!.messages)) {
      if (closed) break;
      send({ type: "delta", text: delta });
    }
    if (!closed) send({ type: "done" });
  } catch (err) {
    const message =
      err instanceof GeminiError
        ? err.message
        : err instanceof GeminiConfigError
          ? err.message
          : "Gemini request failed. Please try again in a moment.";
    if (!(err instanceof GeminiError)) {
      console.error("[nyayabot] unexpected stream error:", err);
    }
    if (!closed) send({ type: "error", message });
  } finally {
    res.end();
  }
});
