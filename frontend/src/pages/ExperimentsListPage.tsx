import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createExperiment, listExperiments } from '../api/experiments';
import { getErrorMessage } from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ErrorBanner from '../components/ui/ErrorBanner';
import Field from '../components/ui/Field';
import Spinner from '../components/ui/Spinner';
import type { Experiment, ExperimentStatus } from '../types/api';

const statusStyles: Record<ExperimentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  running: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ExperimentsListPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['experiments'],
    queryFn: listExperiments,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createExperiment(name, description),
    onSuccess: () => {
      setName('');
      setDescription('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Failed to create experiment.')),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">New experiment</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Field
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create experiment'}
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Experiments</h2>
        {isLoading && <Spinner />}
        {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load experiments.')} />}
        {data && data.experiments.length === 0 && (
          <p className="text-sm text-slate-500">No experiments yet — create one above.</p>
        )}
        {data && data.experiments.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {data.experiments.map((experiment: Experiment) => (
              <li key={experiment.id} className="flex items-center justify-between px-4 py-3">
                <Link to={`/experiments/${experiment.id}`} className="font-medium text-slate-900 hover:text-primary">
                  {experiment.name}
                </Link>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusStyles[experiment.status] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {experiment.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
