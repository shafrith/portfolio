import { AnimatePresence, m } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';

// The panel (and its streaming/markdown code) is code-split and only fetched on intent.
const loadPanel = () => import('./ChatPanel');
const ChatPanel = lazy(loadPanel);

/** How far the footer has scrolled into view, so the floating button can rest above it. */
function useFooterLift(): number {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const footer = document.querySelector('footer');
      const next = footer ? Math.max(0, Math.round(window.innerHeight - footer.getBoundingClientRect().top)) : 0;
      setLift((prev) => (prev === next ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return lift;
}

export function ChatLauncher() {
  const { isOpen, open } = useChat();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const lift = useFooterLift();

  // Return focus to the launcher when the panel closes.
  useEffect(() => {
    if (wasOpen.current && !isOpen) buttonRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  return (
    <>
      <div
        className="fixed bottom-5 right-5 z-50 sm:bottom-8 sm:right-8"
        style={lift ? { transform: `translateY(-${lift}px)` } : undefined}
      >
        <AnimatePresence>
          {!isOpen && (
            <m.button
              ref={buttonRef}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => open()}
              onPointerEnter={() => void loadPanel()}
              onFocus={() => void loadPanel()}
              aria-haspopup="dialog"
              className="inline-flex items-center gap-2 rounded-full bg-accent py-3 pl-4 pr-5 text-sm font-semibold text-on-accent shadow-lifted transition-colors hover:bg-accent-hover"
            >
              <span className="relative inline-flex">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3" aria-hidden="true" />
              </span>
              Ask my AI
            </m.button>
          )}
        </AnimatePresence>
      </div>
      {isOpen && (
        <Suspense
          fallback={
            <div
              role="status"
              className="card fixed bottom-5 right-5 z-50 px-5 py-4 text-sm text-muted sm:bottom-8 sm:right-8"
            >
              Loading assistant…
            </div>
          }
        >
          <ChatPanel />
        </Suspense>
      )}
    </>
  );
}
