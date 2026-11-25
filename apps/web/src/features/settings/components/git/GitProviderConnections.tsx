'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GitBranch, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getGitHubOAuthStartUrl } from '@/lib/api/endpoints/git';
import { useGitHubOAuthStatusQuery } from '@/services/gitConnections.service';
import { GIT_PROVIDER_CONFIG } from '@/utils/gitProviderConfig';
import { teamSectionPath } from '@/utils/paths';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Button } from '@/components/ui/button';
import { useGitProviderConnectionsQuery } from '../../services/settings.service';
import GitProviderConnectionCard from './GitProviderConnectionCard';

export default function GitProviderConnections({
  projectKey,
  teamId,
  teamRef,
  canManageTeam,
}: {
  projectKey: string;
  teamId: number;
  teamRef: string;
  canManageTeam: boolean;
}) {
  const t = useTranslations('settings.git');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const connections = useGitProviderConnectionsQuery(projectKey);
  const githubOAuth = useGitHubOAuthStatusQuery(teamId, canManageTeam);
  const empty = !connections.isPending && connections.data?.length === 0;

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

  const githubConnectButton =
    canManageTeam &&
    (githubOAuth.data?.enabled ? (
      <Button asChild variant="outline" size="sm">
        <a href={getGitHubOAuthStartUrl(teamId, pathname)}>
          <GitBranch className="size-3.5" />
          {t('nativeConnectProvider', { provider: GIT_PROVIDER_CONFIG.github.label })}
        </a>
      </Button>
    ) : (
      <Button asChild variant="outline" size="sm">
        <Link href={teamSectionPath(teamRef, 'git')}>
          <GitBranch className="size-3.5" />
          {t('nativeConnectProvider', { provider: GIT_PROVIDER_CONFIG.github.label })}
        </Link>
      </Button>
    ));

  const addButton = canManageTeam && (
    <div className="flex flex-wrap items-center gap-2">
      {githubConnectButton}
      <Button asChild variant="ghost" size="sm">
        <Link href={teamSectionPath(teamRef, 'git')}>
          <Plus className="size-3.5" />
          {tc('add')}
        </Link>
      </Button>
    </div>
  );

  return (
    <SettingsSection title={t('nativeConnectionsRecommended')} action={!empty && addButton}>
      <div className="space-y-3">
        {connections.isPending ? (
          <ListSkeleton rows={2} rowClassName="h-24" />
        ) : (
          connections.data?.map((connection) => (
            <GitProviderConnectionCard
              key={connection.id}
              projectKey={projectKey}
              connection={connection}
            />
          ))
        )}
        {empty && (
          <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            <p>{t('nativeNoConnections')}</p>
            {addButton || <p>{t('nativeAskTeamManager')}</p>}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
