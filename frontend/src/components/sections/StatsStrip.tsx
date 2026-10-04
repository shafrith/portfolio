import { useCountUp } from '../../hooks/useCountUp';
import { useProfile } from '../../lib/api';
import { formatNumber } from '../../lib/format';
import type { Stat } from '../../lib/types';
import { LoadingRegion, Skeleton } from '../ui/primitives';

function StatItem({ stat }: { stat: Stat }) {
  const { ref, value } = useCountUp<HTMLLIElement>(stat.value);
  return (
    <li ref={ref} className="bg-surface px-4 py-6 text-center sm:py-8">
      {/* The animated number is hidden from screen readers; they get the final value instead. */}
      <p aria-hidden="true" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        <span className="tabular-nums">{formatNumber(value)}</span>
        <span className="text-accent">{stat.suffix}</span>
      </p>
      <p aria-hidden="true" className="mt-1 text-sm font-medium text-muted">
        {stat.label}
      </p>
      <span className="sr-only">
        {formatNumber(stat.value)}
        {stat.suffix} {stat.label}
      </span>
    </li>
  );
}

export function StatsStrip() {
  const { data, isPending, isError } = useProfile();
  if (isError) return null; // the hero already shows the error + retry

  return (
    <section aria-label="Career highlights" className="container-page -mt-4">
      {isPending ? (
        <LoadingRegion label="highlights">
          <Skeleton className="h-28 w-full rounded-2xl" />
        </LoadingRegion>
      ) : (
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-soft lg:grid-cols-4">
          {data.stats.map((stat) => (
            <StatItem key={stat.label} stat={stat} />
          ))}
        </ul>
      )}
    </section>
  );
}
