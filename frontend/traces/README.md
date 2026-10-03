# Runtime traces

Drop real chat sessions from Mini-Michi here so the evaluation suite can score them.

## How a trace gets here

1. Chat with Mini-Michi in the dock (e.g. "what projects has he built?").
2. When the reply is finished, click **Save trace** in the dock banner — the browser downloads
   `mini-michi-<timestamp>.jsonl`.
3. Move the file into this directory.

That's it. The default run `npm run eval:chain` picks up every `*.jsonl` in this directory with no
extra flags:

```sh
cd frontend
npm run eval:chain -- --modes=lexical --traces=frontend/traces
```

You can also point the eval at a single file or an HTTPS URL:

```sh
npm run eval:chain -- --traces=path/to/session.jsonl
npm run eval:chain -- --traces=https://example.com/team/session.jsonl
```

## Trace format

Each trace is one JSONL file in the HuggingFace **Session Trace Simple Format (STS-Format)** — the
same format the HF trace viewer and Hub datasets render. Line 1 is the session header:

```json
{ "type": "session", "harness": "about-me.mini-michi", "id": "<slug>", "name": "<title>" }
```

Every following line is a message envelope `{ "type": "message", "message": { "role": ..., "content": ... } }`
covering the user query, the retrieval step (as a `system` message), the assistant's tool calls, the
linked `tool` results, and the final answer. The spec lives in `specs/002-agent-chain-eval/contracts/traces.md`.

## Privacy

**Traces may contain prompts and personal data.** A session is the literal conversation you had with
Mini-Michi — it can include names, project details, and anything else you typed.

- Nothing is uploaded automatically. The site only ever *downloads* the file you explicitly save.
- Before publishing a trace (e.g. to a Hub dataset or a shared bucket), review it and redact anything
  personal — same guidance as HuggingFace's own session-trace docs.

## Why bother

The eval scores each trace *historically*: it re-runs retrieval on the recorded query (does today's
top-k still cover the tools the session used?), validates the recorded tool calls against the current
registry, and checks the recorded answer is grounded in the tool results it actually saw. Over time
this directory becomes a regression corpus of real usage, separate from the hand-written fixtures in
`frontend/scripts/eval-fixtures.mjs`.