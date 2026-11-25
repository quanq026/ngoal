'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Bot,
  ChevronRight,
  FolderKanban,
  GitBranch,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Team } from '@/lib/api/endpoints/teams';
import { cn } from '@/lib/utils';
import { teamSectionPath, type TeamSection } from '@/utils/paths';
import { titlePath, useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  activeNavItem,
  SectionNav,
  sectionNavIdleClass,
  sectionNavItemClass,
  type SectionNavItem,
} from '@/components/common/page/SectionNav';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// The sections of the open team, as the page's last rail: the team itself, its
// projects, the roles they assign from and its members, then the AI group — the
// integration credentials the agents run on, the agents themselves, the skills they
// load, the tools they can call, the run queue and what they spent — with Git, what MCP
// clients reach and the notification providers last. The counts come with the team
// list, so each is shown before its section is opened. A section the caller may not read
// is left out, and the AI group with it once none of them is readable. Collapsed, the
// rail shows the icons of every section, the AI group's included, without the group.
export default function TeamSectionNav({
  team,
  collapsed,
  onToggleCollapsed,
}: {
  team: Team;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const t = useTranslations('teams.sections');
  const tNav = useTranslations('nav');
  const tScreens = useTranslations('meta.screens');
  const pathname = usePathname();

  function section(
    id: TeamSection,
    label: string,
    icon: LucideIcon,
    count?: number,
  ): SectionNavItem {
    return {
      id,
      label,
      icon,
      badge: count === undefined ? undefined : String(count),
      href: teamSectionPath(team.ref, id),
    };
  }

  const runsTeam = team.role === 'owner' || team.role === 'manager';
  const top = [
    section('info', t('info.title'), Info),
    section('projects', t('projects.title'), FolderKanban, team.projectCount),
    section('members', t('members.title'), Users, team.memberCount),
  ];
  const ai: SectionNavItem[] = [];
  // The notification providers are the owner's: nobody else reads or writes them.
  const bottom = [
    ...(runsTeam ? [section('git', 'Git', GitBranch)] : []),
    ...(team.role === 'owner' ? [section('notifications', t('notifications.title'), Bell)] : []),
  ];

  const active = activeNavItem([...top, ...ai, ...bottom], pathname);
  const activeId = active?.id ?? null;
  useDocumentTitle(titlePath(team.name, tScreens('teamSettings'), active?.label));
  const aiActive = ai.some((entry) => entry.id === activeId);
  // Null until the user opens or closes the group themselves; until then it follows
  // whichever section is open.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const aiOpen = toggled ?? aiActive;

  const toggleLabel = collapsed ? t('expand') : t('collapse');
  const toggle = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 rtl:-scale-x-100" />
          ) : (
            <PanelLeftClose className="size-4 rtl:-scale-x-100" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{toggleLabel}</TooltipContent>
    </Tooltip>
  );

  if (collapsed) {
    return (
      <div className="space-y-2">
        <div className="flex w-8 justify-center">{toggle}</div>
        <SectionNav
          sections={[...top, ...ai, ...bottom]}
          activeId={activeId}
          label={team.name}
          collapsed
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-2">
        <h2 className="min-w-0 truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {team.name}
        </h2>
        <div className="ms-auto">{toggle}</div>
      </div>
      <div className="space-y-0.5">
        <SectionNav sections={top} activeId={activeId} label={team.name} />
        {ai.length > 0 && (
          <Collapsible open={aiOpen} onOpenChange={setToggled}>
            <CollapsibleTrigger className={cn(sectionNavItemClass, sectionNavIdleClass)}>
              <Bot className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{tNav('aiTeam')}</span>
              <ChevronRight
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform duration-150',
                  aiOpen && 'rotate-90',
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="ps-4">
              <SectionNav sections={ai} activeId={activeId} label={tNav('aiTeam')} />
            </CollapsibleContent>
          </Collapsible>
        )}
        <SectionNav sections={bottom} activeId={activeId} label={team.name} />
      </div>
    </div>
  );
}
