import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => {
    return (
        <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            {...props}
        >
            {children}
        </button>
    );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ ...props }) => {
    return (
        <input
            className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...props}
        />
    );
};

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, ...props }) => {
    return (
        <label className="block text-sm font-medium text-gray-700" {...props}>
            {children}
        </label>
    );
};