"use client";
import { useState, useRef } from "react";
import {
  BookOpen, Sparkles, Send, RotateCcw,
  ChevronDown, Copy, Check,
  ImageIcon, GraduationCap, ClipboardCheck, Dumbbell, Globe
} from "lucide-react";
import clsx from "clsx";
import FileUpload       from "@/components/FileUpload";
import DiagramRenderer  from "@/components/DiagramRenderer";
import SubjectBadge     from "@/components/SubjectBadge";
import VoicePlayer      from "@/components/VoicePlayer";
import StructuredAnswer from "@/components/StructuredAnswer";
import MicButton        from "@/components/MicButton";

type Mode     = "solve" | "tutor" | "mark" | "practice";
type Language = "en" | "ru" | "ur";

interface Answer {
  explanation: string;
  diagramSvg?: string;
  subject:     "maths" | "science" | "general";
  hasDiagram:  boolean;
  voiceText:   string;
  mode:        Mode;
}

interface HistoryItem {
  id: number; question: string; answer: Answer; time: string;
}

const MODES: { key: Mode; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "solve",    label: "Solve",    icon: <Sparkles size={14} />,       desc: "Step-by-step worked solution" },
  { key: "tutor",    label: "Tutor Me", icon: <GraduationCap size={14} />,  desc: "Guided — try each step yourself" },
  { key: "mark",     label: "Mark It",  icon: <ClipboardCheck size={14} />, desc: "Get your own answer marked" },
  { key: "practice", label: "Practice", icon: <Dumbbell size={14} />,       desc: "3 new questions on this topic" },
];

const LANGS: { key: Language; label: string }[] = [
  { key: "en", label: "English" },
  { key: "ru", label: "Русский" },
  { key: "ur", label: "اردو" },
];

const EXAMPLES: Record<Mode, string[]> = {
  solve: [
    "Solve the quadratic equation: x² + 5x + 6 = 0",
    "Explain how photosynthesis works in plants",
    "Draw and explain a distance-time graph for a car journey",
  ],
  tutor: [
    "Teach me how to solve simultaneous equations",
    "Help me understand balancing chemical equations",
    "Guide me through finding the gradient of a line",
  ],
  mark: [
    "Question: What is 15% of 240?  (then type your answer below)",
    "Question: Explain the difference between mitosis and meiosis",
  ],
  practice: [
    "Pythagoras' theorem",
    "Photosynthesis and respiration",
    "Fractions and percentages",
  ],
};

