import React, { ReactElement, isValidElement } from 'react'

export function IconWrapper({ children, size = 'w-5 h-5', bg = false }: { children: ReactElement<any>; size?: string; bg?: boolean }) {
  if (!isValidElement(children)) return null

  const childClass = `${size} text-primary-foreground`
  const existing = (children.props && (children.props as any).className) || ''
  const merged = { className: [childClass, existing].join(' ').trim() }

  if (bg) {
    return (
      <div className={`rounded-full bg-primary p-2 inline-flex items-center justify-center`}>
        {React.cloneElement(children, merged)}
      </div>
    )
  }

  return React.cloneElement(children, merged)
}
