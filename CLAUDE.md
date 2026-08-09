# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Experimentation Copilot: a B2B A/B-testing platform. FastAPI + Celery backend for planning experiments, running statistical analysis, and storing results in Postgres; a React/Vite frontend for creating experiments, uploading data, and viewing results.

## Commands

### Docker (whole stack)

```
docker compose up --build   # postgres, redis, migrate (one-shot), api, worker, frontend
docker compose down -v      # stop and drop the postgres volume
```

Frontend on :3000, API on :8000. Config is env-var driven with working defaults (see root `.env.example`); copy it to `.env` to override.

### Backend (`backend/`, Python 3.12, managed with `uv`)

```
uv sync                                                    # install/sync dependencies
uv run fastapi dev app/main.py                             # run the API (serves on :8000)
uv run celery -A app.tasks.worker.celery_app worker --loglevel=info   # run the analysis worker
uv run alembic revision --autogenerate -m "message"         # create a migration
uv run alembic upgrade head                                 # apply migrations
```

The API requires Postgres at `DATABASE_URL` and the worker requires Redis at `REDIS_URL`/`REDIS_BACKEND_URL` (see `backend/.env.example`). There is no test suite or lint/format config in the repo currently.

`celery` is declared as `celery[redis]` in `pyproject.toml` — plain `celery` does *not* pull in the `redis` Python package, and Kombu's Redis transport fails at import time (`AttributeError: 'NoneType' object has no attribute 'Redis'`) without it. Easy to miss because nothing exercises the real Redis transport unless you actually run the worker against a real broker (see the verification section below).

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

**Async analysis pipeline**: `POST /api/experiments/{id}/run-analysis` generates a `task_id` itself, persists the `Analysis_Run` row with it first, then dispatches the Celery task via `apply_async(..., task_id=task_id)` — in that order, so a worker that picks up the task immediately always finds a matching row instead of racing the commit. `app/tasks/worker.py::run_analysis` computes results via `app/stats/` and writes the `Analysis_Run`/`Summary` rows back via `_update_analysis_status`, which creates and disposes its **own** `AsyncEngine` (`NullPool`) per call rather than reusing `app.db.session.engine`. This isn't optional: `run_analysis` calls it through a fresh `asyncio.run(...)` every time, asyncpg connections are bound to the event loop that created them, and Celery's default `prefork` pool forks worker processes on top of that — sharing one engine/pool across separate `asyncio.run()` calls (or across forked processes) fails with "attached to a different loop" the moment it tries to actually use a pooled connection. Clients poll `GET /api/analysis-runs/{id}` for status.

**Model registry gotcha**: several models reference each other only via string forward-references (`Field(foreign_key="experiment.id")`, `Relationship(sa_relationship=relationship("Variant", ...))`, `owner: "User" = Relationship(...)`), which SQLAlchemy resolves lazily against whatever's registered in the process *at that point* — not against the database. A module that only imports the one or two models it directly touches (e.g. the Celery worker importing just `Analysis_Run`/`Summary`) can run fine until it hits a flush/query that needs a relationship or FK pointing at a model nobody in that process ever imported, then fails with `NoReferencedTableError` or "failed to locate a name" deep inside SQLAlchemy internals, nowhere near the actual missing import. `app/db/models/__init__.py` imports every model for exactly this reason — Python always runs a package's `__init__.py` before any of its submodules, so importing even one model from anywhere (`from app.db.models.analysis_model import Analysis_Run`) transitively registers all of them. Prefer importing from the models you need normally; the point is that `app/db/models/__init__.py` must keep importing everything, not that call sites need to.

**Stats module** (`app/stats/`) is pure/stateless, split by concern:
- `calculators.py` — sample-size and MDE (power) calculations.
- `stat_analysis.py` — two-proportion z-test primitives: significance, p-value, confidence interval, uplift, and sample-ratio-mismatch (SRM) check.
- `summary.py` — `decision_summary` composes the `stat_analysis` primitives into one decision dict and a human-readable text verdict (SRM check first, then significance/CI, then uplift direction).

**Auth**: bcrypt password hashing + JWT bearer tokens (`python-jose`), issued from `POST /api/auth/token` (`OAuth2PasswordRequestForm`) and validated per-request by `get_current_user`.

