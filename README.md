# Experimentation Copilot

A B2B A/B-testing platform: plan experiments, run statistical analysis, and review results.

- **Backend**: FastAPI + Celery (async analysis jobs) + PostgreSQL, managed with [uv](https://docs.astral.sh/uv/).
- **Frontend**: React + TypeScript + Vite, talking to the backend over a typed REST API.

See [CLAUDE.md](./CLAUDE.md) for a deeper architecture walkthrough.

## Quickstart (Docker)

The fastest way to run the whole stack — Postgres, Redis, the API, the Celery worker, and the frontend — is Docker Compose. Requires [Docker](https://docs.docker.com/get-docker/) with Compose v2 (bundled with Docker Desktop).

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD and SECRET_KEY (generate one with `openssl rand -hex 32`)
docker compose up --build
```

`.env` is required — `docker compose` reads it automatically, and `POSTGRES_PASSWORD`/`SECRET_KEY` have no built-in default, so it fails immediately with a clear error if either is missing rather than silently starting with a guessable credential. `.env` is gitignored; never commit it.

That builds the images, runs the database migrations (via a one-shot `migrate` service), and starts everything else once they're healthy. First run takes a few minutes; subsequent runs are cached.

- Frontend: http://localhost:3000
- API: http://localhost:8000 (docs at http://localhost:8000/docs)
- Postgres: localhost:5432 (`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` from `.env`)
- Redis: localhost:6379

Stop everything with `docker compose down` (add `-v` to also drop the Postgres volume and start fresh next time).

**Port already in use?** Common if you have a native Postgres/Redis install (e.g. a Windows Postgres service auto-started on 5432). Set `POSTGRES_PORT`, `REDIS_PORT`, `API_PORT`, and/or `FRONTEND_PORT` in `.env` to remap the *host* side only — the containers still talk to each other over the internal Docker network regardless. If you change `API_PORT`, also update `FRONTEND_API_URL` to match, since that's what the browser calls.

## Manual setup (without Docker)

Useful for backend/frontend development with hot reload. Requires Python 3.12, [uv](https://docs.astral.sh/uv/), Node.js 20+, a local PostgreSQL instance, and (only if you need the analysis pipeline) Redis.

### Backend

```bash
cd backend
uv sync
cp .env.example .env   # then edit DATABASE_URL/SECRET_KEY/etc. for your local Postgres+Redis
uv run alembic upgrade head
uv run fastapi dev app/main.py          # API on :8000
uv run celery -A app.tasks.worker.celery_app worker --loglevel=info   # only needed for /run-analysis
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # only needed if the API isn't at http://localhost:8000
npm run dev             # :3000
```

Full command reference (migrations, typecheck, etc.) is in [CLAUDE.md](./CLAUDE.md).

## Environment variables

| Variable | Used by | Purpose | Default (Docker) |
|---|---|---|---|
| `DATABASE_URL` | backend | Async Postgres DSN (`postgresql+asyncpg://...`) | derived from `POSTGRES_*` below |
| `SECRET_KEY` | backend | JWT signing secret | **required, no default** |
| `ALGORITHM` | backend | JWT signing algorithm | `HS512` |
| `REDIS_URL` | backend | Celery broker | `redis://redis:6379/0` |
| `REDIS_BACKEND_URL` | backend | Celery result backend | `redis://redis:6379/1` |
| `CORS_ORIGINS` | backend | Comma-separated origins allowed to call the API | `http://localhost:3000` |
| `POSTGRES_USER` / `POSTGRES_DB` | docker-compose | Postgres container user/db name | `postgres` / `experiment_copilot` |
| `POSTGRES_PASSWORD` | docker-compose | Postgres container password | **required, no default** |
| `POSTGRES_PORT` / `REDIS_PORT` / `API_PORT` / `FRONTEND_PORT` | docker-compose | Host-side published ports (remap if one's already taken) | `5432` / `6379` / `8000` / `3000` |
| `VITE_API_URL` | frontend | API base URL the browser calls (baked in at build time) | `http://localhost:8000` |

See `.env.example` (root, for Docker — copy to `.env`) and `backend/.env.example` / `frontend/.env.example` (for manual setup) for the full list.

## Project structure

```
backend/    FastAPI app, Celery worker, Alembic migrations (see backend/README.md)
frontend/   React + TypeScript SPA (see frontend/README.md)
docker-compose.yml   Full local stack: postgres, redis, migrate, api, worker, frontend
```
