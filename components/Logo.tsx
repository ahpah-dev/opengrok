export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <circle cx="16" cy="16" r="8" />
      <path d="M7 26 25 6" />
    </svg>
  );
}
