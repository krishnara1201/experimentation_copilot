import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '../api/client';
import { createExperiment } from '../api/experiments';
import Button from './ui/Button';
import ErrorBanner from './ui/ErrorBanner';
import Field from './ui/Field';
import Modal from './ui/Modal';

export default function ExperimentFormModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createExperiment(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <Modal title="New experiment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        <Field label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        {createMutation.isError && (
          <ErrorBanner message={getErrorMessage(createMutation.error, 'Failed to create experiment.')} />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create experiment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
