export function MoonIcon({ className }: { className?: string }) {
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
      {/* Moon crescent */}
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
      {/* Large sparkle — appears on hover */}
      <path
        d="M19 0.5l1 3.5 3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1Z"
        fill="currentColor"
        strokeWidth="0"
        className="origin-[19px_5px] scale-0 transition-transform duration-300 ease-out group-hover/theme:scale-100"
      />
    </svg>
  );
}
