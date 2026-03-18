import { useState, useRef } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { createNode } from '../state/graphReducer'
import type { NodeType } from '../types/graph'

function detectNodeType(text: string): NodeType {
  const lower = text.toLowerCase()
  if (/디자인|ui|ux|레이아웃|컬러|폰트|타이포|와이어프레임|프로토타입|목업|figma|sketch|일러스트|그래픽|아이콘|로고|브랜딩|비주얼|css|스타일/.test(lower)) return 'idea'
  if (/회의|미팅|보고|업무|프로젝트|일정|마감|클라이언트|기획|전략|분석|리뷰|발표|제안/.test(lower)) return 'work'
  if (/해야|할일|todo|체크|완료|진행|구현|수정|버그|fix|deploy|배포|테스트|확인/.test(lower)) return 'task'
  if (/일기|감정|생각|느낌|고민|꿈|목표|운동|건강|취미|여행|독서|영화/.test(lower)) return 'personal'
  return 'idea'
}

export function Header({ onReheat }: { onReheat: () => void }) {
  const { viewport } = useGraphState()
  const dispatch = useGraphDispatch()
  const [quickInput, setQuickInput] = useState('')
  const quickInputRef = useRef<HTMLInputElement>(null)

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = quickInput.trim()
    if (!text) return

    const cx = -viewport.x + (Math.random() - 0.5) * 200
    const cy = -viewport.y + (Math.random() - 0.5) * 200

    const detectedType = detectNodeType(text)
    const newNode = createNode({
      label: text,
      type: detectedType,
      x: cx,
      y: cy,
      description: '',
      radius: 14,
    })
    dispatch({ type: 'ADD_NODE', node: newNode })
    dispatch({ type: 'SET_SELECTED', nodeId: newNode.id })
    onReheat()
    setQuickInput('')
  }

  return (
    <header className="header">
      <div className="header__left">
        <div className="header__breadcrumb">
          <span>Workspaces</span>
          <span>/</span>
          <span className="header__current">Graph View</span>
        </div>
      </div>

      <div className="header__center">
        <form onSubmit={handleQuickSubmit} className="quick-input">
          <svg className="quick-input__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <input
            ref={quickInputRef}
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="할 일, 생각, 궁금한 것을 적어보세요..."
            className="quick-input__field"
            autoComplete="off"
          />
          {quickInput && (
            <span className="quick-input__type-hint">
              {detectNodeType(quickInput) === 'task' ? '할일' :
               detectNodeType(quickInput) === 'work' ? '업무' :
               detectNodeType(quickInput) === 'personal' ? '개인' : '아이디어'}
            </span>
          )}
          <span className="quick-input__hint">Enter</span>
        </form>
      </div>

      <div className="header__actions">
        <button className="btn-icon" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
        <button className="btn-icon" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
