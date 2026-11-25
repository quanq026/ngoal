'use client';

import type { ImportSourceEntry } from '@/features/settings/types/importSource';

export default function useImportSources(core: ImportSourceEntry[]): ImportSourceEntry[] {
  return core;
}
