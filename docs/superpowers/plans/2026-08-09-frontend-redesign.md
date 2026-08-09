# Frontend Redesign & Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Experimentation Copilot a polished, well-designed UI — a full visual overhaul of the authenticated app plus a new public marketing landing page for unauthenticated visitors.

**Architecture:** Pure frontend change (`frontend/src/`). New design tokens (Inter font, indigo `primary` palette) flow through redesigned shared primitives (`components/ui/*`), which every page consumes. A new public `LandingPage` becomes the `/` route; authenticated users are redirected from `/` to `/experiments`. No backend or API-contract changes.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS v3 + react-router-dom v6 + @tanstack/react-query v5, plus a new `lucide-react` dependency for icons.

## Global Constraints

- No backend changes. No changes to `frontend/src/api/*` request/response shapes.
- No dark mode — light theme only.
- Brand color: Tailwind `primary` = indigo scale (`DEFAULT` = indigo-600), replacing the current unused `secondary`/`accent` tokens. Neutrals stay Tailwind `slate`.
- Existing experiment-status color mapping (draft=slate, running=green, completed=blue, paused=amber, cancelled=red) is preserved — only the visual treatment (via the new `Badge` component) changes.
- Font: Inter, loaded via a Google Fonts `<link>` in `frontend/index.html`.
- Icons: `lucide-react` (added in Task 1). Use only these icon names throughout (verified/high-confidence names, do not substitute others without checking they exist): `FlaskConical`, `Beaker`, `Upload`, `UploadCloud`, `LogOut`, `Plus`, `X`, `Trash2`, `ArrowRight`, `ArrowLeft`, `AlertCircle`, `LineChart`, `BarChart3`, `ClipboardList`, `Layers`, `Calculator`, `ShieldCheck`.
- **Typecheck command** (this environment has no native Linux Node.js — only Windows Node.js reachable via WSL interop, and `npm run typecheck` breaks because it spawns `cmd.exe`, which can't use a WSL UNC path as its working directory). Run typecheck from `frontend/` with:
  ```bash
  "/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
  ```
  Expected on success: no output, exit code 0.
- **Full build/runtime verification**: `npm run build`/`npm run dev` are NOT reliable in this WSL shell (Vite 8's config bundler fails to resolve its own entry point over the WSL UNC path). Docker is available and working in this environment — the final task (Task 14) verifies everything via `docker compose up --build`, which builds the frontend inside a Linux container and sidesteps the host issue entirely. Don't attempt `npm run build`/`npm run dev` directly on the host during earlier tasks.
- Every "Modify" step below gives the complete new file contents — replace the entire file with what's shown, don't hand-merge diffs.
- Commit after each task with `git add <files>` + a `git commit` message ending in the standard `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer (per repo convention already used in this project's commits).

---

### Task 1: Design tokens — palette, font, global styles, icon dependency

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/index.html`
- Modify: `frontend/src/styles/tailwind.css`
- Modify: `frontend/package.json` (via `npm install lucide-react`)

**Interfaces:**
- Produces: Tailwind color token `primary` (with shades `50`–`900` plus `DEFAULT`), `font-sans` = Inter, and the `lucide-react` package available for import in later tasks.

- [ ] **Step 1: Update the Tailwind color/font config**

Replace the full contents of `frontend/tailwind.config.js`:

```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Add the Inter font link and a meta description to `frontend/index.html`**

Replace the full contents of `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Experimentation Copilot — plan, run, and analyze A/B tests with statistical rigor."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <title>Experimentation Copilot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Set the global body styles**

Replace the full contents of `frontend/src/styles/tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-50 font-sans text-slate-900 antialiased;
  }
}
```

- [ ] **Step 4: Install lucide-react**

Run from `frontend/`:

```bash
npm install lucide-react
```

Expected: `package.json` and `package-lock.json` gain a `lucide-react` entry; exit code 0.

- [ ] **Step 5: Typecheck**

Run (from `frontend/`):
```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS (no source files changed yet, this just confirms the toolchain still works after `npm install`).

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.js frontend/index.html frontend/src/styles/tailwind.css frontend/package.json frontend/package-lock.json
git commit -m "$(cat <<'EOF'
Add design tokens: indigo palette, Inter font, lucide-react

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Redesign core UI primitives

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Card.tsx`
- Modify: `frontend/src/components/ui/Field.tsx`
- Modify: `frontend/src/components/ui/Select.tsx`
- Modify: `frontend/src/components/ui/Spinner.tsx`
- Modify: `frontend/src/components/ui/ErrorBanner.tsx`

**Interfaces:**
- Consumes: `primary` Tailwind token and `lucide-react` from Task 1.
- Produces: `Button` gains `size?: 'sm' | 'md'` (default `'md'`) and `icon?: ReactNode` props, plus a new `'ghost'` variant, on top of its existing `variant`/`className`/native-button props. `Card`, `Field`, `Select`, `Spinner` keep their existing prop signatures unchanged (visual-only restyle). `ErrorBanner` keeps its existing `{ message: string }` prop.

- [ ] **Step 1: Redesign `Button.tsx`**

Replace the full contents of `frontend/src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary-700 disabled:bg-primary-300',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Redesign `Card.tsx`**

Replace the full contents of `frontend/src/components/ui/Card.tsx`:

```tsx
import type { ReactNode } from 'react';

export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Redesign `Field.tsx`**

Replace the full contents of `frontend/src/components/ui/Field.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Field({ label, id, className = '', ...props }: FieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={inputId} className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 ${className}`}
        {...props}
      />
    </label>
  );
}
```

- [ ] **Step 4: Redesign `Select.tsx`**

Replace the full contents of `frontend/src/components/ui/Select.tsx`:

```tsx
import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export default function Select({ label, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={selectId} className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <select
        id={selectId}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
```

- [ ] **Step 5: Redesign `Spinner.tsx`**

Replace the full contents of `frontend/src/components/ui/Spinner.tsx`:

```tsx
export default function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
    </div>
  );
}
```

- [ ] **Step 6: Redesign `ErrorBanner.tsx` with an icon**

Replace the full contents of `frontend/src/components/ui/ErrorBanner.tsx`:

```tsx
import { AlertCircle } from 'lucide-react';

