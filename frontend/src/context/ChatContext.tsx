import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface ChatContextValue {
  isOpen: boolean;
  /** A question queued from outside the panel (e.g. a suggestion chip in the page). */
  pendingQuestion: string | null;
  open: (question?: string) => void;
  close: () => void;
  clearPending: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const open = useCallback((question?: string) => {
    if (question) setPendingQuestion(question);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const clearPending = useCallback(() => setPendingQuestion(null), []);

  const value = useMemo(
    () => ({ isOpen, pendingQuestion, open, close, clearPending }),
    [isOpen, pendingQuestion, open, close, clearPending],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
