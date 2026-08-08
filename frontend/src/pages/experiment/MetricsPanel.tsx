import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { createMetric, deleteMetric, listMetrics } from '../../api/experiments';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import type { Metric, MetricDirection, MetricType } from '../../types/api';

export default function MetricsPanel({ experimentId }: { experimentId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ['experiments', experimentId, 'metrics'];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => listMetrics(experimentId),
  });

  const [name, setName] = useState('');
  const [type, setType] = useState<MetricType>('binary');
  const [direction, setDirection] = useState<MetricDirection>('up');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isGuardrail, setIsGuardrail] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createMetric(experimentId, {
        metric_name: name,
        metric_type: type,
        metric_direction: direction,
        is_primary: isPrimary,
        is_guardrail: isGuardrail,
      }),
    onSuccess: () => {
      setName('');
      setIsPrimary(false);
      setIsGuardrail(false);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Failed to create metric.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (metricId: number) => deleteMetric(experimentId, metricId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isPrimary && isGuardrail) {
      setFormError('A metric cannot be both primary and guardrail.');
      return;
    }
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold">Add metric</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value as MetricType)}>
            <option value="binary">Binary</option>
            <option value="continuous">Continuous</option>
          </Select>
          <Select
            label="Direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value as MetricDirection)}
          >
            <option value="up">Up is good</option>
            <option value="down">Down is good</option>
            <option value="neutral">Neutral</option>
          </Select>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
              Primary
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isGuardrail}
                onChange={(event) => setIsGuardrail(event.target.checked)}
              />
              Guardrail
            </label>
          </div>
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add metric'}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load metrics.')} />}
      {data && data.metrics.length === 0 && <p className="text-sm text-slate-500">No metrics yet.</p>}
      {data && data.metrics.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {data.metrics.map((metric: Metric) => (
            <li key={metric.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{metric.name}</p>
                <p className="text-xs text-slate-500">
                  {metric.type} · {metric.direction}
                  {metric.is_primary && ' · primary'}
                  {metric.is_guardrail && ' · guardrail'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => deleteMutation.mutate(metric.id)}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
