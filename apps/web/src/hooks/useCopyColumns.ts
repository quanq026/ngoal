import { useTranslations } from 'next-intl';
import { useCopySections } from '@/cloud';
import type { Messages } from '@/i18n/messages';
import type { CopyGroup, CopyOption } from '@/utils/copyOptions';

// The parts of a project a copy can carry over, in the columns they are shown in: the
// core's, with what the hosted build adds. With `template`, only what a project template
// carries.
export function useCopyColumns(template = false): CopyGroup[][] {
  const t = useTranslations('newProject');

  const option = (
    key: keyof Messages['newProject']['copyItems'],
    requires: string[] = [],
    inTemplate = true,
  ): CopyOption => ({ key, label: t(`copyItems.${key}`), requires, template: inTemplate });
  const group = (
    key: keyof Messages['newProject']['copyGroups'],
    options: CopyOption[],
  ): CopyGroup => ({ key, title: t(`copyGroups.${key}`), options });

  const columns = useCopySections([
    [group('workflow', [option('states'), option('labels')])],
    [
      group('views', [
        option('views', ['states', 'labels']),
        option('dashboards'),
      ]),
    ],
  ]);

  if (!template) return columns;
  return columns
    .map((column) =>
      column
        .map((g) => ({ ...g, options: g.options.filter((o) => o.template) }))
        .filter((g) => g.options.length > 0),
    )
    .filter((column) => column.length > 0);
}
