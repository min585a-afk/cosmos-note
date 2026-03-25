import { useState, useMemo } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { NODE_COLORS } from '../types/graph'
import type { ViewMode } from '../App'

interface CalendarViewProps {
  onViewChange: (v: ViewMode) => void
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function CalendarView({ onViewChange }: CalendarViewProps) {
  const { nodes } = useGraphState()
  const dispatch = useGraphDispatch()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Group notes by date
  const notesByDate = useMemo(() => {
    const map = new Map<string, typeof nodes>()
    for (const n of nodes) {
      const d = new Date(n.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const arr = map.get(key) || []
      arr.push(n)
      map.set(key, arr)
    }
    return map
  }, [nodes])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const handlePrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const handleNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  const handleToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  const handleNoteClick = (nodeId: string) => {
    dispatch({ type: 'SET_SELECTED', nodeId })
    onViewChange('notes')
  }

  const cells: Array<{ day: number | null; key: string }> = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: `e${i}` })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d${d}` })

  const isToday = (day: number) =>
    year === now.getFullYear() && month === now.getMonth() && day === now.getDate()

  return (
    <div className="calendar-view">
      <div className="calendar-view__header">
        <button className="calendar-view__nav-btn" onClick={handlePrev}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="calendar-view__title">
          <span className="calendar-view__year">{year}년</span>
          <span className="calendar-view__month">{MONTH_NAMES[month]}</span>
        </div>
        <button className="calendar-view__nav-btn" onClick={handleNext}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button className="calendar-view__today-btn" onClick={handleToday}>오늘</button>
      </div>

      <div className="calendar-view__weekdays">
        {WEEKDAYS.map(w => (
          <div key={w} className="calendar-view__weekday">{w}</div>
        ))}
      </div>

      <div className="calendar-view__grid">
        {cells.map(cell => {
          const dateKey = cell.day ? `${year}-${month}-${cell.day}` : ''
          const dayNotes = cell.day ? (notesByDate.get(dateKey) || []) : []

          return (
            <div
              key={cell.key}
              className={`calendar-view__cell ${!cell.day ? 'calendar-view__cell--empty' : ''} ${cell.day && isToday(cell.day) ? 'calendar-view__cell--today' : ''}`}
            >
              {cell.day && (
                <>
                  <div className="calendar-view__day-num">{cell.day}</div>
                  <div className="calendar-view__notes">
                    {dayNotes.slice(0, 3).map(n => (
                      <button
                        key={n.id}
                        className="calendar-view__note"
                        onClick={() => handleNoteClick(n.id)}
                        style={{ borderLeftColor: NODE_COLORS[n.type] }}
                      >
                        {n.label}
                      </button>
                    ))}
                    {dayNotes.length > 3 && (
                      <span className="calendar-view__more">+{dayNotes.length - 3}개</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
