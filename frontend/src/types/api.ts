export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'paused' | 'cancelled';
export type MetricType = 'binary' | 'continuous';
export type MetricDirection = 'up' | 'down' | 'neutral';
export type UpliftMode = 'absolute' | 'relative';
export type TestType = 'two-sided' | 'one-sided';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface Experiment {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  status: ExperimentStatus;
  hypothesis: string | null;
  unit_of_randomization: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Metric {
  id: number;
  name: string;
  experiment_id: number;
  direction: MetricDirection;
  type: MetricType;
  is_primary: boolean;
  is_guardrail: boolean;
  created_at: string;
}

export interface Variant {
  id: number;
  name: string;
  experiment_id: number;
  is_control: boolean;
  allocation_percentage: number;
  created_at: string;
}
