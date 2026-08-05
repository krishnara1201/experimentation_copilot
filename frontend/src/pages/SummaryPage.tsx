import React from 'react';

const SummaryPage: React.FC = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Summary</h1>
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold">Final Decision</h2>
                <p className="mt-2">Based on the analysis, we recommend the following:</p>
                <div className="mt-4">
                    <h3 className="font-bold">Recommendation:</h3>
                    <p>Implement the proposed changes to improve performance.</p>
                </div>
                <div className="mt-4">
                    <h3 className="font-bold">Evidence:</h3>
                    <ul className="list-disc list-inside">
                        <li>Data point 1 supporting the recommendation.</li>
                        <li>Data point 2 supporting the recommendation.</li>
                        <li>Data point 3 supporting the recommendation.</li>
                    </ul>
                </div>
                <button className="mt-6 bg-blue-500 text-white py-2 px-4 rounded">
                    Export Summary
                </button>
            </div>
        </div>
    );
};

export default SummaryPage;