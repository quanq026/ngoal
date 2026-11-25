import { usePathname } from 'next/navigation';
import { useShellRoute } from '@/hooks/useShellRoute';
import { useTranslations } from 'next-intl';
import {
  BookOpenText,
  GitBranch,
  Inbox,
  LayoutDashboard,
  RefreshCw,
  SquareKanban,
  StickyNote,
  Target,
} from 'lucide-react';
import {
  cyclesPath,
  dashboardsPath,
  documentsPath,
  githubPath,
  inboxPath,
  initiativePath,
  initiativesPath,
  notesPath,
  projectPath,
} from '@/utils/paths';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectFeatures } from '@/hooks/useProjectFeatures';
import { useInboxUnread } from '@/hooks/useInboxUnread';
import { useFavoriteInitiativesQuery } from '@/services/initiatives.service';
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@/components/ui/sidebar';
import SidebarNavItem from '@/components/layout/SidebarNavItem';
import SidebarNavSubmenu from '@/components/layout/SidebarNavSubmenu';

// The top sidebar group. An entry appears only when its project feature is on and
// the user may read the section.
export default function SidebarWorkNav({
  projectKey,
  projectId,
}: {
  projectKey: string | null;
  projectId: number | null;
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const routeSub = useShellRoute().sub;
  const { can } = usePermissions();
  const features = useProjectFeatures();
  const disabled = !projectKey;
  const { data: inboxUnread } = useInboxUnread(projectKey, projectId);
  const canReadInitiatives = features.initiatives && can('initiatives', 'read');
  const { data: favoriteInitiatives } = useFavoriteInitiativesQuery(projectKey, canReadInitiatives);

  // "Work items" is the default view: active on the project root and any segment
  // that is not one of the other top-level destinations.
  const onWorkItems =
    !!projectKey && (pathname === projectPath(projectKey) || routeSub === 'issue');

  const onInitiatives = !!projectKey && pathname.startsWith(initiativesPath(projectKey));
  const isFavoriteInitiativeActive = (id: number) => {
    if (!projectKey) return false;
    const base = initiativePath(projectKey, id);
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  // With favorites, Initiatives becomes a sub-list: all initiatives plus one
  // entry per favorite initiative.
  const initiativesSubmenu =
    projectKey && favoriteInitiatives && favoriteInitiatives.length > 0
      ? [
          {
            key: 'all',
            href: initiativesPath(projectKey),
            icon: Target,
            label: t('allInitiatives'),
            active:
              onInitiatives && !favoriteInitiatives.some((i) => isFavoriteInitiativeActive(i.id)),
          },
          ...favoriteInitiatives.map((i) => ({
            key: String(i.id),
            href: initiativePath(projectKey, i.id),
            icon: Target,
            label: i.title,
            active: isFavoriteInitiativeActive(i.id),
          })),
        ]
      : null;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarNavItem
            href={projectKey ? inboxPath(projectKey) : '#'}
            icon={Inbox}
            label={t('inbox')}
            active={pathname.endsWith('/inbox')}
            disabled={disabled}
            badge={inboxUnread}
          />
          {features.dashboards && can('dashboards', 'read') && (
            <SidebarNavItem
              href={projectKey ? dashboardsPath(projectKey) : '#'}
              icon={LayoutDashboard}
              label={t('dashboards')}
              active={pathname.includes('/dashboard')}
              disabled={disabled}
            />
          )}
          <SidebarNavItem
            href={projectKey ? projectPath(projectKey) : '#'}
            icon={SquareKanban}
            label={t('workItems')}
            active={onWorkItems}
            disabled={disabled}
          />
          {canReadInitiatives &&
            (initiativesSubmenu ? (
              <SidebarNavSubmenu
                icon={Target}
                label={t('initiatives')}
                items={initiativesSubmenu}
              />
            ) : (
              <SidebarNavItem
                href={projectKey ? initiativesPath(projectKey) : '#'}
                icon={Target}
                label={t('initiatives')}
                active={onInitiatives}
                disabled={disabled}
              />
            ))}
          {features.cycles && can('cycles', 'read') && (
            <SidebarNavItem
              href={projectKey ? cyclesPath(projectKey) : '#'}
              icon={RefreshCw}
              label={t('cycles')}
              active={pathname.includes('/cycles')}
              disabled={disabled}
            />
          )}
          {features.documents && can('documents', 'read') && (
            <SidebarNavItem
              href={projectKey ? documentsPath(projectKey) : '#'}
              icon={BookOpenText}
              label={t('documents')}
              active={pathname.includes('/docs')}
              disabled={disabled}
            />
          )}
          {features.notes && can('note_boards', 'read') && (
            <SidebarNavItem
              href={projectKey ? notesPath(projectKey) : '#'}
              icon={StickyNote}
              label={t('notes')}
              active={pathname.includes('/notes')}
              disabled={disabled}
            />
          )}
          <SidebarNavItem
            href={projectKey ? githubPath(projectKey) : '#'}
            icon={GitBranch}
            label="GitHub"
            active={pathname.includes('/github')}
            disabled={disabled}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
