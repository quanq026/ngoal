import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, GitBranch } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { CreatedIssueBranchResponse } from '@/lib/api/endpoints/git';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateIssueBranch,
  useDevelopmentBranchesQuery,
  useIssueDevelopmentRepositoriesQuery,
} from '@/services/issues.service';
import { GIT_PROVIDER_CONFIG } from '@/utils/gitProviderConfig';

function suggestBranchName(identifier: string, title: string): string {
  const asciiTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const prefix = identifier.toLowerCase();
  const combined = asciiTitle ? `${prefix}-${asciiTitle}` : prefix;
  return combined.slice(0, 60).replace(/-+$/, '');
}

export default function IssueDevelopmentCreateBranchDialog({
  issueId,
  identifier,
  issueTitle,
  open,
  onOpenChange,
}: {
  issueId: number;
  identifier: string;
  issueTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('issue.development');
  const repositoriesQuery = useIssueDevelopmentRepositoriesQuery(issueId, open);
  const [repositoryId, setRepositoryId] = useState<number | null>(null);
  const branchesQuery = useDevelopmentBranchesQuery(issueId, repositoryId, open);
  const branches = useMemo(
    () => [...new Set(branchesQuery.data?.pages.flatMap((page) => page.branches) ?? [])],
    [branchesQuery.data],
  );
  const defaultBranch = branchesQuery.data?.pages[0]?.defaultBranch ?? null;
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [created, setCreated] = useState<CreatedIssueBranchResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const createBranch = useCreateIssueBranch(issueId);

  useEffect(() => {
    if (open && repositoryId === null && repositoriesQuery.data?.[0]) {
      setRepositoryId(repositoriesQuery.data[0].id);
    }
    if (open && !branchName) {
      setBranchName(suggestBranchName(identifier, issueTitle));
    }
    if (!open) {
      setRepositoryId(null);
      setBranchName('');
      setBaseBranch('');
      setCreated(null);
      setCopied(false);
    }
  }, [branchName, identifier, issueTitle, open, repositoryId, repositoriesQuery.data]);

  useEffect(() => {
    if (open && !baseBranch && defaultBranch) {
      setBaseBranch(defaultBranch);
    }
  }, [baseBranch, defaultBranch, open]);

  async function submit() {
    if (repositoryId === null) return;
    try {
      const res = await createBranch.mutateAsync({
        repositoryId,
        branchName: branchName.trim(),
        baseBranch: baseBranch.trim(),
      });
      setCreated(res);
      toast.success(`Created branch ${res.branchName} and linked it to ${identifier}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create branch');
    }
  }

  async function copyCommand() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.checkoutCommand);
      setCopied(true);
      toast.success('Copied checkout command');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  const valid =
    repositoryId !== null &&
    branchName.trim().length > 0 &&
    !/\s/.test(branchName.trim()) &&
    baseBranch.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="size-4" />
            Create branch
          </DialogTitle>
          <DialogDescription>
            Create a new GitHub branch from a base branch and link it to {identifier}.
          </DialogDescription>
        </DialogHeader>

        {repositoriesQuery.isPending ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {t('loadingRepositories')}
          </div>
        ) : repositoriesQuery.data?.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {t('noConnectedRepositories')}
          </div>
        ) : created ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Created branch <code className="font-mono">{created.branchName}</code>
              </p>
              <div className="flex items-center justify-between gap-2 rounded bg-background/80 px-3 py-2 font-mono text-xs">
                <span className="truncate">{created.checkoutCommand}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => void copyCommand()}
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy
                </Button>
              </div>
              {created.url && (
                <Button asChild size="sm" variant="outline">
                  <a href={created.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" />
                    Open branch on GitHub
                  </a>
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t('repository')}</span>
              <Select
                value={repositoryId === null ? undefined : String(repositoryId)}
                onValueChange={(value) => {
                  setRepositoryId(Number(value));
                  setBaseBranch('');
                }}
              >
                <SelectTrigger className="w-full rounded-md">
                  <SelectValue placeholder={t('chooseRepository')} />
                </SelectTrigger>
                <SelectContent>
                  {repositoriesQuery.data?.map((repository) => (
                    <SelectItem key={repository.id} value={String(repository.id)}>
                      {GIT_PROVIDER_CONFIG[repository.provider].label} · {repository.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {branchesQuery.isError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {branchesQuery.error instanceof Error
                  ? branchesQuery.error.message
                  : 'Could not load branches'}
              </p>
            )}

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Base branch</span>
              <Select value={baseBranch || undefined} onValueChange={setBaseBranch}>
                <SelectTrigger className="w-full rounded-md">
                  <SelectValue placeholder={t('chooseBranch')} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Branch name</span>
              <Input
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                placeholder="pj1-12-feature-name"
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!valid || createBranch.isPending}
                onClick={() => void submit()}
              >
                {createBranch.isPending ? 'Creating…' : 'Create branch'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
