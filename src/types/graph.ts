export type NodeType = 'work' | 'personal' | 'task' | 'idea'

export interface GraphNode {
  id: string
  type: NodeType
  label: string
  description: string
  tags: string[]
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
  radius: number
  color: string
  createdAt: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface Viewport {
  x: number
  y: number
  scale: number
}

export type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: string; offsetX: number; offsetY: number }
  | { type: 'panning'; startX: number; startY: number; startVpX: number; startVpY: number }
  | { type: 'creating-edge'; sourceId: string; currentX: number; currentY: number }
  | { type: 'creating-node'; worldX: number; worldY: number; screenX: number; screenY: number }

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport: Viewport
  interaction: InteractionMode
  selectedNodeId: string | null
  hoveredNodeId: string | null
  simulationAlpha: number
  searchQuery: string
}

export type GraphAction =
  | { type: 'UPDATE_POSITIONS'; positions: Array<{ id: string; x: number; y: number; vx: number; vy: number }> }
  | { type: 'ADD_NODE'; node: GraphNode }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'ADD_EDGE'; edge: GraphEdge }
  | { type: 'REMOVE_EDGE'; edgeId: string }
  | { type: 'SET_VIEWPORT'; viewport: Viewport }
  | { type: 'SET_INTERACTION'; interaction: InteractionMode }
  | { type: 'SET_SELECTED'; nodeId: string | null }
  | { type: 'SET_HOVERED'; nodeId: string | null }
  | { type: 'PIN_NODE'; nodeId: string; x: number; y: number }
  | { type: 'UNPIN_NODE'; nodeId: string }
  | { type: 'SET_ALPHA'; alpha: number }
  | { type: 'BATCH_ADD'; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: 'UPDATE_NODE_LABEL'; nodeId: string; label: string }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<Pick<GraphNode, 'label' | 'description' | 'tags' | 'type' | 'color'>> }
  | { type: 'SET_SEARCH'; query: string }

export const NODE_COLORS: Record<NodeType, string> = {
  work: '#a78bfa',
  personal: '#38bdf8',
  task: '#fb7185',
  idea: '#34d399',
}
