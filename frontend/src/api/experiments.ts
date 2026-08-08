import { apiRequest } from './client';
import type { Experiment, Metric, MetricDirection, MetricType, TestType, UpliftMode, Variant } from '../types/api';

export function listExperiments(): Promise<{ experiments: Experiment[] }> {
  return apiRequest('/api/experiments/');
}

export function getExperiment(id: number): Promise<{ experiment: Experiment }> {
  return apiRequest(`/api/experiments/${id}`);
}

export function createExperiment(name: string, description: string): Promise<{ message: string }> {
  return apiRequest('/api/experiments/', { method: 'POST', params: { name, description } });
}

export function deleteExperiment(id: number): Promise<{ message: string }> {
  return apiRequest(`/api/experiments/${id}`, { method: 'DELETE' });
}

export function listMetrics(experimentId: number): Promise<{ metrics: Metric[] }> {
  return apiRequest(`/api/experiments/${experimentId}/metrics`);
}

export interface CreateMetricInput {
  metric_name: string;
  metric_type: MetricType;
  metric_direction: MetricDirection;
  is_primary: boolean;
  is_guardrail: boolean;
}

export function createMetric(
  experimentId: number,
  input: CreateMetricInput
): Promise<{ message: string; metric: Metric }> {
  return apiRequest(`/api/experiments/${experimentId}/metrics`, { method: 'POST', params: { ...input } });
}

export function deleteMetric(experimentId: number, metricId: number): Promise<{ message: string }> {
  return apiRequest(`/api/experiments/${experimentId}/metrics/${metricId}`, { method: 'DELETE' });
}

export function listVariants(experimentId: number): Promise<{ variants: Variant[] }> {
  return apiRequest(`/api/experiments/${experimentId}/variants`);
}

export interface CreateVariantInput {
  variant_name: string;
  is_control: boolean;
  allocation_percentage: number;
}

export function createVariant(
  experimentId: number,
  input: CreateVariantInput
): Promise<{ message: string; variant: Variant }> {
  return apiRequest(`/api/experiments/${experimentId}/variants`, { method: 'POST', params: { ...input } });
}

export function deleteVariant(experimentId: number, variantId: number): Promise<{ message: string }> {
  return apiRequest(`/api/experiments/${experimentId}/variants/${variantId}`, { method: 'DELETE' });
}

export interface SampleSizeInput {
  metric_id: number;
  alpha?: number;
  power?: number;
  effect_size?: number;
  base_rate?: number;
}

export function calculateSampleSize(
  experimentId: number,
  input: SampleSizeInput
): Promise<{ sample_size: number }> {
  return apiRequest(`/api/experiments/${experimentId}/sample-size`, { method: 'POST', params: { ...input } });
}

export interface MdeInput {
  metric_id: number;
  alpha?: number;
  power?: number;
  sample_size?: number;
  base_rate?: number;
}

export function calculateMde(
  experimentId: number,
  input: MdeInput
): Promise<{ minimum_detectable_effect: number }> {
  return apiRequest(`/api/experiments/${experimentId}/mde`, { method: 'POST', params: { ...input } });
}

export interface RunAnalysisInput {
  metric_id: number;
  variant_a_successes: number;
  variant_a_total: number;
  variant_b_successes: number;
  variant_b_total: number;
  alpha?: number;
  uplift_mode?: UpliftMode;
  test_type?: TestType;
}

export function runAnalysis(
  experimentId: number,
  input: RunAnalysisInput
): Promise<{ message: string; task_id: string; analysis_run_id: number }> {
  return apiRequest(`/api/experiments/${experimentId}/run-analysis`, { method: 'POST', params: { ...input } });
}
