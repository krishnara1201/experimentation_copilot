import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../../api/client';
import { createVariant, deleteVariant, listVariants } from '../../api/experiments';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Field from '../../components/ui/Field';
import Spinner from '../../components/ui/Spinner';
import type { Variant } from '../../types/api';

export default function VariantsPanel({ experimentId }: { experimentId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ['experiments', experimentId, 'variants'];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => listVariants(experimentId),
  });

  const [name, setName] = useState('');
  const [isControl, setIsControl] = useState(false);
  const [allocation, setAllocation] = useState(50);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createVariant(experimentId, {
        variant_name: name,
        is_control: isControl,
        allocation_percentage: allocation,
      }),
    onSuccess: () => {
      setName('');
      setIsControl(false);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Failed to create variant.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: number) => deleteVariant(experimentId, variantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (allocation < 0 || allocation > 100) {
      setFormError('Allocation percentage must be between 0 and 100.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Add variant</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Field
            label="Allocation %"
            type="number"
            min={0}
            max={100}
            value={allocation}
            onChange={(event) => setAllocation(Number(event.target.value))}
          />
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isControl}
              onChange={(event) => setIsControl(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-100"
            />
            Control
          </label>
          {formError && (
            <div className="sm:col-span-3">
              <ErrorBanner message={formError} />
            </div>
          )}
          <div className="sm:col-span-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add variant'}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load variants.')} />}
      {data && data.variants.length === 0 && (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No variants yet"
          description="Add a variant above, such as a control and a treatment."
        />
      )}
      {data && data.variants.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data.variants.map((variant: Variant) => (
            <li key={variant.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  {variant.name}
                  {variant.is_control && <Badge tone="slate">control</Badge>}
                </p>
                <p className="mt-1 text-xs text-slate-500">{variant.allocation_percentage}% allocation</p>
              </div>
              <Button
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => deleteMutation.mutate(variant.id)}
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
