"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Waves,
  Anchor,
  Send,
  Plus,
  Trash2,
  BookOpen,
  Cloud,
  Flame,
  LogIn,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  StopCircle,
  Download,
  Share2,
  ChevronDown,
  Brain,
  MessageSquare,
} from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";
import { LatexMarkdownRenderer } from "@/components/LatexMarkdownRenderer";
import { OceanTopicCards } from "@/components/OceanTopicCards";
import { FormulaQuickSheet } from "@/components/FormulaQuickSheet";
import { AuthModal } from "@/components/AuthModal";
import { FirebaseConfigModal } from "@/components/FirebaseConfigModal";
import { DeploymentModal } from "@/components/DeploymentModal";
import { useAuth } from "@/context/AuthContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  model?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  messages: ChatMessage[];
}

const MATH_SYMBOLS = [
  { label: "\\omega", insert: "\\omega" },
  { label: "\\lambda", insert: "\\lambda" },
  { label: "\\rho", insert: "\\rho" },
  { label: "\\eta", insert: "\\eta" },
  { label: "\\nabla", insert: "\\nabla" },
  { label: "H_s", insert: "H_s" },
  { label: "T_p", insert: "T_p" },
  { label: "\\tanh(kh)", insert: "\\tanh(kh)" },
  { label: "\\int", insert: "\\int " },
  { label: "\\sqrt{}", insert: "\\sqrt{}" },
];

