import { useState, useRef, useEffect, useCallback } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { generateBranches } from '../utils/generateBranches'

export function NodeCreator({ onReheat }: { onReheat: () => void }) {
  const state = useGraphState()
  const dispatch = useGraphDispatch()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<number>(0)

  const interaction = state.interaction
  const isActive = interaction.type === 'creating-node'

  useEffect(() => {
    if (isActive) {
      setValue('')
      // Delay focus to avoid immediate blur from canvas click
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [isActive])

  useEffect(() => {
    return () => clearTimeout(blurTimeoutRef.current)
  }, [])

  const handleCancel = useCallback(() => {
    dispatch({ type: 'SET_INTERACTION', interaction: { type: 'idle' } })
  }, [dispatch])

  const handleBlur = useCallback(() => {
    // Delay to allow form submit to fire first
    blurTimeoutRef.current = window.setTimeout(handleCancel, 200)
  }, [handleCancel])

  if (!isActive) return null

  const { worldX, worldY, screenX, screenY } = interaction

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearTimeout(blurTimeoutRef.current)
    const text = value.trim()
    if (!text) return

    const { nodes, edges } = generateBranches(text, worldX, worldY)
    dispatch({ type: 'BATCH_ADD', nodes, edges })
    dispatch({ type: 'SET_SELECTED', nodeId: nodes[0].id })
    dispatch({ type: 'SET_INTERACTION', interaction: { type: 'idle' } })
    onReheat()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearTimeout(blurTimeoutRef.current)
      handleCancel()
    }
  }

  // Position the input near the click point
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${Math.min(screenX, (window.innerWidth - 360))}px`,
    top: `${Math.max(8, screenY - 50)}px`,
    zIndex: 30,
  }

  return (
    <div style={style} className="node-creator" onMouseDown={(e) => e.stopPropagation()}>
      <form onSubmit={handleSubmit} className="node-creator__form">
        <div className="node-creator__dot" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="질문, 고민, 메모를 적어보세요..."
          className="node-creator__input"
          autoComplete="off"
        />
        <span className="node-creator__hint">Enter</span>
      </form>
    </div>
  )
}
