# Experimentation Copilot Backend

FastAPI + Celery backend for the Experimentation Copilot platform: experiment/metric/variant CRUD, sample-size/MDE planning calculators, and an async statistical analysis pipeline backed by Postgres and Redis.

See the [root README](../README.md) for the full stack quickstart (Docker or manual), and [CLAUDE.md](../CLAUDE.md) for architecture details and known limitations.

## Getting started (manual, without Docker)

Requires Python 3.12, [uv](https://docs.astral.sh/uv/), a local PostgreSQL instance, and Redis (only needed to run the Celery worker / analysis pipeline).

```bash
uv sync
cp .env.example .env   # edit DATABASE_URL/SECRET_KEY/REDIS_URL/etc. for your local setup
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

API docs are served at http://localhost:8000/docs once running.

To run the analysis worker (needed for `POST /api/experiments/{id}/run-analysis`):

```bash
uv run celery -A app.tasks.worker.celery_app worker --loglevel=info
```

## Migrations

```bash
uv run alembic revision --autogenerate -m "message"
uv run alembic upgrade head
```

`migrations/env.py` imports every SQLModel table so autogenerate sees the full schema.
