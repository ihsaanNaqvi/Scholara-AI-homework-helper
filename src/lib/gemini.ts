import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Part,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Use gemini-1.5-flash — free tier, multimodal, fast
const MODEL = "gemini-1.5-flash";

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── System prompts ──────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are a friendly, encouraging GCSE tutor for Science (Biology, Chemistry, Physics) 
and Mathematics, helping students aged 14-16.

STYLE — this matters:
- Be CONCISE. Explain like a real teacher speaking to a student — clear and to the point, not a textbook essay.
- Get to the answer quickly. Avoid over-long preambles.
- Use short paragraphs and simple language.
- For maths, show the key working steps clearly but without padding.
- For science, explain the core concept simply, then the answer.
- End with a short "Key Points" summary (2-4 bullets max).
- Use LaTeX for maths: inline $...$ and display $$...$$.
- Warm, supportive tone — like a favourite teacher explaining something.
- Aim for an explanation a student can read in under a minute where possible.`;

const DIAGRAM_SYSTEM = `${BASE_SYSTEM}

DIAGRAM INSTRUCTIONS — CRITICAL:
When a question requires a diagram (geometry, graphs, trigonometry, forces, circuits, etc.):

1. First explain the concept in text
2. Then generate a VALID SVG diagram using this EXACT format:

[DIAGRAM_START]
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- Your diagram here -->
  <!-- Use clean lines, labels, and colors -->
  <!-- Navy: #0B1F3A, Teal: #00B4A0, Amber: #F5A623 -->
</svg>
[DIAGRAM_END]

3. Keep SVG simple and clean — geometric shapes, labeled axes, clear annotations
4. For graphs: always include labeled axes, gridlines, and title
5. For geometry: include all measurements and angle labels
6. For science diagrams (circuits, forces): use standard GCSE symbols`;

// ─── Diagram detection ───────────────────────────────────────────────────────

function needsDiagram(question: string): boolean {
  const diagramKeywords = [
    "draw", "sketch", "diagram", "graph", "plot", "triangle", "circle",
    "angle", "geometry", "force", "circuit", "vector", "coordinate",
    "axes", "gradient", "tangent", "reflect", "rotate", "translate",
    "bisect", "perpendicular", "parallel", "quadrilateral", "polygon",
    "parabola", "hyperbola", "function", "y =", "f(x)", "equation of",
    "ray diagram", "refraction", "reflection", "distance-time", "velocity",
    "acceleration", "displacement", "moment", "lever", "pulley",
  ];
  const lower = question.toLowerCase();
  return diagramKeywords.some((kw) => lower.includes(kw));
}

// ─── File conversion helpers ─────────────────────────────────────────────────

function base64ToGenerativePart(base64: string, mimeType: string): Part {
  return {
    inlineData: { data: base64.split(",")[1] || base64, mimeType },
  };
}

// ─── Main solve function ─────────────────────────────────────────────────────

export interface SolveInput {
  question:   string;
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
}

// Strip markdown, LaTeX, and SVG to produce clean text for text-to-speech
function makeVoiceText(explanation: string): string {
  return explanation
    .replace(/\[DIAGRAM_START\][\s\S]*?\[DIAGRAM_END\]/g, "")   // remove diagrams
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")                        // remove any svg
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")                      // display math → inline
    .replace(/\$([^$]*?)\$/g, " $1 ")                            // strip $ delimiters
    .replace(/[#*_`>|]/g, "")                                    // strip markdown symbols
    .replace(/\\[a-zA-Z]+/g, "")                                 // strip latex commands
    .replace(/\|.*?\|/g, "")                                     // strip table rows
    .replace(/\n{2,}/g, ". ")                                    // paragraphs → pauses
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function detectSubject(text: string): "maths" | "science" | "general" {
  const mathsKw    = ["equation", "solve", "calculate", "algebra", "geometry", "trigonometry", "gradient", "differentiate", "integrate", "probability", "percentage", "ratio", "fraction", "quadratic", "linear", "simultaneous"];
  const scienceKw  = ["atom", "molecule", "cell", "photosynthesis", "respiration", "force", "energy", "circuit", "wave", "reaction", "element", "compound", "enzyme", "dna", "evolution", "ecosystem", "gravity", "momentum", "velocity"];
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

export async function solveQuestion(input: SolveInput): Promise<SolveResult> {
  const { question, imageBase64, imageMime, pdfBase64 } = input;
  const requiresDiagram = needsDiagram(question);
  const subject = detectSubject(question);

  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings,
    systemInstruction: requiresDiagram ? DIAGRAM_SYSTEM : BASE_SYSTEM,
    generationConfig: {
      temperature:     0.3,
      topK:            40,
      topP:            0.95,
      maxOutputTokens: 4096,
    },
  });

  const parts: Part[] = [{ text: question }];

  if (imageBase64 && imageMime) {
    parts.push(base64ToGenerativePart(imageBase64, imageMime));
  }
  if (pdfBase64) {
    parts.push(base64ToGenerativePart(pdfBase64, "application/pdf"));
  }

  const result   = await model.generateContent(parts);
  const response = result.response;
  const rawText  = response.text();

  const { explanation, diagramSvg } = extractDiagram(rawText);

  return {
    explanation,
    diagramSvg,
    subject,
    hasDiagram: !!diagramSvg,
    voiceText:  makeVoiceText(explanation),
  };
}
