"use client";

import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import katex from "katex";
import html2canvas from "html2canvas";
import { Copy, Check, ChevronDown, ImageDown } from "lucide-react";
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

type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function getLatexAnnotation(node: HastNode): string | null {
  if (node.tagName === "annotation") {
    const encoding = node.properties?.encoding;
    if (encoding === "application/x-tex") {
      return node.children
        ?.filter((child) => child.type === "text")
        .map((child) => String(child.value || ""))
        .join("") || null;
    }
  }

  for (const child of node.children || []) {
    const latex = getLatexAnnotation(child);
    if (latex) return latex;
  }
  return null;
}

function rehypeEquationCopyButtons() {
  return (tree: HastNode) => {
    const visit = (node: HastNode, parent?: HastNode) => {
      const className = node.properties?.className;
      const isKatexDisplay =
        (Array.isArray(className) && className.includes("katex-display")) ||
        className === "katex-display";
      if (
        node.type === "element" &&
        node.tagName === "span" &&
        isKatexDisplay
      ) {
        const latex = getLatexAnnotation(node);
        if (latex && parent?.children) {
          const index = parent.children.indexOf(node);
          parent.children[index] = {
            type: "element",
            tagName: "div",
            properties: { className: ["latex-equation-box"] },
            children: [
              node,
              {
                type: "element",
                tagName: "button",
                properties: {
                  type: "button",
                  className: ["latex-equation-copy-btn"],
                  "data-latex": latex,
                  title: "Salin LaTeX sebagai equation",
                  "aria-label": "Salin LaTeX sebagai equation",
                },
                children: [
                  {
                    type: "text",
                    value: "Salin LaTeX",
                  },
                ],
              },
            ],
          };
          return;
        }
      }

      for (const child of node.children || []) visit(child, node);
    };
    visit(tree);
  };
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

function TableWithActions({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"table">) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "exported">("idle");

  const getTableText = () => {
    if (!tableRef.current) return "";
    return Array.from(tableRef.current.rows)
      .map((row) =>
        Array.from(row.cells)
          .map((cell) => cell.innerText.replace(/\s+/g, " ").trim())
          .join("\t")
      )
      .join("\n");
  };

  const handleCopy = async () => {
    const table = tableRef.current;
    if (!table) return;

    const rows = Array.from(table.rows);
    const html = `<table>${rows
      .map((row) => `<tr>${Array.from(row.cells)
        .map((cell) => {
          const tag = cell.tagName.toLowerCase() === "th" ? "th" : "td";
          return `<${tag}>${cell.innerHTML}</${tag}>`;
        })
        .join("")}</tr>`)
      .join("")}</table>`;
    const text = getTableText();

    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    setStatus("copied");
    setIsOpen(false);
    window.setTimeout(() => setStatus("idle"), 2000);
  };

  const handleExportPng = async () => {
    const table = tableRef.current;
    if (!table) return;
    const canvas = await html2canvas(table, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `tabel-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus("exported");
    setIsOpen(false);
    window.setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="claude-table-container">
      <div className="claude-table-toolbar">
        <button
          type="button"
          className="claude-table-menu-button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          title="Aksi tabel"
        >
          {status === "copied" ? "Tabel disalin" : status === "exported" ? "PNG dibuat" : "Aksi tabel"}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {isOpen && (
          <div className="claude-table-menu">
            <button type="button" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5" />
              Salin tabel
            </button>
            <button type="button" onClick={handleExportPng}>
              <ImageDown className="w-3.5 h-3.5" />
              Export tabel menjadi PNG
            </button>
          </div>
        )}
      </div>
      <div className="claude-table-wrapper">
        <table ref={tableRef} className="claude-table" {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function LatexMarkdownRenderer({ content }: LatexMarkdownRendererProps) {
  const [copiedLatex, setCopiedLatex] = useState<string | null>(null);
  const normalized = normalizeLatex(content);

  return (
    <div
      className="claude-markdown-body"
      onClick={async (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest<HTMLButtonElement>("[data-latex]");
        if (!button) return;
        event.preventDefault();
        const latex = button.dataset.latex;
        if (!latex) return;
        try {
          await copyLatexAsEquation(latex);
          setCopiedLatex(latex);
          window.setTimeout(() => setCopiedLatex(null), 2000);
        } catch (error) {
          console.error("Gagal menyalin equation:", error);
        }
      }}
    >
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
          rehypeEquationCopyButtons,
        ]}
        components={{
          code: CodeBlock as unknown as React.FC<React.ComponentPropsWithoutRef<"code">>,
          table: TableWithActions,
          blockquote: ({ children, ...props }) => (
            <blockquote className="claude-blockquote" {...props}>
              {children}
            </blockquote>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
      {copiedLatex && (
        <span className="sr-only" role="status">
          LaTeX berhasil disalin sebagai equation
        </span>
      )}
    </div>
  );
}
