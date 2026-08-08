import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { getExperiment } from '../api/experiments';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import AnalysisPanel from './experiment/AnalysisPanel';
import MetricsPanel from './experiment/MetricsPanel';
import OverviewPanel from './experiment/OverviewPanel';
import PlanningPanel from './experiment/PlanningPanel';
import VariantsPanel from './experiment/VariantsPanel';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'variants', label: 'Variants' },
  { key: 'planning', label: 'Planning' },
  { key: 'analysis', label: 'Analysis' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function ExperimentDetailPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const id = Number(experimentId);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['experiments', id],
    queryFn: () => getExperiment(id),
    enabled: Number.isFinite(id),
  });

  if (!Number.isFinite(id)) {
    return <ErrorBanner message="Invalid experiment id." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/experiments" className="text-sm text-primary hover:underline">
          ← Back to experiments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {data ? data.experiment.name : isLoading ? 'Loading…' : 'Experiment'}
        </h1>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load experiment.')} />}

      {data && (
        <>
          <div className="flex gap-2 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewPanel experiment={data.experiment} />}
          {activeTab === 'metrics' && <MetricsPanel experimentId={id} />}
          {activeTab === 'variants' && <VariantsPanel experimentId={id} />}
          {activeTab === 'planning' && <PlanningPanel experimentId={id} />}
          {activeTab === 'analysis' && <AnalysisPanel experimentId={id} />}
        </>
      )}
    </div>
  );
}
