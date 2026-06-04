/**
 * Build-time loaders for derived substrate data.
 *
 * Reads `_state.json` (tools/state-derive output) + `_board.json`
 * (tools/hive-board-derive output) at Astro build time, returning
 * small summaries. The raw arrays never reach the rendered HTML —
 * only the aggregated counts and a small "in-flight" sample do.
 *
 * Re-running the build picks up new derive outputs automatically.
 * Re-running the derive tools (via `npm run --workspace=...` or
 * the GitHub workflow) refreshes the JSON files; portal re-deploys
 * pick those up on the next build.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-root';

const REPO_ROOT = repoRoot();

// ---------- _state.json (tools/state-derive) ----------

type RawStateStatus = 'COMPLIANT' | 'PARTIAL' | 'NON-COMPLIANT' | 'MANUAL_REVIEW';

interface RawCapability {
  capability: {
    id: string;
    category: string;
    description: string;
    reference?: string;
  };
  status: RawStateStatus;
}

interface RawState {
  schema_version: string;
  generated_at: string;
  as_of_commit: string;
  capabilities: RawCapability[];
}

export type DerivedStatus = 'compliant' | 'partial' | 'non-compliant' | 'manual-review';

const STATE_TO_DERIVED: Record<RawStateStatus, DerivedStatus> = {
  COMPLIANT:      'compliant',
  PARTIAL:        'partial',
  'NON-COMPLIANT': 'non-compliant',
  MANUAL_REVIEW:  'manual-review',
};

export interface CategorySummary {
  category: string;
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  manualReview: number;
  // Sample of capabilities (up to 8) for TaskBar rendering
  sample: Array<{
    id: string;
    description: string;
    status: DerivedStatus;
  }>;
}

export interface NonCompliantCapability {
  id: string;
  category: string;
  description: string;
  reference?: string;
  notes?: string;
}

export interface StateSummary {
  generatedAt: string;
  commit: string;
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  manualReview: number;
  /** % of capabilities at COMPLIANT or PARTIAL (i.e., "working in some form") */
  shippedPercent: number;
  categories: CategorySummary[];
  /** Every NON-COMPLIANT capability with its full detail — the actionable set. */
  nonCompliantItems: NonCompliantCapability[];
}

let _stateCache: StateSummary | null = null;

export function loadState(): StateSummary {
  if (_stateCache) return _stateCache;

  const path = resolve(REPO_ROOT, 'docs/audits/derived/_state.json');
  const raw: RawState = JSON.parse(readFileSync(path, 'utf8'));

  const totals = { compliant: 0, partial: 0, nonCompliant: 0, manualReview: 0 };
  const byCategory = new Map<string, CategorySummary>();
  const nonCompliantItems: NonCompliantCapability[] = [];

  for (const cap of raw.capabilities) {
    const derived = STATE_TO_DERIVED[cap.status];
    if (derived === 'compliant') totals.compliant++;
    else if (derived === 'partial') totals.partial++;
    else if (derived === 'non-compliant') totals.nonCompliant++;
    else if (derived === 'manual-review') totals.manualReview++;

    const catName = cap.capability.category;
    let cat = byCategory.get(catName);
    if (!cat) {
      cat = {
        category: catName,
        total: 0,
        compliant: 0,
        partial: 0,
        nonCompliant: 0,
        manualReview: 0,
        sample: [],
      };
      byCategory.set(catName, cat);
    }
    cat.total++;
    if (derived === 'compliant') cat.compliant++;
    else if (derived === 'partial') cat.partial++;
    else if (derived === 'non-compliant') cat.nonCompliant++;
    else if (derived === 'manual-review') cat.manualReview++;

    if (derived === 'non-compliant') {
      nonCompliantItems.push({
        id: cap.capability.id,
        category: cap.capability.category,
        description: cap.capability.description,
        reference: cap.capability.reference,
        notes: cap.capability.notes,
      });
    }

    // Sample priority: non-compliant first, then partial, then manual-review, then compliant
    if (cat.sample.length < 8) {
      cat.sample.push({
        id: cap.capability.id,
        description: cap.capability.description,
        status: derived,
      });
    }
  }

  // Sort categories by total descending; sort each sample by status priority
  const statusRank: Record<DerivedStatus, number> = {
    'non-compliant': 0,
    'partial':       1,
    'manual-review': 2,
    'compliant':     3,
  };
  const categories = Array.from(byCategory.values())
    .sort((a, b) => b.total - a.total)
    .map((cat) => ({
      ...cat,
      sample: [...cat.sample].sort((a, b) => statusRank[a.status] - statusRank[b.status]),
    }));

  const total = raw.capabilities.length;
  const shipped = totals.compliant + totals.partial;

  _stateCache = {
    generatedAt: raw.generated_at,
    commit: raw.as_of_commit.slice(0, 8),
    total,
    compliant: totals.compliant,
    partial: totals.partial,
    nonCompliant: totals.nonCompliant,
    manualReview: totals.manualReview,
    shippedPercent: Math.round((shipped / total) * 100),
    categories,
    nonCompliantItems,
  };
  return _stateCache;
}

