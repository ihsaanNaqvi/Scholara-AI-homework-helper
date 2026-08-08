import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Part,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Alias that always points to the current Flash model — won't break on version changes
const MODEL = "gemini-flash-latest";

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export type Mode     = "solve" | "tutor" | "mark" | "practice";
export type Language = "en" | "ru" | "ur";

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  ru: "Russian (Русский)",
  ur: "Urdu (اردو)",
};

// ─── Shared style rules ──────────────────────────────────────────────────────

const STYLE = `You are a friendly, encouraging tutor for Science (Biology, Chemistry, Physics)
and Mathematics, helping school students (roughly ages 12-18, GCSE level by default).

STYLE — this matters:
- Be CONCISE. Explain like a real teacher speaking to a student, not a textbook essay.
- Short paragraphs, simple language.
- Use LaTeX for maths: inline $...$ and display $$...$$.
- Warm, supportive tone.`;

const DIAGRAM_RULES = `
DIAGRAM INSTRUCTIONS — when the question genuinely needs a diagram
(geometry, graphs, forces, circuits, cycles):
Output a VALID SVG wrapped EXACTLY like this:

[DIAGRAM_START]
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- clean shapes, labelled axes/angles, colors: #0B1F3A #00B4A0 #F5A623 -->
</svg>
[DIAGRAM_END]

Keep the SVG simple and correct. Do not output broken or unclosed tags.`;

// ─── Mode-specific prompts ───────────────────────────────────────────────────

function solvePrompt(lang: Language): string {
  return `${STYLE}

MODE: SOLVE — full worked solution.
- Structure the solution as clear numbered steps. Start each step with a heading line
  exactly like: "### Step 1: <short title>" then the step content.
- After the steps, add "### Answer" with the final answer, then "### Key Points"
  with 2-4 short bullets.
- Keep the whole thing readable in under a minute.
${DIAGRAM_RULES}

LANGUAGE: Write the ENTIRE response in ${LANGUAGE_NAMES[lang]}.`;
}

function tutorPrompt(lang: Language): string {
  return `${STYLE}

MODE: TUTOR — Socratic guided learning. Do NOT hand over the full solution.
Break the problem into 3-6 small steps. For EACH step output EXACTLY this structure:

### Step N: <short title>
**Think:** <one guiding question that nudges the student to attempt this step themselves>
**Hint:** <a small hint they can use if stuck>
**Step answer:** <the worked result of this step, brief>

After the final step add:
### Answer
<final answer, one or two lines>
### Key Points
<2-3 bullets>

The student's app reveals each step one at a time, so make every step self-contained and short.
${DIAGRAM_RULES}

LANGUAGE: Write the ENTIRE response in ${LANGUAGE_NAMES[lang]}.`;
}

function markPrompt(lang: Language): string {
  return `${STYLE}

MODE: MARK MY ANSWER — act as a fair, encouraging examiner.
The student gives you a question AND their own attempted answer (typed or in an image).
Respond with EXACTLY this structure:

### Marks
<estimated marks, e.g. "3 / 5" — judge like a GCSE mark scheme>
### What you did well
<2-3 short bullets, be specific and genuine>
### What went wrong
<specific errors, each with WHY it's wrong — be kind but honest; if the answer is fully correct, say so>
### Model answer
<the correct worked answer, brief>
### One tip for next time
<a single, memorable tip>

LANGUAGE: Write the ENTIRE response in ${LANGUAGE_NAMES[lang]}.`;
}

function practicePrompt(lang: Language): string {
  return `${STYLE}

MODE: PRACTICE — generate practice questions on the topic/question given.
Create exactly 3 new questions on the same topic: one Easy, one Medium, one Hard.
They must be NEW questions (not the original), realistic exam style.
Output EXACTLY this structure:

### Question 1 (Easy)
<question text>
**Answer:** <concise worked answer>

### Question 2 (Medium)
<question text>
**Answer:** <concise worked answer>

### Question 3 (Hard)
<question text>
**Answer:** <concise worked answer>

The app hides each answer until the student reveals it, so keep answers directly after each question.

LANGUAGE: Write the ENTIRE response in ${LANGUAGE_NAMES[lang]}.`;
}

