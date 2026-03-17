import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { worldToScreen } from '../canvas/viewport'

export function NodeTooltip({ containerWidth, containerHeight }: { containerWidth: number; containerHeight: number }) {
  const { nodes, selectedNodeId, viewport } = useGraphState()
  const dispatch = useGraphDispatch()

  if (!selectedNodeId) return null

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const vp = {
    ...viewport,
    x: viewport.x + containerWidth / 2,
    y: viewport.y + containerHeight / 2,
  }
  const screen = worldToScreen(node.x, node.y, vp)

  // Position tooltip to the right of the node, or left if too close to edge
  const tooltipWidth = 220
  const tooltipHeight = 140
  let left = screen.x + 24
  let top = screen.y - tooltipHeight / 2

  if (left + tooltipWidth > containerWidth - 20) {
    left = screen.x - tooltipWidth - 24
  }
  top = Math.max(10, Math.min(top, containerHeight - tooltipHeight - 10))

  return (
    <div
      className="node-tooltip"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="node-tooltip__bar" style={{ background: node.color }} />
      <div className="node-tooltip__title">{node.label}</div>
      {node.description && (
        <div className="node-tooltip__desc">{node.description}</div>
      )}
      {node.tags.length > 0 && (
        <div className="node-tooltip__tags">
          {node.tags.map((tag) => (
            <span key={tag} className="node-tooltip__tag">{tag}</span>
          ))}
        </div>
      )}
      <div className="node-tooltip__actions">
        <button
          className="node-tooltip__btn"
          onClick={() => dispatch({ type: 'REMOVE_NODE', nodeId: node.id })}
        >
          Delete
        </button>
        <button
          className="node-tooltip__btn"
          onClick={() => dispatch({ type: 'SET_SELECTED', nodeId: null })}
        >
          Close
        </button>
      </div>
    </div>
  )
}
