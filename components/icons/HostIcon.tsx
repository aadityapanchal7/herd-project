import React from 'react'

export function HostIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <title>Host</title>
      <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.95" />
+      <path d="M7 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
+      <circle cx="12" cy="9" r="1" fill="currentColor" />
    </svg>
  )
}
