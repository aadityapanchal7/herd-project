'use client'

import { useRef, useCallback, useEffect } from 'react'

export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  })

  return { containerRef, scrollToBottom }
}