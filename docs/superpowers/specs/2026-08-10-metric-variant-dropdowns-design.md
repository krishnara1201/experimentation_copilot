# Metric/variant dropdowns + type-aware formulas

Date: 2026-08-10

## Problem

`PlanningPanel.tsx` and `AnalysisPanel.tsx` both require the user to type a
raw numeric metric ID, and `AnalysisPanel.tsx` collects "Variant A/B
successes/total" with no binding to a real `Variant`. `listMetrics`/
`listVariants` already exist and are used elsewhere (`MetricsPanel.tsx`,
`VariantsPanel.tsx`), so both panels can be wired into dropdowns.

Separately, `Metric.type` (`binary` | `continuous`) is already stored on
every metric, but every formula in `app/stats/` is hardcoded to the
two-proportion (binary) case. Once metric selection goes through a
dropdown, the metric's type is known up front and should drive which
formulas run and which inputs the UI asks for — today a continuous metric
silently gets binary math (successes/total makes no sense for it).

## Goals

- Planning and Analysis panels select metric (and, in Analysis, variant)
  by name from a dropdown instead of typing raw IDs.
- The selected metric's `type` determines which stats formulas run and
  which numeric inputs the form asks for (no manual type re-entry).
- Continuous metrics get correct sample-size/MDE/significance/CI/uplift
  formulas (Welch's t-test based), not proportion math.

## Non-goals

- Persisting variant identity on `Analysis_Run` (it isn't today; this is a
  frontend-only labeling aid — see "Variant pickers" below).
- Raw-observation input for continuous metrics (mean/std/n only).
- Any change to SRM's role in the decision summary flow, beyond making its
  math correct and type-agnostic (see the bug fix below).

## Design

### 1. Backend — stats formulas (`app/stats/`)

**`calculators.py`** — add, alongside the existing binary
`calculate_sample_size` / `calculate_minimum_detectable_effect`:

```python
def calculate_sample_size_continuous(sigma: float, mde: float, alpha: float = 0.05, power: float = 0.8) -> int:
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    numerator = 2 * (z_alpha + z_beta) ** 2 * sigma ** 2
    denominator = mde ** 2
    return math.ceil(numerator / denominator)

def calculate_minimum_detectable_effect_continuous(sigma: float, n: int, alpha: float = 0.05, power: float = 0.8) -> float:
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    se = sigma * math.sqrt(2 / n)
    return (z_alpha + z_beta) * se
```

Same normal-approximation style as the existing binary functions, but
using metric variance (`sigma**2`) in place of `p*(1-p)`.

**`stat_analysis.py`** — add continuous counterparts using Welch's t-test
(unequal-variance, Welch–Satterthwaite df), mirroring the existing
z-test functions' shape:

```python
def _welch_df(std1, n1, std2, n2) -> float:
    return (std1**2/n1 + std2**2/n2)**2 / ((std1**2/n1)**2/(n1-1) + (std2**2/n2)**2/(n2-1))

def calculate_result_significance_continuous(mean1, mean2, std1, std2, n1, n2, alpha=0.05, test_type=test_type.TWO_SIDED) -> bool: ...
def calculate_result_p_value_continuous(mean1, mean2, std1, std2, n1, n2, test_type=test_type.TWO_SIDED) -> float: ...
def calculate_result_ci_continuous(mean1, mean2, std1, std2, n1, n2, alpha=0.05, test_type=test_type.TWO_SIDED) -> tuple: ...
```

Each follows the existing z-test function it parallels, but computes
`se = sqrt(std1**2/n1 + std2**2/n2)`, `df = _welch_df(...)`, and uses
`scipy.stats.t` (with `df`) instead of `scipy.stats.norm`.
`calculate_uplift(x1, x2, mode)` is reused unchanged for both metric
types — it's already generic over any two floats.

**Bug fix — `calculate_srm`:** the current signature
`calculate_srm(p1, p2, n1, n2, alpha)` computes
`expected_p1 = n1/total_n` and `observed_p1 = p1*n1/total_n`, mixing a
conversion rate (`p1`, range `[0,1]`) into what should be a pure
sample-ratio-mismatch check on allocation *counts*. This is already
mathematically incoherent for binary metrics, and can't work at all for
continuous ones (means aren't proportions). Rewritten to be metric-type
agnostic:

```python
def calculate_srm(n1: int, n2: int, expected_ratio: float = 0.5, alpha: float = 0.05) -> float:
    total_n = n1 + n2
    expected_n1 = total_n * expected_ratio
    expected_n2 = total_n * (1 - expected_ratio)
    chi_squared_stat = ((n1 - expected_n1) ** 2 / expected_n1) + ((n2 - expected_n2) ** 2 / expected_n2)
    return 1 - stats.chi2.cdf(chi_squared_stat, df=1)
```

This is a standard chi-square goodness-of-fit test on the two sample
counts against the expected split. It changes the numeric SRM output for
existing binary runs too (the old output was not a meaningful SRM
p-value), which is intended — it's a correctness fix, not a new feature.

**`summary.py`** — `decision_summary.__init__` takes a `metric_type:
Metric_type` plus either `(p1, p2)` (binary) or
`(mean1, std1, mean2, std2)` (continuous), always `(n1, n2)`.
`generate_summary()` branches once, calling the binary or continuous
significance/p-value/CI/uplift functions accordingly, then computes SRM
via `calculate_srm(self.n1, self.n2, alpha=self.alpha)` regardless of
type. `generate_summary_text()` is unchanged — it only reads the
resulting dict, which has the same shape for both metric types.

### 2. Backend — API & worker plumbing

**`/api/experiments/{id}/sample-size` and `/mde`**
(`app/api/routes/experiments.py`): both already fetch the `Metric` row to
validate ownership — reuse that lookup. Add an optional `std_dev: float |
None = None` query param. If `metric.type == Metric_type.CONTINUOUS`:
require `std_dev` (400 if missing) and call the `_continuous` calculator
with `sigma=std_dev, mde=effect_size`. If `BINARY`: unchanged, uses
`base_rate` as `p1`. Response body gains `"metric_type": metric.type` so
the frontend doesn't have to separately track which branch ran.

**`/api/experiments/{id}/run-analysis`**: extends params — existing
`variant_a_successes`/`variant_b_successes` become `int | None = None`,
and four new `float | None = None` params are added:
`variant_a_mean`, `variant_a_std`, `variant_b_mean`, `variant_b_std`.
`variant_a_total`/`variant_b_total` stay required (they're the sample
size either way). After fetching `metric`, validate the right subset is
present for `metric.type` (400 with a clear message if not), then pass
`metric.type.value` plus whichever fields are populated through to
`run_analysis.apply_async`.

**`run_analysis` task** (`app/tasks/worker.py`): signature grows to
`(self, experiment_id, metric_id, metric_type_val, variant_a_total,
variant_b_total, variant_a_successes, variant_b_successes,
variant_a_mean, variant_a_std, variant_b_mean, variant_b_std, alpha,
test_type_val, uplift_mode_val)` — unused fields for the given type are
passed as `None`. Body reconstructs `Metric_type(metric_type_val)` and
builds `decision_summary(...)` with the binary or continuous kwargs.
`Metric_type` is imported from `app.db.models.metric_model`, which is
safe per the existing model-registry note in `CLAUDE.md`
(`app/db/models/__init__.py` already imports every model).

### 3. Frontend — Planning tab (`PlanningPanel.tsx`)

Both `SampleSizeCard` and `MdeCard`:

- `useQuery(['experiments', experimentId, 'metrics'], () =>
  listMetrics(experimentId))`.
- Replace the "Metric ID" number `Field` with a `Select` populated as
  `<option value={m.id}>{m.name} ({m.type})</option>`.
- Derive `selectedMetric = data?.metrics.find(m => m.id === Number(metricId))`
  and `metricType = selectedMetric?.type`.
- When `metricType === 'binary'`: keep the "Base rate" field as today.
  When `'continuous'`: swap that one field for "Std dev (σ)", passed as
  `std_dev` instead of `base_rate`. Alpha/Power/Effect size stay for
  both — effect size is already an absolute delta, which is the
  requested unit for continuous too.
- `calculateSampleSize`/`calculateMde` (`api/experiments.ts`) input types
  gain an optional `std_dev?: number`.

### 4. Frontend — Analysis tab (`AnalysisPanel.tsx`)

- `useQuery` for both `listMetrics(experimentId)` and
  `listVariants(experimentId)`.
- "Metric ID" becomes a `Select`, same pattern as Planning. Selected
  metric's `type` drives the input-field branch below.
- Add "Variant A" / "Variant B" `Select`s populated from `listVariants`.
  These are **frontend-only labels** — `Analysis_Run` doesn't persist
  variant identity today (confirmed: no `variant_id` column, and the
  route never looks one up), so nothing new is sent to the backend for
  variant selection. Selecting a variant just relabels the fields below
  (e.g. "Successes" → "Control successes") so the user knows which real
  variant's numbers they're entering; the numeric values are still typed
  in by hand because raw results aren't stored anywhere in this app.
- Numeric inputs swap based on the selected metric's type:
  - binary (today's fields, relabeled with variant names when picked):
    successes + total per variant.
  - continuous: mean + std dev + sample size (n) per variant, using new
    `variant_a_mean`/`variant_a_std`/`variant_b_mean`/`variant_b_std`
    fields (total/n field is reused for both types).
- `RunAnalysisInput` (`api/experiments.ts`) gains the four optional
  continuous fields and makes the two `*_successes` fields optional.

## Testing

No test suite exists in this repo (per `CLAUDE.md`). Verification is
manual, per the backend-verification recipe in `CLAUDE.md` (`pgserver` +
`ASGITransport` + `.apply()`-in-a-thread for the worker) plus running the
frontend dev server:

- Binary metric: sample-size/MDE calculators and run-analysis produce the
  same results as before this change (regression check on the
  proportion-based path), except the SRM p-value, which is expected to
  change (bug fix).
- Continuous metric: sample-size/MDE calculators accept `std_dev` and
  return sane values; run-analysis with mean/std/n per variant completes
  and produces a sensible significance/CI/uplift/SRM summary.
- Dropdowns: Planning and Analysis panels populate metric (and, in
  Analysis, variant) options from the real experiment data; switching
  metric type in the dropdown swaps the visible input fields without a
  page reload.
