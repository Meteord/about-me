import { ref } from "vue";
import {
  VoxtralForConditionalGeneration,
  VoxtralProcessor,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

type VoxtralStatus = "idle" | "loading" | "ready" | "transcribing" | "error";

export function useVoxtral() {
  const status = ref<VoxtralStatus>("idle");
  const error = ref<string | null>(null);
  const transcription = ref<string>("");

  const processorRef = ref<any>((window as any).__VOXTRAL_PROCESSOR__ || null);
  const modelRef = ref<any>((window as any).__VOXTRAL_MODEL__ || null);
  const stoppingCriteriaRef = ref<any>(null);

  const loadModel = async () => {
    status.value = "loading";
    error.value = null;
    try {
      if (!processorRef.value || !modelRef.value) {
        const model_id = "onnx-community/Voxtral-Mini-3B-2507-ONNX";
        const processor = await VoxtralProcessor.from_pretrained(model_id);
        const model = await VoxtralForConditionalGeneration.from_pretrained(model_id, {
          dtype: {
            embed_tokens: "q4",
            audio_encoder: "q4",
            decoder_model_merged: "q4f16",
          },
          device: {
            embed_tokens: "wasm",
            audio_encoder: "webgpu",
            decoder_model_merged: "webgpu",
          },
        });
        processorRef.value = processor;
        modelRef.value = model;
        (window as any).__VOXTRAL_PROCESSOR__ = processor;
        (window as any).__VOXTRAL_MODEL__ = model;
      }
      status.value = "ready";
    } catch (err: any) {
      status.value = "error";
      error.value = "Failed to load model: " + (err?.message || err);
    }
  };

  const transcribe = async (audio: Float32Array, language: string = "en") => {
    const processor = processorRef.value;
    const model = modelRef.value;
    if (!processor || !model) {
      error.value = "Model not loaded";
      status.value = "error";
      return;
    }
    status.value = "transcribing";
    transcription.value = "";
    error.value = null;
    try {
      const conversation = [
        {
          role: "user",
          content: [{ type: "audio" }, { type: "text", text: `lang:${language}[TRANSCRIBE]` }],
        },
      ];
      const text = processor.apply_chat_template(conversation, { tokenize: false });
      const inputs = await processor(text, audio);

      let output = "";
      const streamer = new TextStreamer(processor.tokenizer, {
        skip_special_tokens: true,
        skip_prompt: true,
        callback_function: (token: string) => {
          output += token;
          transcription.value += token;
        },
      });

      stoppingCriteriaRef.value = new InterruptableStoppingCriteria();

      await model.generate({
        ...inputs,
        max_new_tokens: 8192,
        streamer,
        stopping_criteria: stoppingCriteriaRef.value,
      });

      status.value = "ready";
      return output;
    } catch (err: any) {
      status.value = "error";
      error.value = "Transcription failed: " + (err?.message || err);
    } finally {
      stoppingCriteriaRef.value = null;
    }
  };

  const stopTranscription = () => {
    if (stoppingCriteriaRef.value) {
      stoppingCriteriaRef.value.interrupt();
    }
  };

  return {
    status,
    error,
    transcription,
    loadModel,
    transcribe,
    setTranscription: (val: string) => (transcription.value = val),
    stopTranscription,
  };
}