export default function Home() {
  const [mode, setMode]             = useState<Mode>("solve");
  const [language, setLanguage]     = useState<Language>("en");
  const [question, setQuestion]     = useState("");
  const [studentWork, setStudentWork] = useState("");
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
    setFileBase64(base64); setFileMime(mime); setFileType(type);
    setFileName(type === "pdf" ? "Uploaded PDF" : "Uploaded image");
  };
  const clearFile = () => {
    setFileBase64(undefined); setFileMime(undefined);
    setFileType(undefined);   setFileName(undefined);
  };
  const clearAll = () => {
    setQuestion(""); setStudentWork(""); clearFile(); setAnswer(null); setError(null);
  };

  const handleSubmit = async () => {
    if (!question.trim() && !fileBase64) {
      setError("Please enter a question or upload a file."); return;
    }
    if (mode === "mark" && !studentWork.trim() && !fileBase64) {
      setError("Mark It mode needs your attempted answer — type it below or upload a photo of your work."); return;
    }
    setLoading(true); setError(null); setAnswer(null);

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:    question || "Please explain and solve the question in the attached file.",
          mode, language,
          studentWork: mode === "mark" ? studentWork : undefined,
          imageBase64: fileType === "image" ? fileBase64 : undefined,
          imageMime:   fileType === "image" ? fileMime   : undefined,
          pdfBase64:   fileType === "pdf"   ? fileBase64 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer.");

      setAnswer(data);
      setHistory((h) => [{
        id: Date.now(), question: question || "Uploaded file question",
        answer: data,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }, ...h.slice(0, 9)]);
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
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const activeMode = MODES.find((m) => m.key === mode)!;

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
              <p className="text-teal-light text-xs">Solve · Tutor · Mark · Practice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
              <Globe size={12} className="text-teal-light" />
              {LANGS.map((l) => (
                <button key={l.key}
                  onClick={() => setLanguage(l.key)}
                  className={clsx("text-xs px-2 py-0.5 rounded transition",
                    language === l.key ? "bg-teal text-white font-semibold" : "text-white/60 hover:text-white")}>
                  {l.label}
                </button>
              ))}
            </div>
            {history.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs text-teal-light hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10">
                History ({history.length})
                <ChevronDown size={12} className={clsx("transition-transform", showHistory && "rotate-180")} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── History ── */}
      {showHistory && history.length > 0 && (
        <div className="bg-navy-900 border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <button key={h.id}
                  onClick={() => { setQuestion(h.question); setAnswer(h.answer); setShowHistory(false); }}
                  className="text-left text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition truncate">
                  <span className="text-muted mr-2">{h.time}</span>{h.question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ── Hero ── */}
        {!answer && !loading && (
          <div className="text-center py-4 animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-sm font-semibold px-4 py-2 rounded-full mb-4 border border-teal/20">
              <Sparkles size={14} /> The AI tutor that trains you — not just answers
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-navy leading-tight mb-3">
              Don&apos;t just get answers.<br /><span className="text-teal">Learn to solve.</span>
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Full solutions, guided tutoring, examiner-style marking, and practice — in English, Russian, or Urdu.
            </p>
          </div>
        )}

        {/* ── Mode tabs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map((m) => (
            <button key={m.key}
              onClick={() => { setMode(m.key); setAnswer(null); setError(null); }}
              className={clsx(
                "flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-center transition-all",
                mode === m.key
                  ? "bg-navy text-white border-navy shadow-md"
                  : "bg-white text-navy border-navy-100 hover:border-teal"
              )}>
              <span className="flex items-center gap-1.5 text-sm font-semibold">{m.icon}{m.label}</span>
              <span className={clsx("text-[11px] leading-tight", mode === m.key ? "text-white/70" : "text-muted")}>{m.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Input card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-navy-100 overflow-hidden">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                {mode === "practice" ? "Topic or example question" : "Your question"}
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
                  placeholder={
                    mode === "practice" ? "e.g. \"Pythagoras' theorem\" or paste a question to get similar ones…"
                    : mode === "mark"   ? "Type the question here…"
                    : mode === "tutor"  ? "e.g. \"Teach me how to solve simultaneous equations\"…"
                    : "e.g. \"Solve x² - 5x + 6 = 0\" or \"Explain Newton's Third Law\"…"}
                  rows={3}
                  className="flex-1 resize-none rounded-xl border border-navy-100 px-4 py-3 text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/40 text-sm transition"
                />
                <MicButton language={language} onResult={(t) => setQuestion((q) => (q ? q + " " : "") + t)} />
              </div>
              <p className="text-xs text-muted mt-1">Ctrl + Enter to submit · 🎤 to speak your question</p>
            </div>

            {/* Student work — Mark mode only */}
            {mode === "mark" && (
              <div>
                <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                  Your attempted answer (typed, or upload a photo of your work below)
                </label>
                <textarea
                  value={studentWork}
                  onChange={(e) => setStudentWork(e.target.value)}
                  placeholder="Type your answer / working here…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Or attach a file (optional)
              </label>
              <FileUpload onFile={handleFile} onClear={clearFile} hasFile={!!fileBase64} fileName={fileName} />
            </div>

            {fileBase64 && fileType === "image" && (
              <div className="rounded-xl overflow-hidden border border-navy-100 max-h-48 flex items-center justify-center bg-navy-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileBase64} alt="Uploaded question" className="max-h-48 object-contain" />
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSubmit} disabled={loading}
                className={clsx("flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                  loading ? "bg-navy/50 text-white cursor-not-allowed"
                          : "bg-navy text-white hover:bg-navy-900 active:scale-95 shadow-md hover:shadow-lg")}>
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Working…
                  </>
                ) : (
                  <><Send size={15} /> {activeMode.label === "Solve" ? "Solve Question" : activeMode.label}</>
                )}
              </button>
              {(question || fileBase64 || answer || studentWork) && (
                <button onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-muted hover:text-navy border border-navy-100 hover:border-navy transition">
                  <RotateCcw size={14} /> New
                </button>
              )}
            </div>
          </div>

          {!answer && !loading && (
            <div className="border-t border-navy-100 px-5 py-4 bg-paper">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES[mode].map((q) => (
                  <button key={q} onClick={() => setQuestion(q)}
                    className="text-xs text-navy/70 border border-navy-100 hover:border-teal hover:text-teal px-3 py-1.5 rounded-full transition bg-white hover:bg-teal-50">
                    {q.length > 50 ? q.slice(0, 50) + "…" : q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 space-y-3 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full shimmer" />
              <div className="h-4 w-32 rounded shimmer" />
            </div>
            <div className="h-4 w-full rounded shimmer" />
            <div className="h-4 w-5/6 rounded shimmer" />
            <div className="h-4 w-4/6 rounded shimmer" />
            <p className="text-xs text-muted text-center pt-2 animate-pulse">
              {mode === "tutor" ? "✦ Preparing your guided lesson…"
               : mode === "mark" ? "✦ Marking your answer like an examiner…"
               : mode === "practice" ? "✦ Writing practice questions…"
               : "✦ Working out the solution step by step…"}
            </p>
          </div>
        )}

        {/* ── Answer ── */}
        {answer && !loading && (
          <div ref={answerRef} className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-navy-100 bg-paper flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center">
                  {activeMode.icon}
                </div>
                <span className="text-sm font-semibold text-navy">
                  {mode === "tutor" ? "Guided Lesson" : mode === "mark" ? "Your Marking" : mode === "practice" ? "Practice Set" : "Answer"}
                </span>
                <SubjectBadge subject={answer.subject} />
                {answer.hasDiagram && (
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">+ Diagram</span>
                )}
                <VoicePlayer text={answer.voiceText} autoPlay={mode !== "practice"} />
              </div>
              <button onClick={copyAnswer}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-navy transition px-2 py-1 rounded-lg hover:bg-navy-50">
                {copied ? <><Check size={12} className="text-teal" /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>

            <div className="px-5 py-5">
              <StructuredAnswer explanation={answer.explanation} mode={answer.mode} />
              {answer.hasDiagram && answer.diagramSvg && <DiagramRenderer svg={answer.diagramSvg} />}
            </div>

            <div className="border-t border-navy-100 px-5 py-4 bg-paper flex flex-wrap gap-2">
              {mode !== "practice" && (
                <button
                  onClick={() => { setMode("practice"); setTimeout(handleSubmit, 50); }}
                  className="text-xs font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-3 py-2 rounded-lg transition">
                  🏋️ Practice this topic
                </button>
              )}
              {mode !== "tutor" && (
                <button
                  onClick={() => { setMode("tutor"); setTimeout(handleSubmit, 50); }}
                  className="text-xs font-semibold text-navy border border-navy-100 hover:border-navy px-3 py-2 rounded-lg transition">
                  🎓 Teach me this instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Feature cards ── */}
        {!answer && !loading && (
          <div className="grid sm:grid-cols-4 gap-3 animate-fade-up">
            {[
              { icon: <GraduationCap size={16} />, title: "Tutor Mode",  desc: "Try each step yourself first" },
              { icon: <ClipboardCheck size={16} />, title: "Get Marked", desc: "Examiner-style feedback" },
              { icon: <Globe size={16} />,          title: "3 Languages", desc: "English · Русский · اردو" },
              { icon: <ImageIcon size={16} />,      title: "Any Input",  desc: "Photo, PDF, voice, or text" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-navy-100 p-4 flex gap-3 items-start shadow-sm hover:shadow transition">
                <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">{icon}</div>
                <div>
                  <p className="text-sm font-semibold text-navy">{title}</p>
                  <p className="text-xs text-muted mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-muted border-t border-navy-100 mt-8">
        Scholara · The AI tutor that trains you · Solve, Tutor, Mark &amp; Practice
        <br />
        <span className="text-teal/70">Answers are AI-generated. Always double-check with your teacher.</span>
      </footer>
    </div>
  );
}
