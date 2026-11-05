import Groq from "groq-sdk";
import { AI_CONFIG } from "./config";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("GROQ_API_KEY is not configured");
}

const groq = new Groq({
  apiKey,
});

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateWithGroq(
  messages: GroqMessage[]
): Promise<string> {
  const completion =
    await groq.chat.completions.create({
      model: AI_CONFIG.groq.model,
      messages,
      temperature: 0.3,
      max_completion_tokens: 700,
    });

  return (
    completion.choices[0]?.message?.content || ""
  );
}