import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface ServerChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 8000;

interface ChatRequestBody {
  messages?: unknown;
}

/**
 * Validates and normalizes the conversation history sent by the frontend.
 * Rejects malformed, oversized, or empty requests with clear 400 responses.
 */
export const validateChatRequest: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const body = (req.body ?? {}) as ChatRequestBody;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ error: "Request body must be a JSON object." });
    return;
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    res
      .status(400)
      .json({ error: "'messages' must be a non-empty array of { role, content } objects." });
    return;
  }

  if (rawMessages.length > 40) {
    res.status(400).json({ error: "Conversation history is too large. Please start a new chat." });
    return;
  }

  const cleaned: ServerChatMessage[] = [];
  for (const entry of rawMessages) {
    const msg = entry as { role?: unknown; content?: unknown };
    if (
      !msg ||
      typeof msg !== "object" ||
      (msg.role !== "user" && msg.role !== "assistant") ||
      typeof msg.content !== "string"
    ) {
      res.status(400).json({
        error:
          "Every message must be an object with role 'user' or 'assistant' and a non-empty string 'content'.",
      });
      return;
    }
    const content = msg.content.trim();
    if (!content) {
      res.status(400).json({ error: "Message content cannot be empty." });
      return;
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({
        error: `Message content exceeds the ${MAX_MESSAGE_LENGTH}-character limit. Please shorten it.`,
      });
      return;
    }
    cleaned.push({ role: msg.role, content });
  }

  if (cleaned[cleaned.length - 1].role !== "user") {
    res
      .status(400)
      .json({ error: "The last message in 'messages' must be from the user." });
    return;
  }

  // Keep the request bounded: only the most recent turns matter for context.
  const trimmed = cleaned.slice(-MAX_MESSAGES);
  (req as Request & { chat?: { messages: ServerChatMessage[] } }).chat = { messages: trimmed };
  next();
};
