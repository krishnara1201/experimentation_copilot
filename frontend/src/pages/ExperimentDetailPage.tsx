import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Calculator, ClipboardList, Layers, LineChart } from 'lucide-react';
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
  { key: 'overview', label: 'Overview', icon: ClipboardList },
  { key: 'metrics', label: 'Metrics', icon: LineChart },
  { key: 'variants', label: 'Variants', icon: Layers },
  { key: 'planning', label: 'Planning', icon: Calculator },
  { key: 'analysis', label: 'Analysis', icon: BarChart3 },
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
        <Link
          to="/experiments"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to experiments
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {data ? data.experiment.name : isLoading ? 'Loading…' : 'Experiment'}
        </h1>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={getErrorMessage(error, 'Failed to load experiment.')} />}

      {data && (
        <>
          <div className="flex gap-1 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
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
