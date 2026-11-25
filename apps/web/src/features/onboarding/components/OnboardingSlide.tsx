import type { ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { OnboardingSlideDef, OnboardingSlideId } from '../utils/slides';
import OnboardingCyclesArt from './art/OnboardingCyclesArt';
import OnboardingDashboardsArt from './art/OnboardingDashboardsArt';
import OnboardingNotesArt from './art/OnboardingNotesArt';
import OnboardingWorkItemsArt from './art/OnboardingWorkItemsArt';

const ART: Record<OnboardingSlideId, ComponentType> = {
  dashboards: OnboardingDashboardsArt,
  workItems: OnboardingWorkItemsArt,
  cycles: OnboardingCyclesArt,
  notes: OnboardingNotesArt,
};

// One slide: its picture over its name, title and text. A slide out of view is inert, so
// Tab never reaches the controls of a picture the reader cannot see.
export default function OnboardingSlide({
  slide,
  inert,
}: {
  slide: OnboardingSlideDef;
  inert: boolean;
}) {
  const t = useTranslations('onboarding');
  const tNav = useTranslations('nav');
  const Art = ART[slide.id];
  const name: Record<OnboardingSlideId, string> = {
    dashboards: tNav('dashboards'),
    workItems: tNav('workItems'),
    cycles: tNav('cycles'),
    notes: tNav('notes'),
  };

  return (
    <section inert={inert} className="w-full shrink-0 snap-start">
      <div dir="ltr" className={cn('@container relative aspect-[600/280] w-full', slide.tint)}>
        <Art />
      </div>
      <div className="flex flex-col gap-2 px-7 pt-5 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className={cn('size-2 rounded-full', slide.dot)} />
          {name[slide.id]}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{t(`slides.${slide.id}.title`)}</h2>
        <p className="text-sm text-muted-foreground">{t(`slides.${slide.id}.body`)}</p>
      </div>
    </section>
  );
}
