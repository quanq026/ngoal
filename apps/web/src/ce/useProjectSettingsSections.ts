'use client';

import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { SettingsSection } from '@/utils/settingsSections';

export default function useProjectSettingsSections(
  _project: ProjectDetail | null,
  core: SettingsSection[],
): SettingsSection[] {
  return core;
}
