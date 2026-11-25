'use client';

import { useTranslations } from 'next-intl';
import type { NotificationSettings } from '@/lib/api/endpoints/notificationSettings';
import { Button } from '@/components/ui/button';
import { useEmailForm } from '../../hooks/useEmailForm';
import EmailSettings from './EmailSettings';

export default function TeamNotificationProviders({
  teamId,
  settings,
}: {
  teamId: number;
  settings: NotificationSettings;
}) {
  const tCommon = useTranslations('common');
  const emailForm = useEmailForm(teamId, settings);

  return (
    <div className="flex min-w-0 w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={() => void emailForm.save()}
          disabled={!emailForm.dirty || emailForm.saving}
        >
          {tCommon('save')}
        </Button>
      </div>

      <EmailSettings form={emailForm} />
    </div>
  );
}
