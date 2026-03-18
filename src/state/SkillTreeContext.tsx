import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react'
import { skillTreeReducer, initialSkillTreeState } from './skillTreeReducer'
import type { SkillTreeState, SkillTreeAction } from '../types/skillTree'

const STORAGE_KEY = 'cosmos-note-skilltrees'

const StateCtx = createContext<SkillTreeState>(initialSkillTreeState)
const DispatchCtx = createContext<Dispatch<SkillTreeAction>>(() => {})

function loadSaved(): SkillTreeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialSkillTreeState
    const data = JSON.parse(raw)
    return {
      ...initialSkillTreeState,
      trees: data.trees || [],
      flowTrees: data.flowTrees || [],
    }
  } catch {
    return initialSkillTreeState
  }
}

export function SkillTreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(skillTreeReducer, undefined, loadSaved)
  const saveTimer = useRef<number>(0)

  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          trees: state.trees,
          flowTrees: state.flowTrees,
        }))
      } catch { /* full */ }
    }, 500)
  }, [state.trees, state.flowTrees])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useSkillTreeState() { return useContext(StateCtx) }
export function useSkillTreeDispatch() { return useContext(DispatchCtx) }
