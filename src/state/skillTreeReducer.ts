import type { SkillTreeState, SkillTreeAction, SkillNode, SkillTree } from '../types/skillTree'

let _idCounter = 0
function genId(prefix: string): string {
  return `${prefix}${Date.now()}-${++_idCounter}`
}

export const initialSkillTreeState: SkillTreeState = {
  trees: [],
  activeTreeId: null,
  selectedNodeId: null,
}

export function skillTreeReducer(state: SkillTreeState, action: SkillTreeAction): SkillTreeState {
  switch (action.type) {
    case 'CREATE_TREE': {
      const tree: SkillTree = {
        id: genId('tree-'),
        name: action.name,
        nodes: [],
        createdAt: Date.now(),
      }
      return {
        ...state,
        trees: [...state.trees, tree],
        activeTreeId: tree.id,
      }
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
          t.id === action.treeId
            ? { ...t, nodes: [...t.nodes, rootNode] }
            : t
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
        depth: 0, // will be calculated below
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
      // When user picks a branch:
      // - Selected node becomes 'active'
      // - Sibling nodes become 'skipped'
      // - Parent becomes 'completed'
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          const targetNode = t.nodes.find(n => n.id === action.nodeId)
          if (!targetNode) return t

          return {
            ...t,
            nodes: t.nodes.map(n => {
              // The selected node → active
              if (n.id === action.nodeId) {
                return { ...n, status: 'active' }
              }
              // Siblings (same parent, same depth) → skipped
              if (
                n.parentId === targetNode.parentId &&
                n.depth === targetNode.depth &&
                n.id !== action.nodeId &&
                n.status === 'locked'
              ) {
                return { ...n, status: 'skipped' }
              }
              // Parent → completed
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

    case 'COMPLETE_NODE': {
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          return {
            ...t,
            nodes: t.nodes.map(n =>
              n.id === action.nodeId ? { ...n, status: 'completed' } : n
            ),
          }
        }),
      }
    }

    case 'UPDATE_SKILL_NODE': {
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          return {
            ...t,
            nodes: t.nodes.map(n =>
              n.id === action.nodeId ? { ...n, ...action.updates } : n
            ),
          }
        }),
      }
    }

    case 'LOAD_TREES':
      return { ...state, trees: action.trees }

    default:
      return state
  }
}
