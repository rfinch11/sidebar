export function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Door frame — stays still */}
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      {/* Arrow — nudges right on hover */}
      <g className="group-hover/signout:[animation:nudge-right_0.4s_ease-out]">
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </g>
    </svg>
  );
}
