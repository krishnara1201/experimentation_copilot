# Edit Experiment Details — Design

## Problem

`PATCH /api/experiments/{experiment_id}` exists but the handler only ever
applies `name` and `description` to the row — `hypothesis`,
`unit_of_randomization`, `start_date`, `end_date`, and `status` are silently
ignored even if sent. `OverviewPanel.tsx` is read-only (a metadata `<dl>` and
a delete button); there is no edit UI at all. This is documented as a known
gap in `CLAUDE.md`.

## Goals

- Every editable field on `Experiment` (`name`, `description`, `hypothesis`,
  `unit_of_randomization`, `start_date`, `end_date`, `status`) can be changed
  after creation, from the Overview tab.
- Fix the backend so the PATCH handler actually applies what's sent, without
  the request needing to carry fields the client shouldn't have to know about
  (`owner_id`, `id`, `created_at`).

## Non-goals

- No dedicated experiment lifecycle workflow (e.g. explicit "Start
  experiment" / "Pause" actions with side effects). Status becomes a plain
  editable field in this form, same as any other — nothing beyond that.
- No change to metric/variant PATCH handlers (`update_metric`,
  `update_variant`) — they have the same "silently drops fields" shape but
  are out of scope here.
- No optimistic concurrency / conflict handling beyond what already exists
  (none) — last write wins, matching the rest of the codebase.

## Backend

### New schema — `app/db/models/experiment_model.py`

Add `ExperimentUpdate(SQLModel)` alongside the existing `Experiment` table
model: the same seven editable fields, all `Optional[...] = None`.

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

### Handler rewrite — `app/api/routes/experiments.py::update_experiment`

Change the body parameter's type from `Experiment` to `ExperimentUpdate`, and
apply only the fields the client actually set:

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

`exclude_unset=True` means a field the client omits is left untouched on the
row — it does not get reset to the schema's default (this was the actual bug
risk with reusing the full `Experiment` table model as the body: `status`
defaults to `DRAFT` at the Pydantic level, so an edit that didn't explicitly
resend the current status would have silently reset it).

The response now includes the updated `experiment`, matching the existing
convention in `update_metric`/`update_variant` (currently `update_experiment`
is the odd one out, returning only a message).

## Frontend

### API client — `frontend/src/api/experiments.ts`

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

This is a real JSON body (`body`), not query params — matching what the
rewritten handler expects and consistent with how `apiRequest` already
supports both.

### `EditExperimentModal.tsx` (new, `frontend/src/components/`)

Sibling to the existing `ExperimentFormModal.tsx`, same shape (`Modal` +
`Field`/`Select` + `useMutation`). Takes the current `Experiment` as a prop
and pre-fills every field from it:

- `Field` inputs for `name`, `description`, `hypothesis`,
  `unit_of_randomization`.
- `Field` inputs with `type="date"` for `start_date`/`end_date`.
- `Select` for `status`, options from the five `Experiment_status` values
  (`draft`/`running`/`completed`/`paused`/`cancelled`).

On submit, sends the full current form state as the `UpdateExperimentInput`
body — every field always has a value since the form is pre-filled, so there's
no need for client-side "only send what changed" logic; the backend's
`exclude_unset` handles the case of genuinely absent fields, which won't
occur here since this form always fills them all from the loaded experiment.

On success: `queryClient.invalidateQueries({ queryKey: ['experiments'] })`
(covers both the list page's `['experiments']` query and, since React Query
matches by prefix, `ExperimentDetailPage`'s `['experiments', id]` query —
see `ExperimentDetailPage.tsx:31`), then close.

### `OverviewPanel.tsx`

Add an "Edit" button (secondary variant, `Pencil` icon from `lucide-react`,
next to the existing "Delete experiment" button) that opens
`EditExperimentModal` via local `useState` boolean — same pattern as how the
experiments list page opens `ExperimentFormModal`.

## Testing

No test suite exists in this repo (per `CLAUDE.md`). Verify manually per the
repo's documented approach: `docker compose up --build`, then through the
browser — edit each field individually (including status) and confirm it
persists across a page reload, and confirm omitted-from-this-edit fields
(e.g. editing only the name) don't get reset.
