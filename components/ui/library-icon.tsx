export function LibraryIcon({ className }: { className?: string }) {
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
      {/* Leftmost vertical line — leans right most on hover */}
      <path
        d="M4 4v16"
        className="origin-[4px_20px] transition-transform duration-300 ease-out group-hover/browse:rotate-[16deg]"
      />
      {/* Second vertical line */}
      <path
        d="M8 8v12"
        className="origin-[8px_20px] transition-transform duration-300 ease-out group-hover/browse:rotate-[16deg]"
      />
      {/* Third vertical line */}
      <path
        d="M12 6v14"
        className="origin-[12px_20px] transition-transform duration-300 ease-out group-hover/browse:rotate-[16deg]"
      />
      {/* Rightmost leaning line — straightens to vertical on hover */}
      <path
        d="m16 6 4 14"
        className="origin-[20px_20px] transition-transform duration-300 ease-out group-hover/browse:rotate-[16deg]"
      />
    </svg>
  );
}
