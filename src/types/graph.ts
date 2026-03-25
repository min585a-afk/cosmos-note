export type NodeType = 'work' | 'personal' | 'task' | 'idea' | 'skill'
export type NodeSize = 1 | 2 | 3 | 4 | 5
export type NodeStatus = 'good' | 'bad' | 'question' | 'heart' | 'star'

export const STATUS_EMOJI: Record<NodeStatus, string> = {
  good: '👍',
  bad: '👎',
  question: '❓',
  heart: '❤️',
  star: '⭐',
}

export const SIZE_TO_RADIUS: Record<NodeSize, number> = {
  1: 8,
  2: 11,
  3: 14,
  4: 20,
  5: 28,
}

// Skill step definition
export type SkillStepStatus = 'pending' | 'running' | 'done' | 'skipped'

export interface SkillStep {
  id: string
  order: number
  label: string
  description: string
  status: SkillStepStatus
}

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
  size: NodeSize
  icon?: string
  customColor?: string
  statuses: NodeStatus[]
  // Skill node fields
  skillSteps?: SkillStep[]
  skillIcon?: string
  skillRunning?: boolean
  skillCurrentStep?: number
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

export interface DeletedNode {
  node: GraphNode
  edges: GraphEdge[]
  deletedAt: number
}

export interface FolderItem {
  id: string
  name: string
  parentId: string | null  // null = root
  type: 'folder' | 'note'
  nodeId?: string           // note인 경우 GraphNode.id 참조
  createdAt: number
  isOpen?: boolean          // folder 펼침 상태
}

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport: Viewport
  interaction: InteractionMode
  selectedNodeId: string | null
  hoveredNodeId: string | null
  simulationAlpha: number
  searchQuery: string
  recentlyDeleted: DeletedNode[]
  folders: FolderItem[]
  activeFolderId: string | null
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
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<Pick<GraphNode, 'label' | 'description' | 'tags' | 'type' | 'color' | 'size' | 'icon' | 'customColor' | 'statuses' | 'skillSteps' | 'skillIcon'>> }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'RESTORE_NODE'; deletedIndex: number }
  | { type: 'CLEAR_DELETED' }
  | { type: 'RELINK_ALL' }
  | { type: 'ADD_FOLDER'; folder: FolderItem }
  | { type: 'REMOVE_FOLDER'; folderId: string }
  | { type: 'RENAME_FOLDER'; folderId: string; name: string }
  | { type: 'MOVE_ITEM'; itemId: string; newParentId: string | null }
  | { type: 'TOGGLE_FOLDER'; folderId: string }
  | { type: 'SET_ACTIVE_FOLDER'; folderId: string | null }
  | { type: 'UPDATE_SKILL_STEPS'; nodeId: string; steps: SkillStep[] }
  | { type: 'RUN_SKILL'; nodeId: string }
  | { type: 'ADVANCE_SKILL'; nodeId: string }
  | { type: 'RESET_SKILL'; nodeId: string }
  | { type: 'SET_SKILL_STEP_STATUS'; nodeId: string; stepIndex: number; status: SkillStepStatus }

export const NODE_COLORS: Record<NodeType, string> = {
  work: '#bf5af2',
  personal: '#00e5ff',
  task: '#ff2d55',
  idea: '#00ff87',
  skill: '#ffb800',
}

export const EMPTY_NODE_COLOR = '#4a4a5a'

export function getNodeColor(node: GraphNode): string {
  if (node.customColor) return node.customColor
  return node.description.trim() ? NODE_COLORS[node.type] : EMPTY_NODE_COLOR
}
