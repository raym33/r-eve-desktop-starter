import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:1234/v1",
  apiKey: process.env.LM_STUDIO_API_KEY ?? "lm-studio",
  supportsStructuredOutputs: false,
});

const configuredContextWindowTokens = process.env.LM_STUDIO_CONTEXT_TOKENS
  ? Number(process.env.LM_STUDIO_CONTEXT_TOKENS)
  : 1024;
const maxOutputTokens = Number(process.env.LM_STUDIO_MAX_OUTPUT_TOKENS ?? 128);

export default defineAgent({
  model: lmstudio.chatModel(process.env.LM_STUDIO_MODEL ?? "qwen2.5-7b-instruct"),
  ...(configuredContextWindowTokens
    ? { modelContextWindowTokens: configuredContextWindowTokens }
    : {}),
  modelOptions: {
    providerOptions: {
      lmstudio: {
        max_completion_tokens: maxOutputTokens,
      },
    },
  },
  ...(configuredContextWindowTokens
    ? {
        compaction: {
          modelContextWindowTokens: configuredContextWindowTokens,
          thresholdPercent: 0.85,
        },
      }
    : {}),
});
