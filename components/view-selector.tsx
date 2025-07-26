'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map as MapIcon, List as ListIcon } from 'lucide-react'

export function ViewSelector() {
  const path = usePathname()  // e.g. "/dashboard" or "/map"

  const activeClasses   = 'bg-white shadow text-[var(--primary-color)]'
  const inactiveClasses = 'text-zinc-500 hover:text-[var(--primary-color)]'

  return (
    <div className="flex items-center justify-center space-x-2 my-4">
      <Link
        href="/dashboard"
        className={`flex items-center gap-1 px-4 py-2 rounded-full transition ${
          path === '/dashboard' ? activeClasses : inactiveClasses
        }`}
      >
        <ListIcon size={16} className="inline" />
        <span>List View</span>
      </Link>

      <Link
        href="/map"
        className={`flex items-center gap-1 px-4 py-2 rounded-full transition ${
          path === '/map' ? activeClasses : inactiveClasses
        }`}
      >
        <MapIcon size={16} className="inline" />
        <span>Event Map</span>
      </Link>
    </div>
  )
}