function systemFor(mode: Mode, lang: Language): string {
  switch (mode) {
    case "tutor":    return tutorPrompt(lang);
    case "mark":     return markPrompt(lang);
    case "practice": return practicePrompt(lang);
    default:         return solvePrompt(lang);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64ToGenerativePart(base64: string, mimeType: string): Part {
  return { inlineData: { data: base64.split(",")[1] || base64, mimeType } };
}

function detectSubject(text: string): "maths" | "science" | "general" {
  const mathsKw   = ["equation", "solve", "calculate", "algebra", "geometry", "trigonometry", "gradient", "differentiate", "integrate", "probability", "percentage", "ratio", "fraction", "quadratic", "linear", "simultaneous"];
  const scienceKw = ["atom", "molecule", "cell", "photosynthesis", "respiration", "force", "energy", "circuit", "wave", "reaction", "element", "compound", "enzyme", "dna", "evolution", "ecosystem", "gravity", "momentum", "velocity"];
  const lower = text.toLowerCase();
  if (mathsKw.some((k) => lower.includes(k)))   return "maths";
  if (scienceKw.some((k) => lower.includes(k))) return "science";
  return "general";
}

function extractDiagram(text: string): { explanation: string; diagramSvg?: string } {
  const start = text.indexOf("[DIAGRAM_START]");
  const end   = text.indexOf("[DIAGRAM_END]");
  if (start === -1 || end === -1) return { explanation: text };
  const diagramSvg  = text.slice(start + 15, end).trim();
  const explanation = (text.slice(0, start) + text.slice(end + 13)).trim();
  return { explanation, diagramSvg };
}

// Strip markdown/LaTeX/SVG for clean text-to-speech
function makeVoiceText(explanation: string): string {
  return explanation
    .replace(/\[DIAGRAM_START\][\s\S]*?\[DIAGRAM_END\]/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")
    .replace(/\$([^$]*?)\$/g, " $1 ")
    .replace(/[#*_`>|]/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\|.*?\|/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Main solve function ─────────────────────────────────────────────────────

export interface SolveInput {
  question:     string;
  mode?:        Mode;
  language?:    Language;
  studentWork?: string;      // for MARK mode: typed attempt
  imageBase64?: string;
  imageMime?:   string;
  pdfBase64?:   string;
}

export interface SolveResult {
  explanation: string;
  diagramSvg?: string;
  subject:     "maths" | "science" | "general";
  hasDiagram:  boolean;
  voiceText:   string;
  mode:        Mode;
}

export async function solveQuestion(input: SolveInput): Promise<SolveResult> {
  const {
    question, imageBase64, imageMime, pdfBase64,
    mode = "solve", language = "en", studentWork,
  } = input;

  const subject = detectSubject(question);

  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings,
    systemInstruction: systemFor(mode, language),
    generationConfig: { maxOutputTokens: 4096 },
  });

  let userText = question;
  if (mode === "mark" && studentWork) {
    userText = `QUESTION:\n${question}\n\nSTUDENT'S ATTEMPTED ANSWER:\n${studentWork}`;
  }

  const parts: Part[] = [{ text: userText }];
  if (imageBase64 && imageMime) parts.push(base64ToGenerativePart(imageBase64, imageMime));
  if (pdfBase64)                parts.push(base64ToGenerativePart(pdfBase64, "application/pdf"));

  const result   = await model.generateContent(parts);
  const rawText  = result.response.text();
  const { explanation, diagramSvg } = extractDiagram(rawText);

  return {
    explanation,
    diagramSvg,
    subject,
    hasDiagram: !!diagramSvg,
    voiceText:  makeVoiceText(explanation),
    mode,
  };
}
