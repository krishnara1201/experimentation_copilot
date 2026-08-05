import { useQuery, useMutation } from '@tanstack/react-query';

const API_URL = 'https://your-api-url.com/api'; // Replace with your actual API URL

export const fetchExperiments = async () => {
    const response = await fetch(`${API_URL}/experiments`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export const createExperiment = async (experimentData) => {
    const response = await fetch(`${API_URL}/experiments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(experimentData),
    });
    if (!response.ok) {
        throw new Error('Failed to create experiment');
    }
    return response.json();
};

export const uploadData = async (formData) => {
    const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        throw new Error('Failed to upload data');
    }
    return response.json();
};

export const useExperiments = () => {
    return useQuery(['experiments'], fetchExperiments);
};

export const useCreateExperiment = () => {
    return useMutation(createExperiment);
};

export const useUploadData = () => {
    return useMutation(uploadData);
};