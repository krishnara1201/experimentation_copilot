import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './styles/tailwind.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CreateExperimentWizard from './pages/CreateExperimentWizard';
import ExperimentsList from './pages/ExperimentsList';
import PlanningPage from './pages/PlanningPage';
import ResultsDashboard from './pages/ResultsDashboard';
import SummaryPage from './pages/SummaryPage';
import UploadPage from './pages/UploadPage';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-experiment" element={<CreateExperimentWizard />} />
          <Route path="/experiments" element={<ExperimentsList />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/results" element={<ResultsDashboard />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;