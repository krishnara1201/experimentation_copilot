import type { BadgeTone } from '../components/ui/Badge';
import type { ExperimentStatus } from '../types/api';

export const statusTone: Record<ExperimentStatus, BadgeTone> = {
  draft: 'slate',
  running: 'green',
  completed: 'blue',
  paused: 'amber',
  cancelled: 'red',
};
