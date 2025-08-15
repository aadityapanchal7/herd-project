import React from 'react'

export function CommunityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <title>Community</title>
      <path d="M12 12a3 3 0 100-6 3 3 0 000 6z" fill="currentColor" opacity="0.95" />
      <path d="M4 20c0-3 4-5 8-5s8 2 8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  )
}
