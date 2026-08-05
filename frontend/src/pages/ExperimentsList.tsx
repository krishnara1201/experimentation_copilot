import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExperiments } from '../services/api';

const ExperimentsList: React.FC = () => {
    const { data: experiments, isLoading, error } = useQuery('experiments', fetchExperiments);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading experiments</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Experiments List</h1>
            <table className="min-w-full bg-white border border-gray-200">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b">Experiment Name</th>
                        <th className="py-2 px-4 border-b">Status</th>
                        <th className="py-2 px-4 border-b">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {experiments.map((experiment) => (
                        <tr key={experiment.id}>
                            <td className="py-2 px-4 border-b">{experiment.name}</td>
                            <td className="py-2 px-4 border-b">{experiment.status}</td>
                            <td className="py-2 px-4 border-b">
                                <button className="text-blue-500">Edit</button>
                                <button className="text-red-500 ml-2">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ExperimentsList;