'use client';

import { useShellRoute } from '@/hooks/useShellRoute';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import { usePermissions } from '@/hooks/usePermissions';
import { titlePath, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardEditor } from './hooks/useDashboardEditor';
import WidgetGrid from './components/WidgetGrid';

// Fixed Overview dashboard displaying project stats, Pulse contribution chart,
// throughput, burnup, breakdown, and recent activity.
export default function DashboardsPage() {
  const t = useTranslations('dashboards');
  const { project } = useShell();
  const { can } = usePermissions();
  const projectKey = useShellRoute().projectKey ?? '';

  useDocumentTitle(titlePath(project?.project.name, t('defaultName')));

  const editor = useDashboardEditor(projectKey, [], null, () => {});

  if (!project) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!can('dashboards', 'read')) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {t('noAccess')}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex w-full grow flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <WidgetGrid
            projectKey={projectKey}
            project={project}
            editor={editor}
            editing={false}
            dropType={null}
            newIds={[]}
            onDropped={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
