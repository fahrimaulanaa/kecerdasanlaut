"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import "katex/dist/katex.min.css";

interface LatexMarkdownRendererProps {
  content: string;
}

// Preprocess model markdown to normalize LaTeX delimiters
function normalizeLatex(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Convert \[ ... \] to $$ ... $$ (display math)
  cleaned = cleaned.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`);

  // Convert \( ... \) to $ ... $ (inline math)
  cleaned = cleaned.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // Fix common case where model outputs raw $$ inside tight paragraphs without spacing
  cleaned = cleaned.replace(/([^\n])\$\$([\s\S]*?)\$\$([^\n])/g, "$1\n\n$$$2$$\n\n$3");

  return cleaned;
}

function CodeBlock({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isInline = !match && !codeString.includes("\n");

  if (isInline) {
    return (
      <code className="ocean-inline-code" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="ocean-code-container">
      <div className="ocean-code-header">
        <span className="ocean-code-lang">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="ocean-code-copy-btn"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="ocean-code-pre">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export function LatexMarkdownRenderer({ content }: LatexMarkdownRendererProps) {
  const normalized = normalizeLatex(content);

  return (
    <div className="ocean-markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { output: "htmlAndMathml", strict: false }]]}
        components={{
          code: CodeBlock as unknown as React.FC<React.ComponentPropsWithoutRef<"code">>,
          table: ({ children, ...props }) => (
            <div className="ocean-table-wrapper">
              <table className="ocean-table" {...props}>
                {children}
              </table>
            </div>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="ocean-blockquote" {...props}>
              {children}
            </blockquote>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
