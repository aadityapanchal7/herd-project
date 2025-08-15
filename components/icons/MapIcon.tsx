import React from 'react'

export function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <title>Map</title>
      <path d="M3 6l6-2 6 2 6-2v13l-6 2-6-2-6 2V6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
+      <path d="M9 4v14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  )
}
