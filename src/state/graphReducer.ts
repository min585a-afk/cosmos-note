import type { GraphState, GraphAction, GraphNode, GraphEdge } from '../types/graph'
import { NODE_COLORS as COLORS } from '../types/graph'

let _idCounter = 0
export function generateId(): string {
  return `n${Date.now()}-${++_idCounter}`
}

export function createNode(
  partial: Pick<GraphNode, 'label' | 'type'> & Partial<GraphNode>
): GraphNode {
  return {
    id: generateId(),
    description: '',
    tags: [],
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fx: null,
    fy: null,
    radius: 14,
    color: COLORS[partial.type],
    createdAt: Date.now(),
    ...partial,
  }
}

const sampleNodes: GraphNode[] = [
  createNode({ id: 's1', label: 'Project Architecture', type: 'work', description: 'Design system structure and component hierarchy', tags: ['design', 'planning'], x: -60, y: -100, radius: 14 }),
  createNode({ id: 's2', label: 'AI Integration', type: 'idea', description: 'LLM-based note summarization and task generation', tags: ['ai', 'feature'], x: 120, y: -80, radius: 10 }),
  createNode({ id: 's3', label: 'Weekly Review', type: 'task', description: 'Review progress and update task priorities', tags: ['routine'], x: -100, y: 60, radius: 10 }),
  createNode({ id: 's4', label: 'Reading List', type: 'personal', description: 'Books and articles to read this month', tags: ['personal'], x: 150, y: 90, radius: 10 }),
  createNode({ id: 's5', label: 'API Design', type: 'work', description: 'RESTful endpoints for note sync service', tags: ['backend', 'api'], x: -150, y: -30, radius: 10 }),
  createNode({ id: 's6', label: 'Graph Visualization', type: 'idea', description: 'Node connection animations and force layout', tags: ['ui', 'experiment'], x: 50, y: 120, radius: 10 }),
]

const sampleEdges: GraphEdge[] = [
  { id: 'e1', source: 's1', target: 's2' },
  { id: 'e2', source: 's1', target: 's3' },
  { id: 'e3', source: 's2', target: 's4' },
  { id: 'e4', source: 's3', target: 's5' },
  { id: 'e5', source: 's2', target: 's6' },
  { id: 'e6', source: 's5', target: 's6' },
]

export const initialState: GraphState = {
  nodes: sampleNodes,
  edges: sampleEdges,
  viewport: { x: 0, y: 0, scale: 1 },
  interaction: { type: 'idle' },
  selectedNodeId: null,
  hoveredNodeId: null,
  simulationAlpha: 1.0,
  searchQuery: '',
}

export function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'UPDATE_POSITIONS': {
      const posMap = new Map(action.positions.map((p) => [p.id, p]))
      return {
        ...state,
        nodes: state.nodes.map((node) => {
          const pos = posMap.get(node.id)
          if (!pos) return node
          return { ...node, x: pos.x, y: pos.y, vx: pos.vx, vy: pos.vy }
        }),
      }
    }

    case 'ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.node] }

    case 'REMOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.nodeId),
        edges: state.edges.filter((e) => e.source !== action.nodeId && e.target !== action.nodeId),
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      }

    case 'ADD_EDGE': {
      const exists = state.edges.some(
        (e) =>
          (e.source === action.edge.source && e.target === action.edge.target) ||
          (e.source === action.edge.target && e.target === action.edge.source)
      )
      if (exists) return state
      return { ...state, edges: [...state.edges, action.edge] }
    }

    case 'REMOVE_EDGE':
      return { ...state, edges: state.edges.filter((e) => e.id !== action.edgeId) }

    case 'SET_VIEWPORT':
      return { ...state, viewport: action.viewport }

    case 'SET_INTERACTION':
      return { ...state, interaction: action.interaction }

    case 'SET_SELECTED':
      return { ...state, selectedNodeId: action.nodeId }

    case 'SET_HOVERED':
      return { ...state, hoveredNodeId: action.nodeId }

    case 'PIN_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, fx: action.x, fy: action.y, x: action.x, y: action.y } : n
        ),
      }

    case 'UNPIN_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, fx: null, fy: null } : n
        ),
      }

    case 'SET_ALPHA':
      return { ...state, simulationAlpha: action.alpha }

    case 'BATCH_ADD':
      return {
        ...state,
        nodes: [...state.nodes, ...action.nodes],
        edges: [...state.edges, ...action.edges],
      }

    case 'UPDATE_NODE_LABEL':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, label: action.label } : n
        ),
      }

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.id !== action.nodeId) return n
          const updated = { ...n, ...action.updates }
          if (action.updates.type) updated.color = COLORS[action.updates.type]
          return updated
        }),
      }

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query }

    default:
      return state
  }
}
