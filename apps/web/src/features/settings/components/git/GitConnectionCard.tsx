import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { GitSettings } from '@/lib/api/endpoints/git';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Button } from '@/components/ui/button';
import { useRegenerateGitSecret } from '../../services/settings.service';
import GitCopyField from './GitCopyField';
import GithubCliCommand from './GithubCliCommand';

// The Connection block: how to register the webhook on a repository, and which
// repositories have delivered so far.
export default function GitConnectionCard({
  projectKey,
  settings,
}: {
  projectKey: string;
  settings: GitSettings;
}) {
  const t = useTranslations('settings.git');
  const regenerate = useRegenerateGitSecret(projectKey);

  async function regenerateSecret() {
    await regenerate.mutateAsync();
    toast.success(t('secretRegenerated'));
  }

  const regenerateAction = (
    <Button
      variant="ghost"
      size="sm"
      disabled={regenerate.isPending}
      onClick={() => void regenerateSecret()}
    >
      {t('regenerate')}
    </Button>
  );

  return (
    <SettingsSection title={t('webhookEndpoint')} description={t('webhookEndpointHint')}>
      <SettingsCard className="divide-y divide-border/60">
        <div className="space-y-4 p-4">
          <GitCopyField label={t('payloadUrl')} value={settings.payloadUrl} />
          <GitCopyField
            label={t('webhookSecret')}
            value={settings.secret}
            masked
            action={regenerateAction}
          />
        </div>
        <details className="group p-4">
          <summary className="cursor-pointer list-none text-sm font-medium select-none marker:content-none">
            <span className="inline-flex items-center gap-2">
              <span className="transition-transform group-open:rotate-90">›</span>
              {t('manualSetup')}
            </span>
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              {t.rich('hintGithub', {
                b: (chunks) => <b>{chunks}</b>,
                code: (chunks) => <code className="rounded bg-muted px-1 py-0.5">{chunks}</code>,
              })}
            </p>
            <GithubCliCommand payloadUrl={settings.payloadUrl} secret={settings.secret} />
          </div>
        </details>
      </SettingsCard>
    </SettingsSection>
  );
}
