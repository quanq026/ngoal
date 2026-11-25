// The nGoal brand mark: a clean geometric lowercase "n" arch paired with a
// goal bullseye target aligned on the right axis. Single-color via currentColor
// so it adapts cleanly to dark, light, and custom sidebar themes.
export default function NGoalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
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
