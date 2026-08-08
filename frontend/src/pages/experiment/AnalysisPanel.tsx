import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getAnalysisRunStatus } from '../../api/analysisRuns';
import { getErrorMessage } from '../../api/client';
import { runAnalysis } from '../../api/experiments';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Select from '../../components/ui/Select';
import type { TestType, UpliftMode } from '../../types/api';

export default function AnalysisPanel({ experimentId }: { experimentId: number }) {
  const [metricId, setMetricId] = useState('');
  const [variantASuccesses, setVariantASuccesses] = useState('');
  const [variantATotal, setVariantATotal] = useState('');
  const [variantBSuccesses, setVariantBSuccesses] = useState('');
  const [variantBTotal, setVariantBTotal] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [upliftMode, setUpliftMode] = useState<UpliftMode>('absolute');
  const [testType, setTestType] = useState<TestType>('two-sided');

  const runMutation = useMutation({
    mutationFn: () =>
      runAnalysis(experimentId, {
        metric_id: Number(metricId),
        variant_a_successes: Number(variantASuccesses),
        variant_a_total: Number(variantATotal),
        variant_b_successes: Number(variantBSuccesses),
        variant_b_total: Number(variantBTotal),
        alpha,
        uplift_mode: upliftMode,
        test_type: testType,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (analysisRunId: number) => getAnalysisRunStatus(analysisRunId),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold">Run analysis</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Metric ID"
              type="number"
              value={metricId}
              onChange={(event) => setMetricId(event.target.value)}
              required
            />
            <Field
              label="Alpha"
              type="number"
              step="0.01"
              value={alpha}
              onChange={(event) => setAlpha(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Variant A successes"
                type="number"
                value={variantASuccesses}
                onChange={(event) => setVariantASuccesses(event.target.value)}
                required
              />
              <Field
                label="Variant A total"
                type="number"
                value={variantATotal}
                onChange={(event) => setVariantATotal(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Variant B successes"
                type="number"
                value={variantBSuccesses}
                onChange={(event) => setVariantBSuccesses(event.target.value)}
                required
              />
              <Field
                label="Variant B total"
                type="number"
                value={variantBTotal}
                onChange={(event) => setVariantBTotal(event.target.value)}
                required
              />
            </div>
          </div>
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
          <Button type="submit" disabled={runMutation.isPending}>
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
          <h3 className="mb-4 text-base font-semibold">Check status</h3>
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
            <pre className="mt-4 overflow-x-auto rounded-md bg-slate-50 p-4 text-xs text-slate-700">
              {JSON.stringify(statusMutation.data, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </div>
  );
}
