import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import { graphReducer, initialState } from './graphReducer'
import type { GraphState, GraphAction } from '../types/graph'

const StateCtx = createContext<GraphState>(initialState)
const DispatchCtx = createContext<Dispatch<GraphAction>>(() => {})

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, initialState)
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
