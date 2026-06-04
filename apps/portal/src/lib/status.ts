/**
 * Native loaders for the surfaces that used to live at subs-status.pages.dev:
 *   - Gate status (10-gate Epic DoD compliance per epic)
 *   - Attestations (manual gate sign-offs, partner agreements, etc.)
 *   - Dependencies (blocking chains in the proposal graph)
 *
 * Same source data the satellite read; rendered natively here so the portal
 * is the single front door.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-root';
import {
  EPICS,
  deriveGatesForEpic,
  deriveCrossCuttingGroups,
  readStateDerive,
  type GateColor as DeriveColor,
  type AttestationRecord,
  type AttestationFreshness,
  type CrossCuttingGroup,
} from '@blueprint/gate-derive';

const REPO_ROOT = repoRoot();

export type GateColor = DeriveColor;

export interface GateCellInfo {
  /** Computed cell color from the two-stage model. */
  color: GateColor;
  /** Stage 1 — did the automated check pass? */
  mechanical_passing: boolean;
  /** What mechanical actually checked. */
  mechanical_note: string;
  /** Stage 2 — operator's attestation record, if present. */
  attested?: AttestationRecord;
  /** Whether the attestation is still valid against current files. */
  attestation_freshness: AttestationFreshness;
  /** True when mechanical passes but attestation is stale or unverified. */
  needs_reattestation: boolean;
}

export interface EpicGates {
  epic: number;
  title: string;
  phase: string;
  riskTier: string;
  /** Most-recent operator audit_date for this epic (frontmatter); empty if no audit doc. */
  auditDate: string;
  /** Computed color per gate. */
  gates: Record<number, GateColor>;
  /** Per-gate detail: stage 1 / stage 2 / freshness. */
  cellInfo: Record<number, GateCellInfo>;
  oosMarkers: string[];
  /** Path to the per-epic DoD audit doc, relative to repo root; empty if none. */
  filename: string;
}

export interface GateStatusSummary {
  epics: EpicGates[];
  /** Per-gate aggregate: 1..10 → counts by color across all epics */
  perGate: Record<number, Record<GateColor, number>>;
  /** Per-epic aggregate: green/yellow/red count across the 10 gates */
  totals: { green: number; yellow: number; red: number; gray: number };
  /** Most-recent audit_date across all epic frontmatter — when a human last audited. */
  latestAuditDate: string;
  /** _state.json.generated_at — when the auto-derive layer last ran. */
  dataAsOf: string;
  /** Commit hash the derive ran against. */
  dataCommit: string;
  /** Two-stage counts across all 280 cells (28 epics × 10 gates). */
  stageCounts: {
    mechanical_failing: number;
    mechanical_passing_unattested: number;
    mechanical_passing_stale_attestation: number;
    mechanical_passing_attested: number;
  };
}

export type { CrossCuttingGroup };

/** Epic # → green/total/percent rollup, used to color DAG nodes by completion. */
export interface EpicCompletion {
  epic: number;
  green: number;
  total: number;
  percentGreen: number;
  riskTier: string;
}

/** Cross-cutting proposal stats — proposals/work not affiliated with a BRD epic. */
export interface CrossCuttingStats {
  totalProposals: number;
  epicAffiliated: number;
  crossCutting: number;
  crossCuttingPct: number;
}

let _gateCache: GateStatusSummary | null = null;

/**
 * Compute gate status per epic using the two-stage model:
 *   Stage 1 — mechanical: did the automated check pass? (boolean)
 *   Stage 2 — attestation: did a human check the box? (binary + commit-bound)
 *
 * Color = function of the two stages:
 *   mechanical_passing && attested && fresh → green
 *   mechanical_passing && attested && stale → yellow + needs_reattestation
 *   mechanical_passing && unattested        → yellow
 *   !mechanical_passing                     → red
 *
 * Derivation logic lives in @blueprint/gate-derive (shared with the
 * tools/gate-dashboard/ static HTML renderer).
 */
