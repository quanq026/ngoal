import { asc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, projectColumn } from '@repo/db';
import { guards } from '#shared/guards';
import { authContext } from '#shared/auth-context';
import { noContent } from '#shared/http';
import { HttpError } from '#shared/lib';
import { accessErrors, commonErrors, errors } from '#shared/responses';
import { createIssue } from '#modules/issues/service';
import {
  availableRepositoriesQuery,
  AvailableGitRepositoryPageResponse,
  connectRepositoriesBody,
  createGitProviderConnectionBody,
  gitManagedRepositoryParams,
  gitProviderConnectionParams,
  GitProviderConnectionListResponse,
  GitProviderConnectionResponse,
  GitSettingsResponse,
  teamGitProviderConnectionParams,
  updateGitSettingsBody,
} from './model';
import { getOrCreateGitSettings, regenerateGitSecret, updateGitSettings } from './service';
import {
  connectGitProvider,
  connectRepositories,
  disconnectGitProvider,
  disconnectRepository,
  listAvailableRepositories,
  listDevelopmentRepositories,
  listGitProviderConnections,
  listManagedBranches,
  listManagedCommits,
  listManagedIssues,
  listManagedPullRequests,
  listTeamGitProviderConnections,
  reconcileManagedWebhooks,
} from './connections-service';
import { linkExistingPullRequest } from './development';
import {
  completeGitHubOAuth,
  getGitHubOAuthStatus,
  saveGitHubOAuthConfig,
  startGitHubOAuth,
} from './oauth';

const projectGitHubRepoParams = t.Object({
  projectKey: t.String(),
  repositoryId: t.Numeric(),
});

async function resolveTargetColumnId(projectId: number, requestedColumnId?: number): Promise<number> {
  if (requestedColumnId != null) return requestedColumnId;
  const [first] = await db
    .select({ id: projectColumn.id })
    .from(projectColumn)
    .where(eq(projectColumn.projectId, projectId))
    .orderBy(asc(projectColumn.position), asc(projectColumn.id))
    .limit(1);
  if (!first) throw new HttpError(400, 'Project has no columns');
  return first.id;
}

const GitHubOAuthStatusResponse = t.Object({
  enabled: t.Boolean(),
  clientId: t.String(),
  hasClientSecret: t.Boolean(),
  callbackUrl: t.String(),
  homepageUrl: t.String(),
});

