import type {
  GateStatusSummary,
  AttestationsSummary,
  DependenciesSummary,
  GateColor,
  GateCellInfo,
  CrossCuttingGroup,
} from '@/lib/status';

const REPO = 'https://github.com/nino-chavez/blueprint-platform';
const ISSUES = `${REPO}/issues`;

// ============================================================================
// Gate status — 10-gate Epic DoD matrix
// ============================================================================

// Canonical 10-gate Epic DoD labels from docs/methodology/epic-definition-of-done.md
// (NOT my earlier invented labels — fixed 2026-05-20 after audit).
const GATE_NAMES: Record<number, string> = {
  1:  'Feature complete',
  2:  'Hardened',
  3:  'Security reviewed',
  4:  'Performance baselined',
  5:  'Tested at risk-appropriate rates',
  6:  'Documented',
  7:  'User-guided',
  8:  'Demo-asset-ready',
  9:  'Knowledge-transferred',
  10: 'Change-managed',
};

// Phase narrative labels from ADR-0021 (epic-gating-map-phase-cohorts).
const PHASE_LABELS: Record<string, { title: string; subtitle: string }> = {
  '1a': { title: 'Phase 1a',  subtitle: 'Real merchant can install + run one cycle' },
  '1b': { title: 'Phase 1b',  subtitle: 'Real merchant can manage subscribers via storefront' },
  '2':  { title: 'Phase 2',   subtitle: 'Full features behind 1a/1b foundation' },
  '3':  { title: 'Phase 3',   subtitle: 'Advanced' },
};
const PHASE_ORDER = ['1a', '1b', '2', '3'];

const COLOR_BG: Record<GateColor, string> = {
  green:  'bg-success',
  yellow: 'bg-warning',
  red:    'bg-error',
  gray:   'bg-contrast-200',
};

const COLOR_LABEL: Record<GateColor, string> = {
  green:  'Green — done',
  yellow: 'Yellow — in flight / partial',
  red:    'Red — not started',
  gray:   'Gray — not applicable to this epic',
};

const RISK_TONES: Record<string, string> = {
  P0: 'bg-error-background text-error-foreground',
  P1: 'bg-warning-background text-warning-foreground',
  P2: 'bg-info-background text-info-foreground',
  P3: 'bg-contrast-100 text-contrast-500',
};

function cellTooltip(info: GateCellInfo): string {
  const stage1 = info.mechanical_passing ? 'Stage 1 ✓ automated check pass' : 'Stage 1 ✗ automated check fail';
  let stage2: string;
  if (!info.attested) {
    stage2 = 'Stage 2 ☐ awaiting human attestation';
  } else if (info.attestation_freshness === 'fresh') {
    stage2 = `Stage 2 ✓ attested ${info.attested.on}`;
  } else if (info.attestation_freshness === 'stale') {
    stage2 = `Stage 2 ⊘ attestation stale — files changed since ${info.attested.on}; needs re-attestation`;
  } else {
    stage2 = `Stage 2 ? attestation unverified (${info.attested.on})`;
  }
  return `${stage1}\n${stage2}\n${info.mechanical_note}`;
}

function GateDot({ info, gateName }: { info: GateCellInfo; gateName: string }) {
  return (
    <td className="px-1 py-1.5 text-center align-middle">
      <span className="relative inline-flex items-center justify-center">
        <span
          className={`inline-block h-3 w-3 rounded-full ${COLOR_BG[info.color]} ${info.needs_reattestation ? 'ring-1 ring-warning' : ''}`}
          title={`${gateName} — ${COLOR_LABEL[info.color]}\n${cellTooltip(info)}`}
          aria-label={`${gateName} — ${COLOR_LABEL[info.color]} — ${cellTooltip(info).replace(/\n/g, ' · ')}`}
        />
        {info.needs_reattestation && (
          <span
            className="absolute -top-1.5 -right-2 text-[10px] leading-none text-warning-foreground"
            aria-hidden="true"
          >
            ↻
          </span>
        )}
      </span>
    </td>
  );
}

