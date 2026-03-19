import { useState, useEffect, useRef } from 'react'

export interface QuestItem {
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

export function useQuests() {
  const [quests, setQuests] = useState<QuestItem[]>(loadQuests)
  useEffect(() => { saveQuests(quests) }, [quests])

  const add = (title: string) => {
    if (!title.trim()) return
    setQuests(prev => [...prev, { id: genId(), title: title.trim(), done: false, createdAt: Date.now() }])
  }
  const complete = (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, done: true, completedAt: Date.now() } : q))
  }
  const uncomplete = (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, done: false, completedAt: undefined } : q))
  }
  const remove = (id: string) => {
    setQuests(prev => prev.filter(q => q.id !== id))
  }

  const pending = quests.filter(q => !q.done).sort((a, b) => b.createdAt - a.createdAt)
  const completed = quests.filter(q => q.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayPending = pending.filter(q => new Date(q.createdAt).toISOString().slice(0, 10) === todayStr)

  return { quests, pending, completed, todayPending, add, complete, uncomplete, remove }
}

// Sidebar mini version - only today's quests
export function QuestTodo() {
  const { todayPending, pending, add, complete, remove } = useQuests()
  const [newTitle, setNewTitle] = useState('')
  const [destroyingId, setDestroyingId] = useState<string | null>(null)
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

  // Show today's quests, or all pending if no today quests
  const displayQuests = todayPending.length > 0 ? todayPending : pending.slice(0, 5)

  return (
    <div className="quest-todo">
      <div className="quest-todo__header">
        <div className="quest-todo__title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h3>오늘의 퀘스트</h3>
          <span className="quest-todo__count">{pending.length}</span>
        </div>
      </div>

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

      <div className="quest-todo__list">
        {displayQuests.length === 0 && (
          <div className="quest-todo__empty">모든 퀘스트를 완료했습니다!</div>
        )}
        {displayQuests.map(quest => (
          <div key={quest.id} className={`quest-item ${destroyingId === quest.id ? 'quest-item--destroying' : ''}`}>
            <button className="quest-item__check" onClick={() => handleComplete(quest.id)} title="퀘스트 완료">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="4" />
              </svg>
            </button>
            <span className="quest-item__title">{quest.title}</span>
            <button className="quest-item__delete" onClick={() => remove(quest.id)}>×</button>
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
                    <line x1="100" y1="20" x2="80" y2="0" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
                    <line x1="100" y1="20" x2="120" y2="40" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
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
  )
}
