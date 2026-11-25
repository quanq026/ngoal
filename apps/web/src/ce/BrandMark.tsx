'use client';

import NGoalMark from '@/components/brand/NGoalMark';

// The product mark at the top and the bottom of both sidebars.
export default function BrandMark({ className }: { className?: string }) {
  return <NGoalMark className={className} />;
}
