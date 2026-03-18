import { useRef, useEffect, useState, useCallback } from 'react'
import { GraphProvider, useGraphDispatch } from './state/GraphContext'
import { SkillTreeProvider } from './state/SkillTreeContext'
import { ThemeProvider, useTheme } from './state/ThemeContext'
import { CosmosBg } from './components/CosmosBg'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { GraphCanvas } from './canvas/GraphCanvas'
import { NodeTooltip } from './components/NodeTooltip'
import { BranchInput } from './components/BranchInput'
import { NodeCreator } from './components/NodeCreator'
import { FloatingSearch } from './components/FloatingSearch'
import { HoverPreview } from './components/HoverPreview'
import { NoteView } from './components/NoteView'
import { SkillTreeView } from './components/SkillTreeView'
import { CalendarView } from './components/CalendarView'
import './App.css'

export type ViewMode = 'graph' | 'notes' | 'skilltree' | 'calendar'

function AppContent() {
  const { theme } = useTheme()
  const mainRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<ViewMode>('graph')
  const reheatRef = useRef<(() => void) | null>(null)
  const dispatch = useGraphDispatch()

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleReheat = useCallback(() => {
    reheatRef.current?.()
  }, [])

  const handleSwitchToGraph = useCallback((nodeId: string) => {
    setView('graph')
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED', nodeId })
      reheatRef.current?.()
    }, 100)
  }, [dispatch])

  const handleOpenNote = useCallback((nodeId: string) => {
    dispatch({ type: 'SET_SELECTED', nodeId })
    setView('notes')
  }, [dispatch])

  // ESC in notes/skilltree view → back to graph
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view !== 'graph') {
        setView('graph')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view])

  return (
    <div className="app">
      {theme === 'cosmos' && <CosmosBg />}
      <Sidebar view={view} onViewChange={setView} />
      <main className="main" ref={mainRef}>
        <Header onReheat={handleReheat} />
        {view === 'graph' ? (
          <div className="canvas-wrapper">
            <GraphCanvas reheatRef={reheatRef} onOpenNote={handleOpenNote} />
            <NodeTooltip containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
            <HoverPreview containerWidth={size.w} containerHeight={size.h} />
            <BranchInput containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
            <NodeCreator onReheat={handleReheat} />
            <FloatingSearch />
          </div>
        ) : view === 'notes' ? (
          <NoteView onSwitchToGraph={handleSwitchToGraph} />
        ) : view === 'calendar' ? (
          <CalendarView />
        ) : (
          <SkillTreeView />
        )}
        <StatusBar />
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <GraphProvider>
        <SkillTreeProvider>
          <AppContent />
        </SkillTreeProvider>
      </GraphProvider>
    </ThemeProvider>
  )
}

export default App
