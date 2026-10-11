import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildLatexDocument,
  latexFileName,
  type LatexDocOptions,
} from "@/lib/latexDocument";
import type { ChatMessage } from "@/lib/chatStorage";

const execFileAsync = promisify(execFile);

const ENGINES: Array<{ cmd: string; args: string[]; twice?: boolean }> = [
  { cmd: "tectonic", args: ["-X", "compile", "--outdir", ".", "doc.tex"] },
  {
    cmd: "pdflatex",
    args: ["-interaction=nonstopmode", "-halt-on-error", "doc.tex"],
    twice: true,
  },
  {
    cmd: "xelatex",
    args: ["-interaction=nonstopmode", "-halt-on-error", "doc.tex"],
    twice: true,
  },
];

/**
 * Attempt to compile a LaTeX source into a PDF using whichever engine is
 * installed on the host (tectonic / pdflatex / xelatex). Returns null when
 * no engine is available or compilation fails, so callers can fall back.
 */
async function tryCompileLatex(texSource: string): Promise<Buffer | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "oceanai-tex-"));
  const texPath = path.join(dir, "doc.tex");
  await writeFile(texPath, texSource, "utf8");

  try {
    for (const engine of ENGINES) {
      try {
        await execFileAsync(engine.cmd, engine.args, {
          cwd: dir,
          timeout: 30_000,
          maxBuffer: 20 * 1024 * 1024,
        });
        if (engine.twice) {
          // Second pass for references/table of contents; failures are non-fatal.
          await execFileAsync(engine.cmd, engine.args, {
            cwd: dir,
            timeout: 30_000,
            maxBuffer: 20 * 1024 * 1024,
          }).catch(() => undefined);
        }
        const pdf = await readFile(path.join(dir, "doc.pdf"));
        if (pdf && pdf.length > 0) return pdf;
      } catch {
        // Engine missing or compile error -> try the next engine.
        continue;
      }
    }
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      messages = [],
      title = "Solusi Teknik Kelautan",
      model,
      author,
      subject,
      includeReasoning = false,
      includeUserMessages = true,
      compile = true,
    } = body as {
      messages: ChatMessage[];
      title?: string;
      model?: string;
      author?: string;
      subject?: string;
      includeReasoning?: boolean;
      includeUserMessages?: boolean;
      compile?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada solusi untuk diekspor ke PDF." },
        { status: 400 }
      );
    }

    const options: LatexDocOptions = {
      title,
      model,
      author,
      subject,
      includeReasoning,
      includeUserMessages,
    };
    const texSource = buildLatexDocument(messages, options);
    const baseName = latexFileName(title);

    // Preferred path: compile the LaTeX into a real PDF.
    if (compile) {
      const pdf = await tryCompileLatex(texSource);
      if (pdf) {
        return new Response(new Uint8Array(pdf), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
            "X-Export-Engine": "latex",
          },
        });
      }
    }

    // The browser has a pdf-lib renderer as a reliable fallback. Never expose
    // the intermediate LaTeX source as a download.
    return NextResponse.json({
      format: "client-pdf",
      engine: null,
      fileName: `${baseName}.pdf`,
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengekspor solusi ke PDF.",
      },
      { status: 500 }
    );
  }
}