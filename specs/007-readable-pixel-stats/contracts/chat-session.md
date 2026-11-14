# Contract: Shared Chat Session and Entry Points

**Feature**: `007-readable-pixel-stats` | **Consumers**: `useChatSession.ts`, `ChatSurface.vue`, `AiShowcase.vue`, `AssistantLauncher.vue`, `ChatDetails.vue`
**Violation of this contract is a defect**: the demo must never create a second conversation, duplicate an answer, or lose an answer to navigation/scroll.

---

## C1. Single session invariant

1. There is exactly one `ShowcaseSession` instance per page load (module-level singleton in `src/composables/useChatSession.ts`). The inline showcase and the launcher are two *renders* of it.
2. `messages`, `modelMessages`, `input`, `isGenerating`, `generatingId`, retrieval settings/results and the loaded model handles are shared, not copied.
3. A message pushed by one surface is visible in the other on its next render; no surface owns or clones the array.
4. At most one generation runs at a time for the whole page. Starting a send from the launcher while the inline surface is generating is refused (the same `isGenerating` guard).
5. Clearing or starting a new chat affects both surfaces immediately; partial streamed text is either kept (non-empty after Stop) or removed, never left as an orphan placeholder.

```ts
interface ChatSession {
  state: Ref<ModelState>            // idle | checking | loading | ready | error
  messages: Ref<ChatMessage[]>
  modelMessages: Ref<{ role: string; content: string }[]>
  input: Ref<string>
  isGenerating: Ref<boolean>
  generatingId: Ref<number | null>
  detailsOpen: Ref<boolean>         // technical-details disclosure
  sourcesUsed: ComputedRef<{ names: string[]; labels: string[] }>
  suggestions: Ref<string[]>
  send(raw?: string): Promise<void>
  cancel(): void
  clear(): void                     // disposes chat + vector + decide, resets details
  startNewChat(): void              // text history only; keeps model loaded
  loadModel(): Promise<void>
  saveTrace(): void                 // inside details only
}
```

## C2. Entry-point contract

| Entry point | Where | Visible when | Behaviour |
|-------------|-------|--------------|-----------|
| Inline showcase (`AiShowcase.vue`) | After the stats band, before About details | Always (a normal band in the scroll) | Renders `ChatSurface variant="inline"`; loading is never triggered by mount |
| Launcher (`AssistantLauncher.vue`) | Fixed, bottom-right | Home page only | Toggle button opens a `ChatSurface variant="launcher"` inside a dialog |

**Guarantees**

1. Both surfaces render the same presentational `ChatSurface`; they differ only in wrapper, width and scroll container.
2. The launcher exists only on the home composition. The blog article and projects page render no launcher, no showcase and no assistant entry point.
3. Opening the launcher never scrolls the page, never resets `messages`, and never starts a generation. Closing it restores nothing but focus (the page scroll was never moved).
4. Each surface owns its own transcript scroll element and auto-scrolls independently; one surface's scroll position never changes the other's.
5. Mounting/unmounting either surface never loads or disposes a model. Route changes away from home dispose only the retrievers, as today.
6. Hiding the showcase band through an assistant action does not remove the launcher; the conversation stays reachable.

## C3. Default view vs. technical details

**Default view (must be visible without expanding anything)**

- One-line plain explanation of what the showcase is ("a small language model runs in your browser").
- Transcript (user messages, streamed answers, working/cursor state, plain error text).
- One plain-language line naming the content used: e.g. `Used: skills, education`. Rendered only when at least one source was injected. Never raw source names like `about_skills`.
- Input field with a send button; a Stop button while generating.
- Clear/new-conversation control.
- One primary start action while the model is not loaded ("Load Mini-Michi") or a Retry action after a failure.

**Details disclosure (must not be visible until opened)**

- Retrieval mode chips (BM25/vector/hybrid/decide) and top-k stepper.
- Ranked candidate rows, score bars, `IN CONTEXT`/`ACTED` tags, pruned-% and latency stats.
- Exact checkpoint names, dtype, device, file names and progress detail beyond a plain progress bar.
- Sampling toggle.
- "Save trace" export.
- Exact failure diagnostics (plain sentence stays outside; technical cause lives inside).

**Guarantees**

1. Exactly one disclosure affordance for technical detail, built on native `<details>`/`<summary>` (or a button with `aria-expanded` + `aria-controls`). It is closed on page load and after Clear.
2. Zero checkpoint names, score bars, candidate lists or retrieval-mode chips are visible in the default state (SC-009).
3. Mode switching, top-k and trace export remain fully available once expanded (capability is not removed).
4. If retrieval fell back to a simpler mode, no warning banner appears; the fallback is stated in plain words inside the disclosure.

## C4. Model lifecycle and failure states

| State | Default view | Details view | Rules |
|-------|--------------|--------------|-------|
| `idle` | Plain explanation + "Load Mini-Michi" | Mode controls available | No download before an explicit action or first send |
| `checking`/`loading` | Labelled progress bar (`role="progressbar"`, `aria-valuenow`) + plain line | File/progress detail | Cancellable; never an indefinite spinner |
| `ready` | Input enabled | Full detail | — |
| `error` | One plain sentence + Retry; `sourcesUsed` stays visible | Technical cause + Retry | No blank panel; matched content still shown (SC-011) |
| Generating | Stop control; answer streams in place | — | Stop cancels via `CancelledError`; partial text kept if non-empty |

1. The session never fires a WebGPU session-creation attempt where it is guaranteed to fail (decide is WASM-only; chat/router keep their existing WebGPU-first rules), because one failed transformers.js session creation poisons all later loads for the page lifetime.
2. Clear releases the chat model, vector model and decide model exactly as the current `clearChat()` does.
3. No account, key, setting or configuration is required beyond accepting the model download (FR-019/SC-008).

## C5. Launcher dialog contract

1. Trigger: `<button type="button" aria-expanded="true|false" aria-controls="assistant-launcher-panel">` with an accessible name ("Chat with Mini-Michi").
2. Panel: `role="dialog"`, `aria-modal="true"`, `aria-label="Chat with Mini-Michi"`, rendered only when open (or `hidden` when closed).
3. On open: focus moves to the message input (or the panel heading if the input is disabled). On close: focus returns to the trigger.
4. Escape closes the panel from anywhere inside it. Tab/Shift+Tab stay inside the panel while it is open.
5. ≤ 480 px: the panel occupies the usable width, avoids horizontal clipping, and applies/releases a body scroll lock; closing restores scrolling and focus.
6. The panel's scroll container is independent of the page; opening/closing must not change `window.scrollY`.

## C6. Acceptance checks

- [ ] Open the launcher far down the page after asking a question inline → the same transcript is shown; closing returns to the same scroll position; the answer exists exactly once in the shared state.
- [ ] Ask a question from the launcher → the inline showcase shows the same answer after closing.
- [ ] Clear from the launcher → inline resets too; details closed; model handles disposed.
- [ ] Default view contains no mode chips, scores, candidate list or checkpoint names.
- [ ] Expand the details → mode switching, top-k, scores and Save trace still work.
- [ ] Block/simulate a model failure → one plain sentence, Retry, and the "Used: …" line still names the matched content.
- [ ] Keyboard only: Tab to the launcher, Enter opens, focus lands in the input, Tab cycles inside, Escape closes, focus returns to the trigger.
- [ ] Navigate to the blog article → no launcher, no showcase, page unaffected.
