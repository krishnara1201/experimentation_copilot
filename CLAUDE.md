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

### Frontend (`frontend/`)

```
npm install
npm run dev       # Vite dev server on :3000
npm run build
npm run serve     # preview a production build
```

No lint or test scripts are configured yet.

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

**Frontend**: single-page app (`src/App.tsx`) routed with `react-router-dom`: auth (`Login`/`Register`), `CreateExperimentWizard`, `ExperimentsList`, `PlanningPage` (sample-size/MDE tools), `UploadPage`, `ResultsDashboard`, `SummaryPage`. Server state goes through TanStack Query; charts use Plotly and Recharts (`src/components/Charts/`). API calls are centralized in `src/services/api.ts`.

## Known rough edges

This codebase is early-stage and has several cross-file mismatches that will surface as runtime errors rather than at import time — worth knowing before you assume you broke something:

- `Analysis_Run` (`db/models/analysis_model.py`) has no `task_id` or `error` field, but `experiments.py` and `worker.py` read/write `task_id`, and `worker.py`/`analysis.py` read/write `.error` (the actual field is `error_message`).
- `Summary` has `summary_json`, not `summary_data` — `worker.py` and `app/api/routes/analysis.py` use `summary_data`.
- `decision_summary.__init__` (`stats/summary.py`) takes `mode=`, but `worker.py` calls it with `uplift_mode=`.
- `decision_summary.generate_summary_text()` reads `self.summary["ci_lower"]`/`["ci_upper"]`, but `generate_summary()` actually nests them under `summary["confidence_interval"]["lower"/"upper"]`.
- `Experiment.variants` (`db/models/experiment_model.py`) is wired to the `Metric` class instead of `Variant`.
- `Metric_type` only defines `BINARY`/`CONTINUOUS`; the metrics-creation route defaults to a nonexistent `Metric_type.NUMERIC`.
- `create_experiment` passes `description=` into `Experiment(...)`, which has no such field (it has `hypothesis` instead).
- `get_all_metrics`/`get_metric` filter on `Metric.owner_id`, which doesn't exist on the `Metric` model.

Expect to hit these when exercising the analysis pipeline or metrics endpoints end-to-end.
