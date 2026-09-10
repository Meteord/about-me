# How this site works

This page has no backend: everything runs on-device in the visitor's browser via transformers.js. Mini-Michi, the chat assistant, retrieves the most relevant tools before every reply and only sends those schemas to the language model.

## Chat model

Mini-Michi runs LiquidAI's LFM2.5-350M-ONNX causal language model, streamed over WebGPU or WebAssembly. No data leaves the page.

- [LFM2.5-350M-ONNX](https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX)

## Tool retriever

Before every reply, a retrieval step ranks the site's tools and pre-selects only the most relevant schemas for the model. The neural mode uses the LFM2.5 Encoder (kucukkanat ONNX export, q8) with cosine similarity; a BM25 lexical retriever acts as an instant fallback.

- [LFM2.5-Encoder-350M-ONNX](https://huggingface.co/kucukkanat/LFM2.5-Encoder-350M-ONNX)

## Concept

The tool-selector approach is inspired by LiquidAI's ColBERT tool-selection demo, which retrieves the top-5 most relevant tools out of 151 instead of stuffing every schema into the context window.

- [ColBERT tool-selection demo](https://huggingface.co/spaces/LiquidAI/colbert-tool-selection)
- [LFM2.5 retrievers blog](https://www.liquid.ai/blog/lfm2-5-retrievers)
