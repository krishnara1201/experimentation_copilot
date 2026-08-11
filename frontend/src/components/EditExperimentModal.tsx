import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../api/client';
import { updateExperiment } from '../api/experiments';
import type { Experiment, ExperimentStatus } from '../types/api';
import Button from './ui/Button';
import ErrorBanner from './ui/ErrorBanner';
import Field from './ui/Field';
import Modal from './ui/Modal';
import Select from './ui/Select';

const STATUS_OPTIONS: ExperimentStatus[] = ['draft', 'running', 'completed', 'paused', 'cancelled'];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function EditExperimentModal({
  experiment,
  onClose,
}: {
  experiment: Experiment;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(experiment.name);
  const [description, setDescription] = useState(experiment.description ?? '');
  const [hypothesis, setHypothesis] = useState(experiment.hypothesis ?? '');
  const [unitOfRandomization, setUnitOfRandomization] = useState(experiment.unit_of_randomization ?? '');
  const [startDate, setStartDate] = useState(experiment.start_date ?? '');
  const [endDate, setEndDate] = useState(experiment.end_date ?? '');
  const [status, setStatus] = useState<ExperimentStatus>(experiment.status);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateExperiment(experiment.id, {
        name,
        description,
        hypothesis,
        unit_of_randomization: unitOfRandomization,
        // Omit rather than send "" — the backend's date field rejects an empty
        // string, and omitting leaves the existing value (or absence of one)
        // untouched via the partial-update handler's exclude_unset behavior.
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate();
  };

  return (
    <Modal title="Edit experiment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        <Field label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Field label="Hypothesis" value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} />
        <Field
          label="Unit of randomization"
          value={unitOfRandomization}
          onChange={(event) => setUnitOfRandomization(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Field label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as ExperimentStatus)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {capitalize(option)}
            </option>
          ))}
        </Select>
        {updateMutation.isError && (
          <ErrorBanner message={getErrorMessage(updateMutation.error, 'Failed to update experiment.')} />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
