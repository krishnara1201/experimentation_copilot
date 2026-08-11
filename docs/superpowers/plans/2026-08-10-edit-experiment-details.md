# Edit Experiment Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit every field of an `Experiment` (`name`, `description`, `hypothesis`, `unit_of_randomization`, `start_date`, `end_date`, `status`) after creation, from the Overview tab.

**Architecture:** Backend: replace the PATCH handler's body type with a new `ExperimentUpdate` schema (all fields optional) and apply only the fields the client actually sent (`model_dump(exclude_unset=True)`), instead of the current full-`Experiment`-body approach that only ever touches `name`/`description`. Frontend: add an `updateExperiment` API client function, a new `EditExperimentModal` (mirrors the existing `ExperimentFormModal` pattern), and an "Edit" button on `OverviewPanel.tsx` that opens it.

**Tech Stack:** FastAPI + SQLModel (async, asyncpg) on the backend; React + TypeScript (Vite, TanStack Query) on the frontend. No persistent test suite exists in this repo — backend verification uses the `pgserver` (ephemeral real Postgres) + `httpx.ASGITransport` technique documented in `CLAUDE.md`; frontend verification uses `npm run typecheck` plus a manual browser pass.

## Global Constraints

- Backend: Python 3.12, managed with `uv`, no lint/format config exists — match existing style in the touched files.
- No database schema change is needed for this feature (no new columns) — do **not** generate an Alembic migration.
- The PATCH handler must apply **only** fields present in the request body (`exclude_unset=True`); a field omitted from the request must be left untouched on the row, never reset to a schema default. This is the specific bug being fixed (today, omitting `status` from a full-object PATCH would silently reset it to `draft`).
- Status becomes a plain editable field in the edit form — no separate lifecycle workflow, no side effects tied to a status change.
- Out of scope: `update_metric`/`update_variant` handlers (same "silently drops fields" shape, not touched here); optimistic concurrency/conflict handling (none exists elsewhere in this codebase either).

---

### Task 1: Backend — partial-update schema and handler rewrite

**Files:**
- Modify: `backend/app/db/models/experiment_model.py`
- Modify: `backend/app/api/routes/experiments.py:53-70`

