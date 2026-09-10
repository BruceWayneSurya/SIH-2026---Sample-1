"use client";

import {
  TranslatedText as T,
  useTranslation,
} from "@/components/language-provider";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { ChatMessage } from "@/lib/ai/groq-client";
import { MarkdownText } from "@/components/markdown-text";

// Bound conversation history before sending; an AI reply can be longer than a
// user message. Keep recent context without overflowing server validation.
function recentHistory(messages: ChatMessage[]): ChatMessage[] {
  const recent: ChatMessage[] = [];
  let length = 0;
  for (const message of messages.slice(-20).reverse()) {
    const content = message.content.slice(0, 4_000);
    if (length + content.length > 16_000) break;
    recent.unshift({ role: message.role, content });
    length += content.length;
  }
  return recent;
}

export function AiTutor({
  chapterId,
  chapterTitle,
  compact = false,
}: {
  chapterId?: number;
  chapterTitle?: string;
  compact?: boolean;
}) {
  const { language, t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy]);

  async function send(next: ChatMessage[]) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          messages: recentHistory(next),
          ...(chapterId ? { chapterId } : {}),
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.reply !== "string")
        throw new Error(
          data?.error ?? "The AI tutor could not reply. Please try again.",
        );
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Unable to reach the AI tutor.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
        field.current?.focus();
      }
    }
  }
  function ask(text: string) {
    if (!text.trim() || request.current) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setInput("");
    void send(next);
  }

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm ${compact ? "h-full" : "min-h-[440px]"}`}
      aria-label={
        chapterTitle ? `AI tutor for ${chapterTitle}` : "AI conversation"
      }
    >
      <div className="flex items-center gap-3 border-b border-line bg-navy-50/60 p-4">
        <span className="rounded-lg bg-saffron-100 p-2 text-saffron-700">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-navy-900">
            <T>{chapterTitle ? "Your chapter AI tutor" : "Pragyan AI"}</T>
          </h2>
          <p className="truncate text-xs text-slate-500">
            {chapterTitle ?? t("Your NCERT learning companion")}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("Clear conversation")}
          disabled={busy || messages.length === 0}
          onClick={() => {
            setMessages([]);
            setError(null);
          }}
          className="rounded-md p-2 text-slate-500 hover:bg-navy-100 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className={`min-h-0 flex-1 space-y-4 overflow-y-auto p-4 ${compact ? "" : "max-h-[420px]"}`}
      >
        {messages.length === 0 && (
          <div className="py-3">
            <p className="text-sm leading-relaxed text-navy-800">
              <T>
                Namaste! I’m Pragyan, your AI study companion. Ask a question
                and we’ll work through it together.
              </T>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(chapterTitle
                ? ["Explain this chapter simply", "What should I revise first?"]
                : [
                    "Explain the fire triangle",
                    "Help me understand rational numbers",
                  ]
              ).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(t(prompt))}
                  className="rounded-lg border border-saffron-200 bg-saffron-50 px-3 py-2 text-left text-xs font-semibold text-saffron-700 hover:border-saffron-500"
                >
                  {t(prompt)}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-xl p-3 text-sm leading-relaxed ${message.role === "user" ? "ml-6 bg-navy-800 text-white" : "mr-3 border border-line bg-paper text-navy-900"}`}
          >
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide opacity-70">
              <T>{message.role === "user" ? "You" : "Pragyan"}</T>
            </span>
            {message.role === "user" ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <MarkdownText text={message.content} />
            )}
          </div>
        ))}
        {busy && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-navy-600"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> <T>Thinking…</T>
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            <p><T>{error}</T></p>
            <button
              type="button"
              className="mt-2 font-bold underline"
              onClick={() => void send(messages)}
            >
              <T>Retry question</T>
            </button>
          </div>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
        className="border-t border-line p-3"
      >
        <label
          className="sr-only"
          htmlFor={compact ? "floating-ai-question" : "chapter-ai-question"}
        >
          <T>Ask a question</T>
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={field}
            id={compact ? "floating-ai-question" : "chapter-ai-question"}
            rows={2}
            maxLength={4_000}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={busy}
            placeholder={t("Ask an NCERT question…")}
            className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm text-navy-950"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                ask(input);
              }
            }}
          />
          <button
            type="submit"
            aria-label={t("Send question")}
            disabled={busy || !input.trim()}
            className="rounded-lg bg-saffron-500 p-3 text-navy-950 hover:bg-saffron-400 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          <T>
            AI can make mistakes. Check important answers with NCERT or your
            teacher. Don’t share personal information.
          </T>
        </p>
      </form>
    </section>
  );
}

export function FloatingAiTutor() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector("textarea")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <section
          ref={panel}
          id="pragyan-ai-panel"
          role="dialog"
          aria-modal="false"
          aria-label={t("Pragyan AI tutor")}
          className="mb-3 flex h-[min(580px,calc(100dvh-100px))] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-navy-900 px-4 py-2 text-white">
            <span className="flex items-center gap-2 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-saffron-400" />{" "}
              <T>Your learning companion</T>
            </span>
            <button
              type="button"
              aria-label={t("Close AI tutor")}
              className="rounded p-1 hover:bg-navy-700"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <AiTutor compact />
        </section>
      )}
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="pragyan-ai-panel"
        className="ml-auto flex items-center gap-2 rounded-full border border-saffron-600/30 bg-saffron-500 px-5 py-3 font-extrabold text-navy-950 shadow-lg transition hover:bg-saffron-400"
      >
        <MessageCircle className="h-5 w-5" /> <T>Ask Pragyan AI</T>
      </button>
    </div>
  );
}
