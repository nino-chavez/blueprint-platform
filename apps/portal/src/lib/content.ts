/**
 * Build-time markdown excerpt loader.
 *
 * Reads canonical docs from the repo root and returns short excerpts
 * targeting specific section headings. The full file stays in place;
 * the portal just surfaces a hook into it with a "Read full" link.
 *
 * Excerpt strategy: locate the matching heading, then take prose until
 * the next heading at the same-or-shallower depth, capped at 320 chars.
 * Bullet lists are preserved up to the cap.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-root';

const REPO_ROOT = repoRoot();

const MAX_EXCERPT_CHARS = 320;

export interface Excerpt {
  /** Heading text we matched. */
  heading: string;
  /** Trimmed body content (markdown). */
  body: string;
  /** Was the excerpt truncated to fit MAX_EXCERPT_CHARS? */
  truncated: boolean;
  /** Path of the source file relative to repo root. */
  source: string;
  /** GitHub-style anchor for the heading. */
  anchor: string;
}

const fileCache = new Map<string, string>();

function readFile(relativePath: string): string {
  let cached = fileCache.get(relativePath);
  if (cached) return cached;
  const path = resolve(REPO_ROOT, relativePath);
  cached = readFileSync(path, 'utf8');
  fileCache.set(relativePath, cached);
  return cached;
}

function githubAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Pull an excerpt from a markdown file by heading match.
 *
 * @param relativePath - file relative to repo root (e.g., 'STRATEGY.md')
 * @param headingMatcher - exact heading text OR a RegExp tested against headings
 * @returns excerpt or null if heading not found
 */
export function loadExcerpt(
  relativePath: string,
  headingMatcher: string | RegExp,
): Excerpt | null {
  const content = readFile(relativePath);
  const lines = content.split('\n');

  let foundIdx = -1;
  let foundDepth = 0;
  let foundHeading = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!headingMatch) continue;
    const depth = headingMatch[1]!.length;
    const text = headingMatch[2]!;
    const matches =
      typeof headingMatcher === 'string'
        ? text === headingMatcher
        : headingMatcher.test(text);
    if (matches) {
      foundIdx = i;
      foundDepth = depth;
      foundHeading = text;
      break;
    }
  }

  if (foundIdx === -1) return null;

  // Collect body lines until next heading at same-or-shallower depth
  const bodyLines: string[] = [];
  for (let i = foundIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    const nextHeading = /^(#{1,6})\s+/.exec(line);
    if (nextHeading && nextHeading[1]!.length <= foundDepth) break;
    bodyLines.push(line);
  }

  // Trim leading/trailing blank lines, collapse multiple blanks
  let body = bodyLines.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
  const truncated = body.length > MAX_EXCERPT_CHARS;
  if (truncated) {
    body = body.slice(0, MAX_EXCERPT_CHARS).replace(/\s+\S*$/, '') + '…';
  }

  return {
    heading: foundHeading,
    body,
    truncated,
    source: relativePath,
    anchor: githubAnchor(foundHeading),
  };
}

// ---------- ADR catalog ----------

export interface AdrEntry {
  number: number;
  slug: string;
  title: string;
  filename: string;
}

let _adrCatalogCache: AdrEntry[] | null = null;

/**
 * List ADRs sorted by number descending (newest first). Skips the 0000-template.md.
 * Each entry parses the H1 title from the file.
 */
export function loadAdrCatalog(): AdrEntry[] {
  if (_adrCatalogCache) return _adrCatalogCache;
  const dir = resolve(REPO_ROOT, 'docs/decisions');
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    _adrCatalogCache = [];
    return _adrCatalogCache;
  }

  const entries: AdrEntry[] = [];
  for (const filename of files) {
    const m = /^(\d{4})-(.+)\.md$/.exec(filename);
    if (!m) continue;
    const number = parseInt(m[1]!, 10);
    if (number === 0) continue; // skip 0000-template.md
    const slug = m[2]!;
    let title = slug.replace(/-/g, ' ');
    try {
      const body = readFileSync(resolve(dir, filename), 'utf8');
      const h1 = /^#\s+(.+?)\s*$/m.exec(body);
      if (h1) title = h1[1]!;
    } catch {
      // fall back to slug-derived title
    }
    entries.push({ number, slug, title, filename });
  }
  entries.sort((a, b) => b.number - a.number);
  _adrCatalogCache = entries;
  return _adrCatalogCache;
}
