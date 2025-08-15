import React from 'react'

export function BrandSparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <title>Herd brand spark</title>
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)" />
        </linearGradient>
      </defs>
      <path d="M24 4c1 3 3 5 6 6 0 0 4 1 6 4 3 4 3 8 3 8s1 5-2 9c-3 4-7 6-11 7-3 1-6 1-9 0-4-1-7-3-9-6-2-3-3-7-2-11 1-4 4-8 8-10 3-1 5-2 8-3z" fill="currentColor" opacity="0.08" />
      <g opacity="0.98" fill="currentColor">
        <circle cx="24" cy="12" r="3" />
        <rect x="22" y="20" width="4" height="10" rx="1" />
        <path d="M16 30c2-2 6-2 8 0" stroke="none" />
      </g>
    </svg>
  )
}