**Interfaces:**
- Produces: `ExperimentUpdate(SQLModel)` in `experiment_model.py` with fields `name`, `description`, `hypothesis`, `unit_of_randomization`, `start_date`, `end_date`, `status` — all `Optional[...] = None`. The rewritten `update_experiment` route continues to return `{"message": ..., "experiment": <Experiment>}` (the `"experiment"` key is new — Task 2's `updateExperiment` client function relies on it being present in the response).

- [ ] **Step 1: Add the `ExperimentUpdate` schema**

In `backend/app/db/models/experiment_model.py`, add this class after `Experiment`:

```python
class ExperimentUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hypothesis: Optional[str] = None
    unit_of_randomization: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[Experiment_status] = None
```

(`Optional`, `date`, and `SQLModel` are already imported at the top of the file — no new imports needed.)

- [ ] **Step 2: Rewrite the `update_experiment` handler**

In `backend/app/api/routes/experiments.py`, replace the entire handler (lines 53–70):

```python
@router.patch("/{experiment_id}")
async def update_experiment(experiment_id: int, experiment_details: ExperimentUpdate,
                            session: AsyncSession = Depends(get_session),
                            user: UserReceived = Depends(get_current_user)):

    async with session:
        result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == user.id))
        existing_experiment = result.scalars().first()

        if not existing_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update it.")

        updates = experiment_details.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(existing_experiment, field, value)

        await session.commit()
        await session.refresh(existing_experiment)
    return {"message": f"Experiment {experiment_id} updated", "experiment": existing_experiment}
```

Also update the import at the top of the file — change:

```python
from app.db.models.experiment_model import Experiment
```

to:

```python
from app.db.models.experiment_model import Experiment, ExperimentUpdate
```

- [ ] **Step 3: Write an end-to-end verification script**

Save as `/home/shreyash/.claude/jobs/c59c51c1/tmp/verify_edit_experiment.py` and run with `uv run --with pgserver --with httpx python /home/shreyash/.claude/jobs/c59c51c1/tmp/verify_edit_experiment.py` from `backend/`:

```python
import asyncio, os, shutil
import pgserver
import subprocess

tmp = "/home/shreyash/.claude/jobs/c59c51c1/tmp/pgdata-edit-experiment-verify"
shutil.rmtree(tmp, ignore_errors=True)
db = pgserver.get_server(tmp)
uri = db.get_uri().replace("postgresql://", "postgresql+asyncpg://")
os.environ["DATABASE_URL"] = uri

subprocess.run(["uv", "run", "alembic", "upgrade", "head"], check=True)

async def main():
    import httpx
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/auth/register", json={
            "username": "bob", "email": "bob@example.com",
            "full_name": "Bob Example", "password": "correcthorsebatterystaple",
        })
        assert r.status_code == 200, r.text

        r = await client.post("/api/auth/token", data={"username": "bob", "password": "correcthorsebatterystaple"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        r = await client.post(
            "/api/experiments/",
            params={"name": "Checkout redesign", "description": "Original description"},
            headers=headers,
        )
        assert r.status_code == 200, r.text

        r = await client.get("/api/experiments/", headers=headers)
        assert r.status_code == 200, r.text
        experiment_id = r.json()["experiments"][0]["id"]

        # Partial update: only status + hypothesis. name/description must survive untouched.
        r = await client.patch(f"/api/experiments/{experiment_id}", json={
            "status": "running",
            "hypothesis": "Checkout redesign increases conversion",
        }, headers=headers)
        assert r.status_code == 200, r.text
        updated = r.json()["experiment"]
        assert updated["status"] == "running", updated
        assert updated["hypothesis"] == "Checkout redesign increases conversion", updated
        assert updated["name"] == "Checkout redesign", updated
        assert updated["description"] == "Original description", updated

        # Second partial update: only name. This is the exact bug being fixed —
        # status must NOT silently reset to "draft" just because this request omits it.
        r = await client.patch(f"/api/experiments/{experiment_id}", json={"name": "Checkout redesign v2"}, headers=headers)
        assert r.status_code == 200, r.text
        updated2 = r.json()["experiment"]
        assert updated2["name"] == "Checkout redesign v2", updated2
        assert updated2["status"] == "running", updated2
        assert updated2["hypothesis"] == "Checkout redesign increases conversion", updated2

        # Remaining fields: unit_of_randomization + both dates.
        r = await client.patch(f"/api/experiments/{experiment_id}", json={
            "unit_of_randomization": "user_id",
            "start_date": "2026-08-01",
            "end_date": "2026-08-31",
        }, headers=headers)
        assert r.status_code == 200, r.text
        updated3 = r.json()["experiment"]
        assert updated3["unit_of_randomization"] == "user_id", updated3
        assert updated3["start_date"] == "2026-08-01", updated3
        assert updated3["end_date"] == "2026-08-31", updated3

        # Editing an experiment owned by someone else is still rejected.
        r = await client.post("/api/auth/register", json={
            "username": "eve", "email": "eve@example.com",
            "full_name": "Eve Example", "password": "correcthorsebatterystaple",
        })
        assert r.status_code == 200, r.text
        r = await client.post("/api/auth/token", data={"username": "eve", "password": "correcthorsebatterystaple"})
        eve_token = r.json()["access_token"]
        r = await client.patch(
            f"/api/experiments/{experiment_id}",
            json={"name": "Hijacked"},
            headers={"Authorization": f"Bearer {eve_token}"},
        )
        assert r.status_code == 404, r.text

        print("OK: partial PATCH applies only sent fields, survives repeated partial edits, and stays owner-scoped")

asyncio.run(main())
db.cleanup()
```

- [ ] **Step 4: Run it and confirm the OK line prints; fix any failures before proceeding**

Run: `cd backend && uv run --with pgserver --with httpx python /home/shreyash/.claude/jobs/c59c51c1/tmp/verify_edit_experiment.py`

Expected output ends with: `OK: partial PATCH applies only sent fields, survives repeated partial edits, and stays owner-scoped`

- [ ] **Step 5: Commit**

```bash
git add backend/app/db/models/experiment_model.py backend/app/api/routes/experiments.py
git commit -m "Apply all fields on experiment PATCH via a partial-update schema"
```

---

### Task 2: Frontend — API client for updating an experiment

**Files:**
- Modify: `frontend/src/api/experiments.ts`

**Interfaces:**
- Consumes: `Experiment`, `ExperimentStatus` types from `frontend/src/types/api.ts` (already exist, unchanged).
- Produces: `UpdateExperimentInput` type and `updateExperiment(id: number, input: UpdateExperimentInput): Promise<{ message: string; experiment: Experiment }>`. Task 3's `EditExperimentModal` calls this exact signature.

- [ ] **Step 1: Add the type import and the new function**

In `frontend/src/api/experiments.ts`, change the import line at the top:

```typescript
import type { Experiment, ExperimentStatus, Metric, MetricDirection, MetricType, TestType, UpliftMode, Variant } from '../types/api';
```

Then add, directly after `deleteExperiment`:

```typescript
export interface UpdateExperimentInput {
  name?: string;
  description?: string;
  hypothesis?: string;
  unit_of_randomization?: string;
  start_date?: string;
  end_date?: string;
  status?: ExperimentStatus;
}

export function updateExperiment(
  id: number,
  input: UpdateExperimentInput
): Promise<{ message: string; experiment: Experiment }> {
  return apiRequest(`/api/experiments/${id}`, { method: 'PATCH', body: input });
}
```

This sends `input` as a JSON body (`apiRequest`'s `body` option), not query params — matching the backend's `ExperimentUpdate` Pydantic body from Task 1.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`

Expected: no errors (nothing consumes `updateExperiment` yet, so this is purely additive).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/experiments.ts
git commit -m "Add updateExperiment to the experiments API client"
```

---

### Task 3: Frontend — `EditExperimentModal` component

**Files:**
- Create: `frontend/src/components/EditExperimentModal.tsx`

**Interfaces:**
- Consumes: `updateExperiment` from Task 2; `Modal`, `Field`, `Select`, `Button`, `ErrorBanner` from `frontend/src/components/ui/`; `Experiment`, `ExperimentStatus` from `frontend/src/types/api.ts`.
- Produces: `EditExperimentModal({ experiment: Experiment, onClose: () => void })` — a default export. Task 4's `OverviewPanel.tsx` renders this exact component with these exact props.

- [ ] **Step 1: Write the component**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../api/client';
import { updateExperiment } from '../api/experiments';
import type { Experiment, ExperimentStatus } from '../types/api';
import Button from './ui/Button';
import ErrorBanner from './ui/ErrorBanner';
import Field from './ui/Field';
import Modal from './ui/Modal';
import Select from './ui/Select';

const STATUS_OPTIONS: ExperimentStatus[] = ['draft', 'running', 'completed', 'paused', 'cancelled'];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function EditExperimentModal({
  experiment,
  onClose,
}: {
  experiment: Experiment;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(experiment.name);
  const [description, setDescription] = useState(experiment.description ?? '');
  const [hypothesis, setHypothesis] = useState(experiment.hypothesis ?? '');
  const [unitOfRandomization, setUnitOfRandomization] = useState(experiment.unit_of_randomization ?? '');
  const [startDate, setStartDate] = useState(experiment.start_date ?? '');
  const [endDate, setEndDate] = useState(experiment.end_date ?? '');
  const [status, setStatus] = useState<ExperimentStatus>(experiment.status);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateExperiment(experiment.id, {
        name,
        description,
        hypothesis,
        unit_of_randomization: unitOfRandomization,
        // Omit rather than send "" — the backend's date field rejects an empty
        // string, and omitting leaves the existing value (or absence of one)
        // untouched via the partial-update handler's exclude_unset behavior.
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate();
  };

  return (
    <Modal title="Edit experiment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        <Field label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Field label="Hypothesis" value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} />
        <Field
          label="Unit of randomization"
          value={unitOfRandomization}
          onChange={(event) => setUnitOfRandomization(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Field label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as ExperimentStatus)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {capitalize(option)}
            </option>
          ))}
        </Select>
        {updateMutation.isError && (
          <ErrorBanner message={getErrorMessage(updateMutation.error, 'Failed to update experiment.')} />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/EditExperimentModal.tsx
git commit -m "Add EditExperimentModal"
```

---

### Task 4: Frontend — wire the Edit button into `OverviewPanel`

**Files:**
- Modify: `frontend/src/pages/experiment/OverviewPanel.tsx`

**Interfaces:**
- Consumes: `EditExperimentModal` from Task 3.

- [ ] **Step 1: Replace the file contents**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { deleteExperiment } from '../../api/experiments';
import EditExperimentModal from '../../components/EditExperimentModal';
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
  const [isEditing, setIsEditing] = useState(false);

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
    ['Description', experiment.description ?? '—'],
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
      <div className="mt-6 flex gap-2 border-t border-slate-100 pt-6">
        <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete experiment'}
        </Button>
      </div>
      {isEditing && <EditExperimentModal experiment={experiment} onClose={() => setIsEditing(false)} />}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`

Expected: both succeed with zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/experiment/OverviewPanel.tsx
git commit -m "Add Edit button and modal to the experiment overview panel"
```

---

### Task 5: Full-stack manual verification

**Files:** none (verification only)

- [ ] **Step 1: Bring up the full stack**

```bash
docker compose up --build
```

- [ ] **Step 2: Create an experiment and open its Overview tab**

In the browser, create a new experiment from the experiments list, then open it and confirm the Overview tab shows the new "Edit" button next to "Delete experiment".

- [ ] **Step 3: Edit a single field and confirm the rest survive**

Click Edit, change only the Hypothesis field, save. Confirm the modal closes, the Overview `<dl>` shows the new hypothesis, and Name/Description/Status are unchanged.

- [ ] **Step 4: Edit status and confirm it's no longer silently dropped**

Click Edit again, change Status from "Draft" to "Running" (leave everything else as-is), save. Confirm the Status badge at the top of the Overview panel now reads "running". This is the specific bug fixed in Task 1 — reload the page (`F5`) and confirm the status is still "running" after reload (i.e. it persisted, not just client-side state).

- [ ] **Step 5: Edit dates and unit of randomization**

Click Edit, set Start date, End date, and Unit of randomization, save. Confirm all three show correctly in the Overview `<dl>`, and reload to confirm persistence.

- [ ] **Step 6: Confirm Cancel discards changes**

Click Edit, change the Name field, click Cancel. Confirm the Overview panel still shows the old name (no request was sent — check the Network tab shows no `PATCH` call).

- [ ] **Step 7: Tear down**

```bash
docker compose down -v
```

- [ ] **Step 8: No commit for this task** — it's verification only, nothing to stage.

---

## Notes for the executor

- Tasks must run in order: 1 (backend contract) before 2 (client function needs the response shape), 2 before 3 (modal calls the client function), 3 before 4 (panel renders the modal), 4 before 5 (manual verification needs the wired-up UI).
- All scratch/verification scripts and ephemeral Postgres data directories go under `/home/shreyash/.claude/jobs/c59c51c1/tmp` — don't leave them in the repo.
