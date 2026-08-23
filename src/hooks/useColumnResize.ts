'use client'

import { useState, useCallback } from 'react'

export function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(initialWidths)

  const onMouseDown = useCallback((idx: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = widths[idx]

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, startW + ev.clientX - startX)
      setWidths(prev => {
        const next = [...prev]
        next[idx] = newW
        return next
      })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [widths])

  return { widths, onMouseDown }
}
