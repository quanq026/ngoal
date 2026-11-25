'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsRow from '@/components/common/page/SettingsRow';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Switch } from '@/components/ui/switch';
import GodSectionPage from '../GodSectionPage';
import { useUpdateInstanceAuthSettings } from '../../services/god.service';
import type { InstanceAuthSettings } from '@/lib/api/endpoints/god';

// Personal workspaces are stored with the auth settings, because sign-up reads them;
// the switch sits here, since it is about how people work, not how they sign in.
export default function GodGeneralForm({ auth }: { auth: InstanceAuthSettings }) {
  const t = useTranslations('god.general');
  const updateAuth = useUpdateInstanceAuthSettings();

  async function setPersonalWorkspaces(personalWorkspaces: boolean) {
    try {
      await updateAuth.mutateAsync({ personalWorkspaces });
      toast.success(t('workspacesSaved'));
    } catch {
      // The failure already surfaced through the global mutation error toast.
    }
  }

  async function setInviteSearch(inviteSearch: boolean) {
    try {
      await updateAuth.mutateAsync({ inviteSearch });
      toast.success(t('invitesSaved'));
    } catch {
      // The failure already surfaced through the global mutation error toast.
    }
  }

  return (
    <GodSectionPage slug="general">
      <div className="space-y-10">
        <SettingsSection title={t('workspaces')}>
          <SettingsCard>
            <SettingsRow
              title={t('personalWorkspaces')}
              description={t('personalWorkspacesHint')}
              control={
                <Switch
                  checked={auth.personalWorkspaces}
                  disabled={updateAuth.isPending}
                  onCheckedChange={(checked) => void setPersonalWorkspaces(checked)}
                />
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={t('invites')}>
          <SettingsCard>
            <SettingsRow
              title={t('inviteSearch')}
              description={t('inviteSearchHint')}
              control={
                <Switch
                  checked={auth.inviteSearch}
                  disabled={updateAuth.isPending}
                  onCheckedChange={(checked) => void setInviteSearch(checked)}
                />
              }
            />
          </SettingsCard>
        </SettingsSection>
      </div>
    </GodSectionPage>
  );
}
