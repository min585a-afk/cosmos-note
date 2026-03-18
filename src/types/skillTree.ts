export type SkillNodeStatus = 'locked' | 'active' | 'completed' | 'skipped'

// ===== Analysis Tree (분석트리) =====
export interface SkillNode {
  id: string
  label: string
  description: string
  status: SkillNodeStatus
  parentId: string | null
  depth: number
  branchIndex: number
  graphNodeId?: string
}

export interface SkillTree {
  id: string
  name: string
  treeType: 'analysis' | 'skill'
  nodes: SkillNode[]
  createdAt: number
  exportedToGraph?: boolean
}

// ===== Flow Skill Tree (스킬트리) — 가로형 노드 체인 =====
export type FlowNodeStatus = 'pending' | 'in-progress' | 'done'

export interface FlowNode {
  id: string
  label: string
  description: string
  status: FlowNodeStatus
  order: number          // position in main chain (0, 1, 2, ...)
  parentId: string | null // null = main chain, string = branch of that node
  tags: string[]
}

export interface FlowTree {
  id: string
  name: string
  nodes: FlowNode[]
  createdAt: number
}

// ===== State =====
export interface SkillTreeState {
  trees: SkillTree[]
  flowTrees: FlowTree[]
  activeTreeId: string | null
  activeFlowTreeId: string | null
  selectedNodeId: string | null
  activeTab: 'analysis' | 'skill'
}

export type SkillTreeAction =
  | { type: 'SET_TAB'; tab: 'analysis' | 'skill' }
  // Analysis tree
  | { type: 'CREATE_TREE'; name: string }
  | { type: 'DELETE_TREE'; treeId: string }
  | { type: 'SET_ACTIVE_TREE'; treeId: string | null }
  | { type: 'SET_SELECTED_NODE'; nodeId: string | null }
  | { type: 'ADD_ROOT_NODE'; treeId: string; label: string; description: string }
  | { type: 'ADD_BRANCH_NODES'; treeId: string; parentId: string; nodes: Array<{ label: string; description: string }> }
  | { type: 'SELECT_PATH'; treeId: string; nodeId: string }
  | { type: 'UNDO_PATH'; treeId: string; nodeId: string }
  | { type: 'COMPLETE_NODE'; treeId: string; nodeId: string }
  | { type: 'UPDATE_SKILL_NODE'; treeId: string; nodeId: string; updates: Partial<Pick<SkillNode, 'label' | 'description'>> }
  | { type: 'MARK_EXPORTED'; treeId: string }
  | { type: 'LOAD_TREES'; trees: SkillTree[] }
  // Flow skill tree
  | { type: 'CREATE_FLOW_TREE'; name: string }
  | { type: 'DELETE_FLOW_TREE'; treeId: string }
  | { type: 'SET_ACTIVE_FLOW_TREE'; treeId: string | null }
  | { type: 'ADD_FLOW_NODE'; treeId: string; label: string; afterNodeId: string | null }
  | { type: 'ADD_FLOW_BRANCH'; treeId: string; parentId: string; label: string }
  | { type: 'UPDATE_FLOW_NODE'; treeId: string; nodeId: string; updates: Partial<Pick<FlowNode, 'label' | 'description' | 'status' | 'tags'>> }
  | { type: 'REMOVE_FLOW_NODE'; treeId: string; nodeId: string }
  | { type: 'LOAD_FLOW_TREES'; trees: FlowTree[] }
