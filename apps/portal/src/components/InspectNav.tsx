interface InspectNavProps {
  currentPath: string;
}

const TABS: Array<{ href: string; label: string; hint: string }> = [
  { href: '/inspect',              label: 'Overview',     hint: 'methodology + axioms' },
  { href: '/inspect/gates',        label: 'Gate status',  hint: '10 gates × 28 epics' },
  { href: '/inspect/attestations', label: 'Attestations', hint: '41 manual sign-offs' },
  { href: '/inspect/dependencies', label: 'Dependencies', hint: 'top blockers' },
  { href: '/inspect/coverage',     label: 'Coverage',     hint: 'BRD/ADR/NFR audit' },
];

/**
 * Sub-nav for /inspect/* pages. Pill-bar of tabs with active-state highlight.
 * Active rule: an exact match wins (/inspect itself); for sub-pages, prefix match.
 */
export function InspectNav({ currentPath }: InspectNavProps) {
  return (
    <nav
      aria-label="Inspect sub-sections"
      className="mb-8 flex flex-wrap items-center gap-1 rounded-lg border border-contrast-200 bg-background p-1"
    >
      {TABS.map((tab) => {
        const isActive =
          tab.href === '/inspect'
            ? currentPath === '/inspect' || currentPath === '/inspect/'
            : currentPath.startsWith(tab.href);
        return (
          <a
            key={tab.href}
            href={tab.href}
            data-active={isActive ? 'true' : 'false'}
            className="group inline-flex flex-col items-start rounded-md px-3 py-1.5 text-sm transition-colors duration-fast ease-standard hover:bg-contrast-100 data-[active=true]:bg-contrast-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="font-medium text-foreground group-data-[active=true]:text-brand">
              {tab.label}
            </span>
            <span className="font-mono text-[10px] text-contrast-400">{tab.hint}</span>
          </a>
        );
      })}
    </nav>
  );
}
