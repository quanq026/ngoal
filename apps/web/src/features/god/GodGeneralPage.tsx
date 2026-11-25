'use client';

import GodSettingsGate from './components/GodSettingsGate';
import GodGeneralForm from './components/general/GodGeneralForm';
import { useInstanceAuthSettingsQuery } from './services/god.service';

export default function GodGeneralPage() {
  const auth = useInstanceAuthSettingsQuery().data;

  return (
    <GodSettingsGate slug="general" data={auth ? { auth } : undefined}>
      {(data) => <GodGeneralForm {...data} />}
    </GodSettingsGate>
  );
}
