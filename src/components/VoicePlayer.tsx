"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";

interface Props {
  text:       string;
  autoPlay?:  boolean;
}

export default function VoicePlayer({ text, autoPlay = false }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Pick the most natural available voice (prefer UK/US English, female teacher-like)
  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    // Preference order for a clear, natural teacher voice
    const prefer = [
      "Google UK English Female",
      "Google US English",
      "Microsoft Sonia Online (Natural) - English (United Kingdom)",
      "Microsoft Libby Online (Natural) - English (United Kingdom)",
      "Samantha",
    ];
    for (const name of prefer) {
      const v = voices.find((vc) => vc.name === name);
      if (v) return v;
    }
    // Fallback: any en-GB, then any en
    return (
      voices.find((v) => v.lang === "en-GB") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0]
    );
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate   = 0.98;   // slightly slower — clearer, teacher-like
    u.pitch  = 1.0;
    u.volume = 1.0;

    u.onstart = () => { setSpeaking(true);  setPaused(false); };
    u.onend   = () => { setSpeaking(false); setPaused(false); };
    u.onerror = () => { setSpeaking(false); setPaused(false); };

    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, [text, pickVoice]);

  const pause = () => { window.speechSynthesis.pause(); setPaused(true); };
  const resume = () => { window.speechSynthesis.resume(); setPaused(false); };
  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); };

  // Auto-play once when a new answer arrives
  useEffect(() => {
    if (!autoPlay || !text) return;
    // voices may load async; wait a tick
    const t = setTimeout(() => {
      if (window.speechSynthesis?.getVoices().length) speak();
      else window.speechSynthesis.onvoiceschanged = () => speak();
    }, 300);
    return () => {
      clearTimeout(t);
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Cleanup on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {!speaking && (
        <button
          onClick={speak}
          className="flex items-center gap-1.5 text-xs font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-3 py-1.5 rounded-lg transition"
        >
          <Volume2 size={13} /> Listen
        </button>
      )}
      {speaking && !paused && (
        <button
          onClick={pause}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
        >
          <Pause size={13} /> Pause
        </button>
      )}
      {speaking && paused && (
        <button
          onClick={resume}
          className="flex items-center gap-1.5 text-xs font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-3 py-1.5 rounded-lg transition"
        >
          <Play size={13} /> Resume
        </button>
      )}
      {speaking && (
        <button
          onClick={stop}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted border border-navy-100 hover:bg-navy-50 px-3 py-1.5 rounded-lg transition"
        >
          <Square size={12} /> Stop
        </button>
      )}
      {speaking && (
        <span className="flex items-center gap-1">
          <span className="w-1 h-3 bg-teal rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-3 bg-teal rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-1 h-3 bg-teal rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </span>
      )}
    </div>
  );
}
