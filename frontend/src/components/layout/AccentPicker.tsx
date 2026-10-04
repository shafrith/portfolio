import { Check, Palette } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { Theme } from '../../hooks/useTheme';
import { ACCENTS, type AccentId } from '../../theme/accents';

interface SwatchesProps {
  accent: AccentId;
  mode: Theme;
  onSelect: (id: AccentId) => void;
  /** "list": vertical rows with labels (popover). "grid": 4 columns, label under swatch (mobile). */
  layout: 'list' | 'grid';
}

export function AccentSwatches({ accent, mode, onSelect, layout }: SwatchesProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className={layout === 'list' ? 'flex flex-col gap-1' : 'grid grid-cols-4 gap-2'}
    >
      {ACCENTS.map((theme) => {
        const active = theme.id === accent;
        const color = theme.swatch[mode];
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={theme.label}
            data-accent-option={theme.id}
            onClick={() => onSelect(theme.id)}
            className={
              layout === 'list'
                ? `flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-muted ${active ? 'font-semibold text-fg' : 'text-muted'}`
                : `flex flex-col items-center gap-1.5 rounded-lg py-2 text-xs transition-colors hover:bg-surface-muted ${active ? 'font-semibold text-fg' : 'text-muted'}`
            }
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: color, '--tw-ring-color': color } as CSSProperties}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-accent ${
                active ? 'ring-2 ring-offset-2 ring-offset-surface' : ''
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}

interface PickerProps {
  accent: AccentId;
  mode: Theme;
  onSelect: (id: AccentId) => void;
}

/** Palette button + popover for the desktop navbar. */
export function AccentPicker({ accent, mode, onSelect }: PickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    // Move focus to the active swatch so keyboard users land inside the popover.
    rootRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      // Close when keyboard focus leaves the picker (Tab past the last swatch).
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose accent color"
        title="Accent color"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={popoverId}
        className="icon-btn"
      >
        <Palette className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={popoverId}
          className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-border bg-surface p-2 shadow-lifted"
        >
          <p className="px-2 pb-2 pt-1 text-xs font-medium text-muted">Accent color</p>
          <AccentSwatches accent={accent} mode={mode} onSelect={onSelect} layout="list" />
        </div>
      )}
    </div>
  );
}
