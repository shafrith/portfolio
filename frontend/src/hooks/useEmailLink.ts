import type { MouseEvent } from 'react';
import { useMediaQuery } from './usePrefersReducedMotion';

export const EMAIL_SUBJECT = 'Hello from your portfolio';

const POPUP_WIDTH = 640;
// Roughly the proportions of Gmail's default compose box.
const POPUP_HEIGHT = 600;

export interface EmailLink {
  href: string;
  /** True when the link opens Gmail on the web (pop-up window, or a new tab as fallback). */
  external: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** Opens Gmail compose in a small centred pop-up window; falls back to a new tab if blocked. */
function openComposePopup(event: MouseEvent<HTMLAnchorElement>) {
  // Let modified clicks (Ctrl/Cmd/Shift, middle click) keep the browser's normal behaviour.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const url = event.currentTarget.href;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2));
  const popup = window.open(
    url,
    'gmail-compose',
    `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`,
  );
  if (popup) {
    popup.opener = null;
    popup.focus();
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Desktop: Gmail compose (To + subject prefilled) in a small pop-up window.
 * Phones/tablets: mailto:, which opens the device's mail app (usually the Gmail app on Android).
 */
export function useEmailLink(email: string | null | undefined): EmailLink | null {
  const touch = useMediaQuery('(pointer: coarse)');
  if (!email) return null;
  if (touch) {
    return { href: `mailto:${email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`, external: false };
  }
  // encodeURIComponent (spaces -> %20) rather than URLSearchParams (spaces -> +), which Gmail
  // can show literally in the subject.
  const query = Object.entries({ view: 'cm', fs: '1', to: email, su: EMAIL_SUBJECT })
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return {
    href: `https://mail.google.com/mail/?${query}`,
    external: true,
    onClick: openComposePopup,
  };
}
