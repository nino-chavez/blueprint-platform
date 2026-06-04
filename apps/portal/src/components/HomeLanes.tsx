import {
  LaneCard,
  StatusBadge,
  useAudiencePreference,
  type Audience,
  type Status,
  type LaneVerb,
} from '@blueprint/ui';

interface Lane {
  verb: LaneVerb;
  description: string;
  status: Status;
}

// Status labels reflect lane *maturity* — `ready` = lane works end-to-end,
// `partial` = useful but with gaps, `planned` = scaffold only. The labels
// are authorial judgment (not derived) since "is this surface ready" is a
// categorical call, not a count.
const LANES: Record<LaneVerb, Lane> = {
  discover: {
    verb: 'discover',
    description:
      'Strategy, value prop, the bet — what we are building and why. Excerpts from STRATEGY / BRD / PRD canonical sources.',
    status: 'ready',
  },
  try: {
    verb: 'try',
    description:
      'See it work, live. Storefront, merchant admin, and design prototype as embedded iframes — each a real Cloudflare Pages deployment.',
    status: 'partial',
  },
  build: {
    verb: 'build',
    description:
      'Integrate it. API spec, ADR index, SDKs (React / Catalyst / Web Component), component library + design tokens. Each card links to source.',
    status: 'ready',
  },
  operate: {
    verb: 'operate',
    description:
      'Run it day-to-day. Merchant + subscriber playbooks. Thinnest lane today — most ops guidance still lives in apps/demos/scripts/.',
    status: 'planned',
  },
  inspect: {
    verb: 'inspect',
    description:
      'Under the hood. Methodology, Hive substrate, ADR record, trust axioms, gate/attestation/dependency dashboards, capability coverage audit.',
    status: 'ready',
  },
  roadmap: {
    verb: 'roadmap',
    description:
      'Where it is going. Horizon (now/next/later), phase progress, 29 epics, ready queue, in-flight, shipped-not-released.',
    status: 'ready',
  },
};

// Per-audience lane order. Same six lanes; the lead changes by who's looking.
//   executive — bet first → trajectory → proof → methodology → integration → day-to-day
//   discovery — proof first → integration → bet → trajectory → day-to-day → methodology
//   internal  — methodology first → trajectory → bet → integration → proof → day-to-day
const AUDIENCE_ORDER: Record<Audience, LaneVerb[]> = {
  executive: ['discover', 'roadmap', 'try', 'inspect', 'build', 'operate'],
  discovery: ['try', 'build', 'discover', 'roadmap', 'operate', 'inspect'],
  internal:  ['inspect', 'roadmap', 'discover', 'build', 'try', 'operate'],
};

/**
 * Six-lane card grid on the homepage. Lane order shifts per the persisted
 * audience preference — toggling the switcher in PortalNav re-renders this
 * island via the `blueprint-audience-change` CustomEvent the hook dispatches.
 */
export function HomeLanes() {
  const [audience] = useAudiencePreference();
  const ordered = AUDIENCE_ORDER[audience].map((verb) => LANES[verb]);

  return (
    <section aria-label="Portal lanes" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((lane) => (
        <LaneCard
          key={lane.verb}
          verb={lane.verb}
          description={lane.description}
          meta={<StatusBadge status={lane.status} />}
        />
      ))}
    </section>
  );
}
