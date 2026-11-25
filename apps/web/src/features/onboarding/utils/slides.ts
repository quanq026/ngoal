export type OnboardingSlideId = 'workItems' | 'cycles' | 'notes' | 'dashboards';

export interface OnboardingSlideDef {
  id: OnboardingSlideId;
  // The background of the slide's picture and the dot beside its name, one hue per slide.
  tint: string;
  dot: string;
}

export const ONBOARDING_SLIDES: OnboardingSlideDef[] = [
  { id: 'workItems', tint: 'bg-[#E7EEFC] dark:bg-[#1A2234]', dot: 'bg-[#4C7DEB]' },
  { id: 'cycles', tint: 'bg-[#FCEDE2] dark:bg-[#30231A]', dot: 'bg-[#E8783D]' },
  { id: 'notes', tint: 'bg-[#FCE9F1] dark:bg-[#311F29]', dot: 'bg-[#DB5B92]' },
  { id: 'dashboards', tint: 'bg-[#E2F3EF] dark:bg-[#18292A]', dot: 'bg-[#2A9D8F]' },
];