**Migrations**: Alembic with an async engine, autogenerating off `SQLModel.metadata`. `migrations/env.py` imports every model so autogenerate sees the full schema — it originally only imported `Experiment`/`User`, silently missing `Metric`/`Variant`/`Analysis_Run`/`Summary` for three migrations' worth of history; the fix-up migration (`7d771e25734d_...`) creates all four tables plus `experiment.description` in one shot.

**CORS**: `app/main.py` adds `CORSMiddleware` allowing the origins in `CORS_ORIGINS` (comma-separated, defaults to `http://localhost:3000`) — required for the browser-based frontend to call the API cross-origin (different port = different origin).

**Frontend** (`frontend/src/`): routed with `react-router-dom` behind `ProtectedRoute` (redirects to `/login` when unauthenticated). `context/AuthContext.tsx` holds the JWT (persisted via `api/tokenStore.ts`) and is wired to `api/client.ts`'s 401 handler so an expired/invalid token logs the user out automatically. All backend calls go through `api/client.ts::apiRequest` (adds the `Authorization` header, throws a typed `ApiError`); `api/auth.ts`, `api/experiments.ts`, and `api/analysisRuns.ts` wrap the specific endpoints and mirror the backend's actual query-param/body/response shapes (verified against the live OpenAPI schema, not just the route source — several routes take query params where you'd expect a JSON body, e.g. `POST /api/experiments/`). `pages/ExperimentDetailPage.tsx` is tabbed (Overview/Metrics/Variants/Planning/Analysis), with each tab in `pages/experiment/`. Planning and Analysis take a raw metric ID rather than a dropdown (built before the metrics-list endpoint was fixed; still simpler than round-tripping a fetch just to populate a `<select>`). `pages/UploadPage.tsx` is a stub — there is no backend upload endpoint yet.

## Verifying the backend end-to-end without a persistent Postgres/Redis

The full flow (auth → experiment/metric/variant CRUD → planning → run-analysis → poll → summary/result, including cascade deletes) can be exercised without standing up real infrastructure:

- An ephemeral Postgres via the `pgserver` PyPI package (`uv run --with pgserver python -c "import pgserver; db = pgserver.get_server('/some/tmp/dir'); print(db.get_uri())"` — ships real Postgres binaries, no system install or Docker needed) gives a real `postgresql+asyncpg://` DSN to run `alembic upgrade head` and the app against.
- The Celery worker can be tested without Redis by calling `run_analysis.apply(args=..., task_id=...)` instead of `.delay()`/`.apply_async()` — `.apply()` executes the task body synchronously with no broker at all. Run it in a real OS thread (not just `await`ed inline), since the task body calls `asyncio.run(...)` internally, matching how a real, separate Celery worker process behaves; calling it inline from the same event loop driving the test's HTTP client raises "cannot be called from a running event loop." Give that thread its own SQLAlchemy engine (`NullPool`) rather than reusing the app's shared `engine` — asyncpg connections aren't safe to use across event loops, and sharing the pool across threads corrupts it for later requests on the main loop.
- `httpx.AsyncClient(transport=httpx.ASGITransport(app=app), ...)` drives real requests through the full FastAPI app in-process (auth, serialization, everything) without binding a port.

This combination is how the current backend was actually verified (not just read) after the last round of bug fixes — worth reaching for again before trusting that a backend change works, since this codebase has a track record of bugs that only surface at runtime (wrong kwarg names, type mismatches, response-model mismatches) rather than at import time.

**Caveat**: that `.apply()`-in-a-thread technique gives the task its own thread (no pre-existing event loop) and, in the version used to verify this, its own `NullPool` engine — which happens to sidestep both the missing-`celery[redis]` dependency (no broker is ever touched) *and* the shared-engine-across-event-loops bug, since it never shares an engine with anything else either. Both of those were real, and only surfaced when the worker was actually run via `docker compose up` against a real Redis broker with Celery's default `prefork` pool. The `pgserver` + `ASGITransport` combination is great for exercising route logic and DB writes quickly, but it is not a substitute for actually running `docker compose up --build` (or `celery worker` against a real broker) before believing the analysis pipeline works — the last two bugs in this file were both invisible to the in-process technique and only found that way.