function EpicRow({ epic }: { epic: GateStatusSummary['epics'][number] }) {
  const greenCount = Object.values(epic.gates).filter((c) => c === 'green').length;
  const totalScored = Object.values(epic.gates).filter((c) => c !== 'gray').length;
  const pct = totalScored > 0 ? Math.round((greenCount / totalScored) * 100) : 0;
  const tone =
    pct >= 80 ? 'text-success-foreground' :
    pct >= 40 ? 'text-warning-foreground' :
    'text-error-foreground';
  return (
    <tr className="hover:bg-contrast-100/40">
      <th
        scope="row"
        className="sticky left-0 z-10 border-b border-contrast-100 bg-background px-3 py-2 text-left align-middle font-normal"
      >
        <div className="flex items-baseline gap-2">
          <a
            href={`${REPO}/blob/main/docs/audits/epic-dod/${epic.filename}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 min-w-0"
          >
            <span className="font-mono text-[10px] text-contrast-400">Epic {epic.epic}</span>
            <p
              className="truncate text-sm text-foreground hover:text-brand"
              title={`${epic.title} — open audit doc`}
            >
              {epic.title}
            </p>
          </a>
          {epic.riskTier && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase ${RISK_TONES[epic.riskTier] ?? 'bg-contrast-100 text-contrast-500'}`}
              title={`Risk tier ${epic.riskTier}`}
            >
              {epic.riskTier}
            </span>
          )}
        </div>
      </th>
      {Array.from({ length: 10 }).map((_, i) => {
        const gn = i + 1;
        const info: GateCellInfo = epic.cellInfo[gn] ?? {
          color: 'gray',
          mechanical_passing: false,
          mechanical_note: 'no data',
          attestation_freshness: 'unattested',
          needs_reattestation: false,
        };
        return <GateDot key={gn} info={info} gateName={`Gate ${gn} — ${GATE_NAMES[gn]}`} />;
      })}
      <td className={`border-b border-contrast-100 px-3 py-2 text-right align-middle font-mono text-xs font-medium ${tone}`}>
        {pct}%
      </td>
    </tr>
  );
}

