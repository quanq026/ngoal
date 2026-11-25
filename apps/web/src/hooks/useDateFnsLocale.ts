'use client';

import { enUS, type Locale as DateFnsLocale } from 'date-fns/locale';

export function useDateFnsLocale(): DateFnsLocale {
  return enUS;
}
