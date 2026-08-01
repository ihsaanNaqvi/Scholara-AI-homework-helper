"use client";
import ReactMarkdown from "react-markdown";
import remarkMath   from "remark-math";
import rehypeKatex  from "rehype-katex";

interface Props { content: string }

export default function MathMarkdown({ content }: Props) {
  return (
    <div className="answer-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