export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Card.tsx frontend/src/components/ui/Field.tsx frontend/src/components/ui/Select.tsx frontend/src/components/ui/Spinner.tsx frontend/src/components/ui/ErrorBanner.tsx
git commit -m "$(cat <<'EOF'
Redesign core UI primitives with new design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: New UI primitives — Badge, EmptyState, Modal

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Create: `frontend/src/components/ui/Modal.tsx`
- Create: `frontend/src/lib/statusTone.ts`

**Interfaces:**
- Produces:
  - `Badge`: default export `Badge({ tone?: BadgeTone; children: ReactNode })`, named export `type BadgeTone = 'slate' | 'green' | 'blue' | 'amber' | 'red'` (default tone `'slate'`).
  - `EmptyState`: default export `EmptyState({ icon: ReactNode; title: string; description?: string; action?: ReactNode })`.
  - `Modal`: default export `Modal({ title: string; onClose: () => void; children: ReactNode })` — renders a centered overlay dialog, closes on Escape key or the close (×) button.
  - `statusTone`: named export `statusTone: Record<ExperimentStatus, BadgeTone>` — the single shared mapping from experiment status to badge color, used by both `ExperimentsListPage` (Task 9) and `OverviewPanel` (Task 10) instead of each redefining it.

- [ ] **Step 1: Create `Badge.tsx`**

```tsx
import type { ReactNode } from 'react';

export type BadgeTone = 'slate' | 'green' | 'blue' | 'amber' | 'red';

const toneClasses: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
};

const dotClasses: Record<BadgeTone, string> = {
  slate: 'bg-slate-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export default function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create `EmptyState.tsx`**

```tsx
import type { ReactNode } from 'react';

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create `Modal.tsx`**

```tsx
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/lib/statusTone.ts`**

```ts
import type { BadgeTone } from '../components/ui/Badge';
import type { ExperimentStatus } from '../types/api';

export const statusTone: Record<ExperimentStatus, BadgeTone> = {
  draft: 'slate',
  running: 'green',
  completed: 'blue',
  paused: 'amber',
  cancelled: 'red',
};
```

- [ ] **Step 5: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/EmptyState.tsx frontend/src/components/ui/Modal.tsx frontend/src/lib/statusTone.ts
git commit -m "$(cat <<'EOF'
Add Badge, EmptyState, and Modal UI primitives, and a shared status-tone map

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Expose username from the JWT in AuthContext

**Files:**
- Create: `frontend/src/api/jwt.ts`
- Modify: `frontend/src/context/AuthContext.tsx`

**Interfaces:**
- Produces: `decodeUsername(token: string): string | null` from `api/jwt.ts`. `useAuth()` now also returns `username: string | null` (the `sub` claim from the JWT, decoded client-side — the backend already puts the username in `sub`, see `backend/app/api/auth/dependency.py`; no backend change needed).

- [ ] **Step 1: Create `frontend/src/api/jwt.ts`**

```ts
export function decodeUsername(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Update `AuthContext.tsx` to expose `username`**

Replace the full contents of `frontend/src/context/AuthContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest, registerUser } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { decodeUsername } from '../api/jwt';
import { getToken, setToken as persistToken } from '../api/tokenStore';

interface AuthContextValue {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      persistToken(null);
      setTokenState(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    persistToken(response.access_token);
    setTokenState(response.access_token);
  };

  const register = async (username: string, email: string, password: string) => {
    await registerUser({ username, email, password });
    await login(username, password);
  };

