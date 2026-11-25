'use client';

import { useTranslations } from 'next-intl';
import { BrandMark } from '@/cloud';
import { useOnboardingTour } from '@/context/onboardingTour';
import { useAppVersionQuery } from '@/services/updates.service';
import { APP_NAME } from '@/utils/app';

// The product mark at the bottom of both sidebars, with the running version under it.
export default function SidebarBrandFooter() {
  const t = useTranslations('onboarding');
  const tour = useOnboardingTour();
  const { data: appVersion } = useAppVersionQuery();
  const version = appVersion?.version;

  return (
    <div className="flex w-full items-center gap-2.5 px-2 pt-2 pb-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <button
        type="button"
        onClick={tour.replay}
        data-product-mark
        aria-label={t('replay')}
        title={t('replay')}
        className="shrink-0 rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden"
      >
        <BrandMark className="size-9 text-sidebar-foreground" />
      </button>
      <div className="grid text-start leading-none group-data-[collapsible=icon]:hidden">
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          {APP_NAME}
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          {version ? `v${version} · Lite` : 'Lite'}
        </span>
      </div>
    </div>
  );
}
