"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ChatMessage } from "@/lib/types";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const newMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMessages(
            (json.data as ChatMessage[]).map((m) => ({
              id: String(m.id),
              role: m.role,
              content: m.content,
            }))
          );
        }
      })
      .catch(() => toast.error("Failed to load chat history"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setStreaming(true);

    const userMsg: LocalMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const assistantId = `a-${Date.now()}`;
    newMessageIds.current.add(userMsg.id);
    newMessageIds.current.add(assistantId);

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    setTimeout(() => {
      newMessageIds.current.delete(userMsg.id);
      newMessageIds.current.delete(assistantId);
    }, 500);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) throw new Error("stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break outer;
          try {
            const { text: token } = JSON.parse(payload) as { text: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m
              )
            );
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      toast.error("Message failed — please try again");
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl flex flex-col h-[520px] widget-card card-glow-purple">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-3.5 bg-purple-500 rounded-full" aria-hidden />
          <p className="text-xs text-purple-400/80 uppercase tracking-widest font-semibold">
            AI Chat
          </p>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0"
      >
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tl-sm" />
            <Skeleton className="h-8 w-1/2 rounded-2xl rounded-tr-sm ml-auto" />
            <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-sm" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-600 text-center pt-10 select-none animate-gentle-pulse">
            Ask me about your day…
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${
                newMessageIds.current.has(msg.id) ? "animate-slide-up" : ""
              }`}
            >
              {msg.role === "assistant" && msg.content === "" && streaming ? (
                <div className="px-4 py-3 bg-gray-800 border-l-2 border-purple-500/50 rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              ) : (
                <div
                  className={`px-4 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-indigo-900 to-violet-900 text-gray-100 rounded-2xl rounded-tr-sm"
                      : "bg-gray-800 border-l-2 border-purple-500/50 text-gray-200 rounded-2xl rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      <div className="px-5 py-3 border-t border-gray-800 flex items-end gap-2 flex-shrink-0">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={streaming}
          placeholder="Ask me about your day…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/25 resize-none disabled:opacity-50 leading-relaxed"
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="px-4 py-2 min-h-[44px] text-sm bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_14px_rgba(168,85,247,0.4)] text-white rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
        >
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
