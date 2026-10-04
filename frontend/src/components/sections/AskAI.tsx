import { Database, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { SUGGESTED_QUESTIONS } from '../chat/suggestions';
import { Reveal, Section } from '../ui/primitives';

const STEPS = [
  { icon: Database, title: 'Retrieve', text: 'My profile is chunked and embedded; the top-k passages are retrieved per question.' },
  { icon: MessageSquareText, title: 'Generate', text: 'An LLM answers from those passages only, streamed token by token over SSE.' },
  { icon: ShieldCheck, title: 'Stay grounded', text: "If the answer isn't in my data, it says so — and points you to contact me." },
];

export function AskAI() {
  const { open } = useChat();

  return (
    <Section
      id="ask-ai"
      eyebrow="Ask my AI"
      title="Skip the scrolling — ask my assistant."
      intro="A small RAG assistant built into this site (FastAPI + retrieval + LLM). It's grounded only in my portfolio data."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <Reveal className="card p-6 sm:p-8">
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" /> Try asking
          </h3>
          <ul className="mt-5 flex flex-col gap-3">
            {SUGGESTED_QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => open(q)}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium transition-colors hover:border-accent hover:bg-surface-muted"
                >
                  {q}
                  <span aria-hidden="true" className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => open()} className="btn-primary mt-6">
            Open the assistant
          </button>
        </Reveal>
        <ol className="grid gap-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={0.08 * (i + 1)} className="card flex h-full gap-4 p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">
                    <span className="text-muted">0{i + 1} · </span>
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
