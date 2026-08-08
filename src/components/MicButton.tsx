"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface Props {
  onResult: (text: string) => void;
  language: "en" | "ru" | "ur";
}

const LANG_CODES = { en: "en-GB", ru: "ru-RU", ur: "ur-PK" };

export default function MicButton({ onResult, language }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous     = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript || "";
      if (text) onResult(text);
      setListening(false);
    };
    rec.onend   = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => rec.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); setListening(false); return; }
    rec.lang = LANG_CODES[language];
    try { rec.start(); setListening(true); } catch { /* already started */ }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Stop listening" : "Speak your question"}
      className={`flex items-center justify-center w-10 h-10 rounded-xl border transition shrink-0 ${
        listening
          ? "bg-red-50 border-red-300 text-red-500 animate-pulse"
          : "border-navy-100 text-muted hover:border-teal hover:text-teal"
      }`}
    >
      {listening ? <MicOff size={17} /> : <Mic size={17} />}
    </button>
  );
}