export default function HomePage() {
  const { user, signOut, isFirebaseConfigured } = useAuth();

  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("qwen3.8-max");
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(false);
  const [isFormulaQuickSheetOpen, setIsFormulaQuickSheetOpen] = useState(false);
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("oceanai_sessions");
    const savedModel = localStorage.getItem("oceanai_selected_model");

    if (savedModel) {
      setSelectedModel(savedModel);
    }

    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved sessions", e);
      }
    }

    // Default first session
    const initialSession: ChatSession = {
      id: "session-" + Date.now(),
      title: "Diskusi Dispersi Gelombang",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: savedModel || "qwen3.8-max",
      messages: [],
    };
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
  }, []);

  // Save sessions to localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem("oceanai_sessions", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist sessions", e);
    }
  };

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isStreaming]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("oceanai_selected_model", modelId);
  };

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: "session-" + Date.now(),
      title: "Topik Kelautan Baru",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: [],
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    if (filtered.length === 0) {
      const fresh: ChatSession = {
        id: "session-" + Date.now(),
        title: "Percakapan Baru",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        messages: [],
      };
      saveSessions([fresh]);
      setCurrentSessionId(fresh.id);
    } else {
      saveSessions(filtered);
      if (sessionId === currentSessionId) {
        setCurrentSessionId(filtered[0].id);
      }
    }
  };

  const insertSymbol = (sym: string) => {
    if (!textareaRef.current) {
      setInput((prev) => prev + " $" + sym + "$ ");
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = input;
    const inserted = `$${sym}$`;
    const newText = text.substring(0, start) + inserted + text.substring(end);
    setInput(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        start + inserted.length,
        start + inserted.length
      );
    }, 50);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || input).trim();
    if (!promptToSend || isStreaming) return;

    if (!currentSession) return;

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: promptToSend,
      timestamp: Date.now(),
    };

    const isFirstMessage = currentSession.messages.length === 0;
    const newTitle = isFirstMessage
      ? promptToSend.slice(0, 32) + (promptToSend.length > 32 ? "..." : "")
      : currentSession.title;

    const assistantPlaceholderId = "msg-assistant-" + Date.now();
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      reasoning: "",
      model: selectedModel,
      timestamp: Date.now(),
    };

    const newMessages = [...currentSession.messages, userMessage, assistantMessage];

    const updatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      updatedAt: Date.now(),
      messages: newMessages,
    };

    const nextSessions = sessions.map((s) =>
      s.id === currentSession.id ? updatedSession : s
    );
    saveSessions(nextSessions);

    if (!customPrompt) {
      setInput("");
    }
    setIsStreaming(true);

    // Call API with SSE streaming
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Prepare context history (last 10 messages)
      const contextMessages = newMessages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages,
          model: selectedModel,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${res.status}: Gagal memproses permintaan AI.`
        );
      }

      if (!res.body) {
        throw new Error("Respons streaming kosong dari server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";
      let fullReasoning = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              if (delta.content) {
                fullContent += delta.content;
              }
              if (delta.reasoning) {
                fullReasoning += delta.reasoning;
              }

              // Update the assistant message in session
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSession.id) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantPlaceholderId
                        ? { ...m, content: fullContent, reasoning: fullReasoning }
                        : m
                    ),
                  };
                })
              );
            }
          } catch {
            // Partial JSON line, continue
          }
        }
      }

      // Persist final session state to localStorage
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== currentSession.id) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantPlaceholderId
                ? { ...m, content: fullContent, reasoning: fullReasoning }
                : m
            ),
          };
        });
        localStorage.setItem("oceanai_sessions", JSON.stringify(updated));
        return updated;
      });
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortController") {
        // User stopped generation manually
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat berkomunikasi dengan endpoint AI.";

        setSessions((prev) => {
          const updated = prev.map((s) => {
            if (s.id !== currentSession.id) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content:
                        "⚠️ **Kendala Komunikasi Endpoint AI**:\n\n" +
                        errorMessage +
                        "\n\n*Silakan periksa kembali kuota atau koneksi ke Mecutinai.com.*",
                    }
                  : m
              ),
            };
          });
          localStorage.setItem("oceanai_sessions", JSON.stringify(updated));
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!currentSession) return;
    const lines = [
      `# ${currentSession.title}`,
      `*Diekspor dari OceanAI - Platform AI Mahasiswa Teknik Kelautan*`,
      `*Model: ${currentSession.model} | Tanggal: ${new Date().toLocaleString(
        "id-ID"
      )}*`,
      `\n---\n`,
    ];

    currentSession.messages.forEach((m) => {
      lines.push(`### ${m.role === "user" ? "Mahasiswa" : "OceanAI"}`);
      if (m.reasoning) {
        lines.push(`> **Proses Berpikir:**\n> ${m.reasoning}\n`);
      }
      lines.push(`${m.content}\n\n---\n`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSession.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050b14] text-slate-100 overflow-hidden">
      {/* Ambient Ocean Glows */}
      <div className="ocean-ambient-bg" />

      {/* Main Top Navigation Bar */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#07101e]/80 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg bg-slate-900/60 border border-slate-800"
              title="Menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
                <Anchor className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    Ocean<span className="text-cyan-400">AI</span>
                  </h1>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Teknik Kelautan
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Portal Belajar, Formula LaTeX & Hidrodinamika Lepas Pantai
                </p>
              </div>
            </div>
          </div>

          {/* Model Selector & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
            />

            <button
              onClick={() => setIsFormulaQuickSheetOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-cyan-300 transition-colors shadow-sm"
              title="Buku Rumus Inti"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Buku Rumus</span>
            </button>

            <button
              onClick={() => setIsFirebaseConfigOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isFirebaseConfigured
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  : "bg-slate-900/80 border-slate-700 text-slate-400 hover:text-cyan-300"
              }`}
              title="Konfigurasi Firebase"
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  isFirebaseConfigured ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span className="hidden md:inline">
                {isFirebaseConfigured ? "Firebase Terhubung" : "Firebase Setup"}
              </span>
            </button>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {user.displayName || "Mahasiswa"}
                  </div>
                  <div className="text-[10px] text-cyan-300 font-mono">
                    {user.isDemo ? "Mode Demo" : "Mahasiswa Aktif"}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="ocean-btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Mahasiswa</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace: Sidebar + Chat Area */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Left Sidebar (Sessions & Topics) */}
        <aside
          className={`fixed md:relative z-30 inset-y-0 left-0 w-72 bg-[#060e1b]/95 backdrop-blur-xl border-r border-white/[0.08] flex flex-col transition-transform duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* New Chat Button */}
          <div className="p-3 border-b border-white/[0.06]">
            <button
              onClick={handleCreateNewChat}
              className="w-full ocean-btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Percakapan Baru</span>
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Riwayat Diskusi Kelautan
            </div>

            {sessions.map((s) => {
              const isActive = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-200"
                      : "text-slate-300 hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "text-cyan-400" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate font-medium">{s.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                    title="Hapus sesi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer Shortcuts */}
          <div className="p-3 border-t border-white/[0.06] space-y-1.5 text-xs">
            <button
              onClick={() => {
                setIsFormulaQuickSheetOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-900/80 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Buku Rumus Kelautan</span>
            </button>

            <button
              onClick={() => {
                setIsDeploymentModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-900/80 transition-colors"
            >
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span>Panduan Vercel / Netlify</span>
            </button>

            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span>Endpoint: Mecutinai.com</span>
              <span className="text-emerald-400 font-mono text-[10px]">● Online</span>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop for sidebar */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          />
        )}

        {/* Main Chat Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050b14]/50">
          {/* Top Session Subheader */}
          <div className="px-4 py-2 border-b border-white/[0.06] bg-[#07101e]/40 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-200 truncate">
                {currentSession?.title || "Percakapan Baru"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                {currentSession?.model || selectedModel}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportMarkdown}
                disabled={!currentSession || currentSession.messages.length === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors disabled:opacity-40"
                title="Ekspor Percakapan (.md)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {(!currentSession || currentSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-3xl mx-auto py-8">
                <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 mb-4 shadow-xl shadow-cyan-500/10">
                  <Waves className="w-10 h-10 animate-pulse" />
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                  Selamat Datang di <span className="text-cyan-400">OceanAI</span>
                </h2>
                <p className="text-sm text-slate-300 max-w-xl mb-6 leading-relaxed">
                  Platform AI cerdas untuk mahasiswa <strong>Teknik Kelautan</strong>.
                  Dilengkapi konversi instan formula LaTeX matematis, analisis gelombang laut,
                  beban hidrodinamika Morison, arsitektur perkapalan, dan simulasi numerik.
                </p>

                {/* Popular Topics Quick Prompts */}
                <OceanTopicCards
                  onSelectPrompt={(prompt) => handleSendMessage(prompt)}
                />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {currentSession.messages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 md:gap-4 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20 border border-cyan-400/30">
                          <Anchor className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[88%] md:max-w-[80%] rounded-2xl p-4 text-sm transition-all ${
                          isUser
                            ? "bg-gradient-to-r from-blue-700/80 to-cyan-700/80 text-white rounded-tr-sm border border-cyan-500/30 shadow-lg shadow-cyan-900/20"
                            : "ocean-glass-card rounded-tl-sm text-slate-100 shadow-xl"
                        }`}
                      >
                        {/* Header inside assistant message */}
                        {!isUser && (
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-cyan-300">OceanAI</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                                {message.model || selectedModel}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                handleCopyMessage(message.id, message.content)
                              }
                              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
                              title="Salin Pesan"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Collapsible Reasoning / Thinking Box */}
                        {!isUser && message.reasoning && (
                          <details className="mb-3 rounded-lg bg-slate-950/70 border border-cyan-500/20 text-xs overflow-hidden">
                            <summary className="px-3 py-2 text-cyan-300 cursor-pointer font-medium flex items-center gap-1.5 hover:bg-cyan-500/5 select-none">
                              <Brain className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Lihat Proses Berpikir & Penurunan Formula...</span>
                            </summary>
                            <div className="p-3 text-slate-400 border-t border-slate-800 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                              {message.reasoning}
                            </div>
                          </details>
                        )}

                        {/* Message Content rendered with KaTeX & Markdown */}
                        {isUser ? (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        ) : (
                          <div>
                            {message.content ? (
                              <LatexMarkdownRenderer content={message.content} />
                            ) : (
                              <div className="flex items-center gap-2 text-cyan-300 py-1">
                                <span className="animate-spin text-base">⚙️</span>
                                <span className="text-xs italic">
                                  Menurunkan formula & menganalisis teori kelautan...
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 md:p-4 border-t border-white/[0.08] bg-[#07101e]/90 backdrop-blur-md">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* Quick Math Symbols Palette Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] text-slate-400 font-mono uppercase shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Simbol Cepat:
                </span>
                {MATH_SYMBOLS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSymbol(s.insert)}
                    className="math-symbol-btn shrink-0"
                    title={`Sisipkan ${s.label}`}
                  >
                    ${s.label}$
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="relative flex items-end gap-2 bg-[#091322] border border-cyan-500/25 rounded-2xl p-2 shadow-2xl focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Tanyakan rumus dispersi Airy, gaya Morison, stabilitas kapal, atau koding Python..."
                  className="flex-1 bg-transparent border-0 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none px-2 py-1 max-h-32"
                />

                <div className="flex items-center gap-1 shrink-0 pb-1">
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopStreaming}
                      className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                      title="Hentikan respons"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!input.trim()}
                      onClick={() => handleSendMessage()}
                      className="p-2.5 rounded-xl ocean-btn-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      title="Kirim (Enter)"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Note */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  Tekan <kbd className="font-mono text-cyan-300">Enter</kbd> untuk kirim, <kbd className="font-mono text-cyan-300">Shift+Enter</kbd> untuk baris baru.
                </span>
                <span className="hidden sm:inline">
                  LaTeX rendered otomatis via KaTeX 📐
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
      />

      <FormulaQuickSheet
        isOpen={isFormulaQuickSheetOpen}
        onClose={() => setIsFormulaQuickSheetOpen(false)}
        onAskFormula={(prompt) => handleSendMessage(prompt)}
      />

      <DeploymentModal
        isOpen={isDeploymentModalOpen}
        onClose={() => setIsDeploymentModalOpen(false)}
      />
    </div>
  );
}
