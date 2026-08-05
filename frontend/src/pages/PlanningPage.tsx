import React from 'react';

const PlanningPage: React.FC = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Planning Your Experiment</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-xl font-semibold">Sample Size Calculator</h2>
                    {/* Sample size calculation logic goes here */}
                </div>
                <div className="bg-white shadow-md rounded-lg p-4">
                    <h2 className="text-xl font-semibold">Assumption Editor</h2>
                    {/* Assumption editing logic goes here */}
                </div>
            </div>
            <div className="mt-4">
                <h2 className="text-xl font-semibold">Warnings</h2>
                {/* Warnings for bad assumptions go here */}
            </div>
        </div>
    );
};

export default PlanningPage;