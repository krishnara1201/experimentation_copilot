import { useQuery } from '@tanstack/react-query';
import { Beaker, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { listExperiments } from '../api/experiments';
import ExperimentFormModal from '../components/ExperimentFormModal';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import { statusTone } from '../lib/statusTone';
import type { Experiment } from '../types/api';

export default function ExperimentsListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['experiments'],
    queryFn: listExperiments,
  });
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
          New experiment
        </Button>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load experiments.')} />}
      {data && data.experiments.length === 0 && (
        <EmptyState
          icon={<Beaker className="h-5 w-5" />}
          title="No experiments yet"
          description="Create your first experiment to start planning and analyzing an A/B test."
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
              New experiment
            </Button>
          }
        />
      )}
      {data && data.experiments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.experiments.map((experiment: Experiment) => (
            <Link
              key={experiment.id}
              to={`/experiments/${experiment.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{experiment.name}</p>
                <Badge tone={statusTone[experiment.status] ?? 'slate'}>{experiment.status}</Badge>
              </div>
              {experiment.hypothesis && (
                <p className="mt-2 truncate text-sm text-slate-500">{experiment.hypothesis}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showModal && <ExperimentFormModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
