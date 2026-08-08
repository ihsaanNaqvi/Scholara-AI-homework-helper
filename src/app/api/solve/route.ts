import { NextRequest, NextResponse } from "next/server";
import { solveQuestion } from "@/lib/gemini";

export const maxDuration      = 60;
export const dynamic          = "force-dynamic";
export const preferredRegion  = "iad1"; // US East — avoids Gemini regional blocks

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, imageBase64, imageMime, pdfBase64, mode, language, studentWork } = body;

    if (!question || question.trim().length < 3) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured. Please add GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const result = await solveQuestion({
      question, imageBase64, imageMime, pdfBase64, mode, language, studentWork,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Solve error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
