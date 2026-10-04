import { m } from 'framer-motion';
import { ArrowRight, Download, Mail } from 'lucide-react';
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useProfile } from '../../lib/api';
import { ErrorState, LoadingRegion, Skeleton } from '../ui/primitives';
import { Avatar } from './Avatar';
import { NetworkBackground } from './NetworkBackground';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.21, 0.6, 0.35, 1] as const },
});

/** Highlights the last sentence of the tagline in the accent color. */
function Tagline({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const last = sentences.pop() ?? '';
  return (
    <>
      {sentences.length > 0 && `${sentences.join(' ')} `}
      <span className="text-accent">{last}</span>
    </>
  );
}

function HeroSkeleton() {
  return (
    <LoadingRegion label="profile">
      <div className="grid items-center gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-14 w-full max-w-lg" />
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="flex gap-3">
            <Skeleton className="h-11 w-36" />
            <Skeleton className="h-11 w-40" />
          </div>
        </div>
        <Skeleton className="mx-auto aspect-square w-48 rounded-full sm:w-60 lg:w-80" />
      </div>
    </LoadingRegion>
  );
}

export function Hero() {
  const { data: profile, isPending, isError, refetch } = useProfile();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reducedMotion = usePrefersReducedMotion();
  const showNetwork = isDesktop && !reducedMotion;

  return (
    <section
      id="home"
      aria-label="Introduction"
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-28"
    >
      {showNetwork && <NetworkBackground />}
      <div className="container-page relative">
        {isPending ? (
          <HeroSkeleton />
        ) : isError ? (
          <ErrorState what="the profile" onRetry={() => void refetch()} />
        ) : (
          <div className="grid items-center gap-12 lg:grid-cols-[1.5fr_1fr]">
            <div className="order-2 text-center lg:order-1 lg:text-left">
              <m.p {...fadeUp(0)} className="eyebrow text-[0.7rem] sm:text-xs">
                {profile.eyebrow}
              </m.p>
              <m.h1
                {...fadeUp(0.08)}
                className="mt-5 whitespace-nowrap text-[clamp(1.75rem,8.4vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight lg:text-[clamp(2.75rem,4.2vw,4rem)]"
              >
                {profile.name}
              </m.h1>
              <m.p {...fadeUp(0.16)} className="mt-4 text-base font-medium text-muted sm:text-lg">
                {profile.title}
              </m.p>
              <m.p
                {...fadeUp(0.24)}
                className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                <Tagline text={profile.tagline} />
              </m.p>
              <m.div
                {...fadeUp(0.36)}
                className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
              >
                <a href="#projects" className="btn-primary">
                  View Projects <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                {profile.links.resume && (
                  <a
                    href={profile.links.resume}
                    className="btn-secondary"
                    download={`${profile.name} - Resume.pdf`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Download Resume
                  </a>
                )}
                <a href="#contact" className="btn-secondary">
                  <Mail className="h-4 w-4" aria-hidden="true" /> Contact Me
                </a>
              </m.div>
            </div>
            <m.div
              className="order-1 lg:order-2"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.21, 0.6, 0.35, 1] }}
            >
              <Avatar src={profile.photo} name={profile.name} />
            </m.div>
          </div>
        )}
      </div>
    </section>
  );
}
