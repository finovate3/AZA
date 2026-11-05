import { NextResponse } from "next/server";
import { generateWithGemini } from "../../../ai/gemini";
import { generateWithGroq } from "../../../ai/groq";

export async function GET() {
  const result = {
    gemini: {
      success: false,
      response: "",
      error: "",
    },
    groq: {
      success: false,
      response: "",
      error: "",
    },
  };

  try {
    const response = await generateWithGemini(
      "Reply with exactly: AZA Gemini connection successful."
    );

    result.gemini.success = true;
    result.gemini.response = response;
  } catch (error) {
    console.error("AZA_GEMINI_TEST_ERROR:", error);

    result.gemini.error =
      error instanceof Error
        ? error.message
        : "Gemini connection failed.";
  }

  try {
    const response = await generateWithGroq([
      {
        role: "user",
        content:
          "Reply with exactly: AZA Groq connection successful.",
      },
    ]);

    result.groq.success = true;
    result.groq.response = response;
  } catch (error) {
    console.error("AZA_GROQ_TEST_ERROR:", error);

    result.groq.error =
      error instanceof Error
        ? error.message
        : "Groq connection failed.";
  }

  return NextResponse.json(result);
}