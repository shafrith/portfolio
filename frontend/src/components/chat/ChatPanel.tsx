import { m } from 'framer-motion';
import { Bot, Loader2, Mail, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useChat } from '../../context/ChatContext';
import { ApiError, getChatQuota, streamChat } from '../../lib/api';
import type { ChatMeta, ChatQuota, ChatTurn } from '../../lib/types';
import { Markdown } from './Markdown';
import { MAX_MESSAGE_CHARS, SUGGESTED_QUESTIONS } from './suggestions';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  meta?: ChatMeta;
  error?: string;
  streaming?: boolean;
}

const HISTORY_TURNS = 6;
let nextId = 1;

function toHistory(messages: Message[]): ChatTurn[] {
  return messages
    .filter((msg) => !msg.error && !msg.streaming && msg.content.trim())
    .slice(-HISTORY_TURNS)
    .map(({ role, content }) => ({ role, content }));
}

export default function ChatPanel() {
  const { close, pendingQuestion, clearPending } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // How many questions this visitor has left today; the server is the source of truth.
  useEffect(() => {
    const controller = new AbortController();
    getChatQuota(controller.signal)
      .then(setQuota)
      .catch(() => {
        /* quota display is optional; the server still enforces the limit */
      });
    return () => controller.abort();
  }, []);

  const limitReached = quota?.remaining === 0;

  const update = (id: number, patch: (m: Message) => Partial<Message>) =>
    setMessages((list) => list.map((msg) => (msg.id === id ? { ...msg, ...patch(msg) } : msg)));

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text || busy || limitReached) return;
      const history = toHistory(messages);
      const userMsg: Message = { id: nextId++, role: 'user', content: text };
      const botId = nextId++;
      setMessages((list) => [...list, userMsg, { id: botId, role: 'assistant', content: '', streaming: true }]);
      setInput('');
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await streamChat(
          text,
          history,
          {
            // A later meta (e.g. after a provider fallback) replaces the earlier one and resets text.
            onMeta: (meta) => {
              update(botId, () => ({ meta, content: '' }));
              if (meta.limit !== undefined && meta.remaining !== undefined) {
                setQuota({ limit: meta.limit, remaining: meta.remaining });
              }
            },
            onToken: (token) => update(botId, (msg) => ({ content: msg.content + token })),
            onError: (error) => update(botId, () => ({ error })),
          },
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 429) {
          // Question limit reached: drop the unanswered question and show a friendly notice.
          setMessages((list) => list.filter((msg) => msg.id !== userMsg.id && msg.id !== botId));
          setQuota((q) => ({ limit: q?.limit ?? 10, remaining: 0 }));
          setLimitNotice(err.message);
          return;
        }
        const error =
          err instanceof ApiError
            ? err.message
            : 'The assistant is unreachable right now. Please try again in a moment.';
        update(botId, () => ({ error }));
      } finally {
        update(botId, () => ({ streaming: false }));
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, limitReached],
  );

  // Questions queued from the page (suggestion chips outside the panel).
  useEffect(() => {
    if (pendingQuestion && !busy) {
      clearPending();
      void ask(pendingQuestion);
    }
  }, [pendingQuestion, busy, ask, clearPending]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      abortRef.current?.abort();
    };
  }, [close]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setBusy(false);
    inputRef.current?.focus();
  };

  const charsLeft = MAX_MESSAGE_CHARS - input.length;

  const goToContact = () => {
    close();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <m.div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-x-3 bottom-3 z-50 flex h-[min(78svh,600px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lifted sm:inset-x-auto sm:bottom-8 sm:right-8 sm:w-[25rem]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id={titleId} className="text-sm font-semibold">
              Ask my AI
            </h2>
            <p className="text-xs text-muted">Answers grounded in my portfolio data</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-fg"
              aria-label="Start a new conversation"
              title="New conversation"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-fg"
            aria-label="Close assistant"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={busy}
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 text-sm"
      >
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="leading-relaxed text-muted">
              Hi! I&apos;m an AI assistant that answers questions about Shafrith&apos;s experience,
              projects and skills, using only his portfolio data.
              {quota ? ` You can ask up to ${quota.limit} questions a day.` : ''} Try one of these:
            </p>
            <ul className="flex flex-col gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => void ask(q)}
                    disabled={limitReached}
                    className="w-full disabled:cursor-not-allowed disabled:opacity-50 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-accent hover:bg-surface-muted"
                  >
                    <Sparkles className="mr-2 inline h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-3.5 py-2.5 font-medium text-fg">
                <span className="sr-only">You: </span>
                {msg.content}
              </p>
            </div>
          ) : (
            <div key={msg.id} className="max-w-[92%]">
              <div className="rounded-2xl rounded-bl-md border border-border bg-surface-muted px-3.5 py-2.5 leading-relaxed">
                <span className="sr-only">Assistant: </span>
                {msg.content ? (
                  <Markdown text={msg.content} />
                ) : msg.streaming ? (
                  <span className="inline-flex items-center gap-2 text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…
                  </span>
                ) : null}
                {msg.error && (
                  <p role="alert" className="mt-1 text-danger">
                    {msg.error}
                  </p>
                )}
              </div>
              {!msg.streaming && msg.meta && msg.meta.sources.length > 0 && (
                <p className="mt-1.5 px-1 text-[0.7rem] text-muted">
                  {msg.meta.mode === 'keyword' ? 'Keyword match · ' : 'Sources: '}
                  {msg.meta.sources
                    .slice(0, 3)
                    .map((s) => s.title)
                    .join(' · ')}
                </p>
              )}
            </div>
          ),
        )}
      </div>

      {limitReached ? (
        <div role="status" className="border-t border-border bg-surface-muted p-4 text-sm">
          <p className="leading-relaxed text-fg">
            {limitNotice ??
              `You've used all ${quota?.limit ?? 10} questions for today. Thanks for your interest in Shafrith!`}
          </p>
          <button type="button" onClick={goToContact} className="btn-primary mt-3 w-full">
            <Mail className="h-4 w-4" aria-hidden="true" /> Contact Shafrith
          </button>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Your question
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder="Ask about skills, projects, experience…"
            autoComplete="off"
            className="input py-2.5"
            aria-describedby="chat-input-count"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="btn-primary h-11 w-11 shrink-0 px-0"
            aria-label="Send question"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p
          id="chat-input-count"
          className="mt-1.5 flex justify-between gap-2 px-1 text-[0.7rem] text-muted"
        >
          <span>{quota ? `${quota.remaining} of ${quota.limit} questions left today` : ''}</span>
          <span className={charsLeft < 50 ? 'text-fg' : undefined}>{charsLeft} characters left</span>
        </p>
      </form>
      )}
    </m.div>
  );
}
