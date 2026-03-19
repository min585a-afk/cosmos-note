import { useRef, useEffect, useState, useCallback } from 'react'
import { GraphProvider, useGraphDispatch, useGraphState } from './state/GraphContext'
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
import { GraphSettingsPanel, defaultSettings } from './components/GraphSettingsPanel'
import type { GraphSettings } from './components/GraphSettingsPanel'
import { NoteView } from './components/NoteView'
import { SkillTreeView } from './components/SkillTreeView'
import { CalendarView } from './components/CalendarView'
import { QuestPage } from './components/QuestPage'
import './App.css'

export type ViewMode = 'graph' | 'notes' | 'skilltree' | 'analysis' | 'calendar' | 'quests'

// ===== Login / Loading Screen =====
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'fade-to-login' | 'login' | 'fade-out'>('loading')
  const [name, setName] = useState(() => localStorage.getItem('cosmos-user') || '')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade-to-login'), 2000)
    const t2 = setTimeout(() => setPhase('login'), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleLogin = () => {
    const userName = name.trim() || 'Explorer'
    localStorage.setItem('cosmos-user', userName)
    setPhase('fade-out')
    setTimeout(onLogin, 600)
  }

  return (
    <div className={`login-screen ${phase === 'fade-out' ? 'login-screen--fadeout' : ''}`}>
      <CosmosBg />
      <div className="login-screen__content">
        {(phase === 'loading' || phase === 'fade-to-login') ? (
          <div className={`login-loading ${phase === 'fade-to-login' ? 'login-loading--fadeout' : ''}`}>
            <div className="login-loading__star">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="4" fill="white" className="login-loading__core" />
                <circle cx="24" cy="24" r="12" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1" className="login-loading__ring1" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="1" className="login-loading__ring2" />
              </svg>
            </div>
            <p className="login-loading__text">Cosmos Note</p>
          </div>
        ) : phase !== 'fade-out' ? (
          <div className="login-form login-form--fadein">
            <div className="login-form__logo">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <h1 className="login-form__title">Cosmos Note</h1>
            <p className="login-form__subtitle">우주처럼 무한한 당신의 생각을 연결하세요</p>
            <input
              className="login-form__input"
              placeholder="이름을 입력하세요..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <button className="login-form__btn" onClick={handleLogin}>시작하기</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ===== Screensaver =====
function Screensaver({ onDismiss }: { onDismiss: () => void }) {
  const [fadingOut, setFadingOut] = useState(false)
  const handleDismiss = () => {
    if (fadingOut) return
    setFadingOut(true)
    setTimeout(onDismiss, 600)
  }
  return (
    <div className={`screensaver ${fadingOut ? 'screensaver--fadeout' : ''}`} onClick={handleDismiss}>
      <CosmosBg />
      <div className="screensaver__content">
        <div className="screensaver__logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <h1 className="screensaver__title">Cosmos Note</h1>
        <p className="screensaver__hint">화면을 누르면 해제됩니다</p>
      </div>
    </div>
  )
}

function AppContent() {
  const { theme } = useTheme()
  const mainRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<ViewMode>('graph')
  const [screensaver, setScreensaver] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [graphSettings, setGraphSettings] = useState<GraphSettings>(defaultSettings)
  const reheatRef = useRef<(() => void) | null>(null)
  const dispatch = useGraphDispatch()
  const graphState = useGraphState()

  // Compute stats for settings panel
  const connectedNodeIds = new Set<string>()
  for (const e of graphState.edges) { connectedNodeIds.add(e.source); connectedNodeIds.add(e.target) }
  const orphanCount = graphState.nodes.filter(n => !connectedNodeIds.has(n.id)).length
  const allTags = [...new Set(graphState.nodes.flatMap(n => n.tags))]

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

  // Animate mode: keep reheating
  useEffect(() => {
    if (!graphSettings.animate) return
    const id = setInterval(() => reheatRef.current?.(), 500)
    reheatRef.current?.()
    return () => clearInterval(id)
  }, [graphSettings.animate])

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
      {screensaver && <Screensaver onDismiss={() => setScreensaver(false)} />}
      {theme === 'cosmos' && <CosmosBg />}
      <Sidebar view={view} onViewChange={setView} onScreensaver={() => setScreensaver(true)} />
      <main className="main" ref={mainRef}>
        <Header onReheat={handleReheat} onToggleSettings={() => setShowSettings(p => !p)} />
        {view === 'graph' ? (
          <div className="canvas-wrapper">
            <GraphCanvas reheatRef={reheatRef} onOpenNote={handleOpenNote} settings={graphSettings} />
            <NodeTooltip containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
            <HoverPreview containerWidth={size.w} containerHeight={size.h} />
            <BranchInput containerWidth={size.w} containerHeight={size.h} onReheat={handleReheat} />
            <NodeCreator onReheat={handleReheat} />
            <FloatingSearch />
            {showSettings && (
              <GraphSettingsPanel
                settings={graphSettings}
                onChange={setGraphSettings}
                allTags={allTags}
                nodeCount={graphState.nodes.length}
                edgeCount={graphState.edges.length}
                orphanCount={orphanCount}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        ) : view === 'notes' ? (
          <NoteView onSwitchToGraph={handleSwitchToGraph} />
        ) : view === 'calendar' ? (
          <CalendarView />
        ) : view === 'quests' ? (
          <QuestPage />
        ) : view === 'analysis' ? (
          <SkillTreeView forceTab="analysis" />
        ) : (
          <SkillTreeView forceTab="skill" />
        )}
        <StatusBar />
      </main>
    </div>
  )
}

function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('cosmos-user'))

  if (!loggedIn) {
    return (
      <ThemeProvider>
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      </ThemeProvider>
    )
  }

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
