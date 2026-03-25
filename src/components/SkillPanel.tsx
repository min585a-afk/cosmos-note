import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import type { GraphNode } from '../types/graph'
import type { ViewMode } from '../App'

interface SkillPanelProps {
  onViewChange: (v: ViewMode) => void
}

export function SkillPanel({ onViewChange }: SkillPanelProps) {
  const state = useGraphState()
  const dispatch = useGraphDispatch()

  const skillNodes = state.nodes.filter(n => n.type === 'skill' && n.skillSteps?.length)

  const handleSkillClick = (node: GraphNode) => {
    dispatch({ type: 'SET_SELECTED', nodeId: node.id })
    onViewChange('notes')
  }

  const handleRunSkill = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation()
    if (node.skillRunning) {
      dispatch({ type: 'ADVANCE_SKILL', nodeId: node.id })
    } else {
      const allDone = node.skillSteps?.every(s => s.status === 'done')
      if (allDone) {
        dispatch({ type: 'RESET_SKILL', nodeId: node.id })
      } else {
        dispatch({ type: 'RUN_SKILL', nodeId: node.id })
      }
    }
  }

  if (skillNodes.length === 0) return null

  return (
    <div className="skill-panel">
      <div className="skill-panel__header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>스킬</span>
      </div>
      <div className="skill-panel__list">
        {skillNodes.map(node => {
          const steps = node.skillSteps || []
          const doneCount = steps.filter(s => s.status === 'done').length
          const isRunning = node.skillRunning
          const allDone = doneCount === steps.length
          const progress = steps.length > 0 ? doneCount / steps.length : 0

          return (
            <div
              key={node.id}
              className={`skill-item ${isRunning ? 'skill-item--running' : ''} ${allDone ? 'skill-item--done' : ''}`}
              onClick={() => handleSkillClick(node)}
            >
              <div className="skill-item__icon">
                {node.skillIcon || '⚡'}
              </div>
              <div className="skill-item__info">
                <div className="skill-item__name">{node.label}</div>
                <div className="skill-item__progress-bar">
                  <div className="skill-item__progress-fill" style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="skill-item__status">
                  {allDone ? '완료' : isRunning ? `${doneCount}/${steps.length} 진행중` : `${steps.length}단계`}
                </div>
              </div>
              <button
                className={`skill-item__run ${isRunning ? 'skill-item__run--active' : ''} ${allDone ? 'skill-item__run--reset' : ''}`}
                onClick={(e) => handleRunSkill(e, node)}
                title={allDone ? '리셋' : isRunning ? '다음 단계' : '실행'}
              >
                {allDone ? '↺' : isRunning ? '▶' : '▷'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
