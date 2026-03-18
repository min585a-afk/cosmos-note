import type { SkillTreeState, SkillTreeAction, SkillNode, SkillTree, GameSkillTree, GameSkill } from '../types/skillTree'

let _idCounter = 0
function genId(prefix: string): string {
  return `${prefix}${Date.now()}-${++_idCounter}`
}

export const initialSkillTreeState: SkillTreeState = {
  trees: [],
  gameTrees: [],
  activeTreeId: null,
  activeGameTreeId: null,
  selectedNodeId: null,
  activeTab: 'analysis',
}

export function skillTreeReducer(state: SkillTreeState, action: SkillTreeAction): SkillTreeState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, selectedNodeId: null }

    // ===== Analysis Tree =====
    case 'CREATE_TREE': {
      const tree: SkillTree = {
        id: genId('tree-'),
        name: action.name,
        treeType: 'analysis',
        nodes: [],
        createdAt: Date.now(),
      }
      return { ...state, trees: [...state.trees, tree], activeTreeId: tree.id }
    }

    case 'DELETE_TREE':
      return {
        ...state,
        trees: state.trees.filter(t => t.id !== action.treeId),
        activeTreeId: state.activeTreeId === action.treeId ? null : state.activeTreeId,
      }

    case 'SET_ACTIVE_TREE':
      return { ...state, activeTreeId: action.treeId, selectedNodeId: null }

    case 'SET_SELECTED_NODE':
      return { ...state, selectedNodeId: action.nodeId }

    case 'ADD_ROOT_NODE': {
      const rootNode: SkillNode = {
        id: genId('sn-'),
        label: action.label,
        description: action.description,
        status: 'active',
        parentId: null,
        depth: 0,
        branchIndex: 0,
      }
      return {
        ...state,
        trees: state.trees.map(t =>
          t.id === action.treeId ? { ...t, nodes: [...t.nodes, rootNode] } : t
        ),
      }
    }

    case 'ADD_BRANCH_NODES': {
      const newNodes: SkillNode[] = action.nodes.map((n, i) => ({
        id: genId('sn-'),
        label: n.label,
        description: n.description,
        status: 'locked' as const,
        parentId: action.parentId,
        depth: 0,
        branchIndex: i,
      }))

      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          const parent = t.nodes.find(n => n.id === action.parentId)
          const depth = parent ? parent.depth + 1 : 0
          const depthNodes = newNodes.map(n => ({ ...n, depth }))
          return { ...t, nodes: [...t.nodes, ...depthNodes] }
        }),
      }
    }

    case 'SELECT_PATH': {
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          const targetNode = t.nodes.find(n => n.id === action.nodeId)
          if (!targetNode) return t

          return {
            ...t,
            nodes: t.nodes.map(n => {
              if (n.id === action.nodeId) return { ...n, status: 'active' }
              if (
                n.parentId === targetNode.parentId &&
                n.depth === targetNode.depth &&
                n.id !== action.nodeId &&
                n.status === 'locked'
              ) {
                return { ...n, status: 'skipped' }
              }
              if (n.id === targetNode.parentId && n.status === 'active') {
                return { ...n, status: 'completed' }
              }
              return n
            }),
          }
        }),
        selectedNodeId: action.nodeId,
      }
    }

    case 'UNDO_PATH': {
      // Undo: revert selected node to locked, siblings back to locked, parent back to active
      // Also remove all descendants of the selected node
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          const targetNode = t.nodes.find(n => n.id === action.nodeId)
          if (!targetNode || targetNode.status === 'locked') return t

          // Find all descendant IDs to remove
          const descendantIds = new Set<string>()
          const collectDescendants = (parentId: string) => {
            for (const n of t.nodes) {
              if (n.parentId === parentId) {
                descendantIds.add(n.id)
                collectDescendants(n.id)
              }
            }
          }
          collectDescendants(action.nodeId)

          // Remove descendants, reset target and siblings
          const filtered = t.nodes.filter(n => !descendantIds.has(n.id))
          return {
            ...t,
            nodes: filtered.map(n => {
              // Target → locked
              if (n.id === action.nodeId) return { ...n, status: 'locked' }
              // Siblings → locked
              if (
                n.parentId === targetNode.parentId &&
                n.depth === targetNode.depth &&
                n.status === 'skipped'
              ) {
                return { ...n, status: 'locked' }
              }
              // Parent → active (if it was completed by this selection)
              if (n.id === targetNode.parentId && n.status === 'completed') {
                return { ...n, status: 'active' }
              }
              return n
            }),
          }
        }),
        selectedNodeId: null,
      }
    }

    case 'COMPLETE_NODE':
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          return { ...t, nodes: t.nodes.map(n => n.id === action.nodeId ? { ...n, status: 'completed' } : n) }
        }),
      }

    case 'UPDATE_SKILL_NODE':
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          return { ...t, nodes: t.nodes.map(n => n.id === action.nodeId ? { ...n, ...action.updates } : n) }
        }),
      }

    case 'LOAD_TREES':
      return { ...state, trees: action.trees }

    // ===== Game Skill Tree =====
    case 'CREATE_GAME_TREE': {
      const gt: GameSkillTree = {
        id: genId('gt-'),
        name: action.name,
        skills: [],
        totalPoints: 30,
        usedPoints: 0,
        createdAt: Date.now(),
      }
      return { ...state, gameTrees: [...state.gameTrees, gt], activeGameTreeId: gt.id }
    }

    case 'DELETE_GAME_TREE':
      return {
        ...state,
        gameTrees: state.gameTrees.filter(t => t.id !== action.treeId),
        activeGameTreeId: state.activeGameTreeId === action.treeId ? null : state.activeGameTreeId,
      }

    case 'SET_ACTIVE_GAME_TREE':
      return { ...state, activeGameTreeId: action.treeId, selectedNodeId: null }

    case 'ADD_GAME_SKILL': {
      const skill: GameSkill = { id: genId('gs-'), ...action.skill }
      return {
        ...state,
        gameTrees: state.gameTrees.map(t =>
          t.id === action.treeId ? { ...t, skills: [...t.skills, skill] } : t
        ),
      }
    }

    case 'LEVEL_UP_SKILL':
      return {
        ...state,
        gameTrees: state.gameTrees.map(t => {
          if (t.id !== action.treeId) return t
          const skill = t.skills.find(s => s.id === action.skillId)
          if (!skill || skill.level >= skill.maxLevel) return t
          // Check prerequisite
          if (skill.parentId) {
            const parent = t.skills.find(s => s.id === skill.parentId)
            if (!parent || parent.level === 0) return t // parent not unlocked
          }
          if (t.usedPoints >= t.totalPoints) return t
          return {
            ...t,
            usedPoints: t.usedPoints + 1,
            skills: t.skills.map(s =>
              s.id === action.skillId ? { ...s, level: (s.level + 1) as GameSkill['level'] } : s
            ),
          }
        }),
      }

    case 'LEVEL_DOWN_SKILL':
      return {
        ...state,
        gameTrees: state.gameTrees.map(t => {
          if (t.id !== action.treeId) return t
          const skill = t.skills.find(s => s.id === action.skillId)
          if (!skill || skill.level <= 0) return t
          // Check if any child depends on this
          const hasDependent = t.skills.some(s => s.parentId === action.skillId && s.level > 0)
          if (hasDependent && skill.level <= 1) return t
          return {
            ...t,
            usedPoints: t.usedPoints - 1,
            skills: t.skills.map(s =>
              s.id === action.skillId ? { ...s, level: (s.level - 1) as GameSkill['level'] } : s
            ),
          }
        }),
      }

    case 'UPDATE_GAME_SKILL':
      return {
        ...state,
        gameTrees: state.gameTrees.map(t => {
          if (t.id !== action.treeId) return t
          return { ...t, skills: t.skills.map(s => s.id === action.skillId ? { ...s, ...action.updates } : s) }
        }),
      }

    case 'REMOVE_GAME_SKILL':
      return {
        ...state,
        gameTrees: state.gameTrees.map(t => {
          if (t.id !== action.treeId) return t
          return {
            ...t,
            skills: t.skills.filter(s => s.id !== action.skillId),
            usedPoints: t.usedPoints - (t.skills.find(s => s.id === action.skillId)?.level || 0),
          }
        }),
      }

    case 'LOAD_GAME_TREES':
      return { ...state, gameTrees: action.trees }

    default:
      return state
  }
}