// ---------- _board.json (tools/hive-board-derive) ----------

interface RawBoardIssue {
  number: number;
  title: string;
  bucket: string;
  age_days: number;
  meta?: {
    gate?: string;
    phase?: string;
    surface?: string;
    type?: string;
    priority?: string;
    estimate?: string;
    blocked_by?: Array<number | string>;
  };
}

interface RawBoard {
  generated_at: string;
  commit: string;
  total_open: number;
  total_closed: number;
  open_by_bucket: Record<string, number>;
  issues: RawBoardIssue[];
}

export interface BoardIssue {
  number: number;
  title: string;
  ageDays: number;
  phase?: string;
  priority?: string;
  type?: string;
}

export interface BoardSummary {
  generatedAt: string;
  commit: string;
  totalOpen: number;
  totalClosed: number;
  byBucket: Array<{ bucket: string; label: string; count: number }>;
  // Open-issue counts grouped by phase — drives the horizon view.
  // 'reference' and 'shipped-not-closed' are excluded (they're not "open work").
  byPhase: {
    foundation: number;
    phase1: number;
    phase2: number;
    phase3: number;
    unknown: number;
  };
  inFlight: BoardIssue[];
  shippedNotClosed: BoardIssue[];
  readyQueue: BoardIssue[];
}

const BUCKET_LABEL: Record<string, string> = {
  'shipped-not-closed':  'Shipped (not closed)',
  'in-flight':           'In flight',
  'awaiting-dispatch':   'Awaiting dispatch',
  'awaiting-synthesis':  'Awaiting synthesis',
  'reference':           'Reference',
  'defer-phase-2':       'Deferred to Phase 2',
  'defer-phase-3':       'Deferred to Phase 3',
  'defer-catalyst':      'Deferred to Catalyst',
};

let _boardCache: BoardSummary | null = null;

