/**
 * Deterministic REPO_ROOT discovery. The original loaders used
 * `dirname(fileURLToPath(import.meta.url))` plus 4× `..` to walk up from
 * src/lib/, but Astro's prerender pipeline rewrites `import.meta.url` for
 * nested routes (try/scenarios, inspect/gates, etc), producing a wrong
 * anchor and an `apps/apps/...` path.
 *
 * Instead, walk up from process.cwd() looking for METHODOLOGY.md — that
 * file only exists at repo root in this project. Falls back to the
 * cwd-relative path so the loaders fail loudly with the right message if
 * the marker ever moves.
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

let _root: string | null = null;

export function repoRoot(): string {
  if (_root) return _root;
  // Marker is blueprint.yml — the consumer-universal initiative-root marker.
  // (Template originally used METHODOLOGY.md, which only exists in the
  // methodology SOURCE, never in a consumer initiative. See METHODOLOGY-AMENDMENTS
  // 2026-06-04 "Pattern A portal over-coupled".)
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(resolve(dir, 'blueprint.yml'))) {
      _root = dir;
      return _root;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  _root = process.cwd();
  return _root;
}
