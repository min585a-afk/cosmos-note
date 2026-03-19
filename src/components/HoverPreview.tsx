import { useState, useEffect, useRef } from 'react'
import { useGraphState } from '../state/GraphContext'
import { worldToScreen } from '../canvas/viewport'
import { NODE_COLORS, EMPTY_NODE_COLOR } from '../types/graph'

export function HoverPreview({
  containerWidth,
  containerHeight,
}: {
  containerWidth: number
  containerHeight: number
}) {
  const { nodes, hoveredNodeId, selectedNodeId, viewport } = useGraphState()
  const [visibleNodeId, setVisibleNodeId] = useState<string | null>(null)
  const timerRef = useRef<number>(0)

  useEffect(() => {
    clearTimeout(timerRef.current)

    // Don't show hover preview if node is already selected (tooltip is showing)
    if (!hoveredNodeId || hoveredNodeId === selectedNodeId) {
      setVisibleNodeId(null)
      return
    }

    timerRef.current = window.setTimeout(() => {
      setVisibleNodeId(hoveredNodeId)
    }, 1200)

    return () => clearTimeout(timerRef.current)
  }, [hoveredNodeId, selectedNodeId])

  // Hide when selection changes
  useEffect(() => {
    if (selectedNodeId) setVisibleNodeId(null)
  }, [selectedNodeId])

  if (!visibleNodeId) return null

  const node = nodes.find(n => n.id === visibleNodeId)
  if (!node) return null

  const vp = {
    ...viewport,
    x: viewport.x + containerWidth / 2,
    y: viewport.y + containerHeight / 2,
  }
  const screen = worldToScreen(node.x, node.y, vp)

  const previewWidth = 220
  let left = screen.x + 20
  let top = screen.y - 40

  if (left + previewWidth > containerWidth - 16) {
    left = screen.x - previewWidth - 20
  }
  top = Math.max(8, Math.min(top, containerHeight - 120))

  const color = node.description.trim() ? NODE_COLORS[node.type] : EMPTY_NODE_COLOR

  return (
    <div
      className="hover-preview"
      style={{ left, top, width: previewWidth }}
    >
      <div className="hover-preview__bar" style={{ background: color }} />
      <div className="hover-preview__title">{node.label}</div>
      {node.description && (
        <div className="hover-preview__desc">{node.description}</div>
      )}
      {node.tags.length > 0 && (
        <div className="hover-preview__tags">
          {node.tags.map(t => (
            <span key={t} className="hover-preview__tag">#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
