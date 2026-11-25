import type { WidgetType } from '@/utils/dashboardWidgets';

export type WidgetGroupKey = 'issues';

// Widget types grouped by subject for the add-widget panel. The panel renders one
// section per group, in this order. The label and description of a type are messages
// under `dashboards.widgets`.
export const WIDGET_GROUPS: { key: WidgetGroupKey; types: WidgetType[] }[] = [
  {
    key: 'issues',
    types: ['stat', 'breakdown', 'throughput', 'burnup', 'pulse', 'recent_issues', 'activity_feed'],
  },
];
