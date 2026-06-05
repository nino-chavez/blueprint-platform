---
canonical: true
---

# `tools/archaeology/web/` — Interrogation surface (chat island)

A drop-in React island that lets visitors interrogate the archaeology substrate from any page of your project's portal. Backed by the Worker's `/derive/stream` SSE endpoint, with inline `[E:event_id]` citation chips that open a secondary drawer showing the underlying event.

This is the **trust-restoration surface** companion to the substrate itself. The substrate captures and indexes; this UI lets people ask grounded questions and click through to the evidence.

## Files

- `ArchaeologyChat.tsx` — the React component (single file, ~490 lines). `scaffold.sh` substitutes `{{PROJECT_SLUG}}` and `{{CF_WORKERS_SUBDOMAIN}}` at install time so the component points at your Worker.

## Integration

The component is portal-agnostic. The reference integration (`bc-subscriptions/apps/portal/`) mounts it as a global island in the Astro layout so every page gets it.

### For Astro projects (recommended)

```astro
---
// apps/portal/src/layouts/Layout.astro
import { ArchaeologyChat } from '@/components/ArchaeologyChat';
const currentPath = Astro.url.pathname;
---
<html>
  <body>
    <slot />
    <ArchaeologyChat client:idle pageContext={currentPath} />
  </body>
</html>
```

### For Next.js projects

```tsx
// app/layout.tsx
import { ArchaeologyChat } from '@/components/ArchaeologyChat';
import { headers } from 'next/headers';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '/';
  return (
    <html>
      <body>
        {children}
        <ArchaeologyChat pageContext={pathname} />
      </body>
    </html>
  );
}
```

(Add a middleware that sets `x-pathname` since Next.js doesn't expose the route in layouts directly.)

### For other React-based stacks

Copy `ArchaeologyChat.tsx` into your component directory, import it where it should mount, pass `pageContext` from your router. The component is dependency-free apart from React + the styling assumptions below.

## Styling

The component uses Tailwind classes that assume your design system exposes:

- `bg-brand`, `text-brand`, `border-brand` — primary brand color
- `bg-background`, `text-foreground` — surface + primary text
- `border-contrast-200`, `bg-contrast-50`, `text-contrast-400` — contrast scale (50, 100, 200, 300, 400, 500, 600)
- `font-heading`, `font-mono` — type-stack tokens

If your project doesn't have these tokens, either:
1. Add a small CSS file mapping these to your existing palette (recommended — preserves the component's visual hierarchy)
2. Replace the class names wholesale to match your design system

## Customizing empty-state suggestions

The default suggestions are substrate-agnostic ("What were the most recent architectural decisions?"). Override per-page:

```tsx
function suggestionsForMyProject(pageContext: string): string[] {
  if (pageContext.startsWith('/inspect/gates')) {
    return [
      'How does the gating discipline work?',
      'Which gate is currently blocking us?',
    ];
  }
  return [
    'What ADRs were ratified this week?',
    'Why did we choose Cloudflare over Vercel?',
  ];
}

<ArchaeologyChat pageContext={path} getSuggestions={suggestionsForMyProject} />
```

## CORS

The Worker side allows all origins (`access-control-allow-origin: *`) because the surface is public and rate-limited at the spend layer (per-IP + per-day caps in `spend_counters`). If your deployment needs origin pinning, update `corsHeaders()` in `worker/src/index.ts`.

## Cost / rate limit

Each chat question costs ~1 Anthropic API call (+ embedding cost via Workers AI free tier). The Worker enforces:

- **Per-IP daily cap** — default 50 questions/IP/day (`DERIVE_PER_IP_CAP` env)
- **Global daily cap** — default 200 questions/project/day (`DERIVE_DAILY_CAP` env)

Both are configurable via `wrangler secret put` or the `[vars]` section of `worker/wrangler.toml`. Audit log lands in the `derive_log` D1 table (sha256(ip)[:16] for privacy-preserving review).

## Persistence

Last 30 messages persist in the visitor's `localStorage` under the key `archaeology-chat:transcript`. The substrate side has no per-visitor state. Server-side conversation persistence is a Slice 2 follow-on if/when reviewers actually need durable thread state across sessions.
