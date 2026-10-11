"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import katex from "katex";
import { Copy, Check } from "lucide-react";
import "katex/dist/katex.min.css";

interface LatexMarkdownRendererProps {
  content: string;
}

/**
 * Safely normalizes LaTeX delimiters without aggressively modifying existing markdown.
 * Only converts the two unambiguous cases:
 *   \[ ... \]  →  $$ ... $$   (display math)
 *   \( ... \)  →  $ ... $     (inline math)
 *
 * All other content is left untouched to avoid breaking tables, headings, and paragraphs.
 */
function normalizeLatex(text: string): string {
  if (!text) return "";

  // 1. Display math: \[ ... \]  →  $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
    return `$$\n${math.trim()}\n$$`;
  });

  // 2. Inline math: \( ... \)  →  $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
    return `$${math.trim()}$`;
  });

  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function latexToMathml(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      output: "mathml",
      throwOnError: false,
      strict: false,
    });
  } catch {
    return `<code>${escapeHtml(latex)}</code>`;
  }
}

/**
 * Writes HTML MathML to the clipboard. Microsoft Word recognizes MathML in
 * HTML clipboard data and converts it into a native editable equation.
 */
export async function copyLatexAsEquation(text: string): Promise<void> {
  const normalized = normalizeLatex(text);
  const mathPattern = /(\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$)/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathPattern.exec(normalized)) !== null) {
    html += escapeHtml(normalized.slice(lastIndex, match.index))
      .replace(/\n/g, "<br>");
    const displayMode = match[1].startsWith("$$");
    html += latexToMathml(displayMode ? match[2] : match[3], displayMode);
    lastIndex = match.index + match[1].length;
  }
  html += escapeHtml(normalized.slice(lastIndex)).replace(/\n/g, "<br>");

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([`<div>${html}</div>`], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(text);
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
      <code className="claude-inline-code" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="claude-code-container">
      <div className="claude-code-header">
        <span className="claude-code-lang">{language || "code"}</span>
        <button onClick={handleCopy} className="claude-code-copy-btn" title="Salin kode">
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
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
      <pre className="claude-code-pre">
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
    <div className="claude-markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              output: "htmlAndMathml",
              strict: false,
              throwOnError: false,
              errorColor: "#991b1b",
            },
          ],
        ]}
        components={{
          code: CodeBlock as unknown as React.FC<React.ComponentPropsWithoutRef<"code">>,
          table: ({ children, ...props }) => (
            <div className="claude-table-wrapper">
              <table className="claude-table" {...props}>
                {children}
              </table>
            </div>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="claude-blockquote" {...props}>
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
