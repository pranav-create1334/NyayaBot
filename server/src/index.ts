import express from "express";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import "./config.js";
import { CLIENT_ORIGIN, GEMINI_MODEL, PORT, isGeminiConfigured } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: [CLIENT_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
  }),
);
app.use(express.json({ limit: "256kb" }));

app.use("/api", healthRouter);
app.use("/api", chatRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found." });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const type = (err as { type?: string; body?: string } | null)?.type;
  if (type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large." });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON in request body." });
    return;
  }
  console.error("[nyayabot] unhandled error:", err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(
    `[nyayabot] server listening on http://localhost:${PORT} — model: ${GEMINI_MODEL}, key configured: ${isGeminiConfigured()}`,
  );
});
