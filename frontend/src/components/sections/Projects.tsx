import { Bot, ExternalLink, Github, Network, Workflow } from 'lucide-react';
import { useProjects } from '../../lib/api';
import { ErrorState, LoadingRegion, Reveal, Section, Skeleton } from '../ui/primitives';

const ICONS = [Network, Workflow, Bot];

export function Projects() {
  const { data, isPending, isError, refetch } = useProjects();

  return (
    <Section
      id="projects"
      eyebrow="AI Projects"
      title="Hands-on GenAI & agentic systems."
      intro="RAG, knowledge graphs and multi-agent collaboration — built end to end."
    >
      {isPending ? (
        <LoadingRegion label="projects">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : isError ? (
        <ErrorState what="projects" onRetry={() => void refetch()} />
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((project, i) => {
            const Icon = ICONS[i % ICONS.length]!;
            return (
              <li key={project.id} className="flex">
                <Reveal delay={i * 0.08} className="card card-hover group flex w-full flex-col p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold leading-snug">{project.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{project.description}</p>
                  <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Tech stack">
                    {project.tech.map((t) => (
                      <li key={t} className="chip">
                        {t}
                      </li>
                    ))}
                  </ul>
                  {(project.github || project.demo) && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          aria-label={`${project.title} source code on GitHub (opens in new tab)`}
                        >
                          <Github className="h-4 w-4" aria-hidden="true" /> Code
                        </a>
                      )}
                      {project.demo && (
                        <a
                          href={project.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          aria-label={`${project.title} live demo (opens in new tab)`}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Live demo
                        </a>
                      )}
                    </div>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
