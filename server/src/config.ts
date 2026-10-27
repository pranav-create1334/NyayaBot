import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

/**
 * Loads the root-level .env.local explicitly (falls back to nearby .env files).
 * The server is started via `npm run dev -w server`, so cwd is <root>/server —
 * therefore we probe both the server dir and the project root.
 */
const candidates = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "..", ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
];

const envFile = candidates.find((p) => fs.existsSync(p));
if (envFile) {
  dotenv.config({ path: envFile, override: false });
  console.log(`[nyayabot] environment loaded from ${path.relative(process.cwd(), envFile) || envFile}`);
} else {
  console.warn("[nyayabot] no .env.local found — Gemini will be unconfigured. See .env.example.");
}

export const GEMINI_API_KEY = (process.env.GEMINI_API_KEY ?? "").trim();
export const GEMINI_MODEL = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();
export const PORT = Number(process.env.PORT ?? 4000);
export const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173").trim();

/** True only when a plausible API key is present. Never log or return the key itself. */
export function isGeminiConfigured(): boolean {
  // Reload-safe: tsx watch re-runs this module on restart.
  return GEMINI_API_KEY.length > 10;
}
