import { Elysia } from 'elysia';
import { HttpError, errorAnswer } from './shared/lib';
import { authContext } from './shared/auth-context';
import { projectRoutes } from './modules/projects';
import { teamRoutes } from './modules/teams';
import { workspaceRoutes } from './modules/workspaces';
import { memberRoutes } from './modules/members';
import { roleRoutes } from './modules/roles';
import { inviteRoutes } from './modules/invites';
import { columnRoutes } from './modules/columns';
import { labelRoutes } from './modules/labels';
import { issueRoutes } from './modules/issues';
import { cycleRoutes } from './modules/cycles';
import { attachmentRoutes } from './modules/attachments';
import { avatarRoutes } from './modules/avatars';
import { viewRoutes } from './modules/views';
import { gitSettingsRoutes } from './modules/git';
import { dashboardRoutes } from './modules/dashboards';
import { noteBoardRoutes } from './modules/note-boards';
import { mentionRoutes } from './modules/mentions';
import { analyticsRoutes } from './modules/analytics';
import { chartRoutes } from './modules/charts';
import { notificationRoutes } from './modules/notifications';
import { notificationSettingsRoutes } from './modules/notification-settings';
import { notificationPreferenceRoutes } from './modules/notification-preferences';
import { userPreferenceRoutes } from './modules/user-preferences';
import { syncRoutes } from './modules/sync';
import { linkPreviewRoutes } from './modules/link-previews';
import { settingsRoutes } from './modules/settings';
import { godRoutes } from './modules/god';

// The planner API (True Lite build): core projects, work items, cycles,
// note boards, dashboards/analytics, Git integration, and email notifications.
export const planner = new Elysia({ name: 'planner' })
  .use(authContext)
  .onError({ as: 'global' }, ({ code, error, set }) => {
    const answer = errorAnswer(code, error);
    if (answer.status === 500) console.error('[planner] unhandled error:', error);
    if (error instanceof HttpError && error.headers) Object.assign(set.headers, error.headers);
    set.status = answer.status;
    return answer.body;
  })
  .use(projectRoutes)
  .use(teamRoutes)
  .use(workspaceRoutes)
  .use(memberRoutes)
  .use(roleRoutes)
  .use(inviteRoutes)
  .use(columnRoutes)
  .use(labelRoutes)
  .use(issueRoutes)
  .use(cycleRoutes)
  .use(attachmentRoutes)
  .use(avatarRoutes)
  .use(viewRoutes)
  .use(gitSettingsRoutes)
  .use(dashboardRoutes)
  .use(noteBoardRoutes)
  .use(mentionRoutes)
  .use(analyticsRoutes)
  .use(chartRoutes)
  .use(notificationRoutes)
  .use(notificationSettingsRoutes)
  .use(notificationPreferenceRoutes)
  .use(userPreferenceRoutes)
  .use(syncRoutes)
  .use(linkPreviewRoutes)
  .use(settingsRoutes)
  .use(godRoutes);
