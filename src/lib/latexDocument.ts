import type { ChatMessage } from "@/lib/chatStorage";

export interface LatexDocOptions {
  title: string;
  model?: string;
  author?: string;
  subject?: string;
  includeReasoning?: boolean;
  includeUserMessages?: boolean;
  generatedAt?: number;
}

/** Escape plain text so it is safe inside LaTeX text mode. */
export function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/</g, "\\textless{}")
    .replace(/>/g, "\\textgreater{}");
}

/**
 * Split text into alternating math / plain-text segments so markdown can be
 * converted to LaTeX without destroying embedded math ($...$, $$...$$).
 */
type Segment = { type: "text" | "math" | "display"; value: string };

export function splitMath(input: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "display", value: match[1].trim() });
    } else {
      segments.push({ type: "math", value: match[2].trim() });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    segments.push({ type: "text", value: input.slice(lastIndex) });
  }
  return segments;
}

/** Convert a markdown line to LaTeX, preserving inline math. */
function inlineMarkdownToLatex(line: string): string {
  return splitMath(line)
    .map((seg) => {
      if (seg.type === "math") return `$${seg.value}$`;
      if (seg.type === "display") return `$$${seg.value}$$`;
      let text = escapeLatex(seg.value);
      text = text.replace(/\*\*([^*]+)\*\*/g, "\\textbf{$1}");
      text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1\\textit{$2}");
      text = text.replace(/`([^`]+)`/g, "\\texttt{$1}");
      return text;
    })
    .join("");
}

/** Convert a full markdown body into a LaTeX fragment. */
export function markdownToLatex(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inItemize = false;
  let inEnumerate = false;
  let inCode = false;
  let codeBuffer: string[] = [];

  const closeLists = () => {
    if (inItemize) {
      out.push("\\end{itemize}");
      inItemize = false;
    }
    if (inEnumerate) {
      out.push("\\end{enumerate}");
      inEnumerate = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^```/.test(line.trim())) {
      if (!inCode) {
        inCode = true;
        codeBuffer = [];
      } else {
        inCode = false;
        out.push("\\begin{verbatim}");
        out.push(codeBuffer.join("\n"));
        out.push("\\end{verbatim}");
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (/^\s*\$\$/.test(line)) {
      closeLists();
      const inner = line.replace(/^\s*\$\$/, "").replace(/\$\$\s*$/, "");
      if (inner.trim()) {
        out.push("\\[");
        out.push(inner.trim());
        out.push("\\]");
      }
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      const cmd =
        level === 1
          ? "section"
          : level === 2
          ? "subsection"
          : level === 3
          ? "subsubsection"
          : "paragraph";
      out.push(`\\${cmd}*{${inlineMarkdownToLatex(heading[2])}}`);
      continue;
    }

    const listItem = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (listItem) {
      if (inEnumerate) {
        out.push("\\end{enumerate}");
        inEnumerate = false;
      }
      if (!inItemize) {
        out.push("\\begin{itemize}");
        inItemize = true;
      }
      out.push(`  \\item ${inlineMarkdownToLatex(listItem[1])}`);
      continue;
    }

    const orderedItem = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (orderedItem) {
      if (inItemize) {
        out.push("\\end{itemize}");
        inItemize = false;
      }
      if (!inEnumerate) {
        out.push("\\begin{enumerate}");
        inEnumerate = true;
      }
      out.push(`  \\item ${inlineMarkdownToLatex(orderedItem[1])}`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeLists();
      out.push(
        `\\begin{quote}${inlineMarkdownToLatex(line.replace(/^\s*>\s?/, ""))}\\end{quote}`
      );
      continue;
    }

    if (!line.trim()) {
      closeLists();
      out.push("");
      continue;
    }

    closeLists();
    out.push(inlineMarkdownToLatex(line));
    out.push("");
  }

  closeLists();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Build a complete, compilable LaTeX document from a chat solution.
 * Returns the `.tex` source string.
 */
export function buildLatexDocument(
  messages: ChatMessage[],
  options: LatexDocOptions
): string {
  const now = new Date(options.generatedAt ?? Date.now());
  const dateStr = now.toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const body = messages
    .filter((m) => options.includeUserMessages || m.role === "assistant")
    .map((m) => {
      const who = m.role === "user" ? "Pertanyaan Mahasiswa" : "Solusi OceanAI";
      const parts: string[] = [`\\subsection*{${escapeLatex(who)}}`];
      if (options.includeReasoning && m.reasoning) {
        parts.push("\\begin{quote}\\small\\textit{Proses penalaran:}\\end{quote}");
        parts.push("\\begin{verbatim}");
        parts.push(m.reasoning);
        parts.push("\\end{verbatim}");
      }
      parts.push(markdownToLatex(m.content));
      return parts.join("\n");
    })
    .join("\n\n\\vspace{1em}\n\n");

  return `% =====================================================================
% OceanAI - Solusi Teknik Kelautan
% Dokumen ini dihasilkan otomatis. Kompilasi dengan: pdflatex <file>.tex
% =====================================================================
\\documentclass[11pt,a4paper]{article}

% ---------- Bahasa & Encoding ----------
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[english]{babel}

% ---------- Matematika ----------
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{mathtools}

% ---------- Tata Letak & Grafis ----------
\\usepackage[margin=2.2cm]{geometry}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage[colorlinks=true,linkcolor=teal,urlcolor=teal]{hyperref}

% ---------- Warna Tema Ocean ----------
\\definecolor{ocean}{HTML}{0F5A6E}

\\titleformat{\\section}{\\color{ocean}\\Large\\bfseries}{\\thesection.}{0.5em}{}
\\titleformat{\\subsection}{\\color{ocean}\\large\\bfseries}{\\thesubsection}{0.5em}{}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small\\color{ocean}OceanAI - Teknik Kelautan}
\\fancyhead[R]{\\small\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}

\\setlist[itemize]{leftmargin=1.4em,itemsep=0.25em}
\\setlist[enumerate]{leftmargin=1.6em,itemsep=0.25em}

\\title{\\vspace{-1cm}\\textbf{${escapeLatex(options.title)}}\\\\[0.3em]
\\large\\color{ocean}Solusi Teknik Kelautan}
\\author{OceanAI${options.author ? ` \\textperiodcentered\\ ${escapeLatex(options.author)}` : ""}}
\\date{${escapeLatex(dateStr)}}

\\begin{document}
\\maketitle

\\begin{center}
\\begin{tabular}{>{\\bfseries}l l}
Model AI & ${escapeLatex(options.model || "OceanAI")} \\\\
Subjek & ${escapeLatex(options.subject || "Teknik Kelautan")} \\\\
Dibuat & ${escapeLatex(dateStr)} \\\\
\\end{tabular}
\\end{center}

\\vspace{0.5em}
\\hrule
\\vspace{1em}

${body}

\\vspace{1.5em}
\\begin{center}
\\small\\color{gray}
Dokumen dihasilkan otomatis oleh OceanAI - Platform AI Mahasiswa Teknik Kelautan.
\\end{center}

\\end{document}
`;
}

/** Suggested filename (without extension) for the exported document. */
export function latexFileName(title: string): string {
  const safe = (title || "solusi-oceanai")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return safe || "solusi-oceanai";
}