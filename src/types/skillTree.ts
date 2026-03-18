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
  graphNodeId?: string // link to graph view node
}

export interface SkillTree {
  id: string
  name: string
  treeType: 'analysis' | 'skill'
  nodes: SkillNode[]
  createdAt: number
}

// ===== Game Skill Tree (스킬트리) =====
export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface GameSkill {
  id: string
  label: string
  description: string
  level: SkillLevel
  maxLevel: SkillLevel
  category: string
  parentId: string | null  // prerequisite skill
  x: number  // grid position
  y: number
}

export interface GameSkillTree {
  id: string
  name: string
  skills: GameSkill[]
  totalPoints: number
  usedPoints: number
  createdAt: number
}

// ===== State =====
export interface SkillTreeState {
  trees: SkillTree[]
  gameTrees: GameSkillTree[]
  activeTreeId: string | null
  activeGameTreeId: string | null
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
  | { type: 'LOAD_TREES'; trees: SkillTree[] }
  // Game skill tree
  | { type: 'CREATE_GAME_TREE'; name: string }
  | { type: 'DELETE_GAME_TREE'; treeId: string }
  | { type: 'SET_ACTIVE_GAME_TREE'; treeId: string | null }
  | { type: 'ADD_GAME_SKILL'; treeId: string; skill: Omit<GameSkill, 'id'> }
  | { type: 'LEVEL_UP_SKILL'; treeId: string; skillId: string }
  | { type: 'LEVEL_DOWN_SKILL'; treeId: string; skillId: string }
  | { type: 'UPDATE_GAME_SKILL'; treeId: string; skillId: string; updates: Partial<Pick<GameSkill, 'label' | 'description' | 'category'>> }
  | { type: 'REMOVE_GAME_SKILL'; treeId: string; skillId: string }
  | { type: 'LOAD_GAME_TREES'; trees: GameSkillTree[] }
