import { useMemo } from 'react'
import { useGraphState } from '../state/GraphContext'
import { NODE_COLORS } from '../types/graph'
import type { NodeType } from '../types/graph'

const TYPE_LABELS: Record<NodeType, string> = {
  work: '업무', personal: '개인', task: '할일', idea: '아이디어', skill: '스킬',
}

export function AnalysisView() {
  const { nodes, edges } = useGraphState()

  const stats = useMemo(() => {
    // Type distribution
    const typeCounts: Record<string, number> = {}
    for (const n of nodes) {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
    }

    // Connection stats
    const connectionMap = new Map<string, number>()
    for (const e of edges) {
      connectionMap.set(e.source, (connectionMap.get(e.source) || 0) + 1)
      connectionMap.set(e.target, (connectionMap.get(e.target) || 0) + 1)
    }
    const orphans = nodes.filter(n => !connectionMap.has(n.id))
    const mostConnected = [...connectionMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const mostConnectedNodes = mostConnected.map(([id, count]) => ({
      node: nodes.find(n => n.id === id)!,
      count,
    })).filter(x => x.node)

    // Tag stats
    const tagCounts: Record<string, number> = {}
    for (const n of nodes) {
      for (const t of n.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      }
    }
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

    // Content stats
    const withContent = nodes.filter(n => n.description.trim().length > 0)
    const totalWords = nodes.reduce((sum, n) => sum + (n.description.trim() ? n.description.trim().split(/\s+/).length : 0), 0)

    // Activity by day of week
    const dayActivity = [0, 0, 0, 0, 0, 0, 0]
    for (const n of nodes) {
      dayActivity[new Date(n.createdAt).getDay()]++
    }

    // Skill stats
    const skillNodes = nodes.filter(n => n.type === 'skill' && n.skillSteps?.length)
    const totalSteps = skillNodes.reduce((s, n) => s + (n.skillSteps?.length || 0), 0)
    const doneSteps = skillNodes.reduce((s, n) => s + (n.skillSteps?.filter(st => st.status === 'done').length || 0), 0)

    return {
      typeCounts, orphans, mostConnectedNodes, topTags,
      withContent, totalWords, dayActivity, skillNodes, totalSteps, doneSteps,
    }
  }, [nodes, edges])

  const maxTypeCount = Math.max(...Object.values(stats.typeCounts), 1)
  const maxDayActivity = Math.max(...stats.dayActivity, 1)
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="analysis-view">
      <div className="analysis-view__header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <h2>워크스페이스 분석</h2>
      </div>

      {/* Overview cards */}
      <div className="analysis-view__cards">
        <div className="analysis-card">
          <div className="analysis-card__value">{nodes.length}</div>
          <div className="analysis-card__label">전체 노트</div>
        </div>
        <div className="analysis-card">
          <div className="analysis-card__value">{edges.length}</div>
          <div className="analysis-card__label">연결</div>
        </div>
        <div className="analysis-card">
          <div className="analysis-card__value">{stats.withContent.length}</div>
          <div className="analysis-card__label">작성된 노트</div>
        </div>
        <div className="analysis-card">
          <div className="analysis-card__value">{stats.totalWords}</div>
          <div className="analysis-card__label">총 단어</div>
        </div>
      </div>

      <div className="analysis-view__grid">
        {/* Type distribution */}
        <div className="analysis-section">
          <h3 className="analysis-section__title">유형별 분포</h3>
          <div className="analysis-section__bars">
            {(Object.entries(stats.typeCounts) as [NodeType, number][]).map(([type, count]) => (
              <div key={type} className="analysis-bar">
                <div className="analysis-bar__label">
                  <span className="analysis-bar__dot" style={{ background: NODE_COLORS[type] }} />
                  {TYPE_LABELS[type] || type}
                </div>
                <div className="analysis-bar__track">
                  <div className="analysis-bar__fill" style={{ width: `${(count / maxTypeCount) * 100}%`, background: NODE_COLORS[type] }} />
                </div>
                <span className="analysis-bar__count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day activity */}
        <div className="analysis-section">
          <h3 className="analysis-section__title">요일별 활동</h3>
          <div className="analysis-section__day-chart">
            {stats.dayActivity.map((count, i) => (
              <div key={i} className="analysis-day">
                <div className="analysis-day__bar-wrap">
                  <div className="analysis-day__bar" style={{ height: `${(count / maxDayActivity) * 100}%` }} />
                </div>
                <span className="analysis-day__label">{DAY_NAMES[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most connected */}
        <div className="analysis-section">
          <h3 className="analysis-section__title">허브 노트 (연결 많은 순)</h3>
          {stats.mostConnectedNodes.length > 0 ? (
            <div className="analysis-section__list">
              {stats.mostConnectedNodes.map(({ node, count }) => (
                <div key={node.id} className="analysis-list-item">
                  <span className="analysis-bar__dot" style={{ background: NODE_COLORS[node.type] }} />
                  <span className="analysis-list-item__name">{node.label}</span>
                  <span className="analysis-list-item__count">{count}개 연결</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="analysis-section__empty">연결된 노트가 없습니다</p>
          )}
        </div>

        {/* Tags */}
        <div className="analysis-section">
          <h3 className="analysis-section__title">인기 태그</h3>
          {stats.topTags.length > 0 ? (
            <div className="analysis-section__tags">
              {stats.topTags.map(([tag, count]) => (
                <span key={tag} className="analysis-tag">#{tag} <em>{count}</em></span>
              ))}
            </div>
          ) : (
            <p className="analysis-section__empty">태그가 없습니다</p>
          )}
        </div>

        {/* Orphan nodes */}
        <div className="analysis-section">
          <h3 className="analysis-section__title">고아 노트 (연결 없음)</h3>
          <div className="analysis-card__value" style={{ fontSize: 24 }}>{stats.orphans.length}</div>
          {stats.orphans.length > 0 && (
            <div className="analysis-section__list" style={{ marginTop: 8 }}>
              {stats.orphans.slice(0, 5).map(n => (
                <div key={n.id} className="analysis-list-item">
                  <span className="analysis-bar__dot" style={{ background: NODE_COLORS[n.type] }} />
                  <span className="analysis-list-item__name">{n.label}</span>
                </div>
              ))}
              {stats.orphans.length > 5 && <span className="analysis-section__empty">...외 {stats.orphans.length - 5}개</span>}
            </div>
          )}
        </div>

        {/* Skill progress */}
        {stats.skillNodes.length > 0 && (
          <div className="analysis-section">
            <h3 className="analysis-section__title">스킬 진행률</h3>
            <div className="analysis-section__list">
              {stats.skillNodes.map(n => {
                const steps = n.skillSteps || []
                const done = steps.filter(s => s.status === 'done').length
                const pct = steps.length > 0 ? (done / steps.length) * 100 : 0
                return (
                  <div key={n.id} className="analysis-skill-item">
                    <span className="analysis-skill-item__icon">{n.skillIcon || '⚡'}</span>
                    <span className="analysis-skill-item__name">{n.label}</span>
                    <div className="analysis-skill-item__bar">
                      <div className="analysis-skill-item__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="analysis-skill-item__pct">{done}/{steps.length}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
