"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, FileText, X, Video } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  onFile: (base64: string, mime: string, type: "image" | "pdf") => void;
  onClear: () => void;
  hasFile: boolean;
  fileName?: string;
}

export default function FileUpload({ onFile, onClear, hasFile, fileName }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      const mime = file.type;

      // Video: extract first frame as image
      if (mime.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = url;
        video.currentTime = 1;
        video.onloadeddata = () => {
          const canvas = document.createElement("canvas");
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL("image/jpeg");
          URL.revokeObjectURL(url);
          onFile(base64, "image/jpeg", "image");
        };
        return;
      }

      if (!mime.startsWith("image/") && mime !== "application/pdf") {
        setError("Please upload an image, PDF, or video file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onFile(base64, mime, mime === "application/pdf" ? "pdf" : "image");
      };
      reader.readAsDataURL(file);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: {
      "image/*":       [],
      "application/pdf": [],
      "video/*":       [],
    },
    maxFiles: 1,
    maxSize:  20_000_000,
  });

  if (hasFile) {
    return (
      <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
        <FileText size={18} className="text-teal-600 shrink-0" />
        <span className="text-sm text-navy font-medium truncate flex-1">{fileName}</span>
        <button
          onClick={onClear}
          className="text-muted hover:text-red-500 transition-colors shrink-0"
          aria-label="Remove file"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-teal-500 bg-teal-50 drop-active"
            : "border-navy-100 hover:border-teal-400 hover:bg-teal-50/30"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-center gap-3 mb-2">
          <ImageIcon size={20} className="text-teal-500" />
          <FileText size={20} className="text-teal-500" />
          <Video   size={20} className="text-teal-500" />
        </div>
        <p className="text-sm font-medium text-navy">
          {isDragActive ? "Drop it here…" : "Drag & drop a file"}
        </p>
        <p className="text-xs text-muted mt-1">Image, PDF, or Video · up to 20 MB</p>
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-teal-600 border border-teal-300 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition"
        >
          Browse files
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
