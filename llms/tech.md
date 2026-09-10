# How this site works

This page has no backend: everything runs on-device in the visitor's browser via transformers.js. Mini-Michi, the chat assistant, retrieves the most relevant tools before every reply and only sends those schemas to the language model.

## Chat model

Mini-Michi runs LiquidAI's LFM2.5-350M-ONNX causal language model, streamed over WebGPU or WebAssembly. No data leaves the page.

- [LFM2.5-350M-ONNX](https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX)

## Tool retriever

Before every reply, a retrieval step ranks the site's tools and pre-selects only the most relevant schemas for the model. Vector search mode scores the request against all 31 tool names in one bidirectional pass of the LFM2.5 prompt-router (kucukkanat ONNX export, q8), using its trained cosine head. BM25 over an alias-enriched tool index acts as an instant fallback, and hybrid mode fuses both rankings with reciprocal rank fusion (RRF).

- [LFM2.5-Encoder-350M-Prompt-Router-ONNX](https://huggingface.co/kucukkanat/LFM2.5-Encoder-350M-Prompt-Router-ONNX)

## Concept

The tool-selector approach is inspired by LiquidAI's prompt-routing and ColBERT tool-selection demos, which retrieve the top-5 most relevant tools instead of stuffing every schema into the context window.

- [ColBERT tool-selection demo](https://huggingface.co/spaces/LiquidAI/colbert-tool-selection)
- [LFM2.5 retrievers blog](https://www.liquid.ai/blog/lfm2-5-retrievers)
