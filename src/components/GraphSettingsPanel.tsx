import { useState } from 'react'
import type { NodeType } from '../types/graph'
import { NODE_COLORS } from '../types/graph'

export interface GraphSettings {
  // Filter
  showTypes: Record<NodeType, boolean>
  filterTags: string[]
  showOrphans: boolean
  // Display
  showArrows: boolean
  labelThreshold: number   // 0~1 — below this zoom, labels hidden
  nodeSizeMul: number      // 0.5 ~ 2.0
  linkThickness: number    // 0.5 ~ 3.0
  // Animation
  animate: boolean
}

export const defaultSettings: GraphSettings = {
  showTypes: { work: true, personal: true, task: true, idea: true },
  filterTags: [],
  showOrphans: true,
  showArrows: false,
  labelThreshold: 0.3,
  nodeSizeMul: 1.0,
  linkThickness: 1.0,
  animate: false,
}

const TYPE_LABELS: Record<NodeType, string> = {
  work: '업무',
  personal: '개인',
  task: '할일',
  idea: '아이디어',
}

interface Props {
  settings: GraphSettings
  onChange: (s: GraphSettings) => void
  allTags: string[]
  nodeCount: number
  edgeCount: number
  orphanCount: number
  onClose: () => void
}

export function GraphSettingsPanel({ settings, onChange, allTags, nodeCount, edgeCount, orphanCount, onClose }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    filter: true, group: false, display: true, controls: true,
  })

  const toggle = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }))
  const update = (patch: Partial<GraphSettings>) => onChange({ ...settings, ...patch })

  return (
    <div className="graph-settings">
      <div className="gs-header">
        <span className="gs-title">Graph Settings</span>
        <button className="gs-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="gs-stats">
        <span>{nodeCount} nodes</span>
        <span>{edgeCount} edges</span>
        <span>{orphanCount} orphans</span>
      </div>

      {/* Filter */}
      <div className="gs-section">
        <button className="gs-section__head" onClick={() => toggle('filter')}>
          <svg className={`gs-chevron ${openSections.filter ? 'gs-chevron--open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>필터 (Filters)</span>
        </button>
        {openSections.filter && (
          <div className="gs-section__body">
            <label className="gs-label">Node Types</label>
            <div className="gs-type-grid">
              {(Object.keys(TYPE_LABELS) as NodeType[]).map(t => (
                <label key={t} className="gs-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.showTypes[t]}
                    onChange={() => update({ showTypes: { ...settings.showTypes, [t]: !settings.showTypes[t] } })}
                  />
                  <span className="gs-checkbox__dot" style={{ background: NODE_COLORS[t] }} />
                  <span>{TYPE_LABELS[t]}</span>
                </label>
              ))}
            </div>

            <label className="gs-checkbox gs-checkbox--mt">
              <input
                type="checkbox"
                checked={settings.showOrphans}
                onChange={() => update({ showOrphans: !settings.showOrphans })}
              />
              <span>고립 노드 표시</span>
            </label>

            {allTags.length > 0 && (
              <>
                <label className="gs-label gs-label--mt">Tags</label>
                <div className="gs-tag-list">
                  {allTags.map(tag => {
                    const active = settings.filterTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        className={`gs-tag ${active ? 'gs-tag--active' : ''}`}
                        onClick={() => {
                          const next = active
                            ? settings.filterTags.filter(t => t !== tag)
                            : [...settings.filterTags, tag]
                          update({ filterTags: next })
                        }}
                      >
                        #{tag}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Group */}
      <div className="gs-section">
        <button className="gs-section__head" onClick={() => toggle('group')}>
          <svg className={`gs-chevron ${openSections.group ? 'gs-chevron--open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>그룹 (Groups)</span>
        </button>
        {openSections.group && (
          <div className="gs-section__body">
            <p className="gs-hint">노드 타입별 컬러가 자동 적용됩니다.</p>
          </div>
        )}
      </div>

      {/* Display */}
      <div className="gs-section">
        <button className="gs-section__head" onClick={() => toggle('display')}>
          <svg className={`gs-chevron ${openSections.display ? 'gs-chevron--open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>보기 (Display)</span>
        </button>
        {openSections.display && (
          <div className="gs-section__body">
            <label className="gs-checkbox">
              <input
                type="checkbox"
                checked={settings.showArrows}
                onChange={() => update({ showArrows: !settings.showArrows })}
              />
              <span>화살표 표시 (Arrows)</span>
            </label>

            <div className="gs-slider-group">
              <div className="gs-slider-label">
                <span>라벨 표시 기준</span>
                <span className="gs-slider-value">{settings.labelThreshold.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.1"
                value={settings.labelThreshold}
                onChange={e => update({ labelThreshold: parseFloat(e.target.value) })}
                className="gs-slider"
              />
            </div>

            <div className="gs-slider-group">
              <div className="gs-slider-label">
                <span>노드 크기</span>
                <span className="gs-slider-value">{settings.nodeSizeMul.toFixed(1)}x</span>
              </div>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={settings.nodeSizeMul}
                onChange={e => update({ nodeSizeMul: parseFloat(e.target.value) })}
                className="gs-slider"
              />
            </div>

            <div className="gs-slider-group">
              <div className="gs-slider-label">
                <span>연결선 두께</span>
                <span className="gs-slider-value">{settings.linkThickness.toFixed(1)}</span>
              </div>
              <input
                type="range" min="0.5" max="3" step="0.1"
                value={settings.linkThickness}
                onChange={e => update({ linkThickness: parseFloat(e.target.value) })}
                className="gs-slider"
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="gs-section">
        <button className="gs-section__head" onClick={() => toggle('controls')}>
          <svg className={`gs-chevron ${openSections.controls ? 'gs-chevron--open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>그래프 조절 (Forces)</span>
        </button>
        {openSections.controls && (
          <div className="gs-section__body">
            <button
              className={`gs-animate-btn ${settings.animate ? 'gs-animate-btn--active' : ''}`}
              onClick={() => update({ animate: !settings.animate })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {settings.animate
                  ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                  : <polygon points="5 3 19 12 5 21 5 3" />
                }
              </svg>
              <span>{settings.animate ? 'Stop' : 'Animate'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
