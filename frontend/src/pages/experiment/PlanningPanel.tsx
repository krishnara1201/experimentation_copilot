import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { calculateMde, calculateSampleSize, listMetrics } from '../../api/experiments';
import NormalDistributionChart from '../../components/charts/NormalDistributionChart';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import type { Metric } from '../../types/api';

const BASELINE_COLOR = '#4f46e5';
const SHIFTED_COLOR = '#f97316';

function effectCurves(isContinuous: boolean, baseRate: number, stdDev: number, effect: number) {
  if (isContinuous) {
    return [
      { label: 'Baseline', mean: 0, stdDev, color: BASELINE_COLOR },
      { label: 'Baseline + effect', mean: effect, stdDev, color: SHIFTED_COLOR },
    ];
  }
  const shiftedRate = baseRate + effect;
  const baselineStdDev = Math.sqrt(Math.max(baseRate * (1 - baseRate), 0.0001));
  const shiftedStdDev = Math.sqrt(Math.max(shiftedRate * (1 - shiftedRate), 0.0001));
  return [
    { label: 'Baseline rate', mean: baseRate, stdDev: baselineStdDev, color: BASELINE_COLOR },
    { label: 'Baseline + effect', mean: shiftedRate, stdDev: shiftedStdDev, color: SHIFTED_COLOR },
  ];
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-lg bg-primary-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary-700">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary-900">{value}</p>
    </div>
  );
}

function MetricSelect({
  metrics,
  value,
  onChange,
}: {
  metrics: Metric[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select label="Metric" value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="" disabled>
        Select a metric…
      </option>
      {metrics.map((metric) => (
        <option key={metric.id} value={metric.id}>
          {metric.name} ({metric.type})
        </option>
      ))}
    </Select>
  );
}

export default function PlanningPanel({ experimentId }: { experimentId: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['experiments', experimentId, 'metrics'],
    queryFn: () => listMetrics(experimentId),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorBanner message={getErrorMessage(error, 'Failed to load metrics.')} />;

  const metrics = data?.metrics ?? [];

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <SampleSizeCard experimentId={experimentId} metrics={metrics} />
      <MdeCard experimentId={experimentId} metrics={metrics} />
    </div>
  );
}

function SampleSizeCard({ experimentId, metrics }: { experimentId: number; metrics: Metric[] }) {
  const [metricId, setMetricId] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [effectSize, setEffectSize] = useState(0.05);
  const [baseRate, setBaseRate] = useState(0.5);
  const [stdDev, setStdDev] = useState(1);

  const selectedMetric = metrics.find((metric) => metric.id === Number(metricId));
  const isContinuous = selectedMetric?.type === 'continuous';

  const mutation = useMutation({
    mutationFn: () =>
      calculateSampleSize(experimentId, {
        metric_id: Number(metricId),
        alpha,
        power,
        effect_size: effectSize,
        base_rate: isContinuous ? undefined : baseRate,
        std_dev: isContinuous ? stdDev : undefined,
      }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!metricId) return;
    mutation.mutate();
  };

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Sample size calculator</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MetricSelect metrics={metrics} value={metricId} onChange={setMetricId} />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Alpha"
            type="number"
            step="0.01"
            value={alpha}
            onChange={(event) => setAlpha(Number(event.target.value))}
          />
          <Field
            label="Power"
            type="number"
            step="0.01"
            value={power}
            onChange={(event) => setPower(Number(event.target.value))}
          />
          <Field
            label="Effect size"
            type="number"
            step="0.01"
            value={effectSize}
            onChange={(event) => setEffectSize(Number(event.target.value))}
          />
          {isContinuous ? (
            <Field
              label="Std dev (σ)"
              type="number"
              step="0.01"
              value={stdDev}
              onChange={(event) => setStdDev(Number(event.target.value))}
            />
          ) : (
            <Field
              label="Base rate"
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(event) => setBaseRate(Number(event.target.value))}
            />
          )}
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Calculating…' : 'Calculate'}
        </Button>
        {mutation.isError && <ErrorBanner message={getErrorMessage(mutation.error, 'Calculation failed.')} />}
        {mutation.isSuccess && (
          <>
            <ResultStat label="Required sample size per variant" value={String(mutation.data.sample_size)} />
            <NormalDistributionChart curves={effectCurves(isContinuous, baseRate, stdDev, effectSize)} />
          </>
        )}
      </form>
    </Card>
  );
}

function MdeCard({ experimentId, metrics }: { experimentId: number; metrics: Metric[] }) {
  const [metricId, setMetricId] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [sampleSize, setSampleSize] = useState(1000);
  const [baseRate, setBaseRate] = useState(0.5);
  const [stdDev, setStdDev] = useState(1);

  const selectedMetric = metrics.find((metric) => metric.id === Number(metricId));
  const isContinuous = selectedMetric?.type === 'continuous';

  const mutation = useMutation({
    mutationFn: () =>
      calculateMde(experimentId, {
        metric_id: Number(metricId),
        alpha,
        power,
        sample_size: sampleSize,
        base_rate: isContinuous ? undefined : baseRate,
        std_dev: isContinuous ? stdDev : undefined,
      }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!metricId) return;
    mutation.mutate();
  };

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Minimum detectable effect</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MetricSelect metrics={metrics} value={metricId} onChange={setMetricId} />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Alpha"
            type="number"
            step="0.01"
            value={alpha}
            onChange={(event) => setAlpha(Number(event.target.value))}
          />
          <Field
            label="Power"
            type="number"
            step="0.01"
            value={power}
            onChange={(event) => setPower(Number(event.target.value))}
          />
          <Field
            label="Sample size"
            type="number"
            value={sampleSize}
            onChange={(event) => setSampleSize(Number(event.target.value))}
          />
          {isContinuous ? (
            <Field
              label="Std dev (σ)"
              type="number"
              step="0.01"
              value={stdDev}
              onChange={(event) => setStdDev(Number(event.target.value))}
            />
          ) : (
            <Field
              label="Base rate"
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(event) => setBaseRate(Number(event.target.value))}
            />
          )}
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Calculating…' : 'Calculate'}
        </Button>
        {mutation.isError && <ErrorBanner message={getErrorMessage(mutation.error, 'Calculation failed.')} />}
        {mutation.isSuccess && (
          <>
            <ResultStat
              label="Minimum detectable effect"
              value={mutation.data.minimum_detectable_effect.toFixed(4)}
            />
            <NormalDistributionChart
              curves={effectCurves(isContinuous, baseRate, stdDev, mutation.data.minimum_detectable_effect)}
            />
          </>
        )}
      </form>
    </Card>
  );
}
