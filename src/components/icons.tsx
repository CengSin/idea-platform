export function SproutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="22" r="3.2" fill="currentColor" />
      <path
        d="M16 20.5c0-6 3.5-10.5 9-12-1 6.5-4 10-9 12Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M16 21c-1.5-5.5-6-9-11-9 2.5 5 6 8 11 9Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path d="M16 22v-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M14.8 9.2 10.7 10.7 9.2 14.8l4.1-1.5 1.5-4.1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.5 18.2c1.3-2.6 3.2-3.8 5.5-3.8s4.2 1.2 5.5 3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