export function loadGateStatus(): GateStatusSummary {
  if (_gateCache) return _gateCache;

  const state = readStateDerive(REPO_ROOT);

  const epics: EpicGates[] = [];
  let latestAuditDate = '';
  const stageCounts = {
    mechanical_failing: 0,
    mechanical_passing_unattested: 0,
    mechanical_passing_stale_attestation: 0,
    mechanical_passing_attested: 0,
  };

  for (const epic of EPICS) {
    const derived = deriveGatesForEpic(epic, state, REPO_ROOT);

    const gates: Record<number, GateColor> = {};
    const cellInfo: Record<number, GateCellInfo> = {};
    for (let g = 1; g <= 10; g++) {
      const cell = derived.gates[g as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10];
      gates[g] = cell.color;
      cellInfo[g] = {
        color: cell.color,
        mechanical_passing: cell.mechanical_passing,
        mechanical_note: cell.mechanical_note,
        attested: cell.attested,
        attestation_freshness: cell.attestation_freshness,
        needs_reattestation: cell.needs_reattestation,
      };

      if (!cell.mechanical_passing) stageCounts.mechanical_failing++;
      // Fresh OR unverified (best-effort) both count as "attested" for bucketing —
      // the color logic in gate-derive treats them the same. Only definitively
      // stale attestations bucket into "needs re-attestation."
      else if (cell.attestation_freshness === 'fresh' || cell.attestation_freshness === 'unverified') {
        if (cell.attested) stageCounts.mechanical_passing_attested++;
        else stageCounts.mechanical_passing_unattested++;
      }
      else if (cell.attestation_freshness === 'stale') stageCounts.mechanical_passing_stale_attestation++;
      else stageCounts.mechanical_passing_unattested++;
    }

    const auditDate = derived.override?.audit_date ?? '';
    if (auditDate > latestAuditDate) latestAuditDate = auditDate;

    epics.push({
      epic: epic.epic,
      title: epic.title,
      phase: epic.phase,
      riskTier: epic.risk_tier,
      auditDate,
      gates,
      cellInfo,
      oosMarkers: derived.override?.oos_marker ?? [],
      filename: derived.audit_doc_path ?? '',
    });
  }

  epics.sort((a, b) => a.epic - b.epic);

  const perGate: Record<number, Record<GateColor, number>> = {};
  for (let i = 1; i <= 10; i++) {
    perGate[i] = { green: 0, yellow: 0, red: 0, gray: 0 };
  }
  const totals = { green: 0, yellow: 0, red: 0, gray: 0 };
  for (const e of epics) {
    for (let g = 1; g <= 10; g++) {
      const color = e.gates[g] ?? 'gray';
      perGate[g]![color]++;
      totals[color]++;
    }
  }

  _gateCache = {
    epics,
    perGate,
    totals,
    latestAuditDate,
    dataAsOf: state.generated_at ?? '',
    dataCommit: state.as_of_commit ?? '',
    stageCounts,
  };
  return _gateCache;
}

let _crossCuttingCapabilitiesCache: CrossCuttingGroup[] | null = null;

/**
 * Cross-cutting capability families emitted by tools/state-derive that don't
 * map to per-epic gates: BigEng platform conventions, ratified ADRs, BRD NFRs,
 * persona scenarios, CI hygiene + testing baseline.
 *
 * These were derived but unread until 2026-05-21.
 */
export function loadCrossCuttingCapabilities(): CrossCuttingGroup[] {
  if (_crossCuttingCapabilitiesCache) return _crossCuttingCapabilitiesCache;
  const state = readStateDerive(REPO_ROOT);
  _crossCuttingCapabilitiesCache = deriveCrossCuttingGroups(state);
  return _crossCuttingCapabilitiesCache;
}

/**
 * Per-epic completion percentage = green / (10 - gray). Used to color the
 * DAG nodes on /inspect/dependencies (≥60% green / 20-59% partial / <20% red,
 * matching the original tools/dep-graph-dashboard thresholds).
 */
