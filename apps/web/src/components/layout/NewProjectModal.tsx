import { useState, type ReactNode } from 'react';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCreateProject } from '@/services/projects.service';
import { useTeamsQuery } from '@/services/teams.service';
import { useCopyColumns } from '@/hooks/useCopyColumns';
import { includeOf, type CopyInclude } from '@/utils/copyOptions';
import { normalizeKey, suggestKey } from '@/utils/projectKey';
import type { PresetKey } from '@/utils/projectPresets';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import CopyProjectForm from '@/components/layout/CopyProjectForm';
import NewProjectFields from '@/components/layout/NewProjectFields';
import NewProjectPreset from '@/components/layout/NewProjectPreset';

export default function NewProjectModal({
  onClose,
  onCreated,
  teamId,
  copyFrom,
}: {
  onClose: () => void;
  onCreated: (projectKey: string) => void;
  teamId: number;
  copyFrom?: { id: number; name: string; description: string };
}) {
  const t = useTranslations('newProject');
  const initialName = copyFrom ? t('copyName', { name: copyFrom.name }) : '';
  const [key, setKey] = useState(() => suggestKey(initialName));
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(copyFrom?.description ?? '');
  const [keyEdited, setKeyEdited] = useState(false);
  const copyColumns = useCopyColumns();
  const [include, setInclude] = useState<CopyInclude>({});
  const [preset, setPreset] = useState<PresetKey>('general');
  const createProject = useCreateProject();
  const teams = useTeamsQuery().data;
  const team = teams?.find((one) => one.id === teamId);

  function onNameChange(value: string) {
    setName(value);
    if (!keyEdited) setKey(suggestKey(value));
  }

  function onKeyChange(value: string) {
    const next = normalizeKey(value);
    setKey(next);
    setKeyEdited(next !== '');
  }

  function submit() {
    const input = {
      key: key.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      ...(copyFrom ? { include: includeOf(copyColumns, include) } : { preset }),
    };
    createProject.mutate(
      { teamId, copyFromId: copyFrom?.id, input },
      { onSuccess: (project) => onCreated(project.ref) },
    );
  }

  const fields = (
    <NewProjectFields
      name={name}
      projectKey={key}
      description={description}
      onNameChange={onNameChange}
      onKeyChange={onKeyChange}
      onDescriptionChange={setDescription}
    />
  );

  const body: ReactNode = copyFrom ? (
    <CopyProjectForm
      name={name}
      projectKey={key}
      description={description}
      columns={copyColumns}
      include={include}
      onNameChange={onNameChange}
      onKeyChange={onKeyChange}
      onDescriptionChange={setDescription}
      onIncludeChange={setInclude}
    />
  ) : (
    <div className="grid gap-6 sm:grid-cols-[1.15fr_1fr]">
      {fields}
      <NewProjectPreset value={preset} onChange={setPreset} />
    </div>
  );

  return (
    <Modal
      title={copyFrom ? t('copyTitle', { name: copyFrom.name }) : t('title')}
      scope={
        team && (
          <>
            <Users className="size-3.5" />
            {team.name}
          </>
        )
      }
      onClose={onClose}
      wide="xl"
      className="pb-3"
    >
      <div className="flex min-h-0 flex-col">
        <div className="max-h-[55vh] overflow-y-auto pr-1">{body}</div>
        <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
          <Button
            disabled={createProject.isPending || !key.trim() || !name.trim()}
            onClick={submit}
          >
            {t(copyFrom ? 'copyAction' : 'create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
