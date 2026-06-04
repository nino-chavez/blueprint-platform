import type { ReactNode } from 'react';
import { Card } from '@blueprint/ui';
import type { Excerpt } from '@/lib/content';

export interface ExcerptCardProps {
  title: ReactNode;
  excerpt: Excerpt | null;
  /** Optional badge slot (status, tag, etc.) shown in the footer. */
  badge?: ReactNode;
  /** Repo URL prefix for source links. */
  repoPrefix?: string;
}

const DEFAULT_REPO_PREFIX = 'https://github.com/nino-chavez/blueprint-platform/blob/main';

/**
 * Card that surfaces a markdown excerpt with a "Read full" link to the
 * canonical source. When the excerpt isn't found, the card renders a
 * 'planned' placeholder pointing at the intended source.
 */
export function ExcerptCard({
  title,
  excerpt,
  badge,
  repoPrefix = DEFAULT_REPO_PREFIX,
}: ExcerptCardProps) {
  if (!excerpt) {
    return (
      <Card variant="outline" title={title} description="Excerpt source not yet authored.">
        {badge}
      </Card>
    );
  }

  const sourceUrl = `${repoPrefix}/${excerpt.source}#${excerpt.anchor}`;

  return (
    <Card variant="elevated" title={title}>
      <p className="text-sm leading-relaxed text-contrast-500 whitespace-pre-wrap">
        {excerpt.body}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-brand transition-colors duration-fast ease-standard hover:underline"
        >
          {excerpt.source} <span aria-hidden>→</span>
        </a>
        {badge}
      </div>
    </Card>
  );
}
