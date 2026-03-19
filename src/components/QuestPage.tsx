import { useState, useRef } from 'react'
import { useQuests } from './QuestTodo'

const GRID_SLOTS = 8 // 2 rows x 4 columns like Diablo 2

export function QuestPage() {
  const { pending, completed, add, complete, uncomplete, remove } = useQuests()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [destroyingId, setDestroyingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    add(newTitle)
    setNewTitle('')
    inputRef.current?.focus()
  }

  const handleComplete = (id: string) => {
    setDestroyingId(id)
    setSelectedId(null)
    setTimeout(() => { complete(id); setDestroyingId(null) }, 800)
  }

  const quests = tab === 'active' ? pending : completed
  const selected = [...pending, ...completed].find(q => q.id === selectedId)

  // Fill grid slots
  const slots = Array.from({ length: GRID_SLOTS }, (_, i) => quests[i] || null)

  return (
    <div className="d2quest">
      {/* Stone frame window */}
      <div className="d2quest__window">
        {/* Title bar */}
        <div className="d2quest__titlebar">
          <span className="d2quest__title">퀘스트 기록</span>
        </div>

        {/* Tabs */}
        <div className="d2quest__tabs">
          <button className={`d2quest__tab ${tab === 'active' ? 'd2quest__tab--active' : ''}`}
            onClick={() => { setTab('active'); setSelectedId(null) }}>
            <span className="d2quest__tab-roman">I</span>
          </button>
          <button className={`d2quest__tab ${tab === 'completed' ? 'd2quest__tab--active' : ''}`}
            onClick={() => { setTab('completed'); setSelectedId(null) }}>
            <span className="d2quest__tab-roman">II</span>
          </button>
        </div>

        {/* Grid of quest slots */}
        <div className="d2quest__grid">
          {slots.map((quest, i) => (
            <button
              key={quest?.id || `empty-${i}`}
              className={`d2quest__slot ${quest ? 'd2quest__slot--filled' : ''} ${quest?.done ? 'd2quest__slot--done' : ''} ${selectedId === quest?.id ? 'd2quest__slot--selected' : ''} ${destroyingId === quest?.id ? 'd2quest__slot--destroying' : ''}`}
              onClick={() => quest && setSelectedId(quest.id === selectedId ? null : quest.id)}
            >
              <div className="d2quest__slot-frame">
                {quest ? (
                  <div className="d2quest__slot-icon">
                    {quest.done ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.7)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4l3 3" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className="d2quest__slot-empty" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="d2quest__detail">
          {selected ? (
            <>
              <h3 className="d2quest__detail-title">{selected.title}</h3>
              <p className="d2quest__detail-desc">
                {selected.done
                  ? `${selected.completedAt ? new Date(selected.completedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : ''} 완료됨`
                  : `${new Date(selected.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 시작됨`
                }
              </p>
            </>
          ) : (
            <p className="d2quest__detail-empty">퀘스트를 선택하세요</p>
          )}
        </div>

        {/* Action button */}
        <div className="d2quest__actions">
          {selected && !selected.done && (
            <button className="d2quest__btn d2quest__btn--complete" onClick={() => handleComplete(selected.id)}>
              퀘스트 완료
            </button>
          )}
          {selected && selected.done && (
            <button className="d2quest__btn d2quest__btn--undo" onClick={() => { uncomplete(selected.id); setSelectedId(null) }}>
              되돌리기
            </button>
          )}
          {selected && (
            <button className="d2quest__btn d2quest__btn--delete" onClick={() => { remove(selected.id); setSelectedId(null) }}>
              삭제
            </button>
          )}
        </div>
      </div>

      {/* Add quest (below the window) */}
      <div className="d2quest__add">
        <input
          ref={inputRef}
          className="d2quest__add-input"
          placeholder="새 퀘스트 추가..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="d2quest__add-btn" onClick={handleAdd}>+</button>
      </div>
    </div>
  )
}
