import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExperimentFormModal from './ExperimentFormModal';

const createExperimentMock = vi.fn();

vi.mock('../api/experiments', () => ({
  createExperiment: (...args: unknown[]) => createExperimentMock(...args),
}));

function renderWithClient(onClose: () => void) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ExperimentFormModal onClose={onClose} />
    </QueryClientProvider>
  );
}

describe('ExperimentFormModal', () => {
  beforeEach(() => createExperimentMock.mockReset());

  it('submits and closes on success', async () => {
    createExperimentMock.mockResolvedValue({ message: 'ok' });
    const onClose = vi.fn();

    renderWithClient(onClose);

    await userEvent.type(screen.getByLabelText('Name'), 'Checkout test');
    await userEvent.type(screen.getByLabelText('Description'), 'desc');
    await userEvent.click(screen.getByRole('button', { name: /create experiment/i }));

    await waitFor(() => {
      expect(createExperimentMock).toHaveBeenCalledWith('Checkout test', 'desc');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
