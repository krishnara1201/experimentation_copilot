# Metric/Variant Dropdowns + Type-Aware Formulas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status note:** this plan was executed inline in the same session that wrote it (the planner already held full context and had pre-verified every formula), so all steps below are checked off and this file doubles as the record of what was built. A future re-run of this plan on a fresh checkout should still work verbatim.

**Goal:** Replace raw metric/variant ID text entry in Planning and Analysis with dropdowns, and make every stats formula (sample size, MDE, significance, p-value, CI, SRM) branch correctly on the selected metric's `binary`/`continuous` type.

**Architecture:** `Metric.type` is already persisted; the fix is to (1) add continuous-metric formulas (Welch's t-test based) alongside the existing binary (two-proportion z-test) ones in `app/stats/`, (2) have the routes/worker look up and thread `metric.type` through instead of assuming binary, and (3) wire `listMetrics`/`listVariants` into `Select` dropdowns on the frontend, swapping the numeric input fields based on the selected metric's type.

**Tech Stack:** FastAPI + SQLModel + Celery (backend, Python 3.12, `uv`), React + TanStack Query + Vite (frontend, TypeScript).

## Global Constraints

- No test framework exists in this repo (no pytest, no frontend test runner) — verification is via ad hoc scripts and the documented pgserver/ASGITransport/celery-`.apply()` recipe in `CLAUDE.md`, not a committed test suite.
- WSL has no native Linux Node — `npm run typecheck`/`build` must go through `node.exe` + `wslpath`, or through `docker compose` for a real build (see `CLAUDE.md`/memory `wsl-node-docker-workarounds`).
- `Analysis_Run` does not persist `metric_id` or `variant_id` today — variant selection in the UI is a labeling aid only, not a new backend field.

---

### Task 1: `stat_analysis.py` — fix `calculate_srm` to be count-based

**Files:**
- Modify: `backend/app/stats/stat_analysis.py`

**Interfaces:**
- Produces: `calculate_srm(n1: int, n2: int, expected_ratio: float = 0.5, alpha: float = 0.05) -> float` (signature change from the old `(p1, p2, n1, n2, alpha)` — the old version mixed a conversion-rate proportion into what should be a pure allocation-count check, which is both wrong for binary metrics and meaningless for continuous ones).

- [x] **Step 1: Replace the function body**

```python
def calculate_srm(n1: int, n2: int, expected_ratio: float = 0.5, alpha: float = 0.05) -> float:
    """
    Calculate the p-value for a Sample Ratio Mismatch (SRM) check between two groups.
    A caller should treat p < alpha as a significant mismatch.

    This is a chi-squared goodness-of-fit test on the two groups' sample
    *counts* against the expected allocation ratio -- it depends only on
    n1/n2, not on the metric being measured, so it's the same check for
    binary and continuous metrics alike.
    """
    total_n = n1 + n2
    expected_n1 = total_n * expected_ratio
    expected_n2 = total_n * (1 - expected_ratio)
    chi_squared_stat = ((n1 - expected_n1) ** 2 / expected_n1) + ((n2 - expected_n2) ** 2 / expected_n2)
    return 1 - stats.chi2.cdf(chi_squared_stat, df=1)
```

- [x] **Step 2: Verify**

```bash
cd backend && uv run python3 - <<'EOF'
from app.stats.stat_analysis import calculate_srm
assert calculate_srm(500, 500) == 1.0
assert calculate_srm(600, 400) < 0.001
print("OK")
EOF
```
Expected: `OK`. (Ran for real: passed.)

- [x] **Step 3: Commit** — bundled with Task 2 below (same file).

---

### Task 2: `stat_analysis.py` — Welch's t-test continuous functions

**Files:**
- Modify: `backend/app/stats/stat_analysis.py`

**Interfaces:**
- Produces: `calculate_result_significance_continuous`, `calculate_result_p_value_continuous`, `calculate_result_ci_continuous`, each `(mean1, mean2, std1, std2, n1, n2, alpha=0.05, test_type=test_type.TWO_SIDED)`, plus a private `_welch_satterthwaite_df(std1, n1, std2, n2)`.

- [x] **Step 1: Add the functions** (inserted after `calculate_srm`, same file):

```python
def _welch_satterthwaite_df(std1: float, n1: int, std2: float, n2: int) -> float:
    var1_term = std1 ** 2 / n1
    var2_term = std2 ** 2 / n2
    return (var1_term + var2_term) ** 2 / ((var1_term ** 2) / (n1 - 1) + (var2_term ** 2) / (n2 - 1))

def calculate_result_significance_continuous(mean1, mean2, std1, std2, n1, n2, alpha=0.05, test_type=test_type.TWO_SIDED) -> bool:
    se = ((std1 ** 2 / n1) + (std2 ** 2 / n2)) ** 0.5
    t_score = (mean1 - mean2) / se
    df = _welch_satterthwaite_df(std1, n1, std2, n2)
    if test_type == test_type.TWO_SIDED:
        critical_t = stats.t.ppf(1 - alpha / 2, df)
        return bool(abs(t_score) > critical_t)
    else:
        critical_t = stats.t.ppf(1 - alpha, df)
        return bool(t_score > critical_t)

def calculate_result_p_value_continuous(mean1, mean2, std1, std2, n1, n2, test_type=test_type.TWO_SIDED) -> float:
    se = ((std1 ** 2 / n1) + (std2 ** 2 / n2)) ** 0.5
    t_score = (mean1 - mean2) / se
    df = _welch_satterthwaite_df(std1, n1, std2, n2)
    if test_type == test_type.TWO_SIDED:
        return 2 * (1 - stats.t.cdf(abs(t_score), df))
    else:
        return 1 - stats.t.cdf(t_score, df)

def calculate_result_ci_continuous(mean1, mean2, std1, std2, n1, n2, alpha=0.05, test_type=test_type.TWO_SIDED) -> tuple:
    se = ((std1 ** 2 / n1) + (std2 ** 2 / n2)) ** 0.5
    df = _welch_satterthwaite_df(std1, n1, std2, n2)
    critical_t = stats.t.ppf(1 - alpha / 2, df) if test_type == test_type.TWO_SIDED else stats.t.ppf(1 - alpha, df)
    margin_of_error = critical_t * se
    return (mean1 - mean2) - margin_of_error, (mean1 - mean2) + margin_of_error
```

- [x] **Step 2: Verify** (mean1=10, std1=2, n1=200; mean2=11, std2=2.5, n2=200):

```bash
cd backend && uv run python3 - <<'EOF'
import math
from app.stats.stat_analysis import (
    calculate_result_significance_continuous,
    calculate_result_p_value_continuous,
    calculate_result_ci_continuous,
)
assert calculate_result_significance_continuous(10.0, 11.0, 2.0, 2.5, 200, 200) is True
assert math.isclose(calculate_result_p_value_continuous(10.0, 11.0, 2.0, 2.5, 200, 200), 1.3055041472975759e-05, rel_tol=1e-6)
lo, hi = calculate_result_ci_continuous(10.0, 11.0, 2.0, 2.5, 200, 200)
assert math.isclose(lo, -1.4451245418592684, rel_tol=1e-6) and math.isclose(hi, -0.5548754581407316, rel_tol=1e-6)
assert calculate_result_significance_continuous(10.0, 10.0, 2.0, 2.5, 200, 200) is False
print("OK")
EOF
```
Expected: `OK`. (Ran for real: passed.)

- [x] **Step 3: Commit** `backend/app/stats/stat_analysis.py` (Tasks 1+2 together).

---

### Task 3: `calculators.py` — continuous sample-size/MDE

**Files:**
- Modify: `backend/app/stats/calculators.py`

**Interfaces:**
- Produces: `calculate_sample_size_continuous(sigma, mde=1.0, alpha=0.05, power=0.8) -> int`, `calculate_minimum_detectable_effect_continuous(sigma, n=1000, alpha=0.05, power=0.8) -> float`.

- [x] **Step 1: Add the functions** (appended to the file):

```python
def calculate_sample_size_continuous(sigma: float, mde: float = 1.0, alpha: float = 0.05, power: float = 0.8) -> int:
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    numerator = 2 * (z_alpha + z_beta) ** 2 * sigma ** 2
    denominator = mde ** 2
    return math.ceil(numerator / denominator)

def calculate_minimum_detectable_effect_continuous(sigma: float, n: int = 1000, alpha: float = 0.05, power: float = 0.8) -> float:
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    standard_error = sigma * (2 / n) ** 0.5
    return (z_alpha + z_beta) * standard_error
```

- [x] **Step 2: Verify**

```bash
cd backend && uv run python3 - <<'EOF'
import math
from app.stats.calculators import calculate_sample_size_continuous, calculate_minimum_detectable_effect_continuous
assert calculate_sample_size_continuous(sigma=10, mde=2) == 393
assert math.isclose(calculate_minimum_detectable_effect_continuous(sigma=10, n=1000), 1.2529069984918344, rel_tol=1e-9)
print("OK")
EOF
```
Expected: `OK`. (Ran for real: passed.)

- [x] **Step 3: Commit** `backend/app/stats/calculators.py`.

---

### Task 4: `summary.py` — branch `decision_summary` on metric type

**Files:**
- Modify: `backend/app/stats/summary.py`

**Interfaces:**
- Consumes: Task 1–3's functions; `Metric_type` from `app.db.models.metric_model`.
- Produces: `decision_summary(metric_type, n1, n2, alpha=0.05, mode=uplift_mode.ABSOLUTE, test_type=test_type.TWO_SIDED, p1=None, p2=None, mean1=None, std1=None, mean2=None, std2=None)` — same `.summary` dict shape and `.generate_summary_text()` as before, for either metric type.

- [x] **Step 1: Rewrite the class** — see `backend/app/stats/summary.py` (full file rewritten; constructor now takes `metric_type` plus either `(p1, p2)` or `(mean1, std1, mean2, std2)`, `generate_summary()` branches on `self.metric_type == Metric_type.BINARY`, and SRM is always computed as `calculate_srm(self.n1, self.n2, alpha=self.alpha)` regardless of type). `generate_summary_text()` is unchanged.

- [x] **Step 2: Verify**

```bash
cd backend && uv run python3 - <<'EOF'
import math
from app.db.models.metric_model import Metric_type
from app.stats.summary import decision_summary

binary = decision_summary(metric_type=Metric_type.BINARY, n1=1000, n2=1000, p1=0.10, p2=0.14)
assert binary.summary["is_significant"] is True and binary.summary["uplift"] > 0
assert "beneficial" in binary.generate_summary_text()

cont = decision_summary(metric_type=Metric_type.CONTINUOUS, n1=200, n2=200, mean1=10.0, std1=2.0, mean2=11.0, std2=2.5)
assert cont.summary["is_significant"] is True
assert math.isclose(cont.summary["p_value"], 1.3055041472975759e-05, rel_tol=1e-6)
assert cont.summary["uplift"] == 1.0

mismatched = decision_summary(metric_type=Metric_type.CONTINUOUS, n1=600, n2=400, mean1=10.0, std1=2.0, mean2=10.0, std2=2.0)
assert "Sample Ratio Mismatch" in mismatched.generate_summary_text()
print("OK")
EOF
```
Expected: `OK`. (Ran for real: passed.)

- [x] **Step 3: Commit** `backend/app/stats/summary.py`.

---

### Task 5: routes — `/sample-size` and `/mde` accept `std_dev`, branch on `metric.type`

**Files:**
- Modify: `backend/app/api/routes/experiments.py`

**Interfaces:**
- Consumes: `calculate_sample_size_continuous`, `calculate_minimum_detectable_effect_continuous` (Task 3).
- Produces: `POST /api/experiments/{id}/sample-size` and `/mde` now accept an optional `std_dev: float | None` query param and return an added `"metric_type"` field; 400 if `std_dev` is missing for a continuous metric.

- [x] **Step 1: Update imports** — `from app.stats.calculators import calculate_sample_size, calculate_minimum_detectable_effect, calculate_sample_size_continuous, calculate_minimum_detectable_effect_continuous`.

- [x] **Step 2: Branch both endpoints on `metric.type`** (both already fetch `metric` for ownership validation — reuse it):

```python
if metric.type == Metric_type.CONTINUOUS:
    if std_dev is None:
        raise HTTPException(status_code=400, detail="std_dev is required to calculate sample size for a continuous metric.")
    sample_size = calculate_sample_size_continuous(sigma=std_dev, mde=effect_size, alpha=alpha, power=power)
else:
    sample_size = calculate_sample_size(alpha=alpha, power=power, mde=effect_size, p1=base_rate)
return {"sample_size": sample_size, "metric_type": metric.type}
```
(mirrored for `/mde` with `calculate_minimum_detectable_effect_continuous`/`calculate_minimum_detectable_effect`).

- [x] **Step 3: Verify** — covered by Task 7's end-to-end script (`continuous_ss`/`continuous_mde` assertions).

- [x] **Step 4: Commit** — bundled with Task 6 (same file).

---

### Task 6: routes + worker — `/run-analysis` and the Celery task support continuous payloads

**Files:**
- Modify: `backend/app/api/routes/experiments.py`
- Modify: `backend/app/tasks/worker.py`

**Interfaces:**
- Produces (route): `POST /api/experiments/{id}/run-analysis` — `variant_a_total`/`variant_b_total` stay required; `variant_a_successes`/`variant_b_successes` become optional; four new optional fields `variant_a_mean`, `variant_a_std`, `variant_b_mean`, `variant_b_std`. 400 if the wrong subset is supplied for `metric.type`.
- Produces (task): `run_analysis(self, experiment_id, metric_id, metric_type_val, variant_a_total, variant_b_total, variant_a_successes, variant_b_successes, variant_a_mean, variant_a_std, variant_b_mean, variant_b_std, alpha, test_type_val, uplift_mode_val)`.

- [x] **Step 1: Route — validate by type and pass `metric.type` through**

```python
if metric.type == Metric_type.BINARY:
    if variant_a_successes is None or variant_b_successes is None:
        raise HTTPException(status_code=400, detail="variant_a_successes and variant_b_successes are required for a binary metric.")
else:
    if None in (variant_a_mean, variant_a_std, variant_b_mean, variant_b_std):
        raise HTTPException(status_code=400, detail="variant_a_mean, variant_a_std, variant_b_mean, and variant_b_std are required for a continuous metric.")

# Captured before the commit below: expire_on_commit (the default) expires
# every attribute on every object in the session once we commit, and
# re-reading metric.type afterwards would need a lazy reload that
# AsyncSession can't do outside an awaited call.
metric_type_value = metric.type.value

task_id = str(uuid.uuid4())
analysis_run = Analysis_Run(experiment_id=experiment_id, task_id=task_id, status=Analysis_Run_Status.PENDING)
session.add(analysis_run)
await session.commit()
await session.refresh(analysis_run)

run_analysis.apply_async(
    args=(experiment_id, metric_id, metric_type_value,
          variant_a_total, variant_b_total,
          variant_a_successes, variant_b_successes,
          variant_a_mean, variant_a_std, variant_b_mean, variant_b_std,
          alpha, test_type.value, uplift_mode.value),
    task_id=task_id,
)
```

**Caught during implementation:** the first version read `metric.type.value` *after* `await session.commit()`. SQLAlchemy's `AsyncSession` expires all loaded attributes on commit by default; reading an expired attribute afterwards triggers an implicit lazy reload that requires awaiting, which raised `sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called` when hit synchronously. Fixed by capturing `metric_type_value` before the commit (as shown above) — verified by the Task 7 script reproducing and then passing past this exact call.

- [x] **Step 2: Worker task signature + branch**

```python
@celery_app.task(bind=True)
def run_analysis(self, experiment_id, metric_id, metric_type_val,
                 variant_a_total, variant_b_total,
                 variant_a_successes, variant_b_successes,
                 variant_a_mean, variant_a_std, variant_b_mean, variant_b_std,
                 alpha, test_type_val, uplift_mode_val):
    task_id = self.request.id
    try:
        actual_test_type = TestTypeEnum(test_type_val)
        actual_uplift_mode = UpliftModeEnum(uplift_mode_val)
        actual_metric_type = Metric_type(metric_type_val)

        if actual_metric_type == Metric_type.BINARY:
            summary = decision_summary(
                metric_type=actual_metric_type, n1=variant_a_total, n2=variant_b_total,
                p1=variant_a_successes / variant_a_total, p2=variant_b_successes / variant_b_total,
                alpha=alpha, test_type=actual_test_type, mode=actual_uplift_mode,
            )
        else:
            summary = decision_summary(
                metric_type=actual_metric_type, n1=variant_a_total, n2=variant_b_total,
                mean1=variant_a_mean, std1=variant_a_std, mean2=variant_b_mean, std2=variant_b_std,
                alpha=alpha, test_type=actual_test_type, mode=actual_uplift_mode,
            )
        text_summary = summary.generate_summary_text()
        # ... unchanged: asyncio.run(_update_analysis_status(...)); return {...}
    except Exception as e:
        # ... unchanged failure path
```
`from app.db.models.metric_model import Metric_type` added to worker.py's imports (safe per the model-registry note in `CLAUDE.md` — `app/db/models/__init__.py` already imports every model).

- [x] **Step 3: Commit** `backend/app/api/routes/experiments.py` and `backend/app/tasks/worker.py`.

---

### Task 7: Backend end-to-end verification

**Files:** none (throwaway script, not committed — no test framework exists in this repo).

- [x] **Step 1: pgserver + ASGITransport verification** — register/login, create a binary and a continuous metric, two variants; hit `/sample-size` and `/mde` for both types (asserting the exact `sample_size == 393` / `mde ≈ 1.2529069984918344` numbers from Task 3); hit `/run-analysis` with the wrong field subset for each type and confirm 400; hit it with the right fields and confirm 200 + a `pending` `Analysis_Run`. This caught the `MissingGreenlet` bug fixed in Task 6.
- [x] **Step 2: Direct task verification** — per `CLAUDE.md`'s no-Redis worker recipe, create an `Analysis_Run` row directly, then call `run_analysis.apply(args=(...), task_id=...)` in a real OS thread for both a binary and a continuous argument set; assert the run lands `COMPLETED` with a `Summary` row whose JSON matches the pre-computed numbers.
- [x] **Step 3: Real-infra verification** — `docker compose up --build` (real Postgres/Redis/Celery worker, and the only reliable full Linux `npm run build` in this WSL environment — see Global Constraints). Re-ran the `/run-analysis` flow through the actual `apply_async`/Redis/worker path (not the `.apply()` bypass) for both metric types; both completed with the same numbers as Step 2, confirming the real dispatch path works end-to-end. Checked worker container logs for errors (none). Tore the stack down (`docker compose down`, no `-v`) after confirming.

All three passed.

---

### Task 8: frontend — `api/experiments.ts` type updates

**Files:**
- Modify: `frontend/src/api/experiments.ts`

- [x] **Step 1:** `SampleSizeInput`/`MdeInput` gain `std_dev?: number`; their return types gain `metric_type: MetricType`. `RunAnalysisInput`: `variant_a_total`/`variant_b_total` stay required, `variant_a_successes`/`variant_b_successes` become optional, and `variant_a_mean`/`variant_a_std`/`variant_b_mean`/`variant_b_std` are added as optional. (`buildQueryString` in `api/client.ts` already skips `undefined` params, so omitted fields don't get sent.)
- [x] **Step 2: Commit** `frontend/src/api/experiments.ts`.

---

### Task 9: frontend — `PlanningPanel.tsx` metric dropdown + type-aware fields

**Files:**
- Modify: `frontend/src/pages/experiment/PlanningPanel.tsx`

**Interfaces:**
- Consumes: `listMetrics` (`api/experiments.ts`), `Metric` type (`types/api.ts`).

- [x] **Step 1:** `PlanningPanel` fetches `listMetrics(experimentId)` once via `useQuery` and passes `metrics: Metric[]` down to `SampleSizeCard`/`MdeCard` (avoids two duplicate fetches). Both cards replace the "Metric ID" number `Field` with a shared `MetricSelect` (`{name} ({type})` options). `selectedMetric`/`isContinuous` are derived from the chosen `metricId`. When continuous, the "Base rate" field is swapped for "Std dev (σ)", passed as `std_dev` instead of `base_rate` (the other value goes through as `undefined` and is dropped from the query string).
- [x] **Step 2: Commit** `frontend/src/pages/experiment/PlanningPanel.tsx`.

---

### Task 10: frontend — `AnalysisPanel.tsx` metric + variant dropdowns + type-aware fields

**Files:**
- Modify: `frontend/src/pages/experiment/AnalysisPanel.tsx`

**Interfaces:**
- Consumes: `listMetrics`, `listVariants` (`api/experiments.ts`).

- [x] **Step 1:** Fetches both `listMetrics` and `listVariants`. "Metric ID" becomes a `Select`. Two new "Variant A"/"Variant B" `Select`s (from `listVariants`) are **label-only** — `Analysis_Run` has no `variant_id` column and the route never looks one up, so nothing new is sent to the backend; picking a variant just relabels the fields below (e.g. "Successes" → "Control successes"). Numeric fields swap by `selectedMetric.type`: binary keeps successes+total per variant; continuous shows mean+std dev+sample size per variant, wired to the new `variant_a_mean`/`variant_a_std`/`variant_b_mean`/`variant_b_std` fields.
- [x] **Step 2: Commit** `frontend/src/pages/experiment/AnalysisPanel.tsx`.

---

### Task 11: Frontend verification

- [x] **Step 1: Typecheck** (WSL workaround — bare `npm run typecheck` silently no-ops here per `CLAUDE.md`/memory `wsl-node-docker-workarounds`):

```bash
cd frontend
TSC_WIN=$(wslpath -w "$(pwd)/node_modules/typescript/bin/tsc")
PROJ_WIN=$(wslpath -w "$(pwd)/tsconfig.json")
node.exe "$TSC_WIN" --noEmit -p "$PROJ_WIN"
```
Expected: no output, exit code 0. (Ran for real: passed.)

- [x] **Step 2: Real production build** via `docker compose up --build` — this is the only reliable way to run a real Linux `npm run build` (Windows `node.exe` can't run Vite's native rolldown bindings at all). Build succeeded: `tsc --noEmit && vite build` completed cleanly, `dist/` produced.
- [x] **Step 3: Manual UI click-through.** No browser-driving tool was available in this session (no `chromium-cli`, no project `run` skill), so the agent couldn't click through the dropdowns and screenshot them itself — it substituted the real-infra HTTP verification in Task 7 Step 3 (full `/run-analysis` round trip through the real stack for both metric types) as the strongest available automated substitute. The user then brought the `docker compose` stack up and manually clicked through the Planning and Analysis tabs at `localhost:3000` and confirmed the dropdowns and type-aware fields work as expected. Feature is confirmed done from a UI perspective too.

---

### Task 12: Write this plan doc and commit

- [x] Write this file to `docs/superpowers/plans/2026-08-10-metric-variant-dropdowns.md`.
- [ ] Commit alongside the implementation changes (see final report — commit not yet made at time of writing; left for the user to review the diff first).
