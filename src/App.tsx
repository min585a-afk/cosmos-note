import { useRef, useEffect, useState, useCallback } from 'react'
import { GraphProvider, useGraphDispatch } from './state/GraphContext'
import { CosmosBg } from './components/CosmosBg'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { GraphCanvas } from './canvas/GraphCanvas'
import { NodeTooltip } from './components/NodeTooltip'
import { BranchInput } from './components/BranchInput'
import { NodeCreator } from './components/NodeCreator'
import { FloatingSearch } from './components/FloatingSearch'
import { NoteView } from './components/NoteView'
import './App.css'

export type ViewMode = 'graph' | 'notes'

function AppContent() {
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
    // Navigate to node in graph after switch
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED', nodeId })
      reheatRef.current?.()
    }, 100)
  }, [dispatch])

  return (
    <div className="app">
      <CosmosBg />
      <Sidebar view={view} onViewChange={setView} />
      <main className="main" ref={mainRef}>
        <Header onReheat={handleReheat} />
        {view === 'graph' ? (
          <div className="canvas-wrapper">
            <GraphCanvas reheatRef={reheatRef} />
            <NodeTooltip containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
            <BranchInput containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
            <NodeCreator onReheat={handleReheat} />
            <FloatingSearch />
          </div>
        ) : (
          <NoteView onSwitchToGraph={handleSwitchToGraph} />
        )}
        <StatusBar />
      </main>
    </div>
  )
}

function App() {
  return (
    <GraphProvider>
      <AppContent />
    </GraphProvider>
  )
}

export default App
