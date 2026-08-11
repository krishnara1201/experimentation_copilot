import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getAnalysisResult, getAnalysisRunStatus, getAnalysisSummary } from '../../api/analysisRuns';
import { getErrorMessage } from '../../api/client';
import { listMetrics, listVariants, runAnalysis } from '../../api/experiments';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import type { TestType, UpliftMode } from '../../types/api';

function statusTone(status: string): BadgeTone {
  const value = status.toLowerCase();
  if (value.includes('success') || value.includes('complete')) return 'green';
  if (value.includes('fail') || value.includes('error')) return 'red';
  if (value.includes('pending') || value.includes('start') || value.includes('progress')) return 'amber';
  return 'slate';
}

export default function AnalysisPanel({ experimentId }: { experimentId: number }) {
  const metricsQuery = useQuery({
    queryKey: ['experiments', experimentId, 'metrics'],
    queryFn: () => listMetrics(experimentId),
  });
  const variantsQuery = useQuery({
    queryKey: ['experiments', experimentId, 'variants'],
    queryFn: () => listVariants(experimentId),
  });

  const [metricId, setMetricId] = useState('');
  const [variantAId, setVariantAId] = useState('');
  const [variantBId, setVariantBId] = useState('');
  const [variantASuccesses, setVariantASuccesses] = useState('');
  const [variantATotal, setVariantATotal] = useState('');
  const [variantBSuccesses, setVariantBSuccesses] = useState('');
  const [variantBTotal, setVariantBTotal] = useState('');
  const [variantAMean, setVariantAMean] = useState('');
  const [variantAStd, setVariantAStd] = useState('');
  const [variantBMean, setVariantBMean] = useState('');
  const [variantBStd, setVariantBStd] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [upliftMode, setUpliftMode] = useState<UpliftMode>('absolute');
  const [testType, setTestType] = useState<TestType>('two-sided');

  const metrics = metricsQuery.data?.metrics ?? [];
  const variants = variantsQuery.data?.variants ?? [];
  const selectedMetric = metrics.find((metric) => metric.id === Number(metricId));
  const isContinuous = selectedMetric?.type === 'continuous';
  const variantAName = variants.find((variant) => variant.id === Number(variantAId))?.name ?? 'Variant A';
  const variantBName = variants.find((variant) => variant.id === Number(variantBId))?.name ?? 'Variant B';

  const runMutation = useMutation({
    mutationFn: () =>
      runAnalysis(experimentId, {
        metric_id: Number(metricId),
        variant_a_total: Number(variantATotal),
        variant_b_total: Number(variantBTotal),
        variant_a_successes: isContinuous ? undefined : Number(variantASuccesses),
        variant_b_successes: isContinuous ? undefined : Number(variantBSuccesses),
        variant_a_mean: isContinuous ? Number(variantAMean) : undefined,
        variant_a_std: isContinuous ? Number(variantAStd) : undefined,
        variant_b_mean: isContinuous ? Number(variantBMean) : undefined,
        variant_b_std: isContinuous ? Number(variantBStd) : undefined,
        alpha,
        uplift_mode: upliftMode,
        test_type: testType,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (analysisRunId: number) => getAnalysisRunStatus(analysisRunId),
  });

  const isCompleted = statusMutation.data?.status.toLowerCase() === 'completed';

  const summaryQuery = useQuery({
    queryKey: ['experiments', experimentId, 'analysis-summary', statusMutation.data?.id],
    queryFn: () => getAnalysisSummary(experimentId),
    enabled: isCompleted,
  });
  const resultQuery = useQuery({
    queryKey: ['experiments', experimentId, 'analysis-result', statusMutation.data?.id],
    queryFn: () => getAnalysisResult(experimentId),
    enabled: isCompleted,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runMutation.mutate();
  };

  if (metricsQuery.isLoading || variantsQuery.isLoading) return <Spinner />;
  if (metricsQuery.isError) {
    return <ErrorBanner message={getErrorMessage(metricsQuery.error, 'Failed to load metrics.')} />;
  }
  if (variantsQuery.isError) {
    return <ErrorBanner message={getErrorMessage(variantsQuery.error, 'Failed to load variants.')} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Run analysis</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Metric" value={metricId} onChange={(event) => setMetricId(event.target.value)} required>
              <option value="" disabled>
                Select a metric…
              </option>
              {metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name} ({metric.type})
                </option>
              ))}
            </Select>
            <Field
              label="Alpha"
              type="number"
              step="0.01"
              value={alpha}
              onChange={(event) => setAlpha(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Variant A" value={variantAId} onChange={(event) => setVariantAId(event.target.value)}>
              <option value="">(unlabeled)</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </Select>
            <Select label="Variant B" value={variantBId} onChange={(event) => setVariantBId(event.target.value)}>
              <option value="">(unlabeled)</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </Select>
          </div>
          {isContinuous ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-3 gap-4">
                <Field
                  label={`${variantAName} mean`}
                  type="number"
                  value={variantAMean}
                  onChange={(event) => setVariantAMean(event.target.value)}
                  required
                />
                <Field
                  label="Std dev"
                  type="number"
                  value={variantAStd}
                  onChange={(event) => setVariantAStd(event.target.value)}
                  required
                />
                <Field
                  label="Sample size"
                  type="number"
                  value={variantATotal}
                  onChange={(event) => setVariantATotal(event.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field
                  label={`${variantBName} mean`}
                  type="number"
                  value={variantBMean}
                  onChange={(event) => setVariantBMean(event.target.value)}
                  required
                />
                <Field
                  label="Std dev"
                  type="number"
                  value={variantBStd}
                  onChange={(event) => setVariantBStd(event.target.value)}
                  required
                />
                <Field
                  label="Sample size"
                  type="number"
                  value={variantBTotal}
                  onChange={(event) => setVariantBTotal(event.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={`${variantAName} successes`}
                  type="number"
                  value={variantASuccesses}
                  onChange={(event) => setVariantASuccesses(event.target.value)}
                  required
                />
                <Field
                  label={`${variantAName} total`}
                  type="number"
                  value={variantATotal}
                  onChange={(event) => setVariantATotal(event.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={`${variantBName} successes`}
                  type="number"
                  value={variantBSuccesses}
                  onChange={(event) => setVariantBSuccesses(event.target.value)}
                  required
                />
                <Field
                  label={`${variantBName} total`}
                  type="number"
                  value={variantBTotal}
                  onChange={(event) => setVariantBTotal(event.target.value)}
                  required
                />
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Uplift mode"
              value={upliftMode}
              onChange={(event) => setUpliftMode(event.target.value as UpliftMode)}
            >
              <option value="absolute">Absolute</option>
              <option value="relative">Relative</option>
            </Select>
            <Select
              label="Test type"
              value={testType}
              onChange={(event) => setTestType(event.target.value as TestType)}
            >
              <option value="two-sided">Two-sided</option>
              <option value="one-sided">One-sided</option>
            </Select>
          </div>
          <Button type="submit" disabled={runMutation.isPending || !metricId}>
            {runMutation.isPending ? 'Starting…' : 'Run analysis'}
          </Button>
          {runMutation.isError && (
            <ErrorBanner message={getErrorMessage(runMutation.error, 'Failed to start analysis.')} />
          )}
          {runMutation.isSuccess && (
            <p className="text-sm text-slate-700">
              Started run <span className="font-semibold">#{runMutation.data.analysis_run_id}</span> (task{' '}
              {runMutation.data.task_id})
            </p>
          )}
        </form>
      </Card>

      {runMutation.isSuccess && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Check status</h3>
          <Button
            variant="secondary"
            onClick={() => statusMutation.mutate(runMutation.data.analysis_run_id)}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? 'Checking…' : 'Refresh status'}
          </Button>
          {statusMutation.isError && (
            <div className="mt-4">
              <ErrorBanner message={getErrorMessage(statusMutation.error, 'Failed to fetch status.')} />
            </div>
          )}
          {statusMutation.isSuccess && (
            <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Run ID</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">#{statusMutation.data.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge tone={statusTone(statusMutation.data.status)}>{statusMutation.data.status}</Badge>
                </dd>
              </div>
              {statusMutation.data.error && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Error</dt>
                  <dd className="mt-1 text-sm text-red-700">{statusMutation.data.error}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}

      {isCompleted && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Results</h3>
          {(summaryQuery.isLoading || resultQuery.isLoading) && <Spinner />}
          {summaryQuery.isError && (
            <ErrorBanner message={getErrorMessage(summaryQuery.error, 'Failed to load analysis summary.')} />
          )}
          {resultQuery.isError && (
            <div className="mt-4">
              <ErrorBanner message={getErrorMessage(resultQuery.error, 'Failed to load analysis result.')} />
            </div>
          )}
          {summaryQuery.isSuccess && (
            <dl className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Significant</dt>
                <dd className="mt-1">
                  <Badge tone={summaryQuery.data.is_significant ? 'green' : 'slate'}>
                    {summaryQuery.data.is_significant ? 'Yes' : 'No'}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">P-value</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{summaryQuery.data.p_value.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Uplift</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{summaryQuery.data.uplift.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Confidence interval</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  [{summaryQuery.data.confidence_interval.lower.toFixed(4)},{' '}
                  {summaryQuery.data.confidence_interval.upper.toFixed(4)}]
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">SRM p-value</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {summaryQuery.data.srm_p_value.toFixed(4)}
                </dd>
              </div>
            </dl>
          )}
          {resultQuery.isSuccess && <p className="mt-4 text-sm text-slate-700">{resultQuery.data}</p>}
        </Card>
      )}
    </div>
  );
}