export function loadEpicCompletions(): Map<number, EpicCompletion> {
  const gates = loadGateStatus();
  const m = new Map<number, EpicCompletion>();
  for (const e of gates.epics) {
    const colors = Object.values(e.gates);
    const green = colors.filter((c) => c === 'green').length;
    const total = colors.filter((c) => c !== 'gray').length;
    const percentGreen = total > 0 ? Math.round((green / total) * 100) : 0;
    m.set(e.epic, { epic: e.epic, green, total, percentGreen, riskTier: e.riskTier });
  }
  return m;
}

// ---------- Attestations ----------

interface RawAttestation {
  attestation_id: string;
  title: string;
  category: string;
  phase: string;
  gating: 'marketplace-blocking' | 'ga-blocking' | 'soft-gating' | 'informational';
  human_owner: string | null;
  status: 'pending' | 'attested' | 'expired';
  last_attested: string | null;
  expires_after_days: number | null;
  expires_on: string | null;
  is_expired: boolean;
  evidence_url: string | null;
  triggers: string[];
  related_hive: number[];
  related_memory: string[];
  source_file: string;
}

interface RawAttestationsFile {
  schema_version: string;
  generated_at: string;
  as_of_commit: string;
  attestation_count: number;
  attestations: RawAttestation[];
}

export interface AttestationsSummary {
  generatedAt: string;
  total: number;
  byStatus: { pending: number; attested: number; expired: number };
  byGating: Record<RawAttestation['gating'], number>;
  attestations: RawAttestation[];
}

let _attestationsCache: AttestationsSummary | null = null;

export function loadAttestations(): AttestationsSummary {
  if (_attestationsCache) return _attestationsCache;
  const path = resolve(REPO_ROOT, 'docs/audits/derived/_attestations.json');
  const raw: RawAttestationsFile = JSON.parse(readFileSync(path, 'utf8'));

  const byStatus = { pending: 0, attested: 0, expired: 0 };
  const byGating: Record<RawAttestation['gating'], number> = {
    'marketplace-blocking': 0,
    'ga-blocking': 0,
    'soft-gating': 0,
    'informational': 0,
  };
  for (const a of raw.attestations) {
    byStatus[a.status]++;
    byGating[a.gating] = (byGating[a.gating] ?? 0) + 1;
  }

  _attestationsCache = {
    generatedAt: raw.generated_at,
    total: raw.attestation_count,
    byStatus,
    byGating,
    attestations: raw.attestations,
  };
  return _attestationsCache;
}

// ---------- Dependency chains ----------

interface RawProposal {
  github_issue_number: number;
  title: string;
  state: 'open' | 'closed';
  metadata_block?: {
    blocked_by?: Array<number | string>;
    priority?: string;
    phase?: string;
    gate?: string;
    type?: string;
  };
}

interface RawProposalsFile {
  generated_at: string;
  commit: string;
  total_open: number;
  total_closed: number;
  proposals: RawProposal[];
}

export interface BlockingChain {
  /** The blocking proposal — close this to unblock downstream. */
  blocker: { number: number; title: string; priority?: string; phase?: string };
  /** Proposals waiting on the blocker. */
  blocked: Array<{ number: number; title: string; priority?: string; phase?: string }>;
}

export interface DependenciesSummary {
  generatedAt: string;
  totalOpen: number;
  /** Top-N blockers ranked by downstream impact (how many proposals they block). */
  topBlockers: BlockingChain[];
  /** Proposals with no blockers and high priority — same shape as Ready Queue. */
  readyCount: number;
}

let _depsCache: DependenciesSummary | null = null;
let _crossCuttingCache: CrossCuttingStats | null = null;
let _depGraphCache: DepGraphData | null = null;

export type GraphStatus = 'compliant' | 'partial' | 'non-compliant' | 'manual-review' | 'neutral';

export interface GraphNode {
  id: string;
  label: string;
  status: GraphStatus;
  meta?: string;
  phase?: string;
  surface?: string;
  type?: string;
  bucket?: string;
  url?: string;
}

export interface GraphEdge { from: string; to: string }

