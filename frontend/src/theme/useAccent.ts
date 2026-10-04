import { useCallback, useState } from 'react';
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  SHOW_THEME_SWITCHER,
  isAccentId,
  type AccentId,
} from './accents';

function readAccent(): AccentId {
  if (!SHOW_THEME_SWITCHER) return DEFAULT_ACCENT;
  // index.html applies the saved accent before first paint; mirror it here.
  const current = document.documentElement.getAttribute('data-accent');
  return isAccentId(current) ? current : DEFAULT_ACCENT;
}

export function useAccent() {
  const [accent, setAccentState] = useState<AccentId>(readAccent);

  const setAccent = useCallback((next: AccentId) => {
    if (!SHOW_THEME_SWITCHER) return;
    document.documentElement.setAttribute('data-accent', next);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode) - accent still applies for this visit */
    }
    setAccentState(next);
  }, []);

  return { accent, setAccent };
}
