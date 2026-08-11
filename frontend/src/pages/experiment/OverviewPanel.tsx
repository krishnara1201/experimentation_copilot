import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { deleteExperiment } from '../../api/experiments';
import EditExperimentModal from '../../components/EditExperimentModal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { statusTone } from '../../lib/statusTone';
import type { Experiment } from '../../types/api';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function OverviewPanel({ experiment }: { experiment: Experiment }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteExperiment(experiment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      navigate('/experiments');
    },
    onError: (err) => setError(getErrorMessage(err, 'Failed to delete experiment.')),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete experiment "${experiment.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const fields: Array<[string, string]> = [
    ['Description', experiment.description || '—'],
    ['Hypothesis', experiment.hypothesis || '—'],
    ['Unit of randomization', experiment.unit_of_randomization || '—'],
    ['Start date', experiment.start_date ?? '—'],
    ['End date', experiment.end_date ?? '—'],
    ['Created', formatDate(experiment.created_at)],
  ];

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-sm font-medium text-slate-500">Status</span>
        <Badge tone={statusTone[experiment.status] ?? 'slate'}>{experiment.status}</Badge>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="mt-6 flex gap-2 border-t border-slate-100 pt-6">
        <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete experiment'}
        </Button>
      </div>
      {isEditing && <EditExperimentModal experiment={experiment} onClose={() => setIsEditing(false)} />}
    </Card>
  );
}
