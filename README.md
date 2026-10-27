# NyayaBot — AI-Powered Indian Legal Chatbot

**Understand the Law. Know Your Rights.**

NyayaBot is a ChatGPT-style web application focused on **Indian legal information**, built as a
college project prototype. Ask questions about your rights, laws, procedures, and legal documents
in natural language and get clear, structured answers from Google Gemini — with full conversation
context for follow-ups.

## Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Frontend         | React 19 + Vite + TypeScript                      |
| Styling          | Tailwind CSS v4 (custom legal-themed palette)     |
| Icons            | lucide-react                                      |
| Markdown         | react-markdown + remark-gfm                       |
| Backend          | Node.js + Express.js (TypeScript, ESM)            |
| AI               | Google Gemini via official `@google/genai` SDK    |
| Persistence      | Browser localStorage (no database)                |

> There is **no database** by design — conversations live only in your browser.

## Project Structure

```
nyayabot/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Sidebar, Header, Welcome, MessageList, MessageBubble, Composer, InfoModal
│       ├── hooks/           # useConversations (state + localStorage)
│       ├── lib/             # api.ts (streaming client), storage.ts, types.ts, uid.ts
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css        # Tailwind theme (navy / ivory / gold / burgundy)
├── server/                  # Express backend
│   └── src/
│       ├── routes/          # health.ts, chat.ts (REST + SSE streaming)
│       ├── services/        # gemini.ts (SDK integration, system instruction, error mapping)
│       ├── middleware/      # validateChat.ts (request validation & history limits)
│       ├── config.ts        # .env.local loading
│       └── index.ts
├── .env.local               # your real secrets (git-ignored)
├── .env.example             # placeholders only
├── .gitignore
├── package.json             # root: workspaces + scripts (concurrently)
└── README.md
```

## Quick Start

### 1. Install dependencies (one command, all workspaces)

```bash
npm install
```

### 2. Configure your Gemini API key

Create/copy the root-level **`.env.local`** file (already present, git-ignored):

```env
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Get a free key at [Google AI Studio](https://aistudio.google.com/apikey). The key lives **only on
the backend** — it is never exposed to the frontend, never sent in API responses, and never logged.

### 3. Run frontend + backend together

```bash
npm run dev
```

This starts:

- **Backend** → http://localhost:4000 (Express + Gemini)
- **Frontend** → http://localhost:5173 (Vite, proxies `/api` to the backend)

Then open **http://localhost:5173** in your browser.

## API Endpoints

| Endpoint              | Method | Description                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------- |
| `/api/health`         | GET    | Backend status + Gemini configuration check (no secrets returned).          |
| `/api/chat`           | POST   | `{ messages: [{ role, content }] }` → `{ reply }` (full markdown response). |
| `/api/chat/stream`    | POST   | Same body, responds with SSE deltas for real-time streaming.                |

Error responses are JSON: `{ "error": "human-readable message" }` with appropriate status codes
(400 validation, 401/403 invalid key, 429 quota, 503 missing config, 502 Gemini failure).

## Features

- Genuine open-ended conversations about Indian law (not a canned FAQ bot)
- Context-aware follow-up questions (history sent with each request, validated & size-limited)
- Real-time streamed responses (SSE) with a Stop button, plus a non-streaming fallback
- Conversation history in localStorage: create, switch, continue after refresh, delete, clear
- Titles auto-generated from the first user message
- Copy response and Regenerate response actions; Retry on failures
- Markdown rendering: headings, lists, code blocks, tables, quotes
- Clear error states: backend down, missing API key, quota exceeded, invalid requests
- Responsive layout with a mobile navigation drawer
- Legal-information disclaimer (short, in-composer + full version in the About modal)

## Scripts

| Command                    | What it does                                  |
| -------------------------- | --------------------------------------------- |
| `npm install`              | Installs all workspace dependencies           |
| `npm run dev`              | Runs backend + frontend together              |
| `npm run typecheck`        | TypeScript check for both workspaces          |
| `npm run build`            | Type-checks and production-builds the client  |
| `npm run test`             | Runs the backend contract tests (mocked AI)   |
| `npm run dev -w server`    | Backend only                                  |
| `npm run dev -w client`    | Frontend only                                 |

## Security Notes

- `.env.local` is git-ignored; `.env.example` contains placeholders only.
- The Gemini API key is read **only** by the Express backend (never via `VITE_` variables).
- Conversation history is validated and size-limited server-side (max 24 recent messages, 8000
  characters each) to prevent oversized requests.
- Error responses never include the key, raw stack traces, or server internals.

## Testing Status

- ✅ TypeScript checks pass for both workspaces; production build succeeds.
- ✅ `npm run test` — 12/12 backend contract tests pass (real validation middleware + SSE
  protocol + context passthrough, with a **mocked** Gemini service).
- ✅ Live error-path verified against the real Gemini API using a deliberately invalid key
  (mapped to a clean 401-style response — no fake answers are ever shown).
- ⚠️ A **successful live Gemini response** was not yet verified because no valid API key is
  present on this machine. Add your key to `.env.local`, restart the backend, and send a
  question — the full integration (SDK → SSE stream → UI) is already wired up.
