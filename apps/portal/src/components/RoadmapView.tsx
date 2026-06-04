import type { BoardSummary, BoardIssue, EpicProgressSummary } from '@/lib/derived';

const GH_REPO = 'https://github.com/nino-chavez/blueprint-platform/issues';

export interface RoadmapViewProps {
  board: BoardSummary;
  epicProgress: EpicProgressSummary;
}

/**
 * Phase pill — used in both the issue list rows and the issue header.
 */
function PhaseChip({ phase }: { phase?: string }) {
  if (!phase) return null;
  const label = phase === 'foundation' ? 'Foundation' : `Phase ${phase}`;
  return (
    <span className="rounded-full bg-contrast-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-contrast-500">
      {label}
    </span>
  );
}

function PriorityChip({ priority }: { priority?: string }) {
  if (!priority) return null;
  const norm = priority.replace(/^P/i, '').toUpperCase();
  const tone =
    norm === '0'
      ? 'bg-error-background text-error-foreground'
      : norm === '1'
      ? 'bg-warning-background text-warning-foreground'
      : 'bg-contrast-100 text-contrast-500';
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase ${tone}`}>
      P{norm}
    </span>
  );
}

function IssueRow({ issue }: { issue: BoardIssue }) {
  // Strip the noisy "[Proposal] [Spec]" / "[Proposal] [Epic-N]" prefix —
  // every proposal title starts with it; the type chip already tells you.
  const cleanTitle = issue.title
    .replace(/^\[Proposal\]\s*/, '')
    .replace(/^\[(Spec|Epic-\d+|Decision(?:-Fast)?|Spike)\]\s*/, '');
  return (
    <li className="group flex items-baseline gap-3 border-b border-contrast-100 py-2 last:border-b-0">
      <a
        href={`${GH_REPO}/${issue.number}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs text-contrast-400 group-hover:text-brand"
      >
        #{issue.number}
      </a>
      <a
        href={`${GH_REPO}/${issue.number}`}
        target="_blank"
        rel="noreferrer"
        className="flex-1 truncate text-sm text-foreground hover:text-brand hover:underline"
        title={cleanTitle}
      >
        {cleanTitle}
      </a>
      <div className="flex shrink-0 items-center gap-1.5">
        <PriorityChip priority={issue.priority} />
        <PhaseChip phase={issue.phase} />
        {issue.ageDays > 0 && (
          <span className="font-mono text-[10px] text-contrast-400">{issue.ageDays}d</span>
        )}
      </div>
    </li>
  );
}

function HorizonCard({
  label,
  count,
  hint,
  tone,
}: {
  label: string;
  count: number;
  hint: string;
  tone: 'now' | 'next' | 'later';
}) {
  const toneClasses = {
    now:   'border-success/40 bg-success-background/40 text-success-foreground',
    next:  'border-brand/40 bg-brand-background/40 text-brand-foreground',
    later: 'border-contrast-300 bg-contrast-100/30 text-contrast-500',
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <p className="font-mono text-[10px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold leading-none tracking-tight text-foreground">
        {count}
      </p>
      <p className="mt-1 text-xs">{hint}</p>
    </div>
  );
}

function PhaseCard({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: 'shipped' | 'active' | 'queued';
}) {
  const statusMeta = {
    shipped: { tag: 'Shipped', tone: 'text-success-foreground' },
    active:  { tag: 'Active',  tone: 'text-brand' },
    queued:  { tag: 'Queued',  tone: 'text-contrast-400' },
  }[status];
  return (
    <div className="rounded-lg border border-contrast-200 bg-background p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-base font-semibold">{label}</p>
        <span className={`font-mono text-[10px] uppercase tracking-wide ${statusMeta.tone}`}>
          {statusMeta.tag}
        </span>
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold leading-none tracking-tight">
        {count}
      </p>
      <p className="mt-1 text-xs text-contrast-500">
        {count === 0 ? 'no open work' : count === 1 ? 'open proposal' : 'open proposals'}
      </p>
    </div>
  );
}

