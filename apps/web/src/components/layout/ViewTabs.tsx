import type { ReactNode } from 'react';
import { FilterIcon } from '@animateicons/react/lucide/filter-icon';
import { Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { View } from '@/lib/api/endpoints/views';
import ToolbarIconButton from '@/components/layout/ToolbarIconButton';
import ViewTabChrome from '@/components/layout/ViewTabChrome';

export default function ViewTabs({
  onSelect,
  onToggleFilter,
  displayControl,
}: {
  views: View[];
  projectKey: string;
  activeViewId: number | null;
  onSelect: (id: number | null) => void;
  onNewView: () => void;
  onEdit: (view: View) => void;
  onDelete: (view: View) => void;
  onDuplicate: (view: View) => void;
  onArrangeRow: (orderedIds: number[]) => void;
  onHide: (view: View) => void;
  onShow: (view: View) => void;
  onResetRow: () => void;
  onPinProjectOrder: () => void;
  onToggleFilter: () => void;
  displayControl: ReactNode;
}) {
  const t = useTranslations('views');

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1.5 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <ViewTabChrome active>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex items-center gap-1.5 py-1 pr-2 pl-2"
          >
            <Layers className="size-3.5" />
            {t('all')}
          </button>
        </ViewTabChrome>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 pl-2">
        <ToolbarIconButton icon={FilterIcon} title={t('filter')} onClick={onToggleFilter} />
        {displayControl}
      </div>
    </div>
  );
}
