# Frontend redesign: design system, landing page, full app visual overhaul

Date: 2026-08-09

## Goal

The current frontend (`frontend/src/`) is functionally complete but visually bare: system-font
typography, an unused blue/purple/amber palette (`tailwind.config.js`), plain bordered cards, and
no public-facing page — unauthenticated visitors are redirected straight to `/login`. This spec
covers a full visual redesign of the authenticated app plus a new public marketing landing page,
so the product looks like a polished, well-designed B2B SaaS tool rather than a bare CRUD scaffold.

No backend changes. No new routes/behavior beyond the landing page and its redirect logic
(described below). No dark mode (light theme only).

## Design system

**Typography**: add Inter (Google Fonts link in `index.html`) as the primary typeface, replacing
the system-font stack. Establish a consistent type scale (display / h1 / h2 / h3 / body / caption)
and apply it consistently instead of today's ad-hoc `text-lg`/`text-sm`/`text-xl` choices.

**Color palette** (`tailwind.config.js`): replace the current `primary`/`secondary`/`accent`
(`#1D4ED8`/`#9333EA`/`#FBBF24`, barely used) with:
- `primary`: Indigo 600/700 as the brand/accent color (buttons, links, active states, focus rings).
- Neutrals: keep Tailwind's `slate` scale as the base (already used throughout), but use it more
  deliberately — `slate-50` page backgrounds vs `white` card surfaces, more considered
  border/shadow treatment for depth.
- Semantic status colors (experiment status badges: draft/running/completed/paused/cancelled) keep
  their current green/blue/amber/red/slate mapping — only the badge *style* changes (softer
  backgrounds, dot indicator), not the color-to-status mapping.

**Primitives** (`frontend/src/components/ui/`): redesign `Button`, `Card`, `Field`, `Select`,
`Spinner`, `ErrorBanner` with the new palette/typography, refined spacing, subtle shadows, and
better focus states. Add two new primitives the current set lacks:
- `Badge` — status pill component (replaces the hand-rolled `statusStyles` map inline in
  `ExperimentsListPage.tsx`).
- An empty-state pattern (icon + message + CTA), used wherever a list is currently just a plain
  "No X yet." text line (experiments, metrics, variants).

**Icons**: add `lucide-react` (new dependency; small, tree-shakeable) for nav items, buttons,
empty states, and stat displays — the current UI has no iconography at all.

## Routing & landing page

- `/` becomes a public route rendering a new `LandingPage.tsx`, shown to unauthenticated visitors.
  Sections: header (logo + Log in / Sign up), hero (headline, subhead, CTA), a features section
  describing what the product actually does (experiment planning / sample-size & MDE calculators,
  two-proportion z-test statistical analysis, results & summaries), a "how it works" 3-step
  section, footer.
- If an **authenticated** user navigates to `/`, redirect to `/experiments` (mirrors today's
  `ProtectedRoute` pattern, inverted).
- `/login` and `/register` remain separate dedicated routes (not merged into the landing page) but
  are restyled to match the new visual language — new palette/typography and a branded side
  panel/backdrop so they don't feel visually disconnected from the landing page.
- All existing protected routes (`/experiments`, `/experiments/:id`, `/upload`) and their
  redirect-to-`/login`-when-unauthenticated behavior (`ProtectedRoute.tsx`) are unchanged.

## App shell & authenticated pages

**`Layout.tsx`**: restyle the nav bar with the new palette/typography; add icons next to
"Experiments"/"Upload" nav items; replace the bare "Log out" button with a small
avatar-initial + logout affordance.

**`ExperimentsListPage.tsx`**: replace the flat `<ul>` with a responsive card grid, using the new
`Badge` for status and a proper empty state (icon + message + CTA) instead of the current plain
text line. The "New experiment" form moves out of the permanently-visible inline position into a
modal/drawer opened by a "New experiment" button — this declutters the list view, which becomes
the primary focus of the page.

**`ExperimentDetailPage.tsx` + panels** (`pages/experiment/*.tsx`): restyle the tab bar (icons,
clearer active/hover state). Panel-level changes, all preserving existing functionality/API calls:
- `OverviewPanel`: `<dl>` metadata grid gets cleaner visual treatment; delete action stays a danger
  button.
- `MetricsPanel` / `VariantsPanel`: list rows and "add" forms restyled with the new primitives;
  same underlying create/delete mutations.
- `PlanningPanel`: the two calculator cards (sample size, MDE) restyled; result display gets a
  small stat-style treatment instead of a plain sentence.
- `AnalysisPanel`: form restyled/regrouped; the raw `JSON.stringify(statusMutation.data)` dump in a
  `<pre>` block becomes a legible key/value result card (formatting only — no new
  results-visualization logic, no backend changes).

**`UploadPage.tsx`**: restyle as an on-brand empty/placeholder state (still a stub — no upload
endpoint exists yet).

**`NotFoundPage.tsx`**: restyle to match the new visual language.

## Testing / verification

No backend changes — this is a frontend-only visual/structural change. Verification:
- `npm run typecheck` and `npm run build` pass.
- Manual walkthrough via `npm run dev`: landing page (logged out) → register → login → create
  experiment (via modal) → add metric → add variant → run planning calculators → run analysis →
  check status → delete experiment → log out → confirm redirect to landing page (not `/login`).
- Responsive check at mobile width for the landing page and the experiments card grid.
- Visual check of empty states (no experiments / no metrics / no variants).

## Out of scope

- Dark mode.
- CSV upload functionality (still blocked on a backend endpoint).
- Any backend/API changes.
- Results-visualization rework beyond making the existing analysis-status JSON legible.