export const gitSettingsRoutes = new Elysia({
  name: 'git-settings',
  detail: { tags: ['Git'] },
})
  .use(authContext)
  .use(guards)
  .get(
    '/teams/:teamId/settings/git/connections',
    ({ membership }) => listTeamGitProviderConnections(membership.teamId),
    {
      teamManager: true,
      response: { 200: GitProviderConnectionListResponse, ...accessErrors },
      detail: { summary: 'List team Git provider accounts' },
    },
  )
  .post(
    '/teams/:teamId/settings/git/connections',
    async ({ membership, body, set }) => {
      const connection = await connectGitProvider(membership.teamId, body);
      set.status = 201;
      return connection;
    },
    {
      teamManager: true,
      body: createGitProviderConnectionBody,
      response: { 201: GitProviderConnectionResponse, ...commonErrors, ...errors(502) },
      detail: { summary: 'Connect or rotate a team Git provider account' },
    },
  )
  .delete(
    '/teams/:teamId/settings/git/connections/:connectionId',
    async ({ membership, params }) => {
      await disconnectGitProvider(membership.teamId, params.connectionId);
      return noContent();
    },
    {
      teamManager: true,
      params: teamGitProviderConnectionParams,
      response: { 204: t.Void(), ...commonErrors, ...errors(502) },
      detail: { summary: 'Disconnect a team Git provider account and its managed webhooks' },
    },
  )
  .get('/teams/:teamId/settings/git/oauth/github/status', () => getGitHubOAuthStatus(), {
    teamManager: true,
    response: {
      200: GitHubOAuthStatusResponse,
      ...accessErrors,
    },
    detail: { summary: 'Check whether GitHub OAuth is configured for provider connections' },
  })
  .put(
    '/teams/:teamId/settings/git/oauth/github/config',
    ({ body }) => saveGitHubOAuthConfig(body),
    {
      teamManager: true,
      body: t.Object({
        clientId: t.String(),
        clientSecret: t.Optional(t.String()),
      }),
      response: {
        200: GitHubOAuthStatusResponse,
        ...commonErrors,
      },
      detail: { summary: 'Save GitHub OAuth App credentials in encrypted instance settings' },
    },
  )
  .get(
    '/teams/:teamId/settings/git/oauth/github/start',
    async ({ membership, user, query, redirect }) =>
      redirect(await startGitHubOAuth(membership.teamId, user!.id, query.returnTo)),
    {
      teamManager: true,
      query: t.Object({ returnTo: t.Optional(t.String()) }),
      detail: { summary: 'Start GitHub OAuth flow to connect a team GitHub account' },
    },
  )
  .get(
    '/git/oauth/github/callback',
    async ({ user, query, redirect }) => {
      const target = await completeGitHubOAuth({
        code: query.code,
        state: query.state,
        error: query.error,
        errorDescription: query.error_description,
        currentUserId: user?.id ?? null,
      });
      return redirect(target);
    },
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
        error: t.Optional(t.String()),
        error_description: t.Optional(t.String()),
      }),
      detail: { summary: 'Complete GitHub OAuth flow and store the GitHub connection' },
    },
  )
  .get('/projects/:projectKey/settings/git', ({ project }) => getOrCreateGitSettings(project.id), {
    permission: ['repositories', 'edit'],
    response: { 200: GitSettingsResponse, ...accessErrors },
    detail: {
      summary: "Get a project's repository integration settings",
      description:
        'Return the webhook endpoint, enabled events, merge automation, and the secret only when the caller may edit integrations.',
    },
  })
  .patch(
    '/projects/:projectKey/settings/git',
    ({ project, body }) => updateGitSettings(project.id, body),
    {
      permission: ['repositories', 'edit'],
      body: updateGitSettingsBody,
      response: { 200: GitSettingsResponse, ...commonErrors },
      detail: {
        summary: "Update a project's repository integration settings",
        description:
          'Enable repository events and configure the issue state change applied after a merge.',
      },
    },
  )
  .post(
    '/projects/:projectKey/settings/git/secret',
    async ({ project }) => {
      const settings = await regenerateGitSecret(project.id);
      await reconcileManagedWebhooks(project.id, settings);
      return settings;
    },
    {
      permission: ['repositories', 'edit'],
      response: { 200: GitSettingsResponse, ...accessErrors },
      detail: {
        summary: "Regenerate a project's repository webhook secret",
        description:
          'Replace the shared webhook secret and update every webhook managed through a provider connection.',
      },
    },
  )
  .get(
    '/projects/:projectKey/settings/git/connections',
    ({ project }) => listGitProviderConnections(project.id),
    {
      permission: ['repositories', 'edit'],
      response: { 200: GitProviderConnectionListResponse, ...accessErrors },
      detail: {
        summary: 'List team Git provider accounts available to a project',
        description:
          'List accounts shared by this project’s team and repositories assigned to this project.',
      },
    },
  )
  .get(
    '/projects/:projectKey/settings/git/connections/:connectionId/repositories',
    ({ project, params, query }) =>
      listAvailableRepositories(
        project.id,
        params.connectionId,
        query.page ?? 1,
        query.search ?? '',
      ),
    {
      permission: ['repositories', 'edit'],
      params: gitProviderConnectionParams,
      query: availableRepositoriesQuery,
      response: { 200: AvailableGitRepositoryPageResponse, ...commonErrors, ...errors(502) },
      detail: {
        summary: 'List repositories available through a Git provider connection',
        description:
          'Search repositories visible to the connected provider account and report which ones are already connected.',
      },
    },
  )
  .post(
    '/projects/:projectKey/settings/git/connections/:connectionId/repositories',
    ({ project, params, body }) =>
      connectRepositories(project.id, params.connectionId, body.externalIds),
    {
      permission: ['repositories', 'edit'],
      params: gitProviderConnectionParams,
      body: connectRepositoriesBody,
      response: { 200: GitProviderConnectionResponse, ...commonErrors, ...errors(502) },
      detail: {
        summary: 'Connect repositories and install their webhooks',
        description:
          'Add the selected repositories to the project and create or reconcile provider webhooks for pull request and CI events.',
      },
    },
  )
  .delete(
    '/projects/:projectKey/settings/git/connections/:connectionId/repositories/:repositoryId',
    async ({ project, params }) => {
      await disconnectRepository(project.id, params.connectionId, params.repositoryId);
      return noContent();
    },
    {
      permission: ['repositories', 'edit'],
      params: gitManagedRepositoryParams,
      response: { 204: t.Void(), ...commonErrors, ...errors(502) },
      detail: {
        summary: 'Disconnect a repository and remove its managed webhook',
        description:
          'Delete the repository connection and remove the webhook that Plan installed at the provider.',
      },
    },
  )
  .get(
    '/projects/:projectKey/github/repositories',
    ({ project }) => listDevelopmentRepositories(project.id),
    {
      permission: ['work_items', 'read'],
      detail: { summary: 'List connected GitHub repositories for a project hub' },
    },
  )
  .get(
    '/projects/:projectKey/github/repositories/:repositoryId/pull-requests',
    async ({ project, params, query }) => {
      const res = await listManagedPullRequests(
        project.id,
        params.repositoryId,
        query.state ?? 'open',
        query.page ?? 1,
      );
      return {
        repository: res.repository,
        pullRequests: res.page.pullRequests,
        nextPage: res.page.nextPage,
      };
    },
    {
      permission: ['work_items', 'read'],
      params: projectGitHubRepoParams,
      query: t.Object({
        state: t.Optional(t.Union([t.Literal('open'), t.Literal('all')])),
        page: t.Optional(t.Numeric({ minimum: 1 })),
      }),
      detail: { summary: 'List repository pull requests for a project' },
    },
  )
  .get(
    '/projects/:projectKey/github/repositories/:repositoryId/branches',
    ({ project, params, query }) =>
      listManagedBranches(project.id, params.repositoryId, query.page ?? 1),
    {
      permission: ['work_items', 'read'],
      params: projectGitHubRepoParams,
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
      }),
      detail: { summary: 'List repository branches for a project' },
    },
  )
  .get(
    '/projects/:projectKey/github/repositories/:repositoryId/commits',
    ({ project, params, query }) =>
      listManagedCommits(project.id, params.repositoryId, query.branch, query.page ?? 1),
    {
      permission: ['work_items', 'read'],
      params: projectGitHubRepoParams,
      query: t.Object({
        branch: t.Optional(t.String()),
        page: t.Optional(t.Numeric({ minimum: 1 })),
      }),
      detail: { summary: 'List repository commits for a project' },
    },
  )
  .get(
    '/projects/:projectKey/github/repositories/:repositoryId/issues',
    ({ project, params, query }) =>
      listManagedIssues(project.id, params.repositoryId, query.state ?? 'open', query.page ?? 1),
    {
      permission: ['work_items', 'read'],
      params: projectGitHubRepoParams,
      query: t.Object({
        state: t.Optional(t.Union([t.Literal('open'), t.Literal('closed'), t.Literal('all')])),
        page: t.Optional(t.Numeric({ minimum: 1 })),
      }),
      detail: { summary: 'List repository GitHub issues for import' },
    },
  )
  .post(
    '/projects/:projectKey/github/repositories/:repositoryId/issues/import',
    async ({ project, body, user, set }) => {
      const columnId = await resolveTargetColumnId(project.id, body.columnId);
      const created = [];
      for (const item of body.items) {
        const title = item.title.trim().slice(0, 255);
        if (!title) continue;
        const bodyText = item.body?.trim() || '';
        const sourceFooter = item.url ? `Imported from GitHub #${item.number}: ${item.url}` : '';
        const description = [bodyText, sourceFooter].filter(Boolean).join('\n\n---\n');
        const issue = await createIssue(
          project,
          { title, description, columnId },
          user?.id ?? null,
        );
        created.push({ id: issue.id, identifier: issue.identifier, title: issue.title });
      }
      set.status = 201;
      return { importedCount: created.length, issues: created };
    },
    {
      permission: ['work_items', 'create'],
      params: projectGitHubRepoParams,
      body: t.Object({
        columnId: t.Optional(t.Integer({ minimum: 1 })),
        items: t.Array(
          t.Object({
            number: t.Integer({ minimum: 1 }),
            title: t.String({ minLength: 1 }),
            body: t.Optional(t.String()),
            url: t.Optional(t.Nullable(t.String())),
          }),
          { minItems: 1, maxItems: 50 },
        ),
      }),
      detail: { summary: 'Import GitHub issues into the project board' },
    },
  )
  .post(
    '/projects/:projectKey/github/repositories/:repositoryId/pull-requests/:number/create-issue',
    async ({ project, params, body, user, set }) => {
      const columnId = await resolveTargetColumnId(project.id, body.columnId);
      const title = body.title.trim().slice(0, 255);
      if (!title) throw new HttpError(400, 'Title is required');
      const created = await createIssue(
        project,
        { title, description: '', columnId },
        user?.id ?? null,
      );
      const linked = await linkExistingPullRequest(
        project.id,
        created.id,
        params.repositoryId,
        params.number,
      );
      set.status = 201;
      return {
        issue: { id: created.id, identifier: created.identifier, title: created.title },
        link: linked.link,
      };
    },
    {
      permission: ['work_items', 'create'],
      params: t.Object({
        projectKey: t.String(),
        repositoryId: t.Numeric(),
        number: t.Numeric(),
      }),
      body: t.Object({
        title: t.String({ minLength: 1 }),
        columnId: t.Optional(t.Integer({ minimum: 1 })),
      }),
      detail: { summary: 'Create a board issue from a GitHub pull request and link them' },
    },
  );
