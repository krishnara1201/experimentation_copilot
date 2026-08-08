# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Experimentation Copilot: a B2B A/B-testing platform. FastAPI + Celery backend for planning experiments, running statistical analysis, and storing results in Postgres; a React/Vite frontend for creating experiments, uploading data, and viewing results.

## Commands

### Backend (`backend/`, Python 3.12, managed with `uv`)

```
uv sync                                                    # install/sync dependencies
uv run fastapi dev app/main.py                             # run the API (serves on :8000)
uv run celery -A app.tasks.worker.celery_app worker --loglevel=info   # run the analysis worker
uv run alembic revision --autogenerate -m "message"         # create a migration
uv run alembic upgrade head                                 # apply migrations
```

The API requires Postgres at `DATABASE_URL` and the worker requires Redis at `REDIS_URL`/`REDIS_BACKEND_URL` (see `backend/.env`). There is no test suite or lint/format config in the repo currently.

### Frontend (`frontend/`, React + TypeScript, Vite)

```
npm install
npm run dev         # Vite dev server on :3000
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build
npm run serve       # preview a production build
```

The API base URL defaults to `http://localhost:8000`; override it by copying `.env.example` to `.env` and setting `VITE_API_URL`. No lint or test scripts are configured yet.

## Architecture

**Request flow**: routes in `app/api/routes/*.py` depend on `get_current_user` (`app/api/auth/dependency.py`, decodes the JWT bearer token and loads the `User` row) and `get_session` (`app/db/session.py`, yields an async SQLModel session) and query Postgres directly — there is no service/repository layer.

**Domain model** (`app/db/models/`): a `User` owns `Experiment`s; an `Experiment` has many `Metric`s and `Variant`s; an `Analysis_Run` represents one async statistics job for an `Experiment`; a `Summary` holds the JSON + text result of a completed `Analysis_Run`.

**Async analysis pipeline**: `POST /api/experiments/{id}/run-analysis` enqueues a Celery task (`app/tasks/worker.py::run_analysis`). The task computes results via `app/stats/` and writes the `Analysis_Run`/`Summary` rows back using its own fresh `AsyncSession` on the shared `engine` (not the original request's session, since the worker runs in a separate process). Clients poll `GET /api/analysis-runs/{id}` for status.

**Stats module** (`app/stats/`) is pure/stateless, split by concern:
- `calculators.py` — sample-size and MDE (power) calculations.
- `stat_analysis.py` — two-proportion z-test primitives: significance, p-value, confidence interval, uplift, and sample-ratio-mismatch (SRM) check.
- `summary.py` — `decision_summary` composes the `stat_analysis` primitives into one decision dict and a human-readable text verdict (SRM check first, then significance/CI, then uplift direction).

**Auth**: bcrypt password hashing + JWT bearer tokens (`python-jose`), issued from `POST /api/auth/token` (`OAuth2PasswordRequestForm`) and validated per-request by `get_current_user`.

**Migrations**: Alembic with an async engine, autogenerating off `SQLModel.metadata`. `migrations/env.py` only imports the `Experiment` and `User` models — `Metric`, `Variant`, `Analysis_Run`, and `Summary` need to be imported there too or autogenerate won't see changes to those tables.

**Frontend** (`frontend/src/`): routed with `react-router-dom` behind `ProtectedRoute` (redirects to `/login` when unauthenticated). `context/AuthContext.tsx` holds the JWT (persisted via `api/tokenStore.ts`) and is wired to `api/client.ts`'s 401 handler so an expired/invalid token logs the user out automatically. All backend calls go through `api/client.ts::apiRequest` (adds the `Authorization` header, throws a typed `ApiError`); `api/auth.ts`, `api/experiments.ts`, and `api/analysisRuns.ts` wrap the specific endpoints and mirror the backend's actual query-param/body/response shapes (verified against the live OpenAPI schema, not just the route source — several routes take query params where you'd expect a JSON body, e.g. `POST /api/experiments/`). `pages/ExperimentDetailPage.tsx` is tabbed (Overview/Metrics/Variants/Planning/Analysis), with each tab in `pages/experiment/`. Planning and Analysis take a raw metric ID rather than a dropdown, since the metrics-list endpoint is one of the broken ones below. `pages/UploadPage.tsx` is a stub — there is no backend upload endpoint yet.

## Known rough edges

Two enum bugs used to crash the app at import time — `Metric.type`'s default was `Metric_type.binary` (lowercase; the enum member is `BINARY`) and the metrics-creation route defaulted to a nonexistent `Metric_type.NUMERIC`. Both are fixed, so the app now imports and boots cleanly (verified with `uv run python -c "import app.main"` and a live `/openapi.json` fetch — no Postgres/Redis needed for that much).

The rest of these are still open and will surface as runtime errors rather than at import time — worth knowing before you assume you (or the frontend) broke something:

- `Analysis_Run` (`db/models/analysis_model.py`) has no `task_id` or `error` field, but `experiments.py` and `worker.py` read/write `task_id`, and `worker.py`/`analysis.py` read/write `.error` (the actual field is `error_message`). This means `POST /{experiment_id}/run-analysis` 500s when it tries to construct `Analysis_Run(..., task_id=...)`.
- `Summary` has `summary_json`, not `summary_data` — `worker.py` and `app/api/routes/analysis.py` use `summary_data`.
- `decision_summary.__init__` (`stats/summary.py`) takes `mode=`, but `worker.py` calls it with `uplift_mode=`.
- `decision_summary.generate_summary_text()` reads `self.summary["ci_lower"]`/`["ci_upper"]`, but `generate_summary()` actually nests them under `summary["confidence_interval"]["lower"/"upper"]`.
- `poll_status` (`GET /api/analysis-runs/{analysis_run_id}`) declares `response_model=list[Summary]` but returns a single dict — FastAPI response validation will reject it.
- `Experiment.variants` (`db/models/experiment_model.py`) is wired to the `Metric` class instead of `Variant`.
- `create_experiment` passes `description=` into `Experiment(...)`, which has no such field (it has `hypothesis` instead) — the same mismatch breaks `update_experiment` (`PATCH /{experiment_id}`), which assigns `experiment_details.description`.
- `get_all_metrics`/`get_metric` filter on `Metric.owner_id`, which doesn't exist on the `Metric` model — both 500.

Net effect: experiment CRUD (create/list/get/delete), variant CRUD, and the sample-size/MDE calculators work end-to-end against a live Postgres. Metric list/get, experiment update, and the entire run-analysis → poll → summary/result pipeline do not, until the bugs above are fixed. The frontend (`frontend/src/`) is built against the correct/intended contracts regardless, so it's ready to go once these are fixed — errors from the broken endpoints surface as an in-app error banner rather than a crash.
