import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react'
import { graphReducer, initialState } from './graphReducer'
import type { GraphState, GraphAction } from '../types/graph'
import { saveToStorage, loadFromStorage } from '../utils/storage'

const StateCtx = createContext<GraphState>(initialState)
const DispatchCtx = createContext<Dispatch<GraphAction>>(() => {})

function getInitialState(): GraphState {
  const saved = loadFromStorage()
  if (saved && saved.nodes.length > 0) {
    return {
      ...initialState,
      nodes: saved.nodes,
      edges: saved.edges,
      recentlyDeleted: saved.recentlyDeleted || [],
      folders: saved.folders || [],
    }
  }
  return initialState
}

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, undefined, getInitialState)
  const saveTimerRef = useRef<number>(0)

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveToStorage(state.nodes, state.edges, state.recentlyDeleted, state.folders)
    }, 500)
  }, [state.nodes, state.edges, state.recentlyDeleted, state.folders])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useGraphState(): GraphState {
  return useContext(StateCtx)
}

export function useGraphDispatch(): Dispatch<GraphAction> {
  return useContext(DispatchCtx)
}
