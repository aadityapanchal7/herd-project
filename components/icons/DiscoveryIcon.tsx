import React from 'react'

export function DiscoveryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <title>Discovery</title>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.12" />
      <path d="M8.5 15.5l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="11" y="5" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.95" />
    </svg>
  )
}
