import { Router } from "express";
import { GEMINI_MODEL, isGeminiConfigured } from "../config.js";

export const healthRouter = Router();

/**
 * GET /api/health
 * Reports that the backend is running and whether Gemini is configured.
 * Never exposes the API key or any secret material.
 */
healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "nyayabot-server",
    time: new Date().toISOString(),
    configured: {
      geminiKey: isGeminiConfigured(),
      geminiModel: GEMINI_MODEL,
    },
    endpoints: ["/api/health", "/api/chat", "/api/chat/stream"],
  });
});
