/**
 * Accent theme config: the single place to add, reorder or disable accent colors.
 *
 * The full token sets (accent / accent-hover / accent-soft for light and dark) live in
 * src/index.css under [data-accent="<id>"]. The swatch colors below must match each theme's
 * --accent value; they are only used to paint the picker swatches.
 *
 * vite.config.ts also reads this file to inject the ids/default into the pre-paint script in
 * index.html, so the theme is applied before first render without duplicating this list.
 */

export const ACCENTS = [
  { id: 'teal', label: 'Calm Teal', swatch: { light: '#0F766E', dark: '#5BB5AA' } },
  { id: 'navy', label: 'Soft Navy', swatch: { light: '#1E40AF', dark: '#7C9CF5' } },
  { id: 'rose', label: 'Muted Rose', swatch: { light: '#B4475A', dark: '#D98393' } },
  { id: 'indigo', label: 'Slate Indigo', swatch: { light: '#4F46E5', dark: '#8B8CF0' } },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];
export type AccentTheme = (typeof ACCENTS)[number];

export const DEFAULT_ACCENT: AccentId = 'teal';

/** When false, the switcher is hidden and DEFAULT_ACCENT is always used. */
export const SHOW_THEME_SWITCHER = false;

export const ACCENT_STORAGE_KEY = 'accent';
export const MODE_STORAGE_KEY = 'theme';

export function isAccentId(value: unknown): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}
