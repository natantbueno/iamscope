export default function EntraScopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="IAM Scope"
    >
      {/* Shield */}
      <path
        d="M16 2L4 7v9c0 6.627 5.148 11.427 12 13 6.852-1.573 12-6.373 12-13V7L16 2z"
        fill="#0078d4"
      />
      {/* Scope circle */}
      <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="1.8" fill="none" />
      {/* Crosshair ticks */}
      <line x1="16" y1="10" x2="16" y2="8"  stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="22" x2="16" y2="24" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="16" x2="8"  y2="16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="16" x2="24" y2="16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="16" cy="16" r="1.8" fill="white" />
    </svg>
  )
}
