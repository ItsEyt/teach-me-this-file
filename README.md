# Teach Me This File

A teacher uploads a file and writes a prompt ("Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes."). The app opens a chat where an AI **teaches** the file to a student: one small step at a time, one question at a time, adapting to the answers, grounded in the file.

- Live app: [Render](https://teach-me-this-file-hfub.onrender.com)
- Design notes, trade-offs and test scenarios: [DECISIONS.md](./DECISIONS.md)

## Use it

1. Open the app and press the gear icon. Paste a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
   The key stays in your browser and is sent with each request. The server never stores or logs it.
2. Choose a file (PDF, Word, text, Markdown, or a PNG/JPG/WEBP photo of a page, up to 15 MB) and write how it should be taught.
3. Start the lesson. The tutor opens, asks a question, and reacts to your answers. The header shows "Step X of Y"; press it to see the plan.
4. Press a source chip under any tutor message to read the passage it is based on. Use the stop button to cut a reply short.

Scanned PDFs and photos are read with Gemini's vision, so they need a key even before the lesson starts.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
npm run dev        # server on :8787, client on http://localhost:5173
```

Optional: copy `.env.example` to `.env` to set a fallback `GEMINI_API_KEY` on the server (used only when a request carries no key) or a different `GEMINI_MODEL`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Server and client with hot reload |
| `npm run build` | Builds the client into `client/dist` |
| `npm start` | Serves the API and the built client on one port |
| `npm test` | Unit and route tests (no network, no key needed) |
| `npm run eval` | Five tutor-behaviour scenarios against the real Gemini API (needs `GEMINI_API_KEY`) |

## How it is built

```
client/  React + Vite + Tailwind
  state/      lessonReducer: the plan and the student's progress (the source of truth)
  hooks/      run tutor turns and feed the reducer
  lib/        API client and SSE parser
  features/   setup screen, lesson screen
server/  Node + Express (stateless)
  ingest/     read a file into numbered, citable passages
  ai/         Gemini calls, prompts, validation of what the model returns
  routes/     /api/ingest, /api/plan, /api/lesson/turn, /api/health, /api/key/check
evals/   behaviour scenarios for the tutor
```

The three concerns are kept apart: **AI logic** lives on the server (`server/src/ai`), **lesson state** in one pure reducer on the client (`client/src/state`), and the **UI** only renders that state and dispatches actions.

The server keeps nothing between requests. Each tutor turn carries the current step, the next step, only their passages and the last few messages, so a sleeping or restarted host loses nothing and every turn stays cheap.

### API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Wake-up ping and server limits |
| `POST /api/key/check` | Checks a key without spending generation quota |
| `POST /api/ingest` | `multipart/form-data` file in, passages out |
| `POST /api/plan` | Passages and teacher prompt in, validated lesson plan out |
| `POST /api/lesson/turn` | One tutor turn as Server-Sent Events: `delta`, `state`, `done`, `error` |

The key travels in the `X-Gemini-Key` header (optionally `X-Gemini-Model`).
