# Experimentation Copilot Frontend

React + TypeScript frontend for the Experimentation Copilot platform, built with Vite.

See the [root README](../README.md) for the full stack quickstart (Docker or manual), and [CLAUDE.md](../CLAUDE.md) for architecture details.

## Features

- **Auth**: register/login, JWT persisted client-side, protected routes.
- **Experiments**: create, list, and manage experiments.
- **Metrics & Variants**: define per-experiment metrics and variants.
- **Planning**: sample-size and minimum-detectable-effect calculators.
- **Analysis**: run the statistical analysis pipeline and view results.
- **Upload**: placeholder page — the backend doesn't have an upload endpoint yet.

## Technologies

- **React** + **TypeScript**
- **Vite** for dev server and builds
- **TanStack Query** for server state
- **react-router-dom** for routing
- **Tailwind CSS** for styling

## Getting started

```bash
npm install
npm run dev
```

Runs on http://localhost:3000 and expects the API at `http://localhost:8000` by default — override with `VITE_API_URL` (see `.env.example`).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + production build
- `npm run serve` — preview a production build locally

## Folder structure

```
src/
├── api/            typed fetch client + per-resource API calls
├── components/     shared UI (Layout, ProtectedRoute, ui/ primitives)
├── context/        AuthContext (token, login/register/logout)
├── pages/          route-level pages, experiment/ tabs under pages/experiment/
├── types/          TypeScript types mirroring the backend's schemas
└── styles/         Tailwind entry point
```
