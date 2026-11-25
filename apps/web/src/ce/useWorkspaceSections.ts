'use client';

import type { WorkspaceSummary } from '@/lib/api/endpoints/workspaces';
import type { WorkspaceSection } from '@/features/teams/types/workspaceSection';

export default function useWorkspaceSections(
  _workspace: WorkspaceSummary,
  core: WorkspaceSection[],
): WorkspaceSection[] {
  return core;
}
