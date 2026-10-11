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

/**
 * Normalizes and converts raw LaTeX formulas into standard KaTeX markdown.
 * Handles display math, inline math, bare equation lines, and standalone Greek letters.
 */
export function normalizeLatex(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Convert display math \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`);

  // 2. Convert inline math \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // 3. Convert bare equation lines without $ into display math $$ ... $$
  // If a line contains TeX operators like \frac, \nabla, \partial, \sum, \int, \tanh, \sqrt, \dot, \ddot
  // and does NOT already contain '$' or backticks
  const lines = text.split("\n");
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Skip if already wrapped in $ or code fence
    if (trimmed.startsWith("$$") || trimmed.startsWith("```") || trimmed.startsWith("|")) {
      return line;
    }

    // Check if line contains TeX math commands and is an equation line
    const hasMathCommand = /\\(frac|nabla|partial|int|sum|prod|tanh|sqrt|dot|ddot|vec|mathbf|boldsymbol|ll|gg|approx|equiv|le|ge|pm|times|cdot|implies|iff)\b/.test(
      trimmed
    );
    const hasEqualsOrRel = /(=|<|>|\+|-|\/|\\approx|\\implies)/.test(trimmed);

    if (hasMathCommand && hasEqualsOrRel && !trimmed.includes("$")) {
      // Clean any accidental markdown heading prefix if present inside equation
      return `$$\n${trimmed}\n$$`;
    }

    return line;
  });
  text = processedLines.join("\n");

  // 4. Wrap standalone inline math expressions like \phi(x,z,t), (a/L \ll 1), z = -h, (\rho), (\omega)
  // First, handle parenthesized expressions containing TeX symbols: e.g. (\rho) or (a/L \ll 1) or (\phi)
  text = text.replace(/\(([^)$\n]*\\[a-zA-Z]+[^)$\n]*)\)/g, (match, inner) => {
    // If not already inside math delimiters
    if (inner.includes("$")) return match;
    return `($${inner.trim()}$)`;
  });

  // Next, wrap standalone Greek letters or symbols like \rho, \omega, \eta, \lambda, \phi, \zeta
  // that have word boundaries and are not already inside $ or backticks
  const greekLetters = "alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega";
  text = text.replace(new RegExp(`(?<=[\\s,;:(]|^)\\\\(${greekLetters})(?=[\\s,;:.?!)]|$)`, "g"), (match) => {
    return `$${match}$`;
  });

  // 5. Ensure display math $$ has proper newline spacing
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
              errorColor: "#2d2b28",
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
