export const AI_CONFIG = {
  gemini: {
    model:
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash",
  },

  groq: {
    model:
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-120b",
  },
} as const;