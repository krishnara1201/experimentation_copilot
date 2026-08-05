import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchResults } from '../services/api';
import PlotlyChart from '../components/Charts/PlotlyChart';
import RechartsChart from '../components/Charts/RechartsChart';

const ResultsDashboard: React.FC = () => {
    const { data, error, isLoading } = useQuery(['results'], fetchResults);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading results</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Results Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-xl font-semibold">KPI Overview</h2>
                    {/* Render KPI cards here */}
                </div>
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-xl font-semibold">Uncertainty Analysis</h2>
                    <PlotlyChart data={data.plotlyData} />
                </div>
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-xl font-semibold">Detailed Results</h2>
                    <RechartsChart data={data.rechartsData} />
                </div>
            </div>
        </div>
    );
};

export default ResultsDashboard;