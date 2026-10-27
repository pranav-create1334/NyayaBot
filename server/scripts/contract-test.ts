/**
 * Contract test for the NyayaBot chat API.
 *
 * Runs the REAL request-validation middleware and the REAL SSE response
 * contract against a stubbed Gemini service (used when no valid API key is
 * available). It verifies:
 *   1. Non-streaming /api/chat returns the full reply.
 *   2. Conversation history (follow-up context) reaches the service intact.
 *   3. Streaming /api/chat/stream emits delta events + a final done event.
 *   4. Malformed requests are rejected with 400 before reaching the service.
 *
 * Run with:  npm run test -w server
 * (A live Gemini call still needs to be verified separately with a real key.)
 */
import express from "express";
import { validateChatRequest, type ServerChatMessage } from "../src/middleware/validateChat.js";

const PORT = 4099;
const base = `http://localhost:${PORT}`;

// ---- Stubbed Gemini service -------------------------------------------------
const serviceCalls: ServerChatMessage[][] = [];

function fakeReply(messages: ServerChatMessage[]): string {
  const last = messages[messages.length - 1].content;
  return [
    "## Answer",
    "",
    `- You asked: **${last}**`,
    `- Context turns received: ${messages.length}`,
    "",
    "This is a mocked response for contract testing.",
  ].join("\n");
}

async function* fakeStream(messages: ServerChatMessage[]): AsyncGenerator<string> {
  serviceCalls.push(messages);
  yield "**Bail** is the temporary release";
  yield " of an accused from custody, usually";
  yield " conditioned on appearing in court.";
}

// ---- Real app wiring (same shape as production routes) -----------------------
const app = express();
app.use(express.json({ limit: "256kb" }));

app.post("/api/chat", validateChatRequest, async (req, res) => {
  const messages: ServerChatMessage[] = (req as RequestWithChat).chat!.messages;
  serviceCalls.push(messages);
  res.json({ reply: fakeReply(messages) });
});

app.post("/api/chat/stream", validateChatRequest, async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  try {
    for await (const delta of fakeStream((req as RequestWithChat).chat!.messages)) {
      send({ type: "delta", text: delta });
    }
    send({ type: "done" });
  } catch (err) {
    send({ type: "error", message: String(err) });
  }
  res.end();
});

interface RequestWithChat {
  chat?: { messages: ServerChatMessage[] };
}

// ---- Assertions --------------------------------------------------------------
let failures = 0;
function assert(condition: boolean, name: string): void {
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}`);
  if (!condition) failures++;
}

const server = app.listen(PORT);
await new Promise((resolve) => server.on("listening", resolve));

async function post(path: string, body: unknown, raw?: boolean) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, text: raw ? await res.text() : await res.json() };
}

// 1. Non-streaming reply
const r1 = await post("/api/chat", {
  messages: [{ role: "user", content: "What is bail?" }],
});
assert(r1.status === 200, "non-stream: HTTP 200");
assert(String(r1.text.reply).includes("**What is bail?**"), "non-stream: reply echoes question");

// 2. Follow-up context passes full history
await post("/api/chat", {
  messages: [
    { role: "user", content: "What is an FIR?" },
    { role: "assistant", content: "An FIR is a First Information Report." },
    { role: "user", content: "How long does it take?" },
  ],
});
const ctxCall = serviceCalls[serviceCalls.length - 1];
assert(ctxCall.length === 3, "follow-up: 3 context turns sent");
assert(ctxCall[0].content === "What is an FIR?", "follow-up: earliest turn preserved");

// 3. SSE streaming contract
const s = await post(
  "/api/chat/stream",
  { messages: [{ role: "user", content: "Explain bail" }] },
  true,
);
const events = s.text
  .split("\n\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line.replace(/^data: /, "")));
const deltas = events.filter((e) => e.type === "delta");
assert(s.status === 200, "stream: HTTP 200");
assert(deltas.length === 3, "stream: 3 delta events");
assert(
  deltas.map((e) => e.text).join("") ===
    "**Bail** is the temporary release of an accused from custody, usually conditioned on appearing in court.",
  "stream: deltas concatenate to full reply",
);
assert(events[events.length - 1].type === "done", "stream: terminates with done event");

// 4. Validation rejections
const bad1 = await post("/api/chat", {}, true);
assert(bad1.status === 400, "validation: empty body rejected");
const bad2 = await post("/api/chat", '{"messages":[]}', true);
assert(bad2.status === 400, "validation: empty messages rejected");
const bad3 = await post("/api/chat", '{"messages":[{"role":"system","content":"hi"}]}', true);
assert(bad3.status === 400, "validation: invalid role rejected");
const bad4 = await post(
  "/api/chat",
  `{"messages":[{"role":"user","content":"${"x".repeat(9000)}"}]}`,
  true,
);
assert(bad4.status === 400, "validation: oversized message rejected");

server.closeAllConnections?.();
await new Promise<void>((resolve) => server.close(() => resolve()));
console.log(failures === 0 ? "\nALL CONTRACT TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
// Set the exit code and let the event loop drain naturally — calling
// process.exit() here crashes tsx on Windows (libuv win/async.c assertion).
process.exitCode = failures === 0 ? 0 : 1;
