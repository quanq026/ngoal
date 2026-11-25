import type { ComponentType } from 'react';
import {
  Bot,
  Columns3,
  GitPullRequest,
  Info,
  type LucideIcon,
  Tags,
} from 'lucide-react';
import type { PermissionAction, PermissionResource } from '@/lib/api/endpoints/roles';

export type SettingsSection = {
  slug: string;
  icon: LucideIcon;
  resource: PermissionResource;
  viewAction?: PermissionAction;
  group: string;
  menu?: string;
  Component?: ComponentType;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    slug: 'general',
    icon: Info,
    resource: 'danger_zone',
    group: 'project',
  },
  {
    slug: 'states',
    icon: Columns3,
    resource: 'states',
    group: 'workflow',
  },
  {
    slug: 'labels',
    icon: Tags,
    resource: 'labels',
    group: 'workflow',
  },
  {
    slug: 'git',
    icon: GitPullRequest,
    resource: 'repositories',
    viewAction: 'edit',
    group: 'automation',
  },
];

export const AI_AGENTS_SECTION: SettingsSection = {
  slug: 'ai-agents',
  icon: Bot,
  resource: 'ai_agents',
  group: 'ai',
};

export type AiTeamEntry =
  { section: SettingsSection } | { menu: string; sections: SettingsSection[] };

export function aiTeamEntries(sections: SettingsSection[]): AiTeamEntry[] {
  const entries: AiTeamEntry[] = [];
  const menus = new Map<string, SettingsSection[]>();
  for (const section of sections) {
    if (!section.menu) {
      entries.push({ section });
      continue;
    }
    const listed = menus.get(section.menu);
    if (listed) {
      listed.push(section);
    } else {
      const grouped = [section];
      menus.set(section.menu, grouped);
      entries.push({ menu: section.menu, sections: grouped });
    }
  }
  return entries;
}

export const AI_TEAM_SECTIONS = SETTINGS_SECTIONS.filter((s) => s.group === 'ai-team');

const BY_SLUG = new Map(SETTINGS_SECTIONS.map((s) => [s.slug, s]));

export function settingsSection(slug: string): SettingsSection {
  const section = BY_SLUG.get(slug);
  if (!section) throw new Error(`Unknown settings section: ${slug}`);
  return section;
}
