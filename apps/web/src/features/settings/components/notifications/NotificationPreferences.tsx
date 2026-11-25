import { Mail } from 'lucide-react';
import SettingsSection from '@/components/common/page/SettingsSection';
import NotificationChannelHeader from './NotificationChannelHeader';
import NotificationChannelRow from './NotificationChannelRow';
import { NOTIFICATION_EVENTS } from '../../utils/notificationEvents';
import type { NotificationPreferencesForm } from '../../hooks/useNotificationPreferencesForm';
import { useTranslations } from 'next-intl';

const COLS = 'grid grid-cols-[1fr_5rem] items-center';

export default function NotificationPreferences({ form }: { form: NotificationPreferencesForm }) {
  const t = useTranslations('settings.notifications');
  const emailLabel = t('email');

  return (
    <div className="flex flex-col gap-10">
      <SettingsSection title={t('eventsTitle')}>
        <div className="max-w-xl">
          <div className={`${COLS} px-3 pb-1`}>
            <span />
            <NotificationChannelHeader icon={<Mail className="size-3.5" />} label={emailLabel} />
          </div>
          <div className="flex flex-col">
            {NOTIFICATION_EVENTS.map((event) => (
              <NotificationChannelRow
                key={event}
                label={t(`events.${event}`)}
                cols={COLS}
                cells={[
                  {
                    channel: emailLabel,
                    checked: form.emailEvents[event],
                    onChange: (value) =>
                      form.setEmailEvents({ ...form.emailEvents, [event]: value }),
                  },
                ]}
              />
            ))}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
