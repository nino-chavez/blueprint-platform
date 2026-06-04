interface TryNavProps {
  currentPath: string;
}

const TABS: Array<{ href: string; label: string; hint: string }> = [
  { href: '/try',           label: 'Live surfaces', hint: '3 deployments, iframed' },
  { href: '/try/scenarios', label: 'Scenarios',     hint: '19 scripted demos' },
];

export function TryNav({ currentPath }: TryNavProps) {
  return (
    <nav
      aria-label="Try sub-sections"
      className="mb-8 flex flex-wrap items-center gap-1 rounded-lg border border-contrast-200 bg-background p-1"
    >
      {TABS.map((tab) => {
        const isActive =
          tab.href === '/try'
            ? currentPath === '/try' || currentPath === '/try/'
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
