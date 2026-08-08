"use client";
import { useState, useEffect } from "react";
import { ChevronRight, Eye, Lightbulb } from "lucide-react";
import MathMarkdown from "@/components/MathMarkdown";

type Mode = "solve" | "tutor" | "mark" | "practice";

interface Props {
  explanation: string;
  mode: Mode;
}

interface Section { title: string; body: string; }

function splitSections(text: string): { intro: string; sections: Section[] } {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let intro = "";
  let current: Section | null = null;

  for (const line of lines) {
    const m = line.match(/^###\s+(.*)/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    } else {
      intro += line + "\n";
    }
  }
  if (current) sections.push(current);
  return { intro: intro.trim(), sections };
}

// Split a section body at a bold marker like **Step answer:** or **Answer:**
function splitHidden(body: string, marker: string): { visible: string; hidden: string | null } {
  const idx = body.indexOf(marker);
  if (idx === -1) return { visible: body, hidden: null };
  return {
    visible: body.slice(0, idx).trim(),
    hidden:  body.slice(idx + marker.length).trim(),
  };
}

function TutorStep({ section }: { section: Section }) {
  const [revealed, setRevealed] = useState(false);
  const { visible, hidden } = splitHidden(section.body, "**Step answer:**");
  return (
    <div>
      <h3 className="font-display text-base font-semibold text-teal mb-1">{section.title}</h3>
      <MathMarkdown content={visible} />
      {hidden !== null && !revealed && (
        <button
          onClick={() => setRevealed(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
        >
          <Eye size={13} /> Reveal this step&apos;s answer
        </button>
      )}
      {hidden !== null && revealed && (
        <div className="mt-2 border-l-2 border-teal pl-3">
          <MathMarkdown content={hidden} />
        </div>
      )}
    </div>
  );
}

function PracticeQuestion({ section }: { section: Section }) {
  const [revealed, setRevealed] = useState(false);
  const { visible, hidden } = splitHidden(section.body, "**Answer:**");
  return (
    <div>
      <h3 className="font-display text-base font-semibold text-navy mb-1">{section.title}</h3>
      <MathMarkdown content={visible} />
      {hidden !== null && !revealed && (
        <button
          onClick={() => setRevealed(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-3 py-1.5 rounded-lg transition"
        >
          <Eye size={13} /> Reveal answer
        </button>
      )}
      {hidden !== null && revealed && (
        <div className="mt-2 border-l-2 border-teal pl-3">
          <MathMarkdown content={hidden} />
        </div>
      )}
    </div>
  );
}

export default function StructuredAnswer({ explanation, mode }: Props) {
  const { intro, sections } = splitSections(explanation);
  const [shown, setShown] = useState(1);

  // Reset progressive reveal when a new answer arrives
  useEffect(() => { setShown(1); }, [explanation]);

  // Mark mode or unstructured output → render whole thing
  if (mode === "mark" || sections.length === 0) {
    return <MathMarkdown content={explanation} />;
  }

  // Practice mode → all questions visible, answers hidden per-question
  if (mode === "practice") {
    return (
      <div className="space-y-6">
        {intro && <MathMarkdown content={intro} />}
        {sections.map((s, i) => <PracticeQuestion key={i} section={s} />)}
      </div>
    );
  }

  // Solve & Tutor → progressive step reveal
  const visibleSections = sections.slice(0, shown);
  const remaining = sections.length - shown;

  return (
    <div className="space-y-5">
      {intro && <MathMarkdown content={intro} />}
      {visibleSections.map((s, i) =>
        mode === "tutor" ? (
          <TutorStep key={i} section={s} />
        ) : (
          <div key={i}>
            <h3 className="font-display text-base font-semibold text-teal mb-1">{s.title}</h3>
            <MathMarkdown content={s.body} />
          </div>
        )
      )}
      {remaining > 0 && (
        <button
          onClick={() => setShown((n) => n + 1)}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-navy hover:bg-navy-900 px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          {mode === "tutor" ? <Lightbulb size={15} /> : <ChevronRight size={15} />}
          {mode === "tutor" ? "Next step" : "Show next step"}
          <span className="text-xs opacity-70">({remaining} left)</span>
        </button>
      )}
    </div>
  );
}
