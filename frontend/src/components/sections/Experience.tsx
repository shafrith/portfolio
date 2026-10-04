import { Briefcase, TrendingUp } from 'lucide-react';
import { useExperience } from '../../lib/api';
import { formatDuration, formatPeriod } from '../../lib/format';
import type { Company, Role } from '../../lib/types';
import { ErrorState, LoadingRegion, Reveal, Section, Skeleton } from '../ui/primitives';

/** One short paragraph per role/project; the detailed highlights feed the AI assistant instead. */
function Summary({ text }: { text: string }) {
  if (!text) return null;
  return <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{text}</p>;
}

function RoleBlock({ role, promoted }: { role: Role; promoted: boolean }) {
  return (
    <div className="relative pl-6">
      <span
        aria-hidden="true"
        className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-surface"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h4 className="text-base font-semibold">{role.title}</h4>
        {promoted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.7rem] font-semibold text-accent">
            <TrendingUp className="h-3 w-3" aria-hidden="true" /> Promoted
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted">
        {formatPeriod(role.start, role.end)} · {formatDuration(role.start, role.end)}
      </p>
      <Summary text={role.summary} />
      {role.projects.length > 0 && (
        <div className="mt-4 grid gap-3">
          {role.projects.map((p) => (
            <div key={p.name} className="rounded-xl border border-border bg-surface-muted p-4">
              <h5 className="text-sm font-semibold">
                {p.name} <span className="font-normal text-muted">· {p.role}</span>
              </h5>
              <Summary text={p.summary} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company, index }: { company: Company; index: number }) {
  const first = company.roles.at(-1);
  const latest = company.roles[0];
  const current = latest?.end === null;
  return (
    <li className="relative pl-10 sm:pl-14">
      <span
        aria-hidden="true"
        className="absolute left-0 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-accent sm:left-2"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
      </span>
      <Reveal delay={index * 0.08} className="card card-hover p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold sm:text-xl">{company.company}</h3>
            {first && latest && (
              <p className="mt-1 text-sm text-muted">
                {formatPeriod(first.start, latest.end)} · {formatDuration(first.start, latest.end)}
              </p>
            )}
          </div>
          {current && (
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              Current
            </span>
          )}
        </div>
        <div className="relative mt-6 space-y-8 before:absolute before:bottom-2 before:left-[4px] before:top-2 before:w-px before:bg-border">
          {company.roles.map((role, i) => (
            <RoleBlock key={role.title + role.start} role={role} promoted={company.roles.length > 1 && i === 0} />
          ))}
        </div>
      </Reveal>
    </li>
  );
}

export function Experience() {
  const { data, isPending, isError, refetch } = useExperience();

  return (
    <Section
      id="experience"
      eyebrow="Experience"
      title="7+ years shipping production software."
      intro="From PHP and test automation to leading enterprise Angular work — and now GenAI."
    >
      {isPending ? (
        <LoadingRegion label="experience">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </LoadingRegion>
      ) : isError ? (
        <ErrorState what="experience" onRetry={() => void refetch()} />
      ) : (
        <ol className="relative space-y-8 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border sm:before:left-6">
          {data.map((company, i) => (
            <CompanyCard key={company.company} company={company} index={i} />
          ))}
        </ol>
      )}
    </Section>
  );
}
