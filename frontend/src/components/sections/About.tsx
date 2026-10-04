import { Bot, GraduationCap, Layers, MapPin } from 'lucide-react';
import { useProfile } from '../../lib/api';
import { ErrorState, LoadingRegion, Reveal, Section, Skeleton } from '../ui/primitives';

const PILLARS = [
  {
    icon: Layers,
    title: 'Enterprise Angular',
    text: 'Large, multi-domain apps with RxJS, guards, interceptors and complex reactive forms.',
  },
  {
    icon: Bot,
    title: 'GenAI & Agents',
    text: 'RAG pipelines, multi-agent systems with CrewAI and AutoGen, and n8n automation.',
  },
];

export function About() {
  const { data, isPending, isError, refetch } = useProfile();

  return (
    <Section id="about" eyebrow="About" title="I build AI that does real work for the business.">
      {isPending ? (
        <LoadingRegion label="about">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </LoadingRegion>
      ) : isError ? (
        <ErrorState what="the summary" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <Reveal className="space-y-4">
            {/* Blank lines in profile.json's summary become separate paragraphs. */}
            {data.summary.split(/\n\s*\n/).map((para) => (
              <p key={para.slice(0, 32)} className="text-lg leading-relaxed text-fg">
                {para}
              </p>
            ))}
          </Reveal>
          <div className="space-y-4">
            {PILLARS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={0.08 * (i + 1)} className="card card-hover flex gap-4 p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.24} className="card space-y-3 p-5 text-sm">
              {data.education.map((edu) => (
                <p key={edu.degree} className="flex gap-3">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{edu.degree}</span>
                    <span className="block text-muted">
                      {edu.institution} · {edu.start} – {edu.end}
                    </span>
                  </span>
                </p>
              ))}
              <p className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{data.location}</span>
              </p>
            </Reveal>
          </div>
        </div>
      )}
    </Section>
  );
}
