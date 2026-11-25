import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useBoardIssuesQuery,
  useProjectQuery,
  useProjectsQuery,
} from '@/services/projects.service';
import type { View } from '@/lib/api/endpoints/views';
import type { CustomField } from '@/lib/api/endpoints/customFields';
import { useCycleOptionsQuery } from '@/services/cycles.service';
import { ApiError } from '@/lib/api/core/client';
import { applyFilters } from '@/utils/filters';
import { viewPath } from '@/utils/paths';
import { usePermissions } from '@/hooks/usePermissions';
import { useViewEditor } from '@/hooks/useViewEditor';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : String(error);
}

export function useShellProject(projectKey: string | null, activeViewId: number | null) {
  const router = useRouter();

  const projectsQuery = useProjectsQuery();
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const projectQuery = useProjectQuery(projectKey);
  const boardIssuesQuery = useBoardIssuesQuery(projectKey);
  const scaffold = projectQuery.data ?? null;
  const cyclesQuery = useCycleOptionsQuery(scaffold ? projectKey : null);
  const project = useMemo(
    () =>
      scaffold
        ? {
            ...scaffold,
            project: {
              ...scaffold.project,
              initiativesEnabled: false,
              documentsEnabled: false,
              subtasksEnabled: scaffold.project.subtasksEnabled,
              checklistsEnabled: true,
              issueStatsEnabled: false,
              pointsEstimateEnabled: scaffold.project.pointsEstimateEnabled,
              timeEstimateEnabled: false,
              timeLoggingEnabled: false,
            },
            assignees: scaffold.assignees.filter((a) => a.kind === 'member'),
            customFields: [],
            issueTypes: [],
            issueTemplates: [],
            issues: boardIssuesQuery.data?.issues ?? [],
            plannedCycles: cyclesQuery.data ?? [],
          }
        : null,
    [scaffold, boardIssuesQuery.data, cyclesQuery.data],
  );

  const views: View[] = useMemo(() => [], []);
  const { can, isMember } = usePermissions(project);
  const editor = useViewEditor(
    projectKey,
    views,
    activeViewId,
    (id) => projectKey && router.push(viewPath(projectKey, id)),
    isMember && can('views', 'read'),
  );

  const filteredProject = useMemo(() => {
    if (!project) return null;
    const filtered = applyFilters(project.issues, editor.effectiveFilters, project);
    return { ...project, issues: filtered };
  }, [project, editor.effectiveFilters]);

  const customFields = useMemo<CustomField[]>(() => [], []);
  const canCreateIssue = can('work_items', 'create');

  const roleDenied = (e: unknown) => (e instanceof ApiError && e.status === 403 ? null : e);
  const error =
    projectsQuery.error ??
    projectQuery.error ??
    roleDenied(boardIssuesQuery.error);

  return {
    projects,
    projectsLoaded: projectsQuery.data != null,
    project,
    filteredProject,
    views,
    viewsFailed: false,
    editor,
    customFields,
    canCreateIssue,
    errorMsg: errorMessage(error),
    forbidden: projectQuery.error instanceof ApiError && projectQuery.error.status === 403,
  };
}
