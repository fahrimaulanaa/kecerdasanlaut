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

// Comprehensive LaTeX preprocessor to catch raw and untranslated formulas
export function normalizeLatex(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Convert display math \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`);

  // 2. Convert inline math \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // 3. Convert parenthesized LaTeX symbols like (\rho), (\omega), (\nabla), (\eta) to ($\rho$), ($\omega$), etc.
  const commonGreek = "alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|nabla|partial|infty|sum|int|prod";
  
  // Replace (\rho) or ( \rho ) with ($\rho$)
  text = text.replace(new RegExp(`\\(\\s*\\\\(${commonGreek})\\s*\\)`, "g"), "($\\$1$)");

  // 4. Wrap standalone TeX macros that are preceded by space or punctuation and not already inside $ or backticks
  // Match macros like \rho, \omega, \nabla when not preceded by $ or \
  text = text.replace(new RegExp(`(?<=[\\s,;:(]|^)\\\\(${commonGreek})(?=[\\s,;:.?!)]|$)`, "g"), "$\\$1$");

  // 5. Fix common case where display math $$ has no space around it
  text = text.replace(/([^\n])\$\$([\s\S]*?)\$\$([^\n])/g, "$1\n\n$$$2$$\n\n$3");

  return text;
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
        <button
          onClick={handleCopy}
          className="claude-code-copy-btn"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin kode</span>
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
        rehypePlugins={[[rehypeKatex, { output: "htmlAndMathml", strict: false }]]}
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
