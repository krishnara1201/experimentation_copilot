import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalysisPanel from './AnalysisPanel';

const runAnalysisMock = vi.fn();
const getStatusMock = vi.fn();

vi.mock('../../api/experiments', () => ({
  runAnalysis: (...args: unknown[]) => runAnalysisMock(...args),
}));

vi.mock('../../api/analysisRuns', () => ({
  getAnalysisRunStatus: (...args: unknown[]) => getStatusMock(...args),
}));

function renderPanel() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AnalysisPanel experimentId={999} />
    </QueryClientProvider>
  );
}

describe('AnalysisPanel', () => {
  beforeEach(() => {
    runAnalysisMock.mockReset();
    getStatusMock.mockReset();
  });

  it('submits run analysis and checks status', async () => {
    runAnalysisMock.mockResolvedValue({ message: 'ok', task_id: 'task-1', analysis_run_id: 7 });
    getStatusMock.mockResolvedValue({ id: 7, status: 'completed', error: null });

    renderPanel();

    await userEvent.type(screen.getByLabelText('Metric ID'), '1');
    await userEvent.type(screen.getByLabelText('Variant A successes'), '50');
    await userEvent.type(screen.getByLabelText('Variant A total'), '1000');
    await userEvent.type(screen.getByLabelText('Variant B successes'), '70');
    await userEvent.type(screen.getByLabelText('Variant B total'), '1000');

    await userEvent.click(screen.getByRole('button', { name: /run analysis/i }));

    await waitFor(() => expect(runAnalysisMock).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /refresh status/i }));

    await waitFor(() => {
      expect(getStatusMock).toHaveBeenCalledWith(7);
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });
});
