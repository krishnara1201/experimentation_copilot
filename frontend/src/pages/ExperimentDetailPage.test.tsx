import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExperimentDetailPage from './ExperimentDetailPage';

vi.mock('../api/experiments', () => ({
  getExperiment: vi.fn(async () => ({
    experiment: {
      id: 1,
      name: 'Experiment A',
      description: 'desc',
      owner_id: 1,
      status: 'draft',
      hypothesis: null,
      unit_of_randomization: null,
      start_date: null,
      end_date: null,
      created_at: '2026-01-01T00:00:00',
    },
  })),
}));

vi.mock('./experiment/MetricsPanel', () => ({ default: () => <div>Metrics panel</div> }));
vi.mock('./experiment/VariantsPanel', () => ({ default: () => <div>Variants panel</div> }));
vi.mock('./experiment/PlanningPanel', () => ({ default: () => <div>Planning panel</div> }));
vi.mock('./experiment/AnalysisPanel', () => ({ default: () => <div>Analysis panel</div> }));

describe('ExperimentDetailPage', () => {
  it('renders and switches tabs', async () => {
    const client = new QueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/experiments/1']}>
          <Routes>
            <Route path="/experiments/:experimentId" element={<ExperimentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Experiment A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /metrics/i }));
    expect(screen.getByText('Metrics panel')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /analysis/i }));
    expect(screen.getByText('Analysis panel')).toBeInTheDocument();
  });
});
