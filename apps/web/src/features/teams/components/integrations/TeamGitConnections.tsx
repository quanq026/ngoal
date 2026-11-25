'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, GitBranch, Settings2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getGitHubOAuthStartUrl } from '@/lib/api/endpoints/git';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useDisconnectGitProvider,
  useGitHubOAuthStatusQuery,
  useSaveGitHubOAuthConfig,
  useTeamGitProviderConnectionsQuery,
} from '@/services/gitConnections.service';
import { GIT_PROVIDER_CONFIG } from '@/utils/gitProviderConfig';

export default function TeamGitConnections({ teamId }: { teamId: number }) {
  const t = useTranslations('settings.git');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const connections = useTeamGitProviderConnectionsQuery(teamId);
  const githubOAuth = useGitHubOAuthStatusQuery(teamId);
  const saveOAuth = useSaveGitHubOAuthConfig(teamId);
  const disconnect = useDisconnectGitProvider(teamId);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (githubOAuth.data?.clientId !== undefined) {
      setClientId(githubOAuth.data.clientId);
    }
  }, [githubOAuth.data?.clientId]);

  useEffect(() => {
    const status = searchParams.get('github_oauth');
    if (!status) return;
    if (status === 'connected') {
      toast.success(t('nativeConnected', { provider: GIT_PROVIDER_CONFIG.github.label }));
      void connections.refetch();
    } else if (status === 'error') {
      toast.error(searchParams.get('message') || t('nativeConnectFailed'));
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete('github_oauth');
    next.delete('message');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [connections, pathname, router, searchParams, t]);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveOAuth.mutateAsync({
        clientId,
        clientSecret: clientSecret.trim() || undefined,
      });
      setClientSecret('');
      setShowConfig(false);
      toast.success('GitHub OAuth configuration saved');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save GitHub OAuth configuration',
      );
    }
  }

  async function remove(connectionId: number, label: string) {
    if (!window.confirm(t('nativeDisconnectConfirm', { provider: label }))) return;
    try {
      await disconnect.mutateAsync(connectionId);
      toast.success(t('nativeDisconnected', { provider: label }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('nativeDisconnectFailed'));
    }
  }

  const oauthEnabled = Boolean(githubOAuth.data?.enabled);
  const configVisible = (!githubOAuth.isPending && !oauthEnabled) || showConfig;

  return (
    <SettingsSection title={t('nativeConnectionsRecommended')}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {oauthEnabled ? (
            <Button asChild>
              <a href={getGitHubOAuthStartUrl(teamId, pathname)}>
                <GitBranch className="size-4" />
                {t('nativeConnectProvider', { provider: GIT_PROVIDER_CONFIG.github.label })}
              </a>
            </Button>
          ) : (
            <Button type="button" disabled>
              <GitBranch className="size-4" />
              {t('nativeConnectProvider', { provider: GIT_PROVIDER_CONFIG.github.label })}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setShowConfig((prev) => !prev)}>
            <Settings2 className="size-4" />
            Configure OAuth App
          </Button>
        </div>

        {configVisible && (
          <form onSubmit={(event) => void saveConfig(event)} className="space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">GitHub OAuth App Configuration</p>
                <p className="text-xs text-muted-foreground">
                  Create a GitHub OAuth App and enter its Client ID and Client Secret here.
                  Credentials are encrypted and stored in the database without restarting the server.
                </p>
              </div>
              <Button asChild type="button" variant="outline" size="sm">
                <a
                  href="https://github.com/settings/applications/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" />
                  New GitHub OAuth App
                </a>
              </Button>
            </div>

            <div className="space-y-1.5 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                Homepage URL:{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                  {githubOAuth.data?.homepageUrl || 'http://localhost:3001'}
                </code>
              </p>
              <p>
                Authorization callback URL:{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                  {githubOAuth.data?.callbackUrl || 'http://localhost:3010/git/oauth/github/callback'}
                </code>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="github-oauth-client-id">Client ID</Label>
                <Input
                  id="github-oauth-client-id"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder="Ov23li..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="github-oauth-client-secret">Client Secret</Label>
                <Input
                  id="github-oauth-client-secret"
                  type="password"
                  autoComplete="off"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder={
                    githubOAuth.data?.hasClientSecret
                      ? 'Leave blank to keep current secret'
                      : 'Enter Client Secret'
                  }
                  required={!githubOAuth.data?.hasClientSecret}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={
                  saveOAuth.isPending ||
                  !clientId.trim() ||
                  (!githubOAuth.data?.hasClientSecret && !clientSecret.trim())
                }
              >
                {saveOAuth.isPending ? 'Saving…' : 'Save configuration'}
              </Button>
              {oauthEnabled && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
                  Close
                </Button>
              )}
            </div>
          </form>
        )}

        {connections.isPending ? (
          <ListSkeleton rows={2} rowClassName="h-16" />
        ) : (
          connections.data?.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between gap-4 rounded-md border p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{GIT_PROVIDER_CONFIG[connection.provider].label}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {connection.accountLogin} · {connection.baseUrl}
                </p>
                {connection.repositories
                  .filter((repository) => repository.lastError)
                  .map((repository) => (
                    <p key={repository.id} className="text-xs text-destructive">
                      {repository.fullName}: {repository.lastError}
                    </p>
                  ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('nativeDisconnectProvider')}
                disabled={disconnect.isPending}
                onClick={() =>
                  void remove(connection.id, GIT_PROVIDER_CONFIG[connection.provider].label)
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </SettingsSection>
  );
}
