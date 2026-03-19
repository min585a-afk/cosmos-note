import { useState, useEffect, useRef } from 'react'

interface QuestItem {
  id: string
  title: string
  done: boolean
  createdAt: number
  completedAt?: number
}

const STORAGE_KEY = 'cosmos-note-quests'

function loadQuests(): QuestItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveQuests(items: QuestItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function genId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function QuestTodo() {
  const [quests, setQuests] = useState<QuestItem[]>(loadQuests)
  const [newTitle, setNewTitle] = useState('')
  const [destroyingId, setDestroyingId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { saveQuests(quests) }, [quests])

  const pending = quests.filter(q => !q.done).sort((a, b) => b.createdAt - a.createdAt)
  const completed = quests.filter(q => q.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

  const handleAdd = () => {
    if (!newTitle.trim()) return
    setQuests(prev => [...prev, { id: genId(), title: newTitle.trim(), done: false, createdAt: Date.now() }])
    setNewTitle('')
    inputRef.current?.focus()
  }

  const handleComplete = (id: string) => {
    setDestroyingId(id)
    // After animation completes, mark as done
    setTimeout(() => {
      setQuests(prev => prev.map(q => q.id === id ? { ...q, done: true, completedAt: Date.now() } : q))
      setDestroyingId(null)
    }, 800)
  }

  const handleUncomplete = (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, done: false, completedAt: undefined } : q))
  }

  const handleDelete = (id: string) => {
    setQuests(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="quest-todo">
      <div className="quest-todo__header">
        <div className="quest-todo__title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h3>퀘스트</h3>
          <span className="quest-todo__count">{pending.length}</span>
        </div>
      </div>

      {/* Add new quest */}
      <div className="quest-todo__add">
        <input
          ref={inputRef}
          className="quest-todo__input"
          placeholder="새 퀘스트 추가..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="quest-todo__add-btn" onClick={handleAdd}>+</button>
      </div>

      {/* Pending quests */}
      <div className="quest-todo__list">
        {pending.length === 0 && (
          <div className="quest-todo__empty">모든 퀘스트를 완료했습니다!</div>
        )}
        {pending.map(quest => (
          <div
            key={quest.id}
            className={`quest-item ${destroyingId === quest.id ? 'quest-item--destroying' : ''}`}
          >
            <button
              className="quest-item__check"
              onClick={() => handleComplete(quest.id)}
              title="퀘스트 완료"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="4" />
              </svg>
            </button>
            <span className="quest-item__title">{quest.title}</span>
            <button className="quest-item__delete" onClick={() => handleDelete(quest.id)}>×</button>

            {/* Destroy particles */}
            {destroyingId === quest.id && (
              <div className="quest-item__particles">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} className="quest-item__particle" style={{
                    '--angle': `${(360 / 12) * i}deg`,
                    '--delay': `${i * 30}ms`,
                    '--dist': `${40 + Math.random() * 30}px`,
                  } as React.CSSProperties} />
                ))}
              </div>
            )}
            {/* Glass crack overlay */}
            {destroyingId === quest.id && (
              <div className="quest-item__crack">
                <svg viewBox="0 0 200 40" className="quest-item__crack-svg">
                  <line x1="100" y1="20" x2="40" y2="5" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
                  <line x1="100" y1="20" x2="160" y2="8" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
                  <line x1="100" y1="20" x2="30" y2="35" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
                  <line x1="100" y1="20" x2="170" y2="30" stroke="rgba(167,139,250,0.4)" strokeWidth="1" />
                  <line x1="100" y1="20" x2="80" y2="0" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
                  <line x1="100" y1="20" x2="120" y2="40" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
                  <line x1="100" y1="20" x2="10" y2="20" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
                  <line x1="100" y1="20" x2="190" y2="20" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completed quests */}
      {completed.length > 0 && (
        <div className="quest-todo__completed">
          <button className="quest-todo__completed-toggle" onClick={() => setShowCompleted(!showCompleted)}>
            <svg className={`quest-todo__chevron ${showCompleted ? 'quest-todo__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            완료 ({completed.length})
          </button>
          {showCompleted && (
            <div className="quest-todo__completed-list">
              {completed.map(quest => (
                <div key={quest.id} className="quest-item quest-item--done">
                  <button className="quest-item__check quest-item__check--done" onClick={() => handleUncomplete(quest.id)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" />
                      <polyline points="9 12 11 14 15 10" stroke="white" strokeWidth="2.5" fill="none" />
                    </svg>
                  </button>
                  <span className="quest-item__title">{quest.title}</span>
                  <button className="quest-item__delete" onClick={() => handleDelete(quest.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
