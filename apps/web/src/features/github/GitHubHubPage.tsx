'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Check,
  CircleDot,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  Plus,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useShell } from '@/context/shellContext';
import { useShellRoute } from '@/hooks/useShellRoute';
import { usePermissions } from '@/hooks/usePermissions';
import { titlePath, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatShortDate } from '@/utils/dates';
import { projectPath, settingsPath, teamSectionPath } from '@/utils/paths';
import {
  useCreateIssueFromPr,
  useImportGitHubIssues,
  useProjectGitHubBranchesQuery,
  useProjectGitHubCommitsQuery,
  useProjectGitHubIssuesQuery,
  useProjectGitHubPullRequestsQuery,
  useProjectGitHubRepositoriesQuery,
} from '@/services/githubHub.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type HubTab = 'pull-requests' | 'branches' | 'commits' | 'issues';

function GitHubErrorBox({
  error,
  fallback,
  teamRef,
}: {
  error: unknown;
  fallback: string;
  teamRef: string;
}) {
  const message = error instanceof Error ? error.message : fallback;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0" />
        <span>{message}</span>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={teamSectionPath(teamRef, 'git')}>Reconnect GitHub</Link>
      </Button>
    </div>
  );
}

function PrStateBadge({ state, draft }: { state: 'open' | 'merged' | 'closed'; draft: boolean }) {
  if (state === 'merged') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
      >
        <GitMerge className="size-3" />
        Merged
      </Badge>
    );
  }
  if (state === 'closed') {
    return (
      <Badge variant="outline" className="gap-1 border-muted-foreground/30 text-muted-foreground">
        <GitPullRequestClosed className="size-3" />
        Closed
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    >
      <GitPullRequest className="size-3" />
      {draft ? 'Draft' : 'Open'}
    </Badge>
  );
}

