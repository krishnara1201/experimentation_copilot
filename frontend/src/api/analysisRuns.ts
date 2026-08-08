import { apiRequest } from './client';

export interface AnalysisRunStatus {
  id: number;
  status: string;
  error?: string | null;
}

export function getAnalysisRunStatus(analysisRunId: number): Promise<AnalysisRunStatus> {
  return apiRequest(`/api/analysis-runs/${analysisRunId}`);
}

export function getAnalysisSummary(experimentId: number): Promise<unknown> {
  return apiRequest(`/api/analysis-runs/${experimentId}/summary`);
}

export function getAnalysisResult(experimentId: number): Promise<string> {
  return apiRequest(`/api/analysis-runs/${experimentId}/result`);
}
