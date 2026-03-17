import { useRef, useEffect, useState, useCallback } from 'react'
import { GraphProvider } from './state/GraphContext'
import { CosmosBg } from './components/CosmosBg'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { GraphCanvas } from './canvas/GraphCanvas'
import { NodeTooltip } from './components/NodeTooltip'
import { BranchInput } from './components/BranchInput'
import './App.css'

function AppContent() {
  const mainRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const reheatRef = useRef<(() => void) | null>(null)

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

  return (
    <div className="app">
      <CosmosBg />
      <Sidebar />
      <main className="main" ref={mainRef}>
        <Header />
        <div className="canvas-wrapper">
          <GraphCanvas reheatRef={reheatRef} />
          <NodeTooltip containerWidth={size.w} containerHeight={size.h} />
          <BranchInput containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
        </div>
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
