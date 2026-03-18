export type SkillNodeStatus = 'locked' | 'active' | 'completed' | 'skipped'

export interface SkillNode {
  id: string
  label: string
  description: string
  status: SkillNodeStatus
  parentId: string | null
  depth: number
  branchIndex: number  // position among siblings
  graphNodeId?: string // link to graph view node
}

export interface SkillTree {
  id: string
  name: string
  nodes: SkillNode[]
  createdAt: number
}

export interface SkillTreeState {
  trees: SkillTree[]
  activeTreeId: string | null
  selectedNodeId: string | null
}

export type SkillTreeAction =
  | { type: 'CREATE_TREE'; name: string }
  | { type: 'DELETE_TREE'; treeId: string }
  | { type: 'SET_ACTIVE_TREE'; treeId: string | null }
  | { type: 'SET_SELECTED_NODE'; nodeId: string | null }
  | { type: 'ADD_ROOT_NODE'; treeId: string; label: string; description: string }
  | { type: 'ADD_BRANCH_NODES'; treeId: string; parentId: string; nodes: Array<{ label: string; description: string }> }
  | { type: 'SELECT_PATH'; treeId: string; nodeId: string }
  | { type: 'COMPLETE_NODE'; treeId: string; nodeId: string }
  | { type: 'UPDATE_SKILL_NODE'; treeId: string; nodeId: string; updates: Partial<Pick<SkillNode, 'label' | 'description'>> }
  | { type: 'LOAD_TREES'; trees: SkillTree[] }
