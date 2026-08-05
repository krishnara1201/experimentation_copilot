import React, { useState } from 'react';

const CreateExperimentWizard: React.FC = () => {
    const [step, setStep] = useState(1);
    const [experimentData, setExperimentData] = useState({
        name: '',
        description: '',
        // Add other fields as necessary
    });

    const handleNext = () => {
        setStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setStep((prevStep) => Math.max(prevStep - 1, 1));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setExperimentData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2>Step 1: Experiment Details</h2>
                        <input
                            type="text"
                            name="name"
                            placeholder="Experiment Name"
                            value={experimentData.name}
                            onChange={handleChange}
                        />
                        <input
                            type="text"
                            name="description"
                            placeholder="Experiment Description"
                            value={experimentData.description}
                            onChange={handleChange}
                        />
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2>Step 2: Additional Settings</h2>
                        {/* Add additional settings fields here */}
                    </div>
                );
            // Add more steps as needed
            default:
                return null;
        }
    };

    return (
        <div className="p-4">
            {renderStep()}
            <div className="flex justify-between mt-4">
                <button onClick={handleBack} disabled={step === 1}>
                    Back
                </button>
                <button onClick={handleNext}>
                    {step === 2 ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default CreateExperimentWizard;