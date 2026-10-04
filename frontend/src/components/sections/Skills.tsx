import { Cloud, Code2, Sparkles, Wrench, type LucideIcon } from 'lucide-react';
import { useSkills } from '../../lib/api';
import { ErrorState, LoadingRegion, Reveal, Section, Skeleton } from '../ui/primitives';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Frontend: Code2,
  'GenAI & Automation': Sparkles,
  'Backend & Cloud': Cloud,
  Practices: Wrench,
};

export function Skills() {
  const { data, isPending, isError, refetch } = useSkills();

  return (
    <Section id="skills" eyebrow="Skills" title="The toolkit.">
      {isPending ? (
        <LoadingRegion label="skills">
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : isError ? (
        <ErrorState what="skills" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {data.map((group, i) => {
            const Icon = CATEGORY_ICONS[group.category] ?? Code2;
            return (
              <Reveal key={group.category} delay={i * 0.06} className="card card-hover p-6">
                <h3 className="flex items-center gap-2.5 text-base font-semibold">
                  <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  {group.category}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <li key={skill} className="chip text-[0.8rem]">
                      {skill}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      )}
    </Section>
  );
}
