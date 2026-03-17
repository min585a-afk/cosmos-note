import { useState, useEffect, useRef } from 'react'
import { useGraphDispatch, useGraphState } from '../state/GraphContext'
import { generateBranches } from '../utils/generateBranches'
import { screenToWorld } from '../canvas/viewport'

export function BranchInput({
  containerWidth,
  containerHeight,
  onReheat,
}: {
  containerWidth: number
  containerHeight: number
  onReheat: () => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dispatch = useGraphDispatch()
  const { viewport } = useGraphState()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !open && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setValue('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return

    const vp = {
      ...viewport,
      x: viewport.x + containerWidth / 2,
      y: viewport.y + containerHeight / 2,
    }
    const center = screenToWorld(containerWidth / 2, containerHeight / 2, vp)
    const { nodes, edges } = generateBranches(value.trim(), center.x, center.y)

    dispatch({ type: 'BATCH_ADD', nodes, edges })
    onReheat()
    setValue('')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="branch-input-overlay">
      <form className="branch-input" onSubmit={handleSubmit}>
        <div className="branch-input__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M6 21V9a9 9 0 0 0 9 9" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="branch-input__field"
          placeholder="What do you want to explore? (e.g., How to improve productivity?)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="branch-input__hint">Enter to create branches</span>
      </form>
    </div>
  )
}
