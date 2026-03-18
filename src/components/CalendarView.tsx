import { useState } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { generateId } from '../state/graphReducer'
import type { CalendarEvent } from '../types/graph'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function CalendarView() {
  const { calendarEvents } = useGraphState()
  const dispatch = useGraphDispatch()

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const ev of calendarEvents) {
    const list = eventsByDate.get(ev.date) || []
    list.push(ev)
    eventsByDate.set(ev.date, list)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  const handleAdd = (date: string) => {
    if (!newTitle.trim()) return
    dispatch({
      type: 'ADD_CALENDAR_EVENT',
      event: { id: generateId(), title: newTitle.trim(), date, done: false },
    })
    setNewTitle('')
  }

  const handleStartEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id)
    setEditValue(ev.title)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    // Remove and re-add with new title
    const ev = calendarEvents.find(e => e.id === editingId)
    if (ev) {
      dispatch({ type: 'REMOVE_CALENDAR_EVENT', eventId: editingId })
      dispatch({
        type: 'ADD_CALENDAR_EVENT',
        event: { ...ev, title: editValue.trim() || ev.title },
      })
    }
    setEditingId(null)
  }

  // Build calendar grid cells
  const cells: Array<{ day: number; dateKey: string } | null> = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateKey: formatDateKey(viewYear, viewMonth, d) })
  }
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : []

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="calendar-view__header">
        <div className="calendar-view__nav">
          <button className="calendar-view__nav-btn" onClick={prevMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="calendar-view__title">{viewYear}년 {MONTH_NAMES[viewMonth]}</h2>
          <button className="calendar-view__nav-btn" onClick={nextMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button className="calendar-view__today-btn" onClick={goToday}>오늘</button>
        </div>
        <div className="calendar-view__stats">
          <span className="calendar-view__stat">
            <span className="calendar-view__stat-dot calendar-view__stat-dot--pending" />
            {calendarEvents.filter(e => !e.done).length} 할 일
          </span>
          <span className="calendar-view__stat">
            <span className="calendar-view__stat-dot calendar-view__stat-dot--done" />
            {calendarEvents.filter(e => e.done).length} 완료
          </span>
        </div>
      </div>

      <div className="calendar-view__body">
        {/* Calendar Grid */}
        <div className="calendar-view__grid-wrapper">
          {/* Weekday headers */}
          <div className="calendar-view__weekdays">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`calendar-view__weekday ${i === 0 ? 'calendar-view__weekday--sun' : i === 6 ? 'calendar-view__weekday--sat' : ''}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="calendar-view__grid">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`empty-${idx}`} className="calendar-view__cell calendar-view__cell--empty" />
              const { day, dateKey } = cell
              const dayEvents = eventsByDate.get(dateKey) || []
              const isToday = dateKey === todayKey
              const isSelected = dateKey === selectedDate
              const colIdx = idx % 7

              return (
                <div
                  key={dateKey}
                  className={`calendar-view__cell ${isToday ? 'calendar-view__cell--today' : ''} ${isSelected ? 'calendar-view__cell--selected' : ''} ${colIdx === 0 ? 'calendar-view__cell--sun' : ''} ${colIdx === 6 ? 'calendar-view__cell--sat' : ''}`}
                  onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                >
                  <span className={`calendar-view__day-num ${isToday ? 'calendar-view__day-num--today' : ''}`}>
                    {day}
                  </span>
                  <div className="calendar-view__cell-events">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`calendar-view__cell-event ${ev.done ? 'calendar-view__cell-event--done' : ''}`}
                        onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_CALENDAR_EVENT', eventId: ev.id }) }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="calendar-view__cell-more">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel - selected date details */}
        <div className={`calendar-view__detail ${selectedDate ? 'calendar-view__detail--open' : ''}`}>
          {selectedDate && (
            <>
              <div className="calendar-view__detail-header">
                <h3>{selectedDate === todayKey ? '오늘' : selectedDate}</h3>
                <button className="calendar-view__detail-close" onClick={() => setSelectedDate(null)}>×</button>
              </div>

              {/* Add new event */}
              <div className="calendar-view__detail-add">
                <input
                  className="calendar-view__detail-input"
                  placeholder="할 일 추가..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd(selectedDate)}
                />
                <button className="calendar-view__detail-add-btn" onClick={() => handleAdd(selectedDate)}>+</button>
              </div>

              {/* Event list */}
              <div className="calendar-view__detail-list">
                {selectedEvents.length === 0 && (
                  <div className="calendar-view__detail-empty">일정이 없습니다</div>
                )}
                {selectedEvents.map(ev => (
                  <div key={ev.id} className={`calendar-view__detail-event ${ev.done ? 'calendar-view__detail-event--done' : ''}`}>
                    <button
                      className="calendar-view__detail-check"
                      onClick={() => dispatch({ type: 'TOGGLE_CALENDAR_EVENT', eventId: ev.id })}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {ev.done
                          ? <><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--accent)" stroke="var(--accent)" /><polyline points="9 12 11 14 15 10" stroke="white" strokeWidth="2.5" /></>
                          : <rect x="3" y="3" width="18" height="18" rx="4" />
                        }
                      </svg>
                    </button>
                    {editingId === ev.id ? (
                      <input
                        autoFocus
                        className="calendar-view__detail-edit-input"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                        onBlur={handleSaveEdit}
                      />
                    ) : (
                      <span
                        className="calendar-view__detail-event-title"
                        onDoubleClick={() => handleStartEdit(ev)}
                      >
                        {ev.title}
                      </span>
                    )}
                    <button
                      className="calendar-view__detail-remove"
                      onClick={() => dispatch({ type: 'REMOVE_CALENDAR_EVENT', eventId: ev.id })}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
