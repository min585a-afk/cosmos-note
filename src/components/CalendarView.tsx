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
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  // Notion-style creation modal
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalDesc, setModalDesc] = useState('')
  const [modalTime, setModalTime] = useState('')

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  // Also get prev/next month days for display
  const prevMonthDays = viewMonth === 0 ? getDaysInMonth(viewYear - 1, 11) : getDaysInMonth(viewYear, viewMonth - 1)

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

  const handleModalAdd = () => {
    if (!modalTitle.trim() || !modalDate) return
    const title = modalTime ? `[${modalTime}] ${modalTitle.trim()}` : modalTitle.trim()
    const fullTitle = modalDesc.trim() ? `${title} — ${modalDesc.trim()}` : title
    dispatch({
      type: 'ADD_CALENDAR_EVENT',
      event: { id: generateId(), title: fullTitle, date: modalDate, done: false },
    })
    setModalDate(null)
    setModalTitle('')
    setModalDesc('')
    setModalTime('')
  }

  const openModal = (date: string) => {
    setModalDate(date)
    setModalTitle('')
    setModalDesc('')
    setModalTime('')
  }

  const handleStartEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id)
    setEditValue(ev.title)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
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

  // Build calendar grid cells with prev/next month padding
  type CellData = { day: number; dateKey: string; isCurrentMonth: boolean }
  const cells: CellData[] = []

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: d, dateKey: formatDateKey(y, m, d), isCurrentMonth: false })
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateKey: formatDateKey(viewYear, viewMonth, d), isCurrentMonth: true })
  }
  // Next month days to fill
  let nextDay = 1
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day: nextDay, dateKey: formatDateKey(y, m, nextDay), isCurrentMonth: false })
    nextDay++
    if (cells.length >= 42) break
  }

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="calendar-view__header">
        <div className="calendar-view__nav">
          <h2 className="calendar-view__title">{viewYear}년 {MONTH_NAMES[viewMonth]}</h2>
          <button className="calendar-view__today-btn" onClick={goToday}>오늘</button>
          <button className="calendar-view__nav-btn" onClick={prevMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="calendar-view__nav-btn" onClick={nextMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <div className="calendar-view__actions">
          <button className="calendar-view__new-btn" onClick={() => openModal(todayKey)}>
            새로 만들기
          </button>
        </div>
      </div>

      <div className="calendar-view__body">
        <div className="calendar-view__grid-wrapper">
          {/* Weekday headers */}
          <div className="calendar-view__weekdays">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`calendar-view__weekday ${i === 0 ? 'calendar-view__weekday--sun' : i === 6 ? 'calendar-view__weekday--sat' : ''}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells - Notion style */}
          <div className="calendar-view__grid">
            {cells.map((cell, idx) => {
              const { day, dateKey, isCurrentMonth } = cell
              const dayEvents = eventsByDate.get(dateKey) || []
              const isToday = dateKey === todayKey
              const isEditing = editingCell === dateKey
              const isHovered = hoveredCell === dateKey
              const colIdx = idx % 7

              return (
                <div
                  key={`${dateKey}-${idx}`}
                  className={`calendar-view__cell ${!isCurrentMonth ? 'calendar-view__cell--other' : ''} ${isToday ? 'calendar-view__cell--today' : ''} ${colIdx === 0 ? 'calendar-view__cell--sun' : ''} ${colIdx === 6 ? 'calendar-view__cell--sat' : ''}`}
                  onMouseEnter={() => setHoveredCell(dateKey)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div className="calendar-view__cell-top">
                    <span className={`calendar-view__day-num ${isToday ? 'calendar-view__day-num--today' : ''}`}>
                      {idx < 7 && !isCurrentMonth ? `${viewMonth === 0 ? 12 : viewMonth}월 ${day}일` :
                       day === 1 && isCurrentMonth && idx > 0 ? `${viewMonth + 1}월 ${day}일` :
                       !isCurrentMonth && cells[idx - 1]?.isCurrentMonth ? `${viewMonth === 11 ? 1 : viewMonth + 2}월 ${day}일` :
                       day}
                    </span>
                    {/* + button on hover */}
                    {isHovered && !isEditing && (
                      <button
                        className="calendar-view__add-btn"
                        onClick={(e) => { e.stopPropagation(); openModal(dateKey) }}
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Inline editor */}
                  {isEditing && (
                    <div className="calendar-view__inline-editor">
                      <input
                        autoFocus
                        className="calendar-view__inline-input"
                        placeholder="메모 입력..."
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { handleAdd(dateKey); setEditingCell(null) }
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        onBlur={() => { if (newTitle.trim()) handleAdd(dateKey); setEditingCell(null) }}
                      />
                    </div>
                  )}

                  {/* Events */}
                  <div className="calendar-view__cell-events">
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        className={`calendar-view__cell-event ${ev.done ? 'calendar-view__cell-event--done' : ''}`}
                      >
                        {editingId === ev.id ? (
                          <input
                            autoFocus
                            className="calendar-view__event-edit"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                            onBlur={handleSaveEdit}
                          />
                        ) : (
                          <>
                            <button
                              className="calendar-view__event-check"
                              onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_CALENDAR_EVENT', eventId: ev.id }) }}
                            >
                              {ev.done ? '✓' : '○'}
                            </button>
                            <span
                              className="calendar-view__event-title"
                              onDoubleClick={() => handleStartEdit(ev)}
                            >
                              {ev.title}
                            </span>
                            <button
                              className="calendar-view__event-remove"
                              onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_CALENDAR_EVENT', eventId: ev.id }) }}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Notion-style creation modal */}
      {modalDate && (
        <div className="cal-modal-overlay" onClick={() => setModalDate(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal__header">
              <span className="cal-modal__date">{modalDate}</span>
              <button className="cal-modal__close" onClick={() => setModalDate(null)}>×</button>
            </div>
            <input
              autoFocus
              className="cal-modal__title"
              placeholder="제목을 입력하세요..."
              value={modalTitle}
              onChange={e => setModalTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleModalAdd() }}
            />
            <input
              className="cal-modal__time"
              type="time"
              value={modalTime}
              onChange={e => setModalTime(e.target.value)}
            />
            <textarea
              className="cal-modal__desc"
              placeholder="설명 추가..."
              value={modalDesc}
              onChange={e => setModalDesc(e.target.value)}
              rows={3}
            />
            <div className="cal-modal__actions">
              <button className="cal-modal__cancel" onClick={() => setModalDate(null)}>취소</button>
              <button className="cal-modal__save" onClick={handleModalAdd}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