export function loadBoard(): BoardSummary {
  if (_boardCache) return _boardCache;

  const path = resolve(REPO_ROOT, 'docs/hive/_board.json');
  const raw: RawBoard = JSON.parse(readFileSync(path, 'utf8'));

  const byBucket = Object.entries(raw.open_by_bucket)
    .map(([bucket, count]) => ({
      bucket,
      label: BUCKET_LABEL[bucket] ?? bucket,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const toIssue = (i: RawBoardIssue): BoardIssue => ({
    number: i.number,
    title: i.title,
    ageDays: i.age_days,
    phase: i.meta?.phase,
    priority: i.meta?.priority,
    type: i.meta?.type,
  });

  const inFlight = raw.issues
    .filter((i) => i.bucket === 'in-flight')
    .slice(0, 6)
    .map(toIssue);

  // Issues that have shipped (PR merged) but the GH issue itself hasn't
  // closed yet — typically waiting on the dev → main fast-forward heartbeat
  // per [[dev-branch-pr-target]]. Surfaced so the roadmap shows "what just
  // landed but isn't released" alongside "what's next."
  const shippedNotClosed = raw.issues
    .filter((i) => i.bucket === 'shipped-not-closed')
    .slice(0, 8)
    .map(toIssue);

  // Ready queue heuristic mirrors the operator's Ready Queue view of
  // Project #1 per CLAUDE.md: unblocked + high priority + not yet claimed.
  // The bucket filter excludes 'in-flight' (already claimed) and 'reference'
  // (long-lived Epic-N trackers).
  const readyQueue = raw.issues
    .filter((i) => i.bucket === 'awaiting-dispatch' || i.bucket === 'awaiting-synthesis')
    .filter((i) => (i.meta?.blocked_by?.length ?? 0) === 0)
    .filter((i) => {
      const p = i.meta?.priority;
      if (!p) return false;
      // Accept 'P0' / 'P1' / '0' / '1' — operator and machine forms both used
      return /^(P?[01])$/i.test(p);
    })
    .sort((a, b) => {
      const pa = (a.meta?.priority ?? '99').replace(/^P/i, '');
      const pb = (b.meta?.priority ?? '99').replace(/^P/i, '');
      return Number(pa) - Number(pb);
    })
    .slice(0, 6)
    .map(toIssue);

  // Phase horizon — exclude reference + shipped-not-closed, those aren't
  // "open work to schedule."
  const byPhase = { foundation: 0, phase1: 0, phase2: 0, phase3: 0, unknown: 0 };
  for (const i of raw.issues) {
    if (i.bucket === 'reference' || i.bucket === 'shipped-not-closed') continue;
    const p = i.meta?.phase;
    if (p === 'foundation') byPhase.foundation++;
    else if (p === '1') byPhase.phase1++;
    else if (p === '2') byPhase.phase2++;
    else if (p === '3') byPhase.phase3++;
    else byPhase.unknown++;
  }

  _boardCache = {
    generatedAt: raw.generated_at,
    commit: raw.commit,
    totalOpen: raw.total_open,
    totalClosed: raw.total_closed,
    byBucket,
    byPhase,
    inFlight,
    shippedNotClosed,
    readyQueue,
  };
  return _boardCache;
}

// ---------- _epic-footprints.json + Epic-N reference trackers ----------

interface RawEpicFootprint {
  epic: number;
  proposal_count: number;
  pr_count: number;
  commit_count: number;
  file_count: number;
}

interface RawEpicFootprintFile {
  generated_at: string;
  source_commit: string;
  epics: RawEpicFootprint[];
}

export interface EpicProgress {
  epic: number;
  title: string;        // joined from the reference Epic-N tracker (#30-#59)
  trackerNumber?: number;
  proposalCount: number;
  prCount: number;
  commitCount: number;
  fileCount: number;
  openCount: number;    // open issues mentioning [Epic-N] in title
  inFlightCount: number;
}

export interface EpicProgressSummary {
  generatedAt: string;
  sourceCommit: string;
  epics: EpicProgress[];
}

let _epicCache: EpicProgressSummary | null = null;

export function loadEpicProgress(): EpicProgressSummary {
  if (_epicCache) return _epicCache;

  const fpPath = resolve(REPO_ROOT, 'docs/audits/derived/_epic-footprints.json');
  const fp: RawEpicFootprintFile = JSON.parse(readFileSync(fpPath, 'utf8'));

  // Reference Epic-N trackers (#30-#59 by convention) carry titles.
  // Open-work counts come from non-reference open issues mentioning [Epic-N].
  const board = loadBoard();
  const boardRaw: RawBoard = JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'docs/hive/_board.json'), 'utf8'),
  );

  const trackersByEpic = new Map<number, { number: number; title: string }>();
  const openByEpic = new Map<number, { open: number; inFlight: number }>();

  for (const i of boardRaw.issues) {
    const m = i.title.match(/\[Epic-(\d+)\]\s*(.+?)(?:\s*$)/);
    if (!m) continue;
    const epic = Number(m[1]);
    // Tracker = lowest-numbered reference issue per epic
    if (i.bucket === 'reference' && i.number >= 30 && i.number <= 59) {
      const existing = trackersByEpic.get(epic);
      if (!existing || i.number < existing.number) {
        trackersByEpic.set(epic, { number: i.number, title: m[2] });
      }
    }
    // Open work = anything not in reference/shipped-not-closed
    if (i.bucket !== 'reference' && i.bucket !== 'shipped-not-closed') {
      const current = openByEpic.get(epic) ?? { open: 0, inFlight: 0 };
      current.open++;
      if (i.bucket === 'in-flight') current.inFlight++;
      openByEpic.set(epic, current);
    }
  }

  const epics: EpicProgress[] = fp.epics
    .map((e) => {
      const tracker = trackersByEpic.get(e.epic);
      const openCounts = openByEpic.get(e.epic) ?? { open: 0, inFlight: 0 };
      return {
        epic: e.epic,
        title: tracker?.title ?? `Epic ${e.epic}`,
        trackerNumber: tracker?.number,
        proposalCount: e.proposal_count,
        prCount: e.pr_count,
        commitCount: e.commit_count,
        fileCount: e.file_count,
        openCount: openCounts.open,
        inFlightCount: openCounts.inFlight,
      };
    })
    .sort((a, b) => a.epic - b.epic);

  _epicCache = {
    generatedAt: fp.generated_at,
    sourceCommit: fp.source_commit,
    epics,
  };
  return _epicCache;
}

// ---------- docs/decisions/ ADR count ----------

let _adrCountCache: number | null = null;

export function loadAdrCount(): number {
  if (_adrCountCache != null) return _adrCountCache;
  const dir = resolve(REPO_ROOT, 'docs/decisions');
  try {
    const files = readdirSync(dir);
    _adrCountCache = files.filter(
      (f) => /^\d{4}-/.test(f) && f.endsWith('.md') && !f.startsWith('0000-'),
    ).length;
  } catch {
    _adrCountCache = 0;
  }
  return _adrCountCache;
}

/**
 * Pretty category label — strip prefixes, title-case, keep familiar terms.
 */
export function prettifyCategory(category: string): string {
  const overrides: Record<string, string> = {
    'capability':          'BRD capabilities',
    'adr-commitment':      'ADR commitments',
    'scenario-coverage':   'Scenario coverage',
    'bigeng-convention':   'BigEng conventions',
    'nfr':                 'Non-functional reqs',
    'feature_flag_inactive': 'Feature flags (inactive)',
    'security':            'Security',
    'feature':             'Features',
  };
  return overrides[category] ?? category;
}