function EpicRow({ epic }: { epic: EpicProgressSummary['epics'][number] }) {
  const link = epic.trackerNumber ? `${GH_REPO}/${epic.trackerNumber}` : null;
  // Progress signal: % of touched files relative to median footprint.
  // Imperfect but better than nothing; the bar reads as "scope of activity."
  const activityScore = Math.min(100, Math.round((epic.fileCount / 30) * 100));
  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)_8rem_6rem] items-center gap-3 border-b border-contrast-100 py-2 last:border-b-0">
      <span className="font-mono text-xs text-contrast-400">Epic {epic.epic}</span>
      <div className="min-w-0">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-foreground hover:text-brand hover:underline"
            title={epic.title}
          >
            {epic.title}
          </a>
        ) : (
          <span className="truncate text-sm text-foreground" title={epic.title}>
            {epic.title}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-contrast-100">
          <div
            className="h-1.5 rounded-full bg-brand transition-all"
            style={{ width: `${activityScore}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[10px] text-contrast-400">{epic.fileCount}f</span>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 font-mono text-[10px] text-contrast-400">
        <span title={`${epic.prCount} merged PRs`}>{epic.prCount}p</span>
        {epic.inFlightCount > 0 && (
          <span className="rounded bg-success-background px-1.5 py-0.5 text-success-foreground">
            {epic.inFlightCount} ↻
          </span>
        )}
        {epic.openCount > 0 && (
          <span className="rounded bg-contrast-100 px-1.5 py-0.5">{epic.openCount} open</span>
        )}
      </div>
    </li>
  );
}

export function RoadmapView({ board, epicProgress }: RoadmapViewProps) {
  // Horizon math: now = in-flight; next = ready-queue + shipped-not-closed
  // (both are "about to land or about to start"); later = awaiting-synthesis.
  const now = board.inFlight.length;
  const next = board.readyQueue.length + board.shippedNotClosed.length;
  const later = board.byBucket.find((b) => b.bucket === 'awaiting-synthesis')?.count ?? 0;

  // Foundation is structurally complete (every epic has at least 1 merged PR);
  // Phase 1 is the active wave; Phases 2/3 are queued.
  const foundationDone = board.byPhase.foundation === 0;

  return (
    <div className="space-y-12">
      {/* Horizon */}
      <section aria-label="Horizon">
        <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">Horizon</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <HorizonCard label="Now" count={now} hint="claimed and in flight" tone="now" />
          <HorizonCard
            label="Next"
            count={next}
            hint={`${board.readyQueue.length} queued · ${board.shippedNotClosed.length} just shipped`}
            tone="next"
          />
          <HorizonCard label="Later" count={later} hint="awaiting synthesis" tone="later" />
        </div>
      </section>

      {/* Phases */}
      <section aria-label="Phases">
        <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">Phases</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PhaseCard
            label="Foundation"
            count={board.byPhase.foundation}
            status={foundationDone ? 'shipped' : 'active'}
          />
          <PhaseCard label="Phase 1" count={board.byPhase.phase1} status="active" />
          <PhaseCard label="Phase 2" count={board.byPhase.phase2} status="queued" />
          <PhaseCard label="Phase 3" count={board.byPhase.phase3} status="queued" />
        </div>
        {board.byPhase.unknown > 0 && (
          <p className="mt-2 text-xs text-contrast-400">
            {board.byPhase.unknown} open proposal{board.byPhase.unknown === 1 ? '' : 's'} missing a
            phase tag — needs <code className="font-mono text-[11px]">hive-meta</code> backfill.
          </p>
        )}
      </section>

      {/* Epics — show top 10 by activity */}
      <section aria-label="Epics">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Epics (10 most active)
          </h2>
          <span className="font-mono text-xs text-contrast-400">
            {epicProgress.epics.length} total
          </span>
        </div>
        <ul className="rounded-lg border border-contrast-200 bg-background px-4">
          {[...epicProgress.epics]
            .sort((a, b) => b.fileCount - a.fileCount)
            .slice(0, 10)
            .map((epic) => (
              <EpicRow key={epic.epic} epic={epic} />
            ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-contrast-400">
          Bar = file-footprint activity (relative). p = merged PRs. ↻ = in flight. Source:{' '}
          <code>tools/state-derive/epic-footprints</code>.
        </p>
      </section>

      {/* Ready queue */}
      {board.readyQueue.length > 0 && (
        <section aria-label="Ready queue">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Ready queue</h2>
            <a
              href="https://github.com/users/nino-chavez/projects/1"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-contrast-400 hover:text-brand"
            >
              full queue ↗
            </a>
          </div>
          <p className="mb-3 text-sm text-contrast-500">
            Unblocked + high-priority proposals queued for dispatch. Operator sets priority; the
            queue auto-orders the rest.
          </p>
          <ul className="rounded-lg border border-contrast-200 bg-background px-4">
            {board.readyQueue.map((issue) => (
              <IssueRow key={issue.number} issue={issue} />
            ))}
          </ul>
        </section>
      )}

      {/* In flight */}
      <section aria-label="In flight">
        <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
          In flight ({board.inFlight.length})
        </h2>
        <p className="mb-3 text-sm text-contrast-500">
          Currently claimed by a session and being implemented.
        </p>
        {board.inFlight.length === 0 ? (
          <div className="rounded-lg border border-contrast-200 bg-background px-4 py-6 text-sm text-contrast-400">
            Nothing in flight. The bench is open.
          </div>
        ) : (
          <ul className="rounded-lg border border-contrast-200 bg-background px-4">
            {board.inFlight.map((issue) => (
              <IssueRow key={issue.number} issue={issue} />
            ))}
          </ul>
        )}
      </section>

      {/* Shipped, not closed */}
      {board.shippedNotClosed.length > 0 && (
        <section aria-label="Shipped not closed">
          <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
            Shipped, awaiting release ({board.shippedNotClosed.length})
          </h2>
          <p className="mb-3 text-sm text-contrast-500">
            PR merged to <code className="font-mono text-xs">dev</code>; the GH issue closes when{' '}
            <code className="font-mono text-xs">dev → main</code> fast-forwards (typically daily).
          </p>
          <ul className="rounded-lg border border-contrast-200 bg-background px-4">
            {board.shippedNotClosed.map((issue) => (
              <IssueRow key={issue.number} issue={issue} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
