'use client';

import { useTranslations } from 'next-intl';
import SearchInput from '@/components/common/SearchInput';

// Search above the directory. Drives server-side queries, so a change here refetches a page.
export default function GodUsersToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const t = useTranslations('god.users');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={t('searchPlaceholder')}
        className="min-w-[240px] flex-1"
      />
    </div>
  );
}
