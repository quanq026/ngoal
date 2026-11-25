import { useRouter } from 'next/navigation';
import {
  Bell,
  GitBranch,
  Inbox,
  LayoutDashboard,
  RefreshCw,
  Shield,
  SquareKanban,
  StickyNote,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from '@/lib/auth-client';
import {
  cyclesPath,
  dashboardsPath,
  githubPath,
  godPath,
  inboxPath,
  manageTeamsPath,
  membersPath,
  notesPath,
  notificationsPath,
  projectPath,
} from '@/utils/paths';
import { ACCOUNT_SECTIONS, accountPath } from '@/utils/accountSections';
import { GOD_SECTIONS } from '@/utils/godSections';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectFeatures } from '@/hooks/useProjectFeatures';
import { useSettingsNavGroups } from '@/hooks/useSettingsNavGroups';
import {
  useAccountSectionLabel,
  useGodSectionText,
} from '@/hooks/useSectionLabels';
import type { Command, CommandSection } from '@/utils/commands';

export function useNavigationCommands(projectKey: string | null): CommandSection | null {
  const t = useTranslations('nav');
  const godText = useGodSectionText();
  const accountLabel = useAccountSectionLabel();
  const router = useRouter();
  const { can, isMember } = usePermissions();
  const features = useProjectFeatures();
  const { data: session } = useSession();
  const { groups } = useSettingsNavGroups(projectKey);
  const isGod = session?.user.role === 'god';

  const items: Command[] = [];

  function add(id: string, label: string, icon: Command['icon'], href: string, keywords?: string) {
    items.push({ id, label, icon, keywords, run: () => router.push(href) });
  }

  if (projectKey) {
    const key = projectKey;
    add('nav.inbox', t('inbox'), <Inbox />, inboxPath(key), 'notifications unread');
    if (features.dashboards && can('dashboards', 'read'))
      add('nav.dashboards', t('dashboards'), <LayoutDashboard />, dashboardsPath(key), 'charts');
    add(
      'nav.work-items',
      t('workItems'),
      <SquareKanban />,
      projectPath(key),
      'board issues kanban',
    );
    if (features.cycles && can('cycles', 'read'))
      add('nav.cycles', t('cycles'), <RefreshCw />, cyclesPath(key), 'sprints cycles');
    if (features.notes && can('note_boards', 'read'))
      add('nav.notes', t('notes'), <StickyNote />, notesPath(key), 'notes boards sticky');
    add(
      'nav.github',
      'GitHub',
      <GitBranch />,
      githubPath(key),
      'github pull requests branches commits',
    );
    add('nav.members', t('members'), <Users />, membersPath(key), 'team people invite');
    if (isMember)
      add(
        'nav.notifications',
        t('notificationPreferences'),
        <Bell />,
        notificationsPath(key),
        'email',
      );
    for (const group of groups) {
      for (const item of group.items) {
        items.push({
          id: `nav.settings.${item.key}`,
          label: item.label,
          icon: <item.icon />,
          keywords: `settings ${group.label}`,
          run: () => router.push(item.href),
        });
      }
    }
  }

  add(
    'nav.manage-teams',
    t('manageTeams'),
    <Users />,
    manageTeamsPath(),
    'account rename leave projects delete copy',
  );
  for (const s of ACCOUNT_SECTIONS) {
    add(`nav.account.${s.slug}`, accountLabel(s.slug), <s.icon />, accountPath(s.slug), 'account');
  }

  // Instance administration, owner account only. The API enforces the same, so
  // hiding it here is about noise, not access.
  if (isGod) {
    for (const s of GOD_SECTIONS) {
      add(
        `nav.god.${s.slug}`,
        t('godModeSection', { section: godText.section(s.slug).label }),
        <Shield />,
        godPath(s.slug),
        'instance admin',
      );
    }
  }

  if (items.length === 0) return null;
  return { id: 'sections', heading: t('sections'), items };
}
