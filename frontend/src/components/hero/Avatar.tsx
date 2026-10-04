import { useState } from 'react';

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')).toUpperCase();
}

/** Profile photo in a simple framed circle. Falls back to monogram initials if the image is missing. */
export function Avatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative mx-auto aspect-square w-48 sm:w-60 lg:w-80">
      {/* 4px surface border, 1px outer outline and a soft neutral shadow. */}
      <div className="h-full w-full overflow-hidden rounded-full border-4 border-surface bg-surface-muted shadow-lifted ring-1 ring-border">
        {failed ? (
          <div
            role="img"
            aria-label={name}
            className="flex h-full w-full items-center justify-center text-6xl font-bold tracking-tight text-muted lg:text-7xl"
          >
            {initials(name)}
          </div>
        ) : (
          <img
            src={src}
            alt={`Portrait of ${name}`}
            width={320}
            height={320}
            decoding="async"
            // React 18 only forwards the lowercase attribute (camelCase arrives in React 19).
            {...{ fetchpriority: 'high' }}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover object-[60%_30%]"
          />
        )}
      </div>
    </div>
  );
}