export interface DepGraphData {
  schema_version: string;
  generated_at: string;
  source: string;
  source_commit: string;
  counts: {
    nodes: number;
    edges: number;
    stub_nodes: number;
    open_issues_with_blockers: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Read the dep-graph snapshot emitted by tools/dep-graph-emit. Critical-path
 * computation happens client-side in the React component since it needs DOM
 * geometry for edge routing.
 */
export function loadDepGraph(): DepGraphData {
  if (_depGraphCache) return _depGraphCache;
  const path = resolve(REPO_ROOT, 'docs/audits/derived/_dep-graph.json');
  _depGraphCache = JSON.parse(readFileSync(path, 'utf8')) as DepGraphData;
  return _depGraphCache;
}

/**
 * Read docs/hive/_proposals.json once and bucket each proposal as epic-affiliated
 * (title carries `[Epic-N]` or `(epic-N)` prefix) vs cross-cutting (substrate /
 * tooling / methodology / CI work with no BRD epic anchor). The original
 * subs-status page exposed this as a "traceability gap" warning.
 */
export function loadCrossCuttingStats(): CrossCuttingStats {
  if (_crossCuttingCache) return _crossCuttingCache;
  const path = resolve(REPO_ROOT, 'docs/hive/_proposals.json');
  const raw: RawProposalsFile = JSON.parse(readFileSync(path, 'utf8'));
  let epicAffiliated = 0;
  let crossCutting = 0;
  for (const p of raw.proposals) {
    if (/\[Epic-\d+\]|\(epic-\d+\)/i.test(p.title)) epicAffiliated++;
    else crossCutting++;
  }
  const total = epicAffiliated + crossCutting;
  _crossCuttingCache = {
    totalProposals: total,
    epicAffiliated,
    crossCutting,
    crossCuttingPct: total > 0 ? Math.round((crossCutting / total) * 100) : 0,
  };
  return _crossCuttingCache;
}

export function loadDependencies(): DependenciesSummary {
  if (_depsCache) return _depsCache;
  const path = resolve(REPO_ROOT, 'docs/hive/_proposals.json');
  const raw: RawProposalsFile = JSON.parse(readFileSync(path, 'utf8'));

  const openByNumber = new Map<number, RawProposal>();
  for (const p of raw.proposals) {
    if (p.state === 'open') openByNumber.set(p.github_issue_number, p);
  }

  // Count downstream impact: how many open proposals each blocker is blocking
  const downstream = new Map<number, RawProposal[]>();
  for (const p of openByNumber.values()) {
    const blockers = p.metadata_block?.blocked_by ?? [];
    for (const b of blockers) {
      const num = typeof b === 'number' ? b : Number(b);
      if (Number.isNaN(num)) continue;
      // Only count blockers that are themselves still open (closed ones aren't really blocking)
      if (!openByNumber.has(num)) continue;
      const list = downstream.get(num) ?? [];
      list.push(p);
      downstream.set(num, list);
    }
  }

  const topBlockers: BlockingChain[] = Array.from(downstream.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 8)
    .map(([blockerNum, blockedList]) => {
      const blocker = openByNumber.get(blockerNum)!;
      return {
        blocker: {
          number: blocker.github_issue_number,
          title: blocker.title,
          priority: blocker.metadata_block?.priority,
          phase: blocker.metadata_block?.phase,
        },
        blocked: blockedList.map((p) => ({
          number: p.github_issue_number,
          title: p.title,
          priority: p.metadata_block?.priority,
          phase: p.metadata_block?.phase,
        })),
      };
    });

  let readyCount = 0;
  for (const p of openByNumber.values()) {
    const blockers = p.metadata_block?.blocked_by ?? [];
    if (blockers.length === 0) {
      const pri = p.metadata_block?.priority?.replace(/^P/i, '');
      if (pri === '0' || pri === '1') readyCount++;
    }
  }

  _depsCache = {
    generatedAt: raw.generated_at,
    totalOpen: raw.total_open,
    topBlockers,
    readyCount,
  };
  return _depsCache;
}
