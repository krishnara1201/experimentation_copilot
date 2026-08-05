import React, { useState } from 'react';

const UploadPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [manualInput, setManualInput] = useState<string>('');
    const [isManualMode, setIsManualMode] = useState<boolean>(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    const handleManualInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setManualInput(event.target.value);
    };

    const toggleMode = () => {
        setIsManualMode(!isManualMode);
    };

    const handleUpload = () => {
        // Logic to handle file upload or manual input submission
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Upload Analysis Inputs</h1>
            <button onClick={toggleMode} className="mb-4 p-2 bg-blue-500 text-white rounded">
                {isManualMode ? 'Switch to CSV Upload' : 'Switch to Manual Input'}
            </button>
            {isManualMode ? (
                <textarea
                    value={manualInput}
                    onChange={handleManualInputChange}
                    placeholder="Enter your analysis inputs here..."
                    className="w-full h-40 p-2 border rounded"
                />
            ) : (
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="mb-4"
                />
            )}
            <button onClick={handleUpload} className="p-2 bg-green-500 text-white rounded">
                Upload
            </button>
        </div>
    );
};

export default UploadPage;