  const logout = () => {
    persistToken(null);
    setTokenState(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: token !== null,
      username: token ? decodeUsername(token) : null,
      login,
      register,
      logout,
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/jwt.ts frontend/src/context/AuthContext.tsx
git commit -m "$(cat <<'EOF'
Expose decoded username from the JWT in AuthContext

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Build the public landing page

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `react-router-dom`'s `Link`, `lucide-react` icons (`ArrowRight`, `FlaskConical`, `BarChart3`, `LineChart`, `ShieldCheck`).
- Produces: default export `LandingPage()` — a self-contained page component, no props. Not yet wired into routing (Task 6 wires it).

- [ ] **Step 1: Create `frontend/src/pages/LandingPage.tsx`**

```tsx
import { ArrowRight, BarChart3, FlaskConical, LineChart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: FlaskConical,
    title: 'Plan with confidence',
    description:
      'Calculate the sample size or minimum detectable effect for any metric before you launch, so every test is powered correctly.',
  },
  {
    icon: BarChart3,
    title: 'Rigorous statistical analysis',
    description:
      'Two-proportion z-tests with a configurable significance level, uplift mode, and one- or two-sided testing — plus automatic sample-ratio-mismatch checks.',
  },
  {
    icon: LineChart,
    title: 'Track every experiment',
    description:
      'Organize metrics and variants per experiment, and keep a full history of analysis runs and their results.',
  },
  {
    icon: ShieldCheck,
    title: 'Guardrail metrics',
    description:
      'Mark metrics as primary or guardrail so you always know what a test is optimizing for — and what it must not break.',
  },
];

const steps = [
  {
    step: '1',
    title: 'Create an experiment',
    description: 'Define a hypothesis, add the metrics you care about, and set up your variants.',
  },
  {
    step: '2',
    title: 'Plan your sample size',
    description: 'Use the built-in calculators to know exactly how much data you need before you start.',
  },
  {
    step: '3',
    title: 'Run the analysis',
    description: 'Feed in results and get a statistically sound read on significance, uplift, and confidence.',
  },
];

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FlaskConical className="h-5 w-5 text-primary" />
          Experimentation Copilot
        </span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Run A/B tests that hold up to scrutiny
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
        Experimentation Copilot helps you plan, launch, and analyze experiments with proper statistical rigor
        — from sample-size calculators to significance testing, in one place.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Log in
        </Link>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-y border-slate-200 bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Everything you need to run a trustworthy test
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold text-slate-900">How it works</h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {steps.map(({ step, title, description }) => (
          <div key={step}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {step}
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-6xl px-6 text-sm text-slate-500">
        © {new Date().getFullYear()} Experimentation Copilot.
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LandingPage.tsx
git commit -m "$(cat <<'EOF'
Add public marketing landing page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Wire the landing page into routing

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `LandingPage` (Task 5), `useAuth` (Task 4/existing).
- Produces: `/` now renders `LandingPage` for unauthenticated visitors and redirects authenticated users to `/experiments`. All other routes unchanged.

- [ ] **Step 1: Update `App.tsx`**

Replace the full contents of `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import ExperimentDetailPage from './pages/ExperimentDetailPage';
import ExperimentsListPage from './pages/ExperimentsListPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import UploadPage from './pages/UploadPage';

function RootRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/experiments" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/experiments" element={<ExperimentsListPage />} />
              <Route path="/experiments/:experimentId" element={<ExperimentDetailPage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "$(cat <<'EOF'
Route '/' to the landing page, redirect authenticated users to /experiments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Restyle auth pages with a branded AuthLayout

**Files:**
- Create: `frontend/src/components/AuthLayout.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/pages/RegisterPage.tsx`

**Interfaces:**
- Produces: `AuthLayout({ title: string; subtitle: string; children: ReactNode })` — a split-panel wrapper (branded panel on `sm:` and up, stacked on mobile) used by both auth pages.

- [ ] **Step 1: Create `frontend/src/components/AuthLayout.tsx`**

```tsx
import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen sm:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-white sm:flex">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <FlaskConical className="h-6 w-6" />
          Experimentation Copilot
        </Link>
        <div>
          <p className="text-2xl font-semibold leading-snug">
            Plan, run, and analyze A/B tests with statistical rigor.
          </p>
          <p className="mt-3 text-primary-100">
            Sample-size calculators, significance testing, and experiment tracking in one place.
          </p>
        </div>
        <span className="text-sm text-primary-200">© {new Date().getFullYear()} Experimentation Copilot</span>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 sm:hidden">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FlaskConical className="h-6 w-6 text-primary" />
              Experimentation Copilot
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `LoginPage.tsx`**

Replace the full contents of `frontend/src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import Field from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/experiments');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to log in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue to your experiments.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          autoFocus
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <ErrorBanner message={error} />}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Update `RegisterPage.tsx`**

Replace the full contents of `frontend/src/pages/RegisterPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import Field from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate('/experiments');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to register.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start planning statistically sound experiments.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          autoFocus
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <ErrorBanner message={error} />}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AuthLayout.tsx frontend/src/pages/LoginPage.tsx frontend/src/pages/RegisterPage.tsx
git commit -m "$(cat <<'EOF'
Restyle login/register pages with a branded AuthLayout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Restyle the app shell (Layout / nav)

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `useAuth()` — now also destructures `username` (Task 4).

- [ ] **Step 1: Update `Layout.tsx`**

Replace the full contents of `frontend/src/components/Layout.tsx`:

```tsx
import { Beaker, FlaskConical, LogOut, Upload } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/experiments', label: 'Experiments', icon: Beaker },
  { to: '/upload', label: 'Upload', icon: Upload },
];

export default function Layout() {
  const { logout, username } = useAuth();
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FlaskConical className="h-5 w-5 text-primary" />
            Experimentation Copilot
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <div className="ml-3 flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary">
                {initial}
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "$(cat <<'EOF'
Restyle app shell nav with icons and a user avatar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Redesign the experiments list page with a "New experiment" modal

**Files:**
- Create: `frontend/src/components/ExperimentFormModal.tsx`
- Modify: `frontend/src/pages/ExperimentsListPage.tsx`

**Interfaces:**
- Consumes: `Modal`, `Badge`, `EmptyState`, `Button` (Tasks 2–3); `statusTone` (Task 3, `lib/statusTone.ts`); `createExperiment`/`listExperiments` (existing, unchanged).
- Produces: `ExperimentFormModal({ onClose: () => void })` — self-contained create-experiment form in a `Modal`, invalidates the `['experiments']` query on success and calls `onClose()`.

- [ ] **Step 1: Create `frontend/src/components/ExperimentFormModal.tsx`**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../api/client';
import { createExperiment } from '../api/experiments';
import Button from './ui/Button';
import ErrorBanner from './ui/ErrorBanner';
import Field from './ui/Field';
import Modal from './ui/Modal';

export default function ExperimentFormModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createExperiment(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <Modal title="New experiment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        <Field label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        {createMutation.isError && (
          <ErrorBanner message={getErrorMessage(createMutation.error, 'Failed to create experiment.')} />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create experiment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Update `ExperimentsListPage.tsx`**

Replace the full contents of `frontend/src/pages/ExperimentsListPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { Beaker, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { listExperiments } from '../api/experiments';
import ExperimentFormModal from '../components/ExperimentFormModal';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import { statusTone } from '../lib/statusTone';
import type { Experiment } from '../types/api';

export default function ExperimentsListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['experiments'],
    queryFn: listExperiments,
  });
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
          New experiment
        </Button>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load experiments.')} />}
      {data && data.experiments.length === 0 && (
        <EmptyState
          icon={<Beaker className="h-5 w-5" />}
          title="No experiments yet"
          description="Create your first experiment to start planning and analyzing an A/B test."
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
              New experiment
            </Button>
          }
        />
      )}
      {data && data.experiments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.experiments.map((experiment: Experiment) => (
            <Link
              key={experiment.id}
              to={`/experiments/${experiment.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{experiment.name}</p>
                <Badge tone={statusTone[experiment.status] ?? 'slate'}>{experiment.status}</Badge>
              </div>
              {experiment.hypothesis && (
                <p className="mt-2 truncate text-sm text-slate-500">{experiment.hypothesis}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showModal && <ExperimentFormModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ExperimentFormModal.tsx frontend/src/pages/ExperimentsListPage.tsx
git commit -m "$(cat <<'EOF'
Redesign experiments list as a card grid with a New Experiment modal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Restyle the experiment detail page tab bar and OverviewPanel

**Files:**
- Modify: `frontend/src/pages/ExperimentDetailPage.tsx`
- Modify: `frontend/src/pages/experiment/OverviewPanel.tsx`

**Interfaces:**
- Consumes: `Badge` and `statusTone` (Task 3, `lib/statusTone.ts`) — the same shared mapping used in Task 9.

- [ ] **Step 1: Update `ExperimentDetailPage.tsx`**

Replace the full contents of `frontend/src/pages/ExperimentDetailPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Calculator, ClipboardList, Layers, LineChart } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { getExperiment } from '../api/experiments';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import AnalysisPanel from './experiment/AnalysisPanel';
import MetricsPanel from './experiment/MetricsPanel';
import OverviewPanel from './experiment/OverviewPanel';
import PlanningPanel from './experiment/PlanningPanel';
import VariantsPanel from './experiment/VariantsPanel';

const tabs = [
  { key: 'overview', label: 'Overview', icon: ClipboardList },
  { key: 'metrics', label: 'Metrics', icon: LineChart },
  { key: 'variants', label: 'Variants', icon: Layers },
  { key: 'planning', label: 'Planning', icon: Calculator },
  { key: 'analysis', label: 'Analysis', icon: BarChart3 },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function ExperimentDetailPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const id = Number(experimentId);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['experiments', id],
    queryFn: () => getExperiment(id),
    enabled: Number.isFinite(id),
  });

  if (!Number.isFinite(id)) {
    return <ErrorBanner message="Invalid experiment id." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/experiments"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to experiments
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {data ? data.experiment.name : isLoading ? 'Loading…' : 'Experiment'}
        </h1>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load experiment.')} />}

      {data && (
        <>
          <div className="flex gap-1 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewPanel experiment={data.experiment} />}
          {activeTab === 'metrics' && <MetricsPanel experimentId={id} />}
          {activeTab === 'variants' && <VariantsPanel experimentId={id} />}
          {activeTab === 'planning' && <PlanningPanel experimentId={id} />}
          {activeTab === 'analysis' && <AnalysisPanel experimentId={id} />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `OverviewPanel.tsx`**

Replace the full contents of `frontend/src/pages/experiment/OverviewPanel.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { deleteExperiment } from '../../api/experiments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { statusTone } from '../../lib/statusTone';
import type { Experiment } from '../../types/api';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function OverviewPanel({ experiment }: { experiment: Experiment }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteExperiment(experiment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      navigate('/experiments');
    },
    onError: (err) => setError(getErrorMessage(err, 'Failed to delete experiment.')),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete experiment "${experiment.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const fields: Array<[string, string]> = [
    ['Hypothesis', experiment.hypothesis ?? '—'],
    ['Unit of randomization', experiment.unit_of_randomization ?? '—'],
    ['Start date', experiment.start_date ?? '—'],
    ['End date', experiment.end_date ?? '—'],
    ['Created', formatDate(experiment.created_at)],
  ];

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-sm font-medium text-slate-500">Status</span>
        <Badge tone={statusTone[experiment.status] ?? 'slate'}>{experiment.status}</Badge>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="mt-6 border-t border-slate-100 pt-6">
        <Button
          variant="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete experiment'}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ExperimentDetailPage.tsx frontend/src/pages/experiment/OverviewPanel.tsx
git commit -m "$(cat <<'EOF'
Restyle experiment detail tab bar and overview panel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Restyle MetricsPanel and VariantsPanel

**Files:**
- Modify: `frontend/src/pages/experiment/MetricsPanel.tsx`
- Modify: `frontend/src/pages/experiment/VariantsPanel.tsx`

**Interfaces:**
- Consumes: `Badge`, `EmptyState` (Task 3).

- [ ] **Step 1: Update `MetricsPanel.tsx`**

Replace the full contents of `frontend/src/pages/experiment/MetricsPanel.tsx`:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { createMetric, deleteMetric, listMetrics } from '../../api/experiments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import type { Metric, MetricDirection, MetricType } from '../../types/api';

export default function MetricsPanel({ experimentId }: { experimentId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ['experiments', experimentId, 'metrics'];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => listMetrics(experimentId),
  });

  const [name, setName] = useState('');
  const [type, setType] = useState<MetricType>('binary');
  const [direction, setDirection] = useState<MetricDirection>('up');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isGuardrail, setIsGuardrail] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createMetric(experimentId, {
        metric_name: name,
        metric_type: type,
        metric_direction: direction,
        is_primary: isPrimary,
        is_guardrail: isGuardrail,
      }),
    onSuccess: () => {
      setName('');
      setIsPrimary(false);
      setIsGuardrail(false);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Failed to create metric.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (metricId: number) => deleteMetric(experimentId, metricId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isPrimary && isGuardrail) {
      setFormError('A metric cannot be both primary and guardrail.');
      return;
    }
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Add metric</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value as MetricType)}>
            <option value="binary">Binary</option>
            <option value="continuous">Continuous</option>
          </Select>
          <Select
            label="Direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value as MetricDirection)}
          >
            <option value="up">Up is good</option>
            <option value="down">Down is good</option>
            <option value="neutral">Neutral</option>
          </Select>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-100"
              />
              Primary
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isGuardrail}
                onChange={(event) => setIsGuardrail(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-100"
              />
              Guardrail
            </label>
          </div>
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add metric'}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load metrics.')} />}
      {data && data.metrics.length === 0 && (
        <EmptyState
          icon={<LineChart className="h-5 w-5" />}
          title="No metrics yet"
          description="Add a metric above to start tracking it for this experiment."
        />
      )}
      {data && data.metrics.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data.metrics.map((metric: Metric) => (
            <li key={metric.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{metric.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    {metric.type} · {metric.direction}
                  </span>
                  {metric.is_primary && <Badge tone="blue">primary</Badge>}
                  {metric.is_guardrail && <Badge tone="amber">guardrail</Badge>}
                </div>
              </div>
              <Button
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => deleteMutation.mutate(metric.id)}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `VariantsPanel.tsx`**

Replace the full contents of `frontend/src/pages/experiment/VariantsPanel.tsx`:

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { createVariant, deleteVariant, listVariants } from '../../api/experiments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Spinner from '../../components/ui/Spinner';
import type { Variant } from '../../types/api';

export default function VariantsPanel({ experimentId }: { experimentId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ['experiments', experimentId, 'variants'];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => listVariants(experimentId),
  });

  const [name, setName] = useState('');
  const [isControl, setIsControl] = useState(false);
  const [allocation, setAllocation] = useState(50);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createVariant(experimentId, {
        variant_name: name,
        is_control: isControl,
        allocation_percentage: allocation,
      }),
    onSuccess: () => {
      setName('');
      setIsControl(false);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Failed to create variant.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: number) => deleteVariant(experimentId, variantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (allocation < 0 || allocation > 100) {
      setFormError('Allocation percentage must be between 0 and 100.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Add variant</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Field
            label="Allocation %"
            type="number"
            min={0}
            max={100}
            value={allocation}
            onChange={(event) => setAllocation(Number(event.target.value))}
          />
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isControl}
              onChange={(event) => setIsControl(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-100"
            />
            Control
          </label>
          {formError && (
            <div className="sm:col-span-3">
              <ErrorBanner message={formError} />
            </div>
          )}
          <div className="sm:col-span-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add variant'}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load variants.')} />}
      {data && data.variants.length === 0 && (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No variants yet"
          description="Add a variant above, such as a control and a treatment."
        />
      )}
      {data && data.variants.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data.variants.map((variant: Variant) => (
            <li key={variant.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  {variant.name}
                  {variant.is_control && <Badge tone="slate">control</Badge>}
                </p>
                <p className="mt-1 text-xs text-slate-500">{variant.allocation_percentage}% allocation</p>
              </div>
              <Button
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => deleteMutation.mutate(variant.id)}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/experiment/MetricsPanel.tsx frontend/src/pages/experiment/VariantsPanel.tsx
git commit -m "$(cat <<'EOF'
Restyle metrics and variants panels with Badge and EmptyState

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Restyle PlanningPanel and AnalysisPanel

**Files:**
- Modify: `frontend/src/pages/experiment/PlanningPanel.tsx`
- Modify: `frontend/src/pages/experiment/AnalysisPanel.tsx`

**Interfaces:**
- Consumes: `Badge`/`BadgeTone` (Task 3). `AnalysisRunStatus` type from `api/analysisRuns.ts` (existing: `{ id: number; status: string; error?: string | null }`) — unchanged.

- [ ] **Step 1: Update `PlanningPanel.tsx`**

Replace the full contents of `frontend/src/pages/experiment/PlanningPanel.tsx`:

```tsx
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { calculateMde, calculateSampleSize } from '../../api/experiments';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-lg bg-primary-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary-700">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary-900">{value}</p>
    </div>
  );
}

export default function PlanningPanel({ experimentId }: { experimentId: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <SampleSizeCard experimentId={experimentId} />
      <MdeCard experimentId={experimentId} />
    </div>
  );
}

function SampleSizeCard({ experimentId }: { experimentId: number }) {
  const [metricId, setMetricId] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [effectSize, setEffectSize] = useState(0.05);
  const [baseRate, setBaseRate] = useState(0.5);

  const mutation = useMutation({
    mutationFn: () =>
      calculateSampleSize(experimentId, {
        metric_id: Number(metricId),
        alpha,
        power,
        effect_size: effectSize,
        base_rate: baseRate,
      }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!metricId) return;
    mutation.mutate();
  };

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Sample size calculator</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Metric ID"
          type="number"
          value={metricId}
          onChange={(event) => setMetricId(event.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Alpha"
            type="number"
            step="0.01"
            value={alpha}
            onChange={(event) => setAlpha(Number(event.target.value))}
          />
          <Field
            label="Power"
            type="number"
            step="0.01"
            value={power}
            onChange={(event) => setPower(Number(event.target.value))}
          />
          <Field
            label="Effect size"
            type="number"
            step="0.01"
            value={effectSize}
            onChange={(event) => setEffectSize(Number(event.target.value))}
          />
          <Field
            label="Base rate"
            type="number"
            step="0.01"
            value={baseRate}
            onChange={(event) => setBaseRate(Number(event.target.value))}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Calculating…' : 'Calculate'}
        </Button>
        {mutation.isError && <ErrorBanner message={getErrorMessage(mutation.error, 'Calculation failed.')} />}
        {mutation.isSuccess && (
          <ResultStat label="Required sample size per variant" value={String(mutation.data.sample_size)} />
        )}
      </form>
    </Card>
  );
}

function MdeCard({ experimentId }: { experimentId: number }) {
  const [metricId, setMetricId] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [sampleSize, setSampleSize] = useState(1000);
  const [baseRate, setBaseRate] = useState(0.5);

  const mutation = useMutation({
    mutationFn: () =>
      calculateMde(experimentId, {
        metric_id: Number(metricId),
        alpha,
        power,
        sample_size: sampleSize,
        base_rate: baseRate,
      }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!metricId) return;
    mutation.mutate();
  };

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Minimum detectable effect</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Metric ID"
          type="number"
          value={metricId}
          onChange={(event) => setMetricId(event.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Alpha"
            type="number"
            step="0.01"
            value={alpha}
            onChange={(event) => setAlpha(Number(event.target.value))}
          />
          <Field
            label="Power"
            type="number"
            step="0.01"
            value={power}
            onChange={(event) => setPower(Number(event.target.value))}
          />
          <Field
            label="Sample size"
            type="number"
            value={sampleSize}
            onChange={(event) => setSampleSize(Number(event.target.value))}
          />
          <Field
            label="Base rate"
            type="number"
            step="0.01"
            value={baseRate}
            onChange={(event) => setBaseRate(Number(event.target.value))}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Calculating…' : 'Calculate'}
        </Button>
        {mutation.isError && <ErrorBanner message={getErrorMessage(mutation.error, 'Calculation failed.')} />}
        {mutation.isSuccess && (
          <ResultStat
            label="Minimum detectable effect"
            value={mutation.data.minimum_detectable_effect.toFixed(4)}
          />
        )}
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Update `AnalysisPanel.tsx`**

Replace the full contents of `frontend/src/pages/experiment/AnalysisPanel.tsx`:

```tsx
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getAnalysisRunStatus } from '../../api/analysisRuns';
import { getErrorMessage } from '../../api/client';
import { runAnalysis } from '../../api/experiments';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Select from '../../components/ui/Select';
import type { TestType, UpliftMode } from '../../types/api';

function statusTone(status: string): BadgeTone {
  const value = status.toLowerCase();
  if (value.includes('success') || value.includes('complete')) return 'green';
  if (value.includes('fail') || value.includes('error')) return 'red';
  if (value.includes('pending') || value.includes('start') || value.includes('progress')) return 'amber';
  return 'slate';
}

export default function AnalysisPanel({ experimentId }: { experimentId: number }) {
  const [metricId, setMetricId] = useState('');
  const [variantASuccesses, setVariantASuccesses] = useState('');
  const [variantATotal, setVariantATotal] = useState('');
  const [variantBSuccesses, setVariantBSuccesses] = useState('');
  const [variantBTotal, setVariantBTotal] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [upliftMode, setUpliftMode] = useState<UpliftMode>('absolute');
  const [testType, setTestType] = useState<TestType>('two-sided');

  const runMutation = useMutation({
    mutationFn: () =>
      runAnalysis(experimentId, {
        metric_id: Number(metricId),
        variant_a_successes: Number(variantASuccesses),
        variant_a_total: Number(variantATotal),
        variant_b_successes: Number(variantBSuccesses),
        variant_b_total: Number(variantBTotal),
        alpha,
        uplift_mode: upliftMode,
        test_type: testType,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (analysisRunId: number) => getAnalysisRunStatus(analysisRunId),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Run analysis</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Metric ID"
              type="number"
              value={metricId}
              onChange={(event) => setMetricId(event.target.value)}
              required
            />
            <Field
              label="Alpha"
              type="number"
              step="0.01"
              value={alpha}
              onChange={(event) => setAlpha(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Variant A successes"
                type="number"
                value={variantASuccesses}
                onChange={(event) => setVariantASuccesses(event.target.value)}
                required
              />
              <Field
                label="Variant A total"
                type="number"
                value={variantATotal}
                onChange={(event) => setVariantATotal(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Variant B successes"
                type="number"
                value={variantBSuccesses}
                onChange={(event) => setVariantBSuccesses(event.target.value)}
                required
              />
              <Field
                label="Variant B total"
                type="number"
                value={variantBTotal}
                onChange={(event) => setVariantBTotal(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Uplift mode"
              value={upliftMode}
              onChange={(event) => setUpliftMode(event.target.value as UpliftMode)}
            >
              <option value="absolute">Absolute</option>
              <option value="relative">Relative</option>
            </Select>
            <Select
              label="Test type"
              value={testType}
              onChange={(event) => setTestType(event.target.value as TestType)}
            >
              <option value="two-sided">Two-sided</option>
              <option value="one-sided">One-sided</option>
            </Select>
          </div>
          <Button type="submit" disabled={runMutation.isPending}>
            {runMutation.isPending ? 'Starting…' : 'Run analysis'}
          </Button>
          {runMutation.isError && (
            <ErrorBanner message={getErrorMessage(runMutation.error, 'Failed to start analysis.')} />
          )}
          {runMutation.isSuccess && (
            <p className="text-sm text-slate-700">
              Started run <span className="font-semibold">#{runMutation.data.analysis_run_id}</span> (task{' '}
              {runMutation.data.task_id})
            </p>
          )}
        </form>
      </Card>

      {runMutation.isSuccess && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Check status</h3>
          <Button
            variant="secondary"
            onClick={() => statusMutation.mutate(runMutation.data.analysis_run_id)}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? 'Checking…' : 'Refresh status'}
          </Button>
          {statusMutation.isError && (
            <div className="mt-4">
              <ErrorBanner message={getErrorMessage(statusMutation.error, 'Failed to fetch status.')} />
            </div>
          )}
          {statusMutation.isSuccess && (
            <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Run ID</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">#{statusMutation.data.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge tone={statusTone(statusMutation.data.status)}>{statusMutation.data.status}</Badge>
                </dd>
              </div>
              {statusMutation.data.error && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Error</dt>
                  <dd className="mt-1 text-sm text-red-700">{statusMutation.data.error}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/experiment/PlanningPanel.tsx frontend/src/pages/experiment/AnalysisPanel.tsx
git commit -m "$(cat <<'EOF'
Restyle planning calculators and analysis status result display

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Restyle UploadPage and NotFoundPage

**Files:**
- Modify: `frontend/src/pages/UploadPage.tsx`
- Modify: `frontend/src/pages/NotFoundPage.tsx`

**Interfaces:**
- Consumes: `EmptyState` (Task 3).

- [ ] **Step 1: Update `UploadPage.tsx`**

Replace the full contents of `frontend/src/pages/UploadPage.tsx`:

```tsx
import { UploadCloud } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function UploadPage() {
  return (
    <EmptyState
      icon={<UploadCloud className="h-5 w-5" />}
      title="Upload analysis data"
      description="CSV upload isn't available yet — the backend doesn't expose an upload endpoint. This page is a placeholder for when that lands."
    />
  );
}
```

- [ ] **Step 2: Update `NotFoundPage.tsx`**

Replace the full contents of `frontend/src/pages/NotFoundPage.tsx`:

```tsx
import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <FlaskConical className="h-10 w-10 text-primary" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        Back home
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
"/mnt/c/Program Files/nodejs/node.exe" node_modules/typescript/bin/tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/UploadPage.tsx frontend/src/pages/NotFoundPage.tsx
git commit -m "$(cat <<'EOF'
Restyle upload placeholder and 404 pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Full Docker build and manual verification walkthrough

**Files:** none (verification-only task).

- [ ] **Step 1: Build and start the full stack**

From the repo root:

```bash
docker compose up --build
```

Expected: `postgres`, `redis`, `migrate` (one-shot, exits 0), `api`, `worker`, and `frontend` containers all start without errors. The `frontend` service build must succeed (this exercises the exact Vite production build the host shell couldn't run directly).

- [ ] **Step 2: Manual walkthrough in a browser at `http://localhost:3000`**

Confirm, in order:
1. Logged out, visiting `/` shows the new landing page (header with Log in/Sign up, hero, features, how-it-works, footer) — not a redirect to `/login`.
2. Click "Sign up" → register a new account → redirected to `/experiments`.
3. Log out → confirm redirect back to the landing page at `/` (not `/login`).
4. Log back in via `/login`.
5. On `/experiments`: empty state shows if no experiments exist; click "New experiment" → modal opens → create one → modal closes and the new experiment appears as a card with a status badge.
6. Open the experiment → tab bar shows icons for Overview/Metrics/Variants/Planning/Analysis.
7. Overview tab: status badge and metadata grid render; delete button present.
8. Metrics tab: add a metric → appears in the list with primary/guardrail badges if set; empty state shows before any are added.
9. Variants tab: add a variant → appears in the list with a control badge if set.
10. Planning tab: run both calculators → results render as a stat block.
11. Analysis tab: run an analysis, then "Refresh status" → status renders as a badge in a key/value block (not raw JSON).
12. Delete the experiment from the Overview tab → redirected to `/experiments`, experiment gone.
13. Visit an unknown path (e.g. `/nonexistent`) → styled 404 page with a "Back home" link.

- [ ] **Step 3: Responsive check**

Resize the browser (or use devtools device emulation) to a mobile width (~375px) and confirm:
- The landing page hero/features/how-it-works sections stack cleanly with no horizontal overflow.
- The experiments card grid collapses to a single column.
- `AuthLayout`'s branded side panel hides on mobile (per its `sm:flex`/`sm:hidden` classes) and the form remains centered and usable.

- [ ] **Step 4: Tear down**

```bash
docker compose down -v
```

- [ ] **Step 5: Report**

If every check in Steps 2–3 passes, the redesign is complete — no further commit needed for this task (it's verification-only). If anything fails, fix it in the relevant task's files, re-run Steps 1–3, and commit the fix with a `fix:`-style message before considering the plan done.
