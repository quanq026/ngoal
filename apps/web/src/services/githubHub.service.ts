import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIssueFromGitHubPr,
  importProjectGitHubIssues,
  listProjectGitHubBranches,
  listProjectGitHubCommits,
  listProjectGitHubIssues,
  listProjectGitHubPullRequests,
  listProjectGitHubRepositories,
} from '@/lib/api/endpoints/git';
import { qk } from '@/services/queryKeys';

export function useProjectGitHubRepositoriesQuery(projectKey: string) {
  return useQuery({
    queryKey: ['projectGitHub', projectKey, 'repositories'] as const,
    queryFn: () => listProjectGitHubRepositories(projectKey),
    enabled: Boolean(projectKey),
  });
}

export function useProjectGitHubPullRequestsQuery(
  projectKey: string,
  repositoryId: number | null,
  state: 'open' | 'all',
) {
  return useInfiniteQuery({
    queryKey: ['projectGitHub', projectKey, repositoryId, 'pull-requests', state] as const,
    queryFn: ({ pageParam }) =>
      listProjectGitHubPullRequests(projectKey, repositoryId!, { state, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: Boolean(projectKey) && repositoryId !== null,
  });
}

export function useProjectGitHubBranchesQuery(projectKey: string, repositoryId: number | null) {
  return useInfiniteQuery({
    queryKey: ['projectGitHub', projectKey, repositoryId, 'branches'] as const,
    queryFn: ({ pageParam }) => listProjectGitHubBranches(projectKey, repositoryId!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: Boolean(projectKey) && repositoryId !== null,
  });
}

export function useProjectGitHubCommitsQuery(
  projectKey: string,
  repositoryId: number | null,
  branch: string | undefined,
) {
  return useInfiniteQuery({
    queryKey: ['projectGitHub', projectKey, repositoryId, 'commits', branch ?? 'default'] as const,
    queryFn: ({ pageParam }) =>
      listProjectGitHubCommits(projectKey, repositoryId!, { branch, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: Boolean(projectKey) && repositoryId !== null,
  });
}

export function useProjectGitHubIssuesQuery(
  projectKey: string,
  repositoryId: number | null,
  state: 'open' | 'closed' | 'all',
) {
  return useInfiniteQuery({
    queryKey: ['projectGitHub', projectKey, repositoryId, 'issues', state] as const,
    queryFn: ({ pageParam }) =>
      listProjectGitHubIssues(projectKey, repositoryId!, { state, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: Boolean(projectKey) && repositoryId !== null,
  });
}

export function useImportGitHubIssues(projectKey: string, repositoryId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof importProjectGitHubIssues>[2]) =>
      importProjectGitHubIssues(projectKey, repositoryId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.boardIssues(projectKey) });
    },
  });
}

export function useCreateIssueFromPr(projectKey: string, repositoryId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { number: number; title: string; columnId?: number }) =>
      createIssueFromGitHubPr(projectKey, repositoryId!, input.number, {
        title: input.title,
        columnId: input.columnId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.boardIssues(projectKey) });
    },
  });
}
