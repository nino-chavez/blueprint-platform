/**
 * Demo scenarios — JSON-driven storyboard previously served at
 * subs-demos.pages.dev. Source: apps/demos/scenarios.json. Read natively
 * so /try renders scenarios in portal chrome rather than linking out.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-root';

const REPO_ROOT = repoRoot();

export type ScenarioStatus = 'ready' | 'partial' | 'missing' | 'planned' | 'not-applicable';

export interface SurfaceState {
  surfaceId: string;
  status: ScenarioStatus;
  demoUrl?: string;
  demoScript: string[];
  guide?: string;
}

export interface Scenario {
  id: string;
  category: string;
  title: string;
  summary: string;
  brdRefs: string[];
  prerequisites: string[];
  expectedOutcome: string;
  surfaces: SurfaceState[];
}

export interface ScenariosSummary {
  description: string;
  surfaces: Array<{ id: string; label: string }>;
  scenarios: Scenario[];
  byCategory: Record<string, Scenario[]>;
}

interface RawSurfaceState {
  status: ScenarioStatus;
  demo_url?: string;
  demo_script?: string[];
  guide?: string;
}

interface RawScenario {
  id: string;
  category: string;
  title: string;
  summary: string;
  brd_refs?: string[];
  prerequisites?: string[];
  expected_outcome?: string;
  surfaces?: Record<string, RawSurfaceState>;
}

interface RawSurfaces {
  id: string;
  label: string;
}

interface RawScenariosFile {
  description: string;
  surfaces: RawSurfaces[];
  scenarios: RawScenario[];
}

let _cache: ScenariosSummary | null = null;

export function loadScenarios(): ScenariosSummary {
  if (_cache) return _cache;
  const path = resolve(REPO_ROOT, 'apps/demos/scenarios.json');
  const raw: RawScenariosFile = JSON.parse(readFileSync(path, 'utf8'));

  const scenarios: Scenario[] = raw.scenarios.map((s) => ({
    id: s.id,
    category: s.category,
    title: s.title,
    summary: s.summary,
    brdRefs: s.brd_refs ?? [],
    prerequisites: s.prerequisites ?? [],
    expectedOutcome: s.expected_outcome ?? '',
    surfaces: Object.entries(s.surfaces ?? {}).map(([surfaceId, st]) => ({
      surfaceId,
      status: st.status,
      demoUrl: st.demo_url,
      demoScript: st.demo_script ?? [],
      guide: st.guide,
    })),
  }));

  const byCategory: Record<string, Scenario[]> = {};
  for (const s of scenarios) {
    byCategory[s.category] = byCategory[s.category] ?? [];
    byCategory[s.category]!.push(s);
  }

  _cache = {
    description: raw.description,
    surfaces: raw.surfaces.map((s) => ({ id: s.id, label: s.label })),
    scenarios,
    byCategory,
  };
  return _cache;
}
