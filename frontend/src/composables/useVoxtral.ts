import { ref } from "vue";
import {
  VoxtralForConditionalGeneration,
  VoxtralProcessor,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

type VoxtralStatus = "idle" | "loading" | "ready" | "transcribing" | "error";

type VoxtralProcessorLike = {
  tokenizer: unknown;
  apply_chat_template: (
    conversation: Array<{ role: string; content: Array<{ type: string; text?: string }> }>,
    options: { tokenize: boolean },
  ) => string;
  (text: string, audio: Float32Array): Promise<Record<string, unknown>>;
};

type VoxtralModelLike = {
  generate: (options: Record<string, unknown>) => Promise<unknown>;
};

type InterruptableStoppingCriteriaLike = {
  interrupt: () => void;
};

const globalVoxtral = window as Window & {
  __VOXTRAL_PROCESSOR__?: VoxtralProcessorLike | null;
  __VOXTRAL_MODEL__?: VoxtralModelLike | null;
};

function formatError(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function useVoxtral() {
  const status = ref<VoxtralStatus>("idle");
  const error = ref<string | null>(null);
  const transcription = ref<string>("");

  const processorRef = ref<VoxtralProcessorLike | null>(globalVoxtral.__VOXTRAL_PROCESSOR__ || null);
  const modelRef = ref<VoxtralModelLike | null>(globalVoxtral.__VOXTRAL_MODEL__ || null);
  const stoppingCriteriaRef = ref<InterruptableStoppingCriteriaLike | null>(null);

  const loadModel = async () => {
    if (status.value === "loading") {
      return;
    }
    if (processorRef.value && modelRef.value) {
      status.value = "ready";
      error.value = null;
      return;
    }

    status.value = "loading";
    error.value = null;
    try {
      if (!processorRef.value || !modelRef.value) {
        const model_id = "onnx-community/Voxtral-Mini-3B-2507-ONNX";
        const processor = (await VoxtralProcessor.from_pretrained(model_id)) as unknown as VoxtralProcessorLike;
        const model = (await VoxtralForConditionalGeneration.from_pretrained(model_id, {
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
        })) as unknown as VoxtralModelLike;
        processorRef.value = processor;
        modelRef.value = model;
        globalVoxtral.__VOXTRAL_PROCESSOR__ = processor;
        globalVoxtral.__VOXTRAL_MODEL__ = model;
      }
      status.value = "ready";
    } catch (err: unknown) {
      status.value = "error";
      error.value =
        "Model initialization failed. Check your network and browser WebGPU support, then retry. Details: " +
        formatError(err);
    }
  };

  const transcribe = async (audio: Float32Array, language: string = "en") => {
    const processor = processorRef.value;
    const model = modelRef.value;
    if (!processor || !model) {
      error.value = "Model not ready. Initialize the model first.";
      status.value = "error";
      return;
    }
    status.value = "transcribing";
    transcription.value = "";
    error.value = null;
    try {
      const conversation: Array<{ role: string; content: Array<{ type: string; text?: string }> }> = [
        {
          role: "user",
          content: [{ type: "audio" }, { type: "text", text: `lang:${language}[TRANSCRIBE]` }],
        },
      ];
      const text = processor.apply_chat_template(conversation, { tokenize: false });
      const inputs = await processor(text, audio);

      let output = "";
      const streamer = new TextStreamer(
        processor.tokenizer as ConstructorParameters<typeof TextStreamer>[0],
        {
        skip_special_tokens: true,
        skip_prompt: true,
        callback_function: (token: string) => {
          output += token;
          transcription.value += token;
        },
        },
      );

      stoppingCriteriaRef.value = new InterruptableStoppingCriteria() as InterruptableStoppingCriteriaLike;

      await model.generate({
        ...inputs,
        max_new_tokens: 8192,
        streamer,
        stopping_criteria: stoppingCriteriaRef.value,
      });

      status.value = "ready";
      return output;
    } catch (err: unknown) {
      status.value = "error";
      error.value = "Transcription failed: " + formatError(err);
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
