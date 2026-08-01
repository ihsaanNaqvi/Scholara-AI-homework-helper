"use client";
import { useState } from "react";
import { ZoomIn, ZoomOut, Download } from "lucide-react";

interface Props { svg: string }

function sanitizeSvg(raw: string): string {
  // Remove any script tags or event handlers for safety
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

export default function DiagramRenderer({ svg }: Props) {
  const [scale, setScale] = useState(1);
  const clean = sanitizeSvg(svg);

  const download = () => {
    const blob = new Blob([clean], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 rounded-2xl border border-navy-100 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-navy-50 border-b border-navy-100">
        <span className="text-xs font-semibold text-navy uppercase tracking-wider">Diagram</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-1.5 rounded hover:bg-navy-100 text-muted transition"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-muted w-8 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
            className="p-1.5 rounded hover:bg-navy-100 text-muted transition"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={download}
            className="p-1.5 rounded hover:bg-navy-100 text-muted transition"
            aria-label="Download SVG"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
      <div className="p-4 overflow-auto bg-white flex items-center justify-center min-h-[160px]">
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.2s" }}
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      </div>
    </div>
  );
}
