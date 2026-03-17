import { useGraphState } from '../state/GraphContext'

export function StatusBar() {
  const { nodes, edges } = useGraphState()
  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <div className="status-bar__indicator" />
        <span>{nodes.length} nodes</span>
        <span>{edges.length} connections</span>
      </div>
      <div className="status-bar__right">
        <span>Graph View</span>
        <span>Cosmos Note v0.1</span>
      </div>
    </div>
  )
}
