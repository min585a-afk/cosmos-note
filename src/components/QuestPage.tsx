import { useState, useRef } from 'react'
import { useQuests } from './QuestTodo'

export function QuestPage() {
  const { pending, completed, add, complete, uncomplete, remove } = useQuests()
  const [newTitle, setNewTitle] = useState('')
  const [destroyingId, setDestroyingId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    add(newTitle)
    setNewTitle('')
    inputRef.current?.focus()
  }

  const handleComplete = (id: string) => {
    setDestroyingId(id)
    setTimeout(() => { complete(id); setDestroyingId(null) }, 800)
  }

  return (
    <div className="quest-page">
      <div className="quest-page__header">
        <div className="quest-page__title-row">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h2>퀘스트 보드</h2>
        </div>
        <div className="quest-page__stats">
          <span className="quest-page__stat">
            <span className="quest-page__stat-num">{pending.length}</span> 진행중
          </span>
          <span className="quest-page__stat quest-page__stat--done">
            <span className="quest-page__stat-num">{completed.length}</span> 완료
          </span>
        </div>
      </div>

      {/* Add quest */}
      <div className="quest-page__add">
        <input
          ref={inputRef}
          className="quest-page__input"
          placeholder="새 퀘스트를 추가하세요..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="quest-page__add-btn" onClick={handleAdd}>+ 추가</button>
      </div>

      {/* Pending quests */}
      <div className="quest-page__section">
        <h3 className="quest-page__section-title">진행중 ({pending.length})</h3>
        <div className="quest-page__list">
          {pending.length === 0 && (
            <div className="quest-page__empty">모든 퀘스트를 완료했습니다! 🎉</div>
          )}
          {pending.map(quest => (
            <div key={quest.id} className={`quest-page__item ${destroyingId === quest.id ? 'quest-page__item--destroying' : ''}`}>
              <button className="quest-page__check" onClick={() => handleComplete(quest.id)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                </svg>
              </button>
              <div className="quest-page__item-content">
                <span className="quest-page__item-title">{quest.title}</span>
                <span className="quest-page__item-date">
                  {new Date(quest.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <button className="quest-page__item-delete" onClick={() => remove(quest.id)}>×</button>

              {destroyingId === quest.id && (
                <>
                  <div className="quest-item__particles">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span key={i} className="quest-item__particle" style={{
                        '--angle': `${(360 / 12) * i}deg`,
                        '--delay': `${i * 30}ms`,
                        '--dist': `${40 + Math.random() * 30}px`,
                      } as React.CSSProperties} />
                    ))}
                  </div>
                  <div className="quest-item__crack">
                    <svg viewBox="0 0 200 40" className="quest-item__crack-svg">
                      <line x1="100" y1="20" x2="40" y2="5" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
                      <line x1="100" y1="20" x2="160" y2="8" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
                      <line x1="100" y1="20" x2="30" y2="35" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
                      <line x1="100" y1="20" x2="170" y2="30" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
                      <line x1="100" y1="20" x2="10" y2="20" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
                      <line x1="100" y1="20" x2="190" y2="20" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Completed quests */}
      <div className="quest-page__section">
        <button className="quest-page__section-toggle" onClick={() => setShowCompleted(!showCompleted)}>
          <svg className={`quest-page__chevron ${showCompleted ? 'quest-page__chevron--open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <h3 className="quest-page__section-title">완료 ({completed.length})</h3>
        </button>
        {showCompleted && (
          <div className="quest-page__list">
            {completed.map(quest => (
              <div key={quest.id} className="quest-page__item quest-page__item--done">
                <button className="quest-page__check quest-page__check--done" onClick={() => uncomplete(quest.id)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="4" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" />
                    <polyline points="9 12 11 14 15 10" stroke="white" strokeWidth="2.5" fill="none" />
                  </svg>
                </button>
                <div className="quest-page__item-content">
                  <span className="quest-page__item-title">{quest.title}</span>
                  <span className="quest-page__item-date">
                    {quest.completedAt && new Date(quest.completedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 완료
                  </span>
                </div>
                <button className="quest-page__item-delete" onClick={() => remove(quest.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
