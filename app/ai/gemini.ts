import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "./config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured");
}

const gemini = new GoogleGenAI({
  apiKey,
});

export async function generateWithGemini(
  prompt: string
): Promise<string> {
  const response = await gemini.models.generateContent({
    model: AI_CONFIG.gemini.model,
    contents: prompt,
  });

  return response.text || "";
}