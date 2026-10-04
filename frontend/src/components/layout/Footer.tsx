import type { MouseEvent } from 'react';
import { useEmailLink } from '../../hooks/useEmailLink';
import { useProfile } from '../../lib/api';

interface FooterLink {
  label: string;
  href: string;
  external: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function Footer() {
  const { data } = useProfile();
  const year = new Date().getFullYear();
  const links = data?.links;
  const emailLink = useEmailLink(links?.email);
  const items = [
    emailLink && { label: 'Email', ...emailLink },
    links?.linkedin && { label: 'LinkedIn', href: links.linkedin, external: true },
    links?.github && { label: 'GitHub', href: links.github, external: true },
  ].filter((item): item is FooterLink => Boolean(item));

  return (
    <footer className="border-t border-border py-5">
      <div className="container-page grid items-center gap-3 text-center sm:grid-cols-[1fr_auto_1fr] sm:text-left">
        <div className="leading-snug">
          <p className="text-xs font-bold text-fg">{data?.name ?? 'Haja Shafrith Suhail'}</p>
          {data?.shortTitle && <p className="text-xs text-muted">{data.shortTitle}</p>}
        </div>

        {items.length > 0 && (
          <nav aria-label="Contact links">
            <ul className="flex items-center justify-center gap-5 text-xs">
              {items.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    onClick={item.onClick}
                  >
                    {item.label}
                    {item.external && <span className="sr-only"> (opens in new tab)</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className="text-xs text-muted sm:text-right">
          © {year} {data?.shortName ?? 'Shafrith'}
        </p>
      </div>
    </footer>
  );
}
