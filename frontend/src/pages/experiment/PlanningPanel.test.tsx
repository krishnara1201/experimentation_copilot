import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanningPanel from './PlanningPanel';

const calculateSampleSizeMock = vi.fn();
const calculateMdeMock = vi.fn();

vi.mock('../../api/experiments', () => ({
  calculateSampleSize: (...args: unknown[]) => calculateSampleSizeMock(...args),
  calculateMde: (...args: unknown[]) => calculateMdeMock(...args),
}));

function renderPanel() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PlanningPanel experimentId={123} />
    </QueryClientProvider>
  );
}

describe('PlanningPanel', () => {
  beforeEach(() => {
    calculateSampleSizeMock.mockReset();
    calculateMdeMock.mockReset();
  });

  it('submits sample size calculation and renders result', async () => {
    calculateSampleSizeMock.mockResolvedValue({ sample_size: 1600 });
    calculateMdeMock.mockResolvedValue({ minimum_detectable_effect: 0.1 });

    renderPanel();

    const metricInputs = screen.getAllByLabelText('Metric ID');
    await userEvent.type(metricInputs[0], '1');
    await userEvent.click(screen.getAllByRole('button', { name: /^calculate$/i })[0]);

    await waitFor(() => {
      expect(calculateSampleSizeMock).toHaveBeenCalled();
      expect(screen.getByText('1600')).toBeInTheDocument();
    });
  });
});
