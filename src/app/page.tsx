"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  LogIn,
  LogOut,
  Menu,
  ArrowUp,
  StopCircle,
  Copy,
  Brain,
  Search,
  Sparkles,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { ModelSelector } from "@/components/ModelSelector";
import {
  copyLatexAsEquation,
  LatexMarkdownRenderer,
} from "@/components/LatexMarkdownRenderer";
import { OceanTopicCards } from "@/components/OceanTopicCards";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import {
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  loadSessionsFromFirestore,
  subscribeSessionsFromFirestore,
  type ChatMessage,
  type ChatSession,
} from "@/lib/chatStorage";
import {
  ACCEPT_FILE_TYPES,
  MAX_ATTACHMENTS,
  buildUserVisibleContent,
  formatFileSize,
  readLocalFile,
  stripAttachmentBinaries,
  toApiMessageContent,
  type ChatAttachment,
} from "@/lib/fileAttachments";

export default function HomePage() {
  const { user, signOut } = useAuth();

  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("qwen3.8-max");
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingReasoning, setStreamingReasoning] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Renaming state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>("");

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Refs
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Load sessions from localStorage & sync from Cloud Firestore
  useEffect(() => {
    const savedModel = localStorage.getItem("oceanai_selected_model");
    if (savedModel) {
      queueMicrotask(() => setSelectedModel(savedModel));
    }

    // 1. Instant local load
    const savedSessions = localStorage.getItem("oceanai_sessions");
    let hasLocal = false;
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          queueMicrotask(() => {
            setSessions(parsed);
            setCurrentSessionId(parsed[0].id);
          });
          hasLocal = true;
        }
      } catch (e) {
        console.error("Failed to parse saved sessions", e);
      }
    }

    // 2. Sync from Cloud Firestore collection `riwayat-chat`
    loadSessionsFromFirestore().then((cloudSessions) => {
      if (cloudSessions && cloudSessions.length > 0) {
        setSessions((prev) => {
          const sessionMap = new Map<string, ChatSession>();
          prev.forEach((s) => sessionMap.set(s.id, s));
          cloudSessions.forEach((s) => {
            const existing = sessionMap.get(s.id);
            if (!existing || (s.updatedAt || 0) >= (existing.updatedAt || 0)) {
              sessionMap.set(s.id, s);
            }
          });
          const merged = Array.from(sessionMap.values()).sort(
            (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
          );
          try {
            localStorage.setItem("oceanai_sessions", JSON.stringify(merged));
          } catch {}
          if (merged.length > 0) {
            setCurrentSessionId((curr) => curr || merged[0].id);
          }
          return merged;
        });
      } else if (!hasLocal) {
        // Default initial session if no local or cloud data
        const initialSession: ChatSession = {
          id: "session-" + Date.now(),
          title: "Diskusi Hidrodinamika Kelautan",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: savedModel || "qwen3.8-max",
          messages: [],
        };
        setSessions([initialSession]);
        setCurrentSessionId(initialSession.id);
        saveSessionToFirestore(initialSession, user?.uid);
      }
    });

    // 3. Realtime listener for Firestore updates
    const unsub = subscribeSessionsFromFirestore((cloudSessions) => {
      if (cloudSessions && cloudSessions.length > 0 && !isStreaming) {
        setSessions((prev) => {
          const sessionMap = new Map<string, ChatSession>();
          prev.forEach((s) => sessionMap.set(s.id, s));
          cloudSessions.forEach((s) => {
            const existing = sessionMap.get(s.id);
            if (!existing || (s.updatedAt || 0) >= (existing.updatedAt || 0)) {
              sessionMap.set(s.id, s);
            }
          });
          return Array.from(sessionMap.values()).sort(
            (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
          );
        });
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Save sessions helper (localStorage + Firestore)
  const persistableSession = (session: ChatSession): ChatSession => ({
    ...session,
    messages: session.messages.map((m) => ({
      ...m,
      attachments: stripAttachmentBinaries(m.attachments),
    })),
  });

  const saveSessions = (updated: ChatSession[], sessionToSync?: ChatSession) => {
    setSessions(updated);
    try {
      localStorage.setItem(
        "oceanai_sessions",
        JSON.stringify(updated.map(persistableSession))
      );
    } catch (e) {
      console.error("Failed to persist sessions", e);
    }
    if (sessionToSync) {
      saveSessionToFirestore(persistableSession(sessionToSync), user?.uid);
    }
  };

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;

  // Ultra-smooth instant scroll during streaming (prevents animation fight & jitter)
  const scrollToBottom = (instant = false) => {
    if (chatScrollContainerRef.current) {
      const container = chatScrollContainerRef.current;
      if (instant) {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [currentSession?.messages?.length, isStreaming]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingSessionId]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("oceanai_selected_model", modelId);
  };

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: "session-" + Date.now(),
      title: "Percakapan Baru",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: [],
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated, newSession);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSessionFromFirestore(sessionId);
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
      saveSessions([fresh], fresh);
      setCurrentSessionId(fresh.id);
    } else {
      saveSessions(filtered);
      if (sessionId === currentSessionId) {
        setCurrentSessionId(filtered[0].id);
      }
    }
  };

  const startRenameSession = (session: ChatSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title);
  };

  const saveRenameSession = (sessionId: string) => {
    const trimmed = editTitleInput.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }

    let renamedSession: ChatSession | undefined;
    const updated = sessions.map((s) => {
      if (s.id === sessionId) {
        renamedSession = { ...s, title: trimmed, updatedAt: Date.now() };
        return renamedSession;
      }
      return s;
    });
    saveSessions(updated, renamedSession);
    setEditingSessionId(null);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    setFileError(null);
    const remaining = MAX_ATTACHMENTS - pendingAttachments.length;
    if (remaining <= 0) {
      setFileError(`Maksimal ${MAX_ATTACHMENTS} berkas per pesan.`);
      return;
    }

    const selected = files.slice(0, remaining);
    setIsReadingFiles(true);
    try {
      const parsed = await Promise.all(
        selected.map((file) => readLocalFile(file, user?.uid || "guest"))
      );
      setPendingAttachments((prev) => [...prev, ...parsed].slice(0, MAX_ATTACHMENTS));
      if (files.length > remaining) {
        setFileError(`Hanya ${remaining} berkas tambahan yang diterima.`);
      }
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "Gagal membaca berkas yang diunggah."
      );
    } finally {
      setIsReadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const attachmentsToSend = customPrompt ? [] : pendingAttachments;
    const promptToSend = buildUserVisibleContent(
      customPrompt || input,
      attachmentsToSend
    ).trim();
    if ((!promptToSend && attachmentsToSend.length === 0) || isStreaming) return;

    if (!currentSession) return;

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: promptToSend,
      timestamp: Date.now(),
      attachments: attachmentsToSend.length ? attachmentsToSend : undefined,
    };

    const isFirstMessage = currentSession.messages.length === 0;
    const newTitle = isFirstMessage
      ? promptToSend.slice(0, 36) + (promptToSend.length > 36 ? "..." : "")
      : currentSession.title;

    // Immediately push user message to UI
    const updatedUserSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      updatedAt: Date.now(),
      messages: [...currentSession.messages, userMessage],
    };

    saveSessions(
      sessions.map((s) => (s.id === currentSession.id ? updatedUserSession : s)),
      updatedUserSession
    );

    if (!customPrompt) {
      setInput("");
      setPendingAttachments([]);
      setFileError(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }

    // Set streaming state
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingReasoning("");

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const contextMessages = updatedUserSession.messages.map((m) => ({
        role: m.role,
        content: toApiMessageContent(m.content, m.attachments),
      }));

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
                setStreamingContent(fullContent);
              }
              if (delta.reasoning) {
                fullReasoning += delta.reasoning;
                setStreamingReasoning(fullReasoning);
              }
              // Instant scroll during active writing
              scrollToBottom(true);
            }
          } catch {
            // Partial JSON
          }
        }
      }

      // Commit final assistant message to session
      const assistantMessage: ChatMessage = {
        id: "msg-assistant-" + Date.now(),
        role: "assistant",
        content: fullContent,
        reasoning: fullReasoning,
        model: selectedModel,
        timestamp: Date.now(),
      };

      const finalSession: ChatSession = {
        ...updatedUserSession,
        updatedAt: Date.now(),
        messages: [...updatedUserSession.messages, assistantMessage],
      };

      saveSessions(
        sessions.map((s) => (s.id === currentSession.id ? finalSession : s)),
        finalSession
      );
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        // User stopped generation manually
      } else {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat berkomunikasi dengan endpoint AI.";

        const errAssistantMessage: ChatMessage = {
          id: "msg-assistant-" + Date.now(),
          role: "assistant",
          content:
            "⚠️ **Kendala Komunikasi Endpoint AI**:\n\n" +
            errorMessage +
            "\n\n*Silakan periksa kembali kuota atau koneksi ke Mecutinai.com.*",
          model: selectedModel,
          timestamp: Date.now(),
        };

        const errorSession: ChatSession = {
          ...updatedUserSession,
          updatedAt: Date.now(),
          messages: [...updatedUserSession.messages, errAssistantMessage],
        };

        saveSessions(
          sessions.map((s) => (s.id === currentSession.id ? errorSession : s)),
          errorSession
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingReasoning("");
      abortControllerRef.current = null;
      scrollToBottom(false);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await copyLatexAsEquation(text);
    } catch (error) {
      console.error("Gagal menyalin equation:", error);
      await navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    if (!currentSession) return;
    const lines = [
      `# ${currentSession.title}`,
      `*Diekspor dari Narwhal Intelligence - Platform AI Mahasiswa Teknik Kelautan*`,
      `*Model: ${currentSession.model} | Tanggal: ${new Date().toLocaleString("id-ID")}*`,
      `\n---\n`,
    ];

    currentSession.messages.forEach((m) => {
      lines.push(`### ${m.role === "user" ? "Mahasiswa" : "Narwhal Intelligence"}`);
      if (m.reasoning) {
        lines.push(`> **Proses Berpikir:**\n> ${m.reasoning}\n`);
      }
      if (m.attachments?.length) {
        lines.push(
          `*Lampiran:* ${m.attachments.map((a) => a.name).join(", ")}\n`
        );
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

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-[#faf9f5] text-[#2d2b28] antialiased">
      {/* Sidebar - Claude Style */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-0 -translate-x-full"
        } md:translate-x-0 fixed md:static z-40 inset-y-0 left-0 bg-[#f5f4ef] border-r border-[#e8e6df] flex flex-col transition-all duration-200 overflow-hidden shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-3 pb-2 space-y-2">
          <div className="flex items-center gap-2 px-1 pb-1">
            <div className="w-full overflow-hidden rounded-xl bg-white px-2 py-1 shadow-sm">
              <img
                src="/logo_ftsl.png"
                alt="Logo FTSL ITB"
                className="h-14 w-full object-contain object-left"
              />
            </div>
            <div className="sr-only">
              <div>AI Kelautan</div>
              <div>Narwhal Intelligence</div>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e8e5dc] text-stone-600 font-medium">
                Teknik Kelautan
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-[#eae8e1] transition-colors md:hidden"
              title="Tutup sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleCreateNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e8e6df] text-xs font-medium text-stone-800 hover:bg-[#faf9f7] hover:border-[#dedbd2] shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-stone-500" />
            <span>Percakapan Baru</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari percakapan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 rounded-md bg-[#eae8e1]/60 border border-transparent hover:border-[#dedbd2] focus:bg-white focus:border-stone-300 focus:outline-none text-xs text-stone-800 placeholder-stone-400 transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          <div className="px-2 py-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
            Riwayat Percakapan
          </div>

          {filteredSessions.map((s) => {
            const isActive = s.id === currentSessionId;
            const isEditing = editingSessionId === s.id;

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (!isEditing) {
                    setCurrentSessionId(s.id);
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#e5e2d8] text-[#1f1e1d] font-medium"
                    : "text-stone-600 hover:bg-[#eceae3] hover:text-stone-900"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={editTitleInput}
                      onChange={(e) => setEditTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRenameSession(s.id);
                        if (e.key === "Escape") setEditingSessionId(null);
                      }}
                      className="flex-1 bg-white border border-stone-300 rounded px-1.5 py-0.5 text-xs text-stone-900 focus:outline-none focus:border-amber-700"
                    />
                    <button
                      onClick={() => saveRenameSession(s.id)}
                      className="p-1 text-emerald-700 hover:text-emerald-900"
                      title="Simpan nama"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingSessionId(null)}
                      className="p-1 text-stone-400 hover:text-stone-700"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="truncate pr-2">{s.title}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => startRenameSession(s, e)}
                        className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-[#dedbd2]"
                        title="Ganti nama percakapan"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-[#dedbd2]"
                        title="Hapus percakapan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-[#e8e6df] space-y-1.5">
          {/* User Profile Pill */}
          {user ? (
            <div className="flex items-center justify-between px-2.5 py-2 mt-1 rounded-lg bg-[#eae8e1]/70 border border-[#dedbd2] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-stone-300 flex items-center justify-center font-medium text-stone-800 text-[11px] shrink-0">
                  {user.fullName[0].toUpperCase()}
                </div>
                <div className="truncate text-left leading-tight">
                  <div className="font-semibold text-stone-800 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    NIM {user.nim}
                  </div>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-1 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-900 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login dengan NIM</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top Header */}
        <header className="h-12 border-b border-[#e8e6df] bg-[#faf9f5] flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-stone-500 hover:text-stone-800 rounded-md hover:bg-[#eae8e1] transition-colors cursor-pointer"
                title="Buka sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Editable Conversation Title in Header */}
            {user && (
              <div className="hidden sm:block mr-3 pr-3 border-r border-[#e8e6df] leading-tight">
                <div className="text-[10px] text-stone-500">Halo, {user.nim}</div>
                <div className="text-xs font-semibold text-stone-800 truncate max-w-44">
                  {user.fullName}
                </div>
              </div>
            )}
            {currentSession && editingSessionId === currentSession.id ? (
              <div className="flex items-center gap-1">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRenameSession(currentSession.id);
                    if (e.key === "Escape") setEditingSessionId(null);
                  }}
                  className="bg-white border border-stone-300 rounded px-2 py-0.5 text-xs font-semibold text-stone-800 focus:outline-none"
                />
                <button
                  onClick={() => saveRenameSession(currentSession.id)}
                  className="p-1 text-emerald-700 hover:text-emerald-900"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 group cursor-pointer"
                onClick={() => currentSession && startRenameSession(currentSession)}
                title="Klik untuk ganti nama percakapan"
              >
                <h2 className="text-sm font-semibold text-stone-800 truncate max-w-sm sm:max-w-md">
                  {currentSession?.title || "Percakapan Baru"}
                </h2>
                <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-stone-700 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportMarkdown}
              disabled={!currentSession || currentSession.messages.length === 0}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-[#eae8e1] transition-colors disabled:opacity-30 cursor-pointer"
              title="Ekspor ke Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div
          ref={chatScrollContainerRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6"
        >
          {(!currentSession || (currentSession.messages.length === 0 && !isStreaming)) ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#f0eee6] border border-[#e8e6df] flex items-center justify-center mb-4 text-[#c2613a]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#1f1e1d] tracking-tight mb-2">
                Jalesveva Jayamahe
              </h2>
              <p className="text-sm text-stone-600 max-w-md mb-8 leading-relaxed">
                Justru di Laut Kita Jaya
              </p>

              {/* Minimal Clean Prompts */}
              <OceanTopicCards
                onSelectPrompt={(prompt) => handleSendMessage(prompt)}
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
              {/* Historical Messages */}
              {currentSession.messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {isUser ? (
                      /* User message Claude Style */
                      <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-[#f0eee6] text-[#1f1e1d] text-sm leading-relaxed border border-[#e5e3dc] shadow-2xs">
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex flex-col gap-2 mb-2">
                            {message.attachments.map((att) =>
                              att.kind === "image" && att.dataUrl ? (
                                <div key={att.id} className="relative w-fit">
                                  <img
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="max-h-48 rounded-lg border border-[#e5e3dc] object-contain bg-white"
                                  />
                                  {att.downloadUrl && (
                                    <a
                                      href={att.downloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={att.name}
                                      className="absolute bottom-2 right-2 rounded-md bg-white/90 p-1.5 text-stone-600 shadow hover:text-[#c2613a]"
                                      title="Unduh gambar"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <div
                                  key={att.id}
                                  className="flex items-center gap-2 rounded-lg bg-white/70 border border-[#e5e3dc] px-2.5 py-1.5 text-xs"
                                >
                                  {att.kind === "image" ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                  )}
                                  <span className="truncate font-medium">{att.name}</span>
                                  <span className="text-stone-400 shrink-0">
                                    {formatFileSize(att.size)}
                                  </span>
                                  {att.downloadUrl && (
                                    <a
                                      href={att.downloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={att.name}
                                      className="text-stone-500 hover:text-[#c2613a]"
                                      title="Unduh lampiran"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    ) : (
                      /* Assistant message Claude Style */
                      <div className="w-full text-sm leading-relaxed text-[#2d2b28]">
                        {/* Thinking / Reasoning collapsible */}
                        {message.reasoning && (
                          <details className="mb-3 rounded-lg bg-[#f7f5ef] border border-[#e8e6df] text-xs">
                            <summary className="px-3 py-2 text-stone-600 cursor-pointer font-medium flex items-center gap-1.5 hover:text-stone-900 select-none">
                              <Brain className="w-3.5 h-3.5 text-[#c2613a]" />
                              <span>Lihat proses penalaran & penurunan formula...</span>
                            </summary>
                            <div className="p-3 text-stone-600 border-t border-[#e8e6df] text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                              {message.reasoning}
                            </div>
                          </details>
                        )}

                        {/* Content rendered with High-Contrast KaTeX */}
                        <LatexMarkdownRenderer content={message.content} />

                        {/* Minimal message footer action */}
                        {message.content && (
                          <div className="flex items-center gap-2 mt-2 pt-1 text-xs text-stone-400">
                            <button
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              className="p-1 hover:text-stone-700 transition-colors cursor-pointer"
                              title="Salin respon"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-[11px] font-mono text-stone-400">
                              {message.model || selectedModel}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Active Streaming Message (Smooth, no flickering) */}
              {isStreaming && (
                <div className="flex justify-start w-full text-sm leading-relaxed text-[#2d2b28]">
                  <div className="w-full">
                    {streamingReasoning && (
                      <details className="mb-3 rounded-lg bg-[#f7f5ef] border border-[#e8e6df] text-xs" open>
                        <summary className="px-3 py-2 text-stone-600 cursor-pointer font-medium flex items-center gap-1.5 select-none">
                          <Brain className="w-3.5 h-3.5 text-[#c2613a] animate-pulse" />
                          <span>Sedang memproses penalaran matematika...</span>
                        </summary>
                        <div className="p-3 text-stone-600 border-t border-[#e8e6df] text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                          {streamingReasoning}
                        </div>
                      </details>
                    )}

                    {streamingContent ? (
                      <div>
                        <LatexMarkdownRenderer content={streamingContent} />
                        <span className="inline-block w-1.5 h-4 ml-1 bg-[#c2613a] animate-pulse align-middle" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-500 py-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#c2613a] animate-ping" />
                        <span className="text-xs italic">
                          Menurunkan formula & menganalisis teori kelautan...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Box - Claude Style Floating Card */}
        <div className="p-4 bg-[#faf9f5] shrink-0">
          <div className="max-w-3xl mx-auto">
            <div
              className={`relative bg-white border rounded-2xl shadow-xs focus-within:border-stone-400 focus-within:shadow-md transition-all p-3 ${
                isDraggingFiles
                  ? "border-[#c2613a] bg-[#faf6f2]"
                  : "border-[#dedbd2]"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFiles(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingFiles(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFiles(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_FILE_TYPES}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                }}
              />

              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 px-1">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="group relative flex items-center gap-2 rounded-lg border border-[#e8e6df] bg-[#f7f5ef] px-2 py-1.5 text-xs max-w-[220px]"
                    >
                      {att.kind === "image" && att.dataUrl ? (
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      ) : att.kind === "image" ? (
                        <ImageIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-stone-800">{att.name}</div>
                        <div className="text-[10px] text-stone-400">
                          {formatFileSize(att.size)}
                          {att.extractedText ? " · dibaca" : ""}
                          {att.storagePath ? " · tersimpan" : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(att.id)}
                        className="p-0.5 rounded text-stone-400 hover:text-rose-600 hover:bg-white cursor-pointer"
                        title="Hapus lampiran"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {fileError && (
                <p className="px-1 mb-2 text-[11px] text-rose-700">{fileError}</p>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const files = Array.from(e.clipboardData.files || []);
                  if (files.length) {
                    e.preventDefault();
                    addFiles(files);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="Tanyakan rumus, unggah gambar, atau tempel screenshot..."
                className="w-full bg-transparent border-0 text-sm text-[#1f1e1d] placeholder-stone-400 focus:outline-none resize-none px-1 max-h-36 leading-relaxed"
              />

              {/* Bottom bar of Claude's input box */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f4f2ec] text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming || isReadingFiles || pendingAttachments.length >= MAX_ATTACHMENTS}
                    className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 hover:bg-[#f4f2ec] disabled:opacity-30 cursor-pointer"
                    title="Unggah file (PDF, DOCX, gambar, teks)"
                  >
                    {isReadingFiles ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </button>
                  <span className="text-[11px] text-stone-400 select-none truncate">
                    {isDraggingFiles
                      ? "Lepaskan berkas untuk diunggah"
                      : "PDF, DOCX, gambar, atau teks · maks 8 MB"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Single Model Selector with Logos */}
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={handleSelectModel}
                    direction="up"
                  />

                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopStreaming}
                      className="w-7 h-7 rounded-full bg-stone-800 text-white flex items-center justify-center hover:bg-stone-900 transition-colors shrink-0 cursor-pointer"
                      title="Hentikan respons"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        isReadingFiles ||
                        (!input.trim() && pendingAttachments.length === 0)
                      }
                      onClick={() => handleSendMessage()}
                      className="w-7 h-7 rounded-full bg-[#c2613a] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#b0532f] transition-colors shrink-0 cursor-pointer"
                      title="Kirim (Enter)"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
