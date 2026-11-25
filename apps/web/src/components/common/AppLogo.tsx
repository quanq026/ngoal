// The nGoal product mark, drawn in currentColor so it works on any background.
export default function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.25"
      />
      <path
        d="M9.5 23V14.5C9.5 11.19 12.19 8.5 15.5 8.5C18.81 8.5 21.5 11.19 21.5 14"
        stroke="currentColor"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="21.2" r="3.6" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.7" />
      <circle cx="21.5" cy="21.2" r="1.9" fill="currentColor" />
    </svg>
  );
}
