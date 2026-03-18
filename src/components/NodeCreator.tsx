import { useState, useRef, useEffect, useCallback } from 'react'
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

export function NodeCreator({ onReheat }: { onReheat: () => void }) {
  const state = useGraphState()
  const dispatch = useGraphDispatch()
  const [value, setValue] = useState('')
  const [nodeSize, setNodeSize] = useState<'planet' | 'star'>('planet')
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<number>(0)

  const interaction = state.interaction
  const isActive = interaction.type === 'creating-node'

  useEffect(() => {
    if (isActive) {
      setValue('')
      setNodeSize('planet')
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [isActive])

  useEffect(() => {
    return () => clearTimeout(blurTimeoutRef.current)
  }, [])

  const handleCancel = useCallback(() => {
    dispatch({ type: 'SET_INTERACTION', interaction: { type: 'idle' } })
  }, [dispatch])

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(handleCancel, 200)
  }, [handleCancel])

  if (!isActive) return null

  const { worldX, worldY, screenX, screenY } = interaction

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearTimeout(blurTimeoutRef.current)
    const text = value.trim()
    if (!text) return

    const detectedType = detectNodeType(text)
    const newNode = createNode({
      label: text,
      type: detectedType,
      x: worldX,
      y: worldY,
      description: '',
      radius: nodeSize === 'planet' ? 14 : 10,
    })
    dispatch({ type: 'ADD_NODE', node: newNode })
    dispatch({ type: 'SET_SELECTED', nodeId: newNode.id })
    dispatch({ type: 'SET_INTERACTION', interaction: { type: 'idle' } })
    onReheat()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearTimeout(blurTimeoutRef.current)
      handleCancel()
    }
    // Tab to toggle planet/star
    if (e.key === 'Tab') {
      e.preventDefault()
      setNodeSize(prev => prev === 'planet' ? 'star' : 'planet')
    }
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${Math.min(screenX, (window.innerWidth - 400))}px`,
    top: `${Math.max(8, screenY - 50)}px`,
    zIndex: 30,
  }

  return (
    <div style={style} className="node-creator" onMouseDown={(e) => e.stopPropagation()}>
      <form onSubmit={handleSubmit} className="node-creator__form">
        <button
          type="button"
          className={`node-creator__size-toggle ${nodeSize === 'planet' ? 'node-creator__size-toggle--planet' : 'node-creator__size-toggle--star'}`}
          onClick={() => setNodeSize(prev => prev === 'planet' ? 'star' : 'planet')}
          onMouseDown={(e) => { e.preventDefault(); clearTimeout(blurTimeoutRef.current) }}
          title="Tab 키로 전환"
        >
          {nodeSize === 'planet' ? '🪐' : '✦'}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={nodeSize === 'planet' ? '메인 노트 (행성)...' : '가지 노트 (별)...'}
          className="node-creator__input"
          autoComplete="off"
        />
        <span className="node-creator__size-label">{nodeSize === 'planet' ? '행성' : '별'}</span>
        <span className="node-creator__hint">Enter</span>
      </form>
    </div>
  )
}
