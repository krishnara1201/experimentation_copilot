import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { calculateMde, calculateSampleSize } from '../../api/experiments';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-lg bg-primary-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary-700">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary-900">{value}</p>
    </div>
  );
}

export default function PlanningPanel({ experimentId }: { experimentId: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <SampleSizeCard experimentId={experimentId} />
      <MdeCard experimentId={experimentId} />
    </div>
  );
}

function SampleSizeCard({ experimentId }: { experimentId: number }) {
  const [metricId, setMetricId] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [effectSize, setEffectSize] = useState(0.05);
  const [baseRate, setBaseRate] = useState(0.5);

  const mutation = useMutation({
    mutationFn: () =>
      calculateSampleSize(experimentId, {
        metric_id: Number(metricId),
        alpha,
        power,
        effect_size: effectSize,
        base_rate: baseRate,
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
        <Field
          label="Metric ID"
          type="number"
          value={metricId}
          onChange={(event) => setMetricId(event.target.value)}
          required
        />
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
          <Field
            label="Base rate"
            type="number"
            step="0.01"
            value={baseRate}
            onChange={(event) => setBaseRate(Number(event.target.value))}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Calculating…' : 'Calculate'}
        </Button>
        {mutation.isError && <ErrorBanner message={getErrorMessage(mutation.error, 'Calculation failed.')} />}
        {mutation.isSuccess && (
          <ResultStat label="Required sample size per variant" value={String(mutation.data.sample_size)} />
        )}
      </form>
    </Card>
  );
}

function MdeCard({ experimentId }: { experimentId: number }) {
  const [metricId, setMetricId] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [sampleSize, setSampleSize] = useState(1000);
  const [baseRate, setBaseRate] = useState(0.5);

  const mutation = useMutation({
    mutationFn: () =>
      calculateMde(experimentId, {
        metric_id: Number(metricId),
        alpha,
        power,
        sample_size: sampleSize,
        base_rate: baseRate,
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
        <Field
          label="Metric ID"
          type="number"
          value={metricId}
          onChange={(event) => setMetricId(event.target.value)}
          required
        />
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
          <Field
            label="Base rate"
            type="number"
            step="0.01"
            value={baseRate}
            onChange={(event) => setBaseRate(Number(event.target.value))}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Calculating…' : 'Calculate'}
        </Button>
        {mutation.isError && <ErrorBanner message={getErrorMessage(mutation.error, 'Calculation failed.')} />}
        {mutation.isSuccess && (
          <ResultStat
            label="Minimum detectable effect"
            value={mutation.data.minimum_detectable_effect.toFixed(4)}
          />
        )}
      </form>
    </Card>
  );
}
