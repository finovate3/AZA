import {
  generateWithGemini,
} from "./gemini";

import {
  generateWithGroq,
  type GroqMessage,
} from "./groq";

export async function generateFinancialAnalysis(
  prompt: string
): Promise<string> {
  return generateWithGemini(prompt);
}

export async function generateLiveCfoReply(
  messages: GroqMessage[]
): Promise<string> {
  return generateWithGroq(messages);
}