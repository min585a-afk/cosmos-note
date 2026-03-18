import type { SkillTreeState, SkillTreeAction, SkillNode, SkillTree, FlowTree, FlowNode } from '../types/skillTree'

let _idCounter = 0
function genId(prefix: string): string {
  return `${prefix}${Date.now()}-${++_idCounter}`
}

export const initialSkillTreeState: SkillTreeState = {
  trees: [],
  flowTrees: [],
  activeTreeId: null,
  activeFlowTreeId: null,
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
        id: genId('tree-'), name: action.name, treeType: 'analysis', nodes: [], createdAt: Date.now(),
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
        id: genId('sn-'), label: action.label, description: action.description,
        status: 'active', parentId: null, depth: 0, branchIndex: 0,
      }
      return {
        ...state,
        trees: state.trees.map(t => t.id === action.treeId ? { ...t, nodes: [...t.nodes, rootNode] } : t),
      }
    }

    case 'ADD_BRANCH_NODES': {
      const newNodes: SkillNode[] = action.nodes.map((n, i) => ({
        id: genId('sn-'), label: n.label, description: n.description,
        status: 'locked' as const, parentId: action.parentId, depth: 0, branchIndex: i,
      }))
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          const parent = t.nodes.find(n => n.id === action.parentId)
          const depth = parent ? parent.depth + 1 : 0
          return { ...t, nodes: [...t.nodes, ...newNodes.map(n => ({ ...n, depth }))] }
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
              if (n.parentId === targetNode.parentId && n.depth === targetNode.depth && n.id !== action.nodeId && n.status === 'locked')
                return { ...n, status: 'skipped' }
              if (n.id === targetNode.parentId && n.status === 'active')
                return { ...n, status: 'completed' }
              return n
            }),
          }
        }),
        selectedNodeId: action.nodeId,
      }
    }

    case 'UNDO_PATH': {
      return {
        ...state,
        trees: state.trees.map(t => {
          if (t.id !== action.treeId) return t
          const targetNode = t.nodes.find(n => n.id === action.nodeId)
          if (!targetNode || targetNode.status === 'locked') return t
          const descendantIds = new Set<string>()
          const collect = (pid: string) => { for (const n of t.nodes) { if (n.parentId === pid) { descendantIds.add(n.id); collect(n.id) } } }
          collect(action.nodeId)
          const filtered = t.nodes.filter(n => !descendantIds.has(n.id))
          return {
            ...t,
            nodes: filtered.map(n => {
              if (n.id === action.nodeId) return { ...n, status: 'locked' }
              if (n.parentId === targetNode.parentId && n.depth === targetNode.depth && n.status === 'skipped') return { ...n, status: 'locked' }
              if (n.id === targetNode.parentId && n.status === 'completed') return { ...n, status: 'active' }
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

    case 'MARK_EXPORTED':
      return {
        ...state,
        trees: state.trees.map(t => t.id === action.treeId ? { ...t, exportedToGraph: true } : t),
      }

    case 'LOAD_TREES':
      return { ...state, trees: action.trees }

    // ===== Flow Skill Tree (가로형) =====
    case 'CREATE_FLOW_TREE': {
      const ft: FlowTree = { id: genId('ft-'), name: action.name, nodes: [], createdAt: Date.now() }
      return { ...state, flowTrees: [...state.flowTrees, ft], activeFlowTreeId: ft.id }
    }

    case 'DELETE_FLOW_TREE':
      return {
        ...state,
        flowTrees: state.flowTrees.filter(t => t.id !== action.treeId),
        activeFlowTreeId: state.activeFlowTreeId === action.treeId ? null : state.activeFlowTreeId,
      }

    case 'SET_ACTIVE_FLOW_TREE':
      return { ...state, activeFlowTreeId: action.treeId, selectedNodeId: null }

    case 'ADD_FLOW_NODE': {
      // Add to main chain after specified node
      return {
        ...state,
        flowTrees: state.flowTrees.map(t => {
          if (t.id !== action.treeId) return t
          const mainChain = t.nodes.filter(n => n.parentId === null).sort((a, b) => a.order - b.order)
          let newOrder = 0
          if (action.afterNodeId) {
            const afterNode = mainChain.find(n => n.id === action.afterNodeId)
            newOrder = afterNode ? afterNode.order + 1 : mainChain.length
          } else {
            newOrder = mainChain.length
          }
          // Shift existing nodes after this position
          const shifted = t.nodes.map(n => {
            if (n.parentId === null && n.order >= newOrder) return { ...n, order: n.order + 1 }
            return n
          })
          const newNode: FlowNode = {
            id: genId('fn-'), label: action.label, description: '', status: 'pending',
            order: newOrder, parentId: null, tags: [],
          }
          return { ...t, nodes: [...shifted, newNode] }
        }),
      }
    }

    case 'ADD_FLOW_BRANCH': {
      return {
        ...state,
        flowTrees: state.flowTrees.map(t => {
          if (t.id !== action.treeId) return t
          const branches = t.nodes.filter(n => n.parentId === action.parentId)
          const newBranch: FlowNode = {
            id: genId('fn-'), label: action.label, description: '', status: 'pending',
            order: branches.length, parentId: action.parentId, tags: [],
          }
          return { ...t, nodes: [...t.nodes, newBranch] }
        }),
      }
    }

    case 'UPDATE_FLOW_NODE':
      return {
        ...state,
        flowTrees: state.flowTrees.map(t => {
          if (t.id !== action.treeId) return t
          return { ...t, nodes: t.nodes.map(n => n.id === action.nodeId ? { ...n, ...action.updates } : n) }
        }),
      }

    case 'REMOVE_FLOW_NODE':
      return {
        ...state,
        flowTrees: state.flowTrees.map(t => {
          if (t.id !== action.treeId) return t
          // Remove node and its branches
          const toRemove = new Set<string>([action.nodeId])
          for (const n of t.nodes) { if (n.parentId === action.nodeId) toRemove.add(n.id) }
          const filtered = t.nodes.filter(n => !toRemove.has(n.id))
          // Re-order main chain
          const main = filtered.filter(n => n.parentId === null).sort((a, b) => a.order - b.order)
          const reordered = filtered.map(n => {
            if (n.parentId !== null) return n
            const idx = main.indexOf(n)
            return { ...n, order: idx }
          })
          return { ...t, nodes: reordered }
        }),
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      }

    case 'LOAD_FLOW_TREES':
      return { ...state, flowTrees: action.trees }

    default:
      return state
  }
}
