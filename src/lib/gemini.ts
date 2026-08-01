import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Part,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Use gemini-1.5-flash — free tier, multimodal, fast
 const MODEL = "gemini-flash-latest";

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── System prompts ──────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are an expert GCSE tutor specialising in Science (Biology, Chemistry, Physics) 
and Mathematics. Your role is to help students understand their homework questions clearly and accurately.

RULES:
- Always give a clear, step-by-step explanation a GCSE student can follow
- Use simple, age-appropriate language (target age 14-16)
- For maths, show every working step — never skip steps
- For science, explain the underlying concept, not just the answer
- Always end with a "Key Points to Remember" summary in bullet points
- If the question involves a diagram, describe it clearly in words AND provide SVG/Mafs code
- Use LaTeX for mathematical expressions: wrap inline math in $...$ and display math in $$...$$
- Be encouraging and supportive in tone`;

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
  };
}
