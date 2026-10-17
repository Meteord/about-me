# Blog

Michael's blog on this site. Articles live under the Blog section.

## Chat with my website (2026-09-20)

This page has no backend: everything runs on-device in the visitor's browser via transformers.js. Mini-Michi, the chat assistant, retrieves the most relevant tools before every reply and only sends those schemas to the language model.

The article also evaluates how well the whole agent chain works: a section renders the results of a real end-to-end run of the on-device chain (retrieval → tool selection → language model → tool calls → final answer) across the retrieval modes, including per-fixture scores and runtime-trace results. The numbers come from the committed eval artifact, regenerated locally with `npm run eval:chain`.

### Models

- [LFM2.5-350M-ONNX](https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX): Mini-Michi runs LiquidAI's LFM2.5-350M-ONNX causal language model, streamed over WebGPU or WebAssembly. No data leaves the page.
- [LFM2.5-Encoder-350M-Prompt-Router-ONNX](https://huggingface.co/kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX): Before every reply, a retrieval step ranks the site's tools and pre-selects only the most relevant schemas for the model. Vector search mode scores the request against all tool names in one bidirectional pass of the LFM2.5 prompt-router (kucukkanat ONNX export, q8), using its trained cosine head. BM25 over an alias-enriched tool index acts as an instant fallback, and hybrid mode fuses both rankings with reciprocal rank fusion (RRF).
- [GLiNER2.5-Decide-ONNX](https://huggingface.co/onnx-community/GLiNER2.5-Decide-mobile-ONNX): DECIDE, the fourth retrieval mode, runs the on-device [GLiNER2.5-Decide](https://huggingface.co/fastino/GLiNER2.5-Decide) classifier (onnx-community mobile export, DeBERTa-v3-large, q4f16 on WebAssembly). The GLiNER2 processor is ported in this repo — the query is the state, the content-source names are the labels, and softmax over the per-label markers ranks the sources; the top-ranked ones are injected into the chat context just like the other modes.

### Links

- [ColBERT tool-selection demo](https://huggingface.co/spaces/LiquidAI/colbert-tool-selection): LiquidAI's demo that inspired the tool-selector concept — it retrieves the top-5 most relevant tools out of 151 with a retriever instead of stuffing every schema into the context window.
- [LFM2.5 retrievers blog](https://www.liquid.ai/blog/lfm2-5-retrievers): LiquidAI's blog post on prompt-routing and retrieval, the idea behind scoring a request against all tool names in a single pass.
- [GLiNER2.5-Decide model](https://huggingface.co/fastino/GLiNER2.5-Decide): the classification model behind DECIDE mode — schema-conditioned DeBERTa-v3-large with one logit per label marker.
- [Jevosaurus — a GLiNER2.5-Decide app](https://huggingface.co/spaces/shreyask/jevosaurus): an on-device example built on GLiNER2.5-Decide and open-jev that runs entirely in the browser.
