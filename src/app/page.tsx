"use client";
import { useState, useRef } from "react";
import {
  BookOpen, Sparkles, Send, RotateCcw,
  ChevronDown, Copy, Check, Microscope, Calculator,
  ImageIcon, FileText
} from "lucide-react";
import clsx from "clsx";
import FileUpload     from "@/components/FileUpload";
import MathMarkdown   from "@/components/MathMarkdown";
import DiagramRenderer from "@/components/DiagramRenderer";
import SubjectBadge   from "@/components/SubjectBadge";

interface Answer {
  explanation: string;
  diagramSvg?: string;
  subject:     "maths" | "science" | "general";
  hasDiagram:  boolean;
}

interface HistoryItem {
  id:       number;
  question: string;
  answer:   Answer;
  time:     string;
}

const EXAMPLE_QUESTIONS = [
  "Solve the quadratic equation: x² + 5x + 6 = 0",
  "Explain how photosynthesis works in plants",
  "Find the area of a triangle with base 8cm and height 5cm",
  "What is Newton's Second Law of Motion? Give an example",
  "Draw and explain a displacement-time graph for a car journey",
  "How does the carbon cycle work? Explain each stage",
];

export default function Home() {
  const [question, setQuestion]     = useState("");
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [fileMime,   setFileMime]   = useState<string | undefined>();
  const [fileType,   setFileType]   = useState<"image"|"pdf"|undefined>();
  const [fileName,   setFileName]   = useState<string | undefined>();
  const [loading,    setLoading]    = useState(false);
  const [answer,     setAnswer]     = useState<Answer | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [history,    setHistory]    = useState<HistoryItem[]>([]);
  const [copied,     setCopied]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  const handleFile = (base64: string, mime: string, type: "image"|"pdf") => {
    setFileBase64(base64);
    setFileMime(mime);
    setFileType(type);
    setFileName(type === "pdf" ? "Uploaded PDF" : "Uploaded image");
  };

  const clearFile = () => {
    setFileBase64(undefined);
    setFileMime(undefined);
    setFileType(undefined);
    setFileName(undefined);
  };

  const clearAll = () => {
    setQuestion("");
    clearFile();
    setAnswer(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!question.trim() && !fileBase64) {
      setError("Please enter a question or upload a file.");
      return;
    }
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/solve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question:    question || "Please explain and solve the question in the attached file.",
          imageBase64: fileType === "image" ? fileBase64 : undefined,
          imageMime:   fileType === "image" ? fileMime   : undefined,
          pdfBase64:   fileType === "pdf"   ? fileBase64 : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer.");

      setAnswer(data);
      setHistory((h) => [
        {
          id:       Date.now(),
          question: question || "Uploaded file question",
          answer:   data,
          time:     new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...h.slice(0, 9),
      ]);

      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) handleSubmit();
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* ── Header ── */}
      <header className="bg-navy sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal flex items-center justify-center shadow">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-display font-bold text-lg leading-tight">Scholara</h1>
              <p className="text-teal-light text-xs">Your AI Study Companion · Science &amp; Maths</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-teal-light">
              <Microscope size={13} /> Science
            </span>
            <span className="text-muted text-xs hidden sm:block">·</span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-light">
              <Calculator size={13} /> Maths
            </span>
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="ml-3 flex items-center gap-1 text-xs text-teal-light hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10"
              >
                History ({history.length})
                <ChevronDown size={12} className={clsx("transition-transform", showHistory && "rotate-180")} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── History panel ── */}
      {showHistory && history.length > 0 && (
        <div className="bg-navy-900 border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <p className="text-xs text-muted mb-2 font-semibold uppercase tracking-wider">Recent Questions</p>
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => { setQuestion(h.question); setAnswer(h.answer); setShowHistory(false); }}
                  className="text-left text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition truncate"
                >
                  <span className="text-muted mr-2">{h.time}</span>{h.question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ── Hero ── */}
        {!answer && !loading && (
          <div className="text-center py-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-sm font-semibold px-4 py-2 rounded-full mb-4 border border-teal/20">
              <Sparkles size={14} />
              Powered by Gemini AI · Free to use
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-navy leading-tight mb-3">
              Stuck on homework?<br />
              <span className="text-teal">We&apos;ve got you.</span>
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Upload a photo, PDF, or type your GCSE Science or Maths question.
              Get a clear, step-by-step explanation instantly.
            </p>
          </div>
        )}

        {/* ── Input card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Text input */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Your question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. &quot;Solve x² - 5x + 6 = 0&quot; or &quot;Explain Newton's Third Law&quot;…"
                rows={3}
                className="w-full resize-none rounded-xl border border-navy-100 px-4 py-3 text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/40 text-sm transition"
              />
              <p className="text-xs text-muted mt-1">Tip: Press Ctrl + Enter to submit</p>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Or attach a file (optional)
              </label>
              <FileUpload
                onFile={handleFile}
                onClear={clearFile}
                hasFile={!!fileBase64}
                fileName={fileName}
              />
            </div>

            {/* Uploaded image preview */}
            {fileBase64 && fileType === "image" && (
              <div className="rounded-xl overflow-hidden border border-navy-100 max-h-48 flex items-center justify-center bg-navy-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileBase64} alt="Uploaded question" className="max-h-48 object-contain" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={clsx(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                  loading
                    ? "bg-navy/50 text-white cursor-not-allowed"
                    : "bg-navy text-white hover:bg-navy-900 active:scale-95 shadow-md hover:shadow-lg"
                )}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Solving…
                  </>
                ) : (
                  <><Send size={15} /> Solve Question</>
                )}
              </button>
              {(question || fileBase64 || answer) && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-muted hover:text-navy border border-navy-100 hover:border-navy transition"
                >
                  <RotateCcw size={14} /> New Question
                </button>
              )}
            </div>
          </div>

          {/* ── Example questions ── */}
          {!answer && !loading && (
            <div className="border-t border-navy-100 px-5 py-4 bg-paper">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    className="text-xs text-navy/70 border border-navy-100 hover:border-teal hover:text-teal px-3 py-1.5 rounded-full transition bg-white hover:bg-teal-50"
                  >
                    {q.length > 45 ? q.slice(0, 45) + "…" : q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 space-y-3 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full shimmer" />
              <div className="h-4 w-32 rounded shimmer" />
            </div>
            <div className="h-4 w-full rounded shimmer" />
            <div className="h-4 w-5/6 rounded shimmer" />
            <div className="h-4 w-4/6 rounded shimmer" />
            <div className="h-4 w-full rounded shimmer mt-4" />
            <div className="h-4 w-3/4 rounded shimmer" />
            <p className="text-xs text-muted text-center pt-2 animate-pulse">
              ✦ Working out the solution step by step…
            </p>
          </div>
        )}

        {/* ── Answer ── */}
        {answer && !loading && (
          <div ref={answerRef} className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden animate-fade-up">
            {/* Answer header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-navy-100 bg-paper">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center">
                  <Sparkles size={13} className="text-teal" />
                </div>
                <span className="text-sm font-semibold text-navy">Answer</span>
                <SubjectBadge subject={answer.subject} />
                {answer.hasDiagram && (
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    + Diagram
                  </span>
                )}
              </div>
              <button
                onClick={copyAnswer}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-navy transition px-2 py-1 rounded-lg hover:bg-navy-50"
              >
                {copied ? <><Check size={12} className="text-teal" /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>

            {/* Answer body */}
            <div className="px-5 py-5">
              <MathMarkdown content={answer.explanation} />
              {answer.hasDiagram && answer.diagramSvg && (
                <DiagramRenderer svg={answer.diagramSvg} />
              )}
            </div>

            {/* Ask follow-up */}
            <div className="border-t border-navy-100 px-5 py-4 bg-paper">
              <p className="text-xs text-muted mb-2">Have a follow-up question?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. &quot;Can you show another example?&quot;"
                  className="flex-1 text-sm border border-navy-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      setQuestion(e.currentTarget.value);
                      e.currentTarget.value = "";
                      handleSubmit();
                    }
                  }}
                />
                <button
                  className="text-xs font-semibold bg-teal text-white px-4 py-2 rounded-xl hover:bg-teal-dark transition"
                  onClick={() => handleSubmit()}
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature cards ── */}
        {!answer && !loading && (
          <div className="grid sm:grid-cols-3 gap-4 animate-fade-up">
            {[
              { icon: <ImageIcon />, title: "Photo upload", desc: "Snap your textbook or worksheet" },
              { icon: <FileText  />, title: "PDF support",  desc: "Upload full question papers"      },
              { icon: <Sparkles  />, title: "Step-by-step", desc: "Clear working for every answer"   },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-navy-100 p-4 flex gap-3 items-start shadow-sm hover:shadow transition">
                <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{title}</p>
                  <p className="text-xs text-muted mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-8 text-xs text-muted border-t border-navy-100 mt-8">
        Scholara · Your AI Study Companion for Science &amp; Maths
        <br />
        <span className="text-teal/70">Answers are AI-generated. Always double-check with your teacher.</span>
      </footer>
    </div>
  );
}