export function GateMatrix({ gates }: { gates: GateStatusSummary }) {
  const scoredCells = gates.totals.green + gates.totals.yellow + gates.totals.red;
  const greenPctOfScored = scoredCells > 0 ? Math.round((gates.totals.green / scoredCells) * 100) : 0;

  // Group epics by phase, then within phase by epic number
  const byPhase = new Map<string, typeof gates.epics>();
  for (const e of gates.epics) {
    const p = e.phase ?? '?';
    if (!byPhase.has(p)) byPhase.set(p, []);
    byPhase.get(p)!.push(e);
  }
  for (const list of byPhase.values()) list.sort((a, b) => a.epic - b.epic);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-success/30 bg-success-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-success-foreground">Green</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none">{gates.totals.green}</p>
          <p className="mt-1 text-xs text-success-foreground/80">{greenPctOfScored}% of scored cells</p>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-warning-foreground">Yellow</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none">{gates.totals.yellow}</p>
          <p className="mt-1 text-xs text-warning-foreground/80">in flight / partial</p>
        </div>
        <div className="rounded-lg border border-error/30 bg-error-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-error-foreground">Red</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none">{gates.totals.red}</p>
          <p className="mt-1 text-xs text-error-foreground/80">not started</p>
        </div>
        <div className="rounded-lg border border-contrast-200 bg-contrast-100/30 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-contrast-400">Epics</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none">{gates.epics.length}</p>
          <p className="mt-1 text-xs text-contrast-500">10 gates each</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-contrast-200 bg-background">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-contrast-100/30">
            <tr>
              <th className="sticky left-0 z-10 border-b border-contrast-200 bg-contrast-100/30 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-contrast-400">
                Epic / Risk
              </th>
              {Array.from({ length: 10 }).map((_, i) => (
                <th
                  key={i + 1}
                  className="border-b border-contrast-200 px-1 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-contrast-400"
                  title={`Gate ${i + 1} — ${GATE_NAMES[i + 1]}`}
                >
                  {i + 1}
                </th>
              ))}
              <th className="border-b border-contrast-200 px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wide text-contrast-400">
                % green
              </th>
            </tr>
          </thead>
          {PHASE_ORDER.filter((p) => byPhase.has(p)).map((phase) => {
            const list = byPhase.get(phase)!;
            const meta = PHASE_LABELS[phase] ?? { title: `Phase ${phase}`, subtitle: '' };
            const phaseGreen = list.reduce(
              (sum, e) => sum + Object.values(e.gates).filter((c) => c === 'green').length,
              0,
            );
            const phaseScored = list.reduce(
              (sum, e) => sum + Object.values(e.gates).filter((c) => c !== 'gray').length,
              0,
            );
            const phasePct = phaseScored > 0 ? Math.round((phaseGreen / phaseScored) * 100) : 0;
            return (
              <tbody key={phase}>
                <tr className="bg-contrast-100/50">
                  <th
                    colSpan={12}
                    className="sticky left-0 z-10 border-y border-contrast-200 bg-contrast-100/50 px-3 py-1.5 text-left"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <span className="font-heading text-sm font-semibold text-foreground">{meta.title}</span>
                        <span className="ml-2 text-xs font-normal text-contrast-500">{meta.subtitle}</span>
                      </div>
                      <span className="font-mono text-[11px] text-contrast-500">
                        {list.length} epics · {phaseGreen}/{phaseScored} green ({phasePct}%)
                      </span>
                    </div>
                  </th>
                </tr>
                {list.map((e) => (
                  <EpicRow key={e.epic} epic={e} />
                ))}
              </tbody>
            );
          })}
        </table>
      </div>

      <details className="rounded-lg border border-contrast-200 bg-background">
        <summary className="cursor-pointer select-none px-4 py-2 text-xs font-medium text-contrast-500 hover:bg-contrast-100/50">
          Gate definitions
        </summary>
        <ol className="border-t border-contrast-200 p-4 space-y-1 text-xs">
          {Object.entries(GATE_NAMES).map(([num, name]) => (
            <li key={num} className="flex gap-3">
              <span className="w-6 shrink-0 font-mono text-contrast-400">{num}</span>
              <span className="text-foreground">{name}</span>
            </li>
          ))}
        </ol>
        <p className="border-t border-contrast-200 px-4 py-2 font-mono text-[10px] text-contrast-400">
          Framework: <a href={`${REPO}/blob/main/docs/methodology/epic-definition-of-done.md`} target="_blank" rel="noreferrer" className="text-brand hover:underline">epic-definition-of-done.md</a> · ratified per <a href={`${REPO}/blob/main/docs/decisions/0057-epic-dod-upstream-to-big-blueprint.md`} target="_blank" rel="noreferrer" className="text-brand hover:underline">ADR-0057</a> · phase cohorts per <a href={`${REPO}/blob/main/docs/decisions/0021-epic-gating-map-phase-cohorts.md`} target="_blank" rel="noreferrer" className="text-brand hover:underline">ADR-0021</a>.
        </p>
      </details>
    </div>
  );
}

// ============================================================================
// Cross-cutting capabilities — substrate-level signal from _state.json that
// doesn't map to a per-epic gate (BigEng conventions, ADR commitments, NFRs,
// persona scenarios, CI hygiene).
// ============================================================================

const GROUP_ROLLUP_TONES: Record<GateColor, string> = {
  green:  'border-success/30 bg-success-background/40 text-success-foreground',
  yellow: 'border-warning/30 bg-warning-background/40 text-warning-foreground',
  red:    'border-error/30 bg-error-background/40 text-error-foreground',
  gray:   'border-contrast-200 bg-contrast-100/30 text-contrast-500',
};

