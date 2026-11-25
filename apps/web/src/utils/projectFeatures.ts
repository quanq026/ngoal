import type { ProjectFeatures } from '@/lib/api/endpoints/settings';
import type { Project } from '@/lib/api/endpoints/projects';

export interface ProjectFeatureSet extends ProjectFeatures {
  pointsEstimate: boolean;
  timeEstimate: boolean;
  timeLogging: boolean;
}

export function projectFeatures(project: Project | null): ProjectFeatureSet {
  return {
    initiatives: false,
    cycles: project?.cyclesEnabled ?? true,
    dashboards: project?.dashboardsEnabled ?? true,
    documents: false,
    notes: project?.notesEnabled ?? true,
    subtasks: project?.subtasksEnabled ?? false,
    checklists: true,
    issueStats: false,
    pointsEstimate: project?.pointsEstimateEnabled ?? false,
    timeEstimate: false,
    timeLogging: false,
  };
}