export default function GitHubHubPage() {
  const { project } = useShell();
  const projectKey = useShellRoute().projectKey ?? '';
  const { can } = usePermissions();
  const canCreateIssue = can('work_items', 'create');
  useDocumentTitle(titlePath(project?.project.name, 'GitHub'));

  const reposQuery = useProjectGitHubRepositoriesQuery(projectKey);
  const githubRepos = useMemo(
    () => (reposQuery.data ?? []).filter((r) => r.provider === 'github'),
    [reposQuery.data],
  );
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>('pull-requests');
  const [commitBranch, setCommitBranch] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (githubRepos.length === 0) {
      setSelectedRepoId(null);
      return;
    }
    if (selectedRepoId === null || !githubRepos.some((r) => r.id === selectedRepoId)) {
      setSelectedRepoId(githubRepos[0].id);
      setCommitBranch(undefined);
    }
  }, [githubRepos, selectedRepoId]);

  if (!project || reposQuery.isPending) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeRepo = githubRepos.find((r) => r.id === selectedRepoId) ?? null;

  if (!activeRepo) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
            <GitBranch className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">No GitHub repository connected</h2>
            <p className="text-sm text-muted-foreground">
              Connect a GitHub repository to{' '}
              <span className="font-medium text-foreground">{project.project.name}</span> to browse
              pull requests, branches, commits, and import issues here.
            </p>
          </div>
          <Button asChild>
            <Link href={settingsPath(project.project.ref, 'git')}>
              <Settings className="size-4" />
              Open Repository Settings
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const teamRef = project.project.teamRef;

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={String(activeRepo.id)}
            onValueChange={(value) => {
              setSelectedRepoId(Number(value));
              setCommitBranch(undefined);
            }}
          >
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {githubRepos.map((repo) => (
                <SelectItem key={repo.id} value={String(repo.id)}>
                  {repo.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <a href={activeRepo.webUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              Open on GitHub
            </a>
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={settingsPath(project.project.ref, 'git')}>
            <Settings className="size-3.5" />
            Manage Repositories
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HubTab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pull-requests" className="gap-1.5">
            <GitPullRequest className="size-3.5" />
            Pull Requests
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5">
            <GitBranch className="size-3.5" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="commits" className="gap-1.5">
            <GitCommitHorizontal className="size-3.5" />
            Commits
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5">
            <CircleDot className="size-3.5" />
            Issues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pull-requests">
          <PullRequestsTab
            projectKey={projectKey}
            teamRef={teamRef}
            repositoryId={activeRepo.id}
            canCreateIssue={canCreateIssue}
            defaultColumnId={project.columns[0]?.id}
          />
        </TabsContent>

        <TabsContent value="branches">
          <BranchesTab
            projectKey={projectKey}
            teamRef={teamRef}
            repositoryId={activeRepo.id}
            repoWebUrl={activeRepo.webUrl}
            onInspectCommits={(branch) => {
              setCommitBranch(branch);
              setActiveTab('commits');
            }}
          />
        </TabsContent>

        <TabsContent value="commits">
          <CommitsTab
            projectKey={projectKey}
            teamRef={teamRef}
            repositoryId={activeRepo.id}
            branch={commitBranch}
            onBranchChange={setCommitBranch}
          />
        </TabsContent>

        <TabsContent value="issues">
          <GitHubIssuesTab
            projectKey={projectKey}
            projectRef={project.project.ref}
            teamRef={teamRef}
            repositoryId={activeRepo.id}
            columns={project.columns}
            canCreateIssue={canCreateIssue}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PullRequestsTab({
  projectKey,
  teamRef,
  repositoryId,
  canCreateIssue,
  defaultColumnId,
}: {
  projectKey: string;
  teamRef: string;
  repositoryId: number;
  canCreateIssue: boolean;
  defaultColumnId?: number;
}) {
  const [stateFilter, setStateFilter] = useState<'open' | 'all'>('open');
  const query = useProjectGitHubPullRequestsQuery(projectKey, repositoryId, stateFilter);
  const createFromPr = useCreateIssueFromPr(projectKey, repositoryId);
  const pullRequests = query.data?.pages.flatMap((page) => page.pullRequests) ?? [];

  async function handleCreateIssue(prNumber: number, title: string) {
    try {
      const created = await createFromPr.mutateAsync({
        number: prNumber,
        title,
        columnId: defaultColumnId,
      });
      toast.success(`Created ${created.issue.identifier} and linked to PR #${prNumber}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create issue from pull request');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={stateFilter === 'open' ? 'default' : 'outline'}
          onClick={() => setStateFilter('open')}
        >
          Open
        </Button>
        <Button
          size="sm"
          variant={stateFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStateFilter('all')}
        >
          All
        </Button>
      </div>

      {query.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : query.isError ? (
        <GitHubErrorBox
          error={query.error}
          fallback="Could not load pull requests"
          teamRef={teamRef}
        />
      ) : pullRequests.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {stateFilter === 'open' ? 'open ' : ''}pull requests found.
        </div>
      ) : (
        <div className="divide-y rounded-md border">
          {pullRequests.map((pr) => (
            <div
              key={pr.number}
              className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PrStateBadge state={pr.state} draft={pr.draft} />
                  <span className="font-mono text-xs text-muted-foreground">#{pr.number}</span>
                  <span className="truncate font-medium">{pr.title}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">{pr.sourceBranch ?? 'unknown'}</code>
                  {' → '}
                  <code className="rounded bg-muted px-1 py-0.5">{pr.targetBranch}</code>
                  {pr.updatedAt ? ` · Updated ${formatShortDate(pr.updatedAt)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canCreateIssue && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={createFromPr.isPending}
                    onClick={() => void handleCreateIssue(pr.number, pr.title)}
                  >
                    <Plus className="size-3.5" />
                    Create Issue & Link
                  </Button>
                )}
                {pr.url && (
                  <Button asChild size="sm" variant="ghost">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open PR #${pr.number}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more pull requests'}
        </Button>
      )}
    </div>
  );
}

function BranchesTab({
  projectKey,
  teamRef,
  repositoryId,
  repoWebUrl,
  onInspectCommits,
}: {
  projectKey: string;
  teamRef: string;
  repositoryId: number;
  repoWebUrl: string;
  onInspectCommits: (branch: string) => void;
}) {
  const query = useProjectGitHubBranchesQuery(projectKey, repositoryId);
  const [copiedBranch, setCopiedBranch] = useState<string | null>(null);
  const branches = [...new Set(query.data?.pages.flatMap((p) => p.branches) ?? [])];
  const defaultBranch = query.data?.pages[0]?.defaultBranch ?? null;

  async function copyCheckout(branch: string) {
    try {
      await navigator.clipboard.writeText(`git fetch && git checkout ${branch}`);
      setCopiedBranch(branch);
      toast.success(`Copied checkout command for ${branch}`);
      setTimeout(() => setCopiedBranch((prev) => (prev === branch ? null : prev)), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  if (query.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <GitHubErrorBox error={query.error} fallback="Could not load branches" teamRef={teamRef} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-md border">
        {branches.map((branch) => {
          const isDefault = branch === defaultBranch;
          return (
            <div
              key={branch}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-muted-foreground" />
                <code className="text-sm font-medium">{branch}</code>
                {isDefault && <Badge variant="secondary">default</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onInspectCommits(branch)}>
                  <GitCommitHorizontal className="size-3.5" />
                  View Commits
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void copyCheckout(branch)}>
                  {copiedBranch === branch ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy checkout
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <a
                    href={`${repoWebUrl.replace(/\/+$/, '')}/tree/${encodeURIComponent(branch)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {query.hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more branches'}
        </Button>
      )}
    </div>
  );
}

function CommitsTab({
  projectKey,
  teamRef,
  repositoryId,
  branch,
  onBranchChange,
}: {
  projectKey: string;
  teamRef: string;
  repositoryId: number;
  branch: string | undefined;
  onBranchChange: (branch: string) => void;
}) {
  const branchesQuery = useProjectGitHubBranchesQuery(projectKey, repositoryId);
  const branches = [...new Set(branchesQuery.data?.pages.flatMap((p) => p.branches) ?? [])];
  const defaultBranch = branchesQuery.data?.pages[0]?.defaultBranch ?? undefined;
  const effectiveBranch = branch ?? defaultBranch;
  const commitsQuery = useProjectGitHubCommitsQuery(projectKey, repositoryId, effectiveBranch);
  const commits = commitsQuery.data?.pages.flatMap((p) => p.commits) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Branch:</span>
        <Select value={effectiveBranch} onValueChange={onBranchChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Default branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {commitsQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : commitsQuery.isError ? (
        <GitHubErrorBox
          error={commitsQuery.error}
          fallback="Could not load commits"
          teamRef={teamRef}
        />
      ) : commits.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No commits found on this branch.
        </div>
      ) : (
        <div className="divide-y rounded-md border">
          {commits.map((commit) => (
            <div
              key={commit.sha}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{commit.message}</p>
                <p className="text-xs text-muted-foreground">
                  {commit.authorName}
                  {commit.committedAt ? ` · ${formatShortDate(commit.committedAt)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {commit.shortSha}
                </Badge>
                {commit.url && (
                  <Button asChild size="sm" variant="ghost">
                    <a href={commit.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {commitsQuery.hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          disabled={commitsQuery.isFetchingNextPage}
          onClick={() => void commitsQuery.fetchNextPage()}
        >
          {commitsQuery.isFetchingNextPage ? 'Loading…' : 'Load more commits'}
        </Button>
      )}
    </div>
  );
}

function GitHubIssuesTab({
  projectKey,
  projectRef,
  teamRef,
  repositoryId,
  columns,
  canCreateIssue,
}: {
  projectKey: string;
  projectRef: string;
  teamRef: string;
  repositoryId: number;
  columns: { id: number; name: string }[];
  canCreateIssue: boolean;
}) {
  const issuesQuery = useProjectGitHubIssuesQuery(projectKey, repositoryId, 'open');
  const importMutation = useImportGitHubIssues(projectKey, repositoryId);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [targetColumnId, setTargetColumnId] = useState<string>(
    columns[0] ? String(columns[0].id) : '',
  );

  useEffect(() => {
    setSelectedNumbers(new Set());
  }, [repositoryId]);

  const ghIssues = issuesQuery.data?.pages.flatMap((p) => p.issues) ?? [];
  const allSelected = ghIssues.length > 0 && ghIssues.every((i) => selectedNumbers.has(i.number));

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedNumbers(new Set(ghIssues.map((i) => i.number)));
    } else {
      setSelectedNumbers(new Set());
    }
  }

  function toggleOne(number: number, checked: boolean) {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (checked) next.add(number);
      else next.delete(number);
      return next;
    });
  }

  async function handleImport() {
    const items = ghIssues
      .filter((i) => selectedNumbers.has(i.number))
      .map((i) => ({ number: i.number, title: i.title, body: i.body, url: i.url }));
    if (items.length === 0) return;
    try {
      const res = await importMutation.mutateAsync({
        columnId: targetColumnId ? Number(targetColumnId) : undefined,
        items,
      });
      toast.success(`Imported ${res.importedCount} issue(s) to board`);
      setSelectedNumbers(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import GitHub issues');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => toggleAll(v === true)}
              disabled={ghIssues.length === 0}
            />
            Select all ({selectedNumbers.size}/{ghIssues.length})
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {columns.length > 0 && (
            <Select value={targetColumnId} onValueChange={setTargetColumnId}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="Target column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            disabled={!canCreateIssue || selectedNumbers.size === 0 || importMutation.isPending}
            onClick={() => void handleImport()}
          >
            <Download className="size-3.5" />
            {importMutation.isPending ? 'Importing…' : `Import to Board (${selectedNumbers.size})`}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={projectPath(projectRef)}>Open Board</Link>
          </Button>
        </div>
      </div>

      {issuesQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : issuesQuery.isError ? (
        <GitHubErrorBox
          error={issuesQuery.error}
          fallback="Could not load GitHub issues"
          teamRef={teamRef}
        />
      ) : ghIssues.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No open GitHub issues in this repository.
        </div>
      ) : (
        <div className="divide-y rounded-md border">
          {ghIssues.map((ghIssue) => (
            <div
              key={ghIssue.number}
              className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/30"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Checkbox
                  checked={selectedNumbers.has(ghIssue.number)}
                  onCheckedChange={(v) => toggleOne(ghIssue.number, v === true)}
                  className="mt-1"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{ghIssue.number}
                    </span>
                    <span className="font-medium">{ghIssue.title}</span>
                    {ghIssue.labels.map((label) => (
                      <Badge key={label} variant="secondary" className="text-[10px]">
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ghIssue.authorLogin ? `@${ghIssue.authorLogin}` : 'GitHub user'}
                    {ghIssue.createdAt ? ` · Created ${formatShortDate(ghIssue.createdAt)}` : ''}
                  </p>
                </div>
              </div>
              {ghIssue.url && (
                <Button asChild size="sm" variant="ghost">
                  <a href={ghIssue.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {issuesQuery.hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          disabled={issuesQuery.isFetchingNextPage}
          onClick={() => void issuesQuery.fetchNextPage()}
        >
          {issuesQuery.isFetchingNextPage ? 'Loading…' : 'Load more issues'}
        </Button>
      )}
    </div>
  );
}