const STATUS_TONES: Record<string, string> = {
  COMPLIANT:       'bg-success-background text-success-foreground',
  MANUAL_REVIEW:   'bg-info-background text-info-foreground',
  PARTIAL:         'bg-warning-background text-warning-foreground',
  'NON-COMPLIANT': 'bg-error-background text-error-foreground',
  ABSENT:          'bg-contrast-100 text-contrast-500',
  ERROR:           'bg-error-background text-error-foreground',
};

function rollupColor(state: string): GateColor {
  if (state === 'unknown') return 'gray';
  return state as GateColor;
}

export function CrossCuttingMatrix({ groups }: { groups: CrossCuttingGroup[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const rc = rollupColor(g.rollup);
          const total = g.capabilities.length;
          return (
            <details key={g.id} className={`rounded-lg border p-4 ${GROUP_ROLLUP_TONES[rc]}`}>
              <summary className="cursor-pointer select-none list-none">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">{g.title}</p>
                    <p className="mt-1 text-xs text-contrast-500">{g.description}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs">
                    {g.counts.COMPLIANT}/{total}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 font-mono text-[10px]">
                  {(Object.entries(g.counts) as Array<[string, number]>)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <span key={k} className={`rounded px-1.5 py-0.5 ${STATUS_TONES[k] ?? ''}`}>
                        {v} {k}
                      </span>
                    ))}
                </div>
              </summary>
              <ul className="mt-3 space-y-1.5 border-t border-contrast-200 pt-3 text-xs">
                {g.capabilities.slice(0, 50).map((c) => (
                  <li key={c.id} className="flex items-baseline gap-2">
                    <span className={`shrink-0 rounded px-1 font-mono text-[9px] ${STATUS_TONES[c.status] ?? ''}`}>
                      {c.status[0]}
                    </span>
                    <code className="text-[11px] text-contrast-500">{c.id}</code>
                    <span className="text-contrast-400">— {c.description}</span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Attestations — gating-grouped list
// ============================================================================

const GATING_LABELS: Record<string, string> = {
  'marketplace-blocking': 'Marketplace-blocking',
  'ga-blocking':          'GA-blocking',
  'soft-gating':          'Soft-gating',
  'informational':        'Informational',
};

const GATING_TONES: Record<string, string> = {
  'marketplace-blocking': 'border-error/30 bg-error-background/30 text-error-foreground',
  'ga-blocking':          'border-warning/30 bg-warning-background/30 text-warning-foreground',
  'soft-gating':          'border-info/30 bg-info-background/30 text-info-foreground',
  'informational':        'border-contrast-200 bg-contrast-100/30 text-contrast-500',
};

export function AttestationList({ atts }: { atts: AttestationsSummary }) {
  const groups: Array<{ gating: string; items: AttestationsSummary['attestations'] }> = [];
  for (const gating of ['marketplace-blocking', 'ga-blocking', 'soft-gating', 'informational']) {
    const items = atts.attestations.filter((a) => a.gating === gating);
    if (items.length > 0) groups.push({ gating, items });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-contrast-200 bg-background p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-contrast-400">Total</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none">{atts.total}</p>
        </div>
        <div className="rounded-lg border border-success/30 bg-success-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-success-foreground">Attested</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none text-success-foreground">{atts.byStatus.attested}</p>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-warning-foreground">Pending</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none text-warning-foreground">{atts.byStatus.pending}</p>
        </div>
        <div className="rounded-lg border border-error/30 bg-error-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-error-foreground">Expired</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none text-error-foreground">{atts.byStatus.expired}</p>
        </div>
      </div>

      {groups.map(({ gating, items }) => (
        <section key={gating} aria-label={GATING_LABELS[gating]}>
          <h4 className="mb-3 flex items-baseline gap-2 font-heading text-sm font-semibold tracking-tight">
            <span>{GATING_LABELS[gating]}</span>
            <span className="font-mono text-[10px] text-contrast-400">{items.length} attestation{items.length === 1 ? '' : 's'}</span>
          </h4>
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.attestation_id} className={`rounded-lg border p-3 ${GATING_TONES[gating]}`}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[11px]" title={a.attestation_id}>{a.attestation_id}</p>
                  <span className="shrink-0 font-mono text-[10px] uppercase">{a.status}</span>
                </div>
                <p className="mb-2 text-sm leading-relaxed text-foreground">{a.title}</p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10px] text-contrast-500">
                  <span>category: {a.category}</span>
                  <span>phase: {a.phase}</span>
                  {a.human_owner && <span>owner: {a.human_owner}</span>}
                  {a.expires_after_days && <span>expires after: {a.expires_after_days}d</span>}
                  {a.related_hive.length > 0 && (
                    <span>
                      hive:{' '}
                      {a.related_hive.map((n, i) => (
                        <a
                          key={n}
                          href={`${ISSUES}/${n}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:underline"
                        >
                          #{n}{i < a.related_hive.length - 1 ? ',' : ''}
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ============================================================================
// Dependencies — top blockers
// ============================================================================

function cleanTitle(t: string): string {
  return t
    .replace(/^\[Proposal\]\s*/, '')
    .replace(/^\[(Spec|Epic-\d+|Decision(?:-Fast)?|Spike)\]\s*/, '');
}

export function DependencyView({ deps }: { deps: DependenciesSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-contrast-200 bg-background p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-contrast-400">Open proposals</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none">{deps.totalOpen}</p>
        </div>
        <div className="rounded-lg border border-success/30 bg-success-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-success-foreground">Ready (P0/P1, unblocked)</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none text-success-foreground">{deps.readyCount}</p>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning-background/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-warning-foreground">Top blockers</p>
          <p className="mt-1 font-heading text-2xl font-semibold leading-none text-warning-foreground">{deps.topBlockers.length}</p>
          <p className="mt-1 text-xs text-warning-foreground/80">close these first</p>
        </div>
      </div>

      {deps.topBlockers.length === 0 ? (
        <div className="rounded-lg border border-contrast-200 bg-background px-4 py-6 text-sm text-contrast-400">
          No open proposal is blocking another open proposal right now.
        </div>
      ) : (
        <ul className="space-y-3">
          {deps.topBlockers.map((chain) => (
            <li key={chain.blocker.number} className="rounded-lg border border-contrast-200 bg-background p-4">
              <header className="mb-2 flex items-baseline gap-3">
                <a
                  href={`${ISSUES}/${chain.blocker.number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-contrast-400 hover:text-brand"
                >
                  #{chain.blocker.number}
                </a>
                <p className="flex-1 text-sm font-medium text-foreground">{cleanTitle(chain.blocker.title)}</p>
                <span className="shrink-0 rounded bg-warning-background px-2 py-0.5 font-mono text-[10px] uppercase text-warning-foreground">
                  blocks {chain.blocked.length}
                </span>
              </header>
              <ul className="ml-4 space-y-1 border-l border-contrast-200 pl-3">
                {chain.blocked.slice(0, 5).map((b) => (
                  <li key={b.number} className="flex items-baseline gap-2 text-xs">
                    <span className="font-mono text-contrast-400">→ #{b.number}</span>
                    <a
                      href={`${ISSUES}/${b.number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-contrast-500 hover:text-brand"
                      title={b.title}
                    >
                      {cleanTitle(b.title)}
                    </a>
                  </li>
                ))}
                {chain.blocked.length > 5 && (
                  <li className="font-mono text-[10px] text-contrast-400">
                    +{chain.blocked.length - 5} more
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="font-mono text-[10px] text-contrast-400">
        Source: <code>docs/hive/_proposals.json</code> · 'blocks N' = open proposals citing this in
        their <code>hive-meta.blocked_by</code>. For the queue view (next dispatchable), see <a className="text-brand hover:underline" href="/roadmap">Roadmap</a>.
      </p>
    </div>
  );
}
