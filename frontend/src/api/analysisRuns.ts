import { apiRequest } from './client';

export interface AnalysisRunStatus {
  id: number;
  status: string;
  error?: string | null;
}

export interface AnalysisSummary {
  is_significant: boolean;
  p_value: number;
  confidence_interval: { lower: number; upper: number };
  uplift: number;
  srm_p_value: number;
}

export function getAnalysisRunStatus(analysisRunId: number): Promise<AnalysisRunStatus> {
  return apiRequest(`/api/analysis-runs/${analysisRunId}`);
}

export function getAnalysisSummary(experimentId: number): Promise<AnalysisSummary> {
  return apiRequest(`/api/analysis-runs/${experimentId}/summary`);
}

export function getAnalysisResult(experimentId: number): Promise<string> {
  return apiRequest(`/api/analysis-runs/${experimentId}/result`);
}
