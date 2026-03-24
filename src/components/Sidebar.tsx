import { useState, useMemo } from 'react'
import { useGraphState, useGraphDispatch } from '../state/GraphContext'
import { useTheme, type ThemeMode } from '../state/ThemeContext'
import { NODE_COLORS, EMPTY_NODE_COLOR } from '../types/graph'
import type { FolderItem } from '../types/graph'
import type { ViewMode } from '../App'
import { generateId, createNode } from '../state/graphReducer'

export function Sidebar({ onViewChange }: { view: ViewMode; onViewChange: (v: ViewMode) => void }) {
  const state = useGraphState()
  const { nodes, folders, recentlyDeleted } = state
  const dispatch = useGraphDispatch()
  const { theme, setTheme } = useTheme()

  const [searchQuery, setSearchQuery] = useState('')
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [recentOpen, setRecentOpen] = useState(true)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null)

  const themes: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'cosmos', label: '우주', icon: '🌌' },
    { key: 'dot', label: '도트', icon: '⬤' },
    { key: 'light', label: '기본', icon: '☀️' },
  ]

  // Build folder tree lookup
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, FolderItem[]>()
    for (const f of folders) {
      const children = map.get(f.parentId) || []
      children.push(f)
      map.set(f.parentId, children)
    }
    return map
  }, [folders])

  // Nodes not in any folder
  const folderNodeIds = useMemo(() => new Set(folders.filter(f => f.type === 'note' && f.nodeId).map(f => f.nodeId!)), [folders])
  const unfolderedNodes = useMemo(() => nodes.filter(n => !folderNodeIds.has(n.id)), [nodes, folderNodeIds])

  // Search
  const filteredNodes = searchQuery.trim()
    ? nodes.filter(n =>
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null

  const handleCreateFolder = (parentId: string | null = null) => {
    const folder: FolderItem = {
      id: generateId(),
      name: '새 폴더',
      parentId,
      type: 'folder',
      createdAt: Date.now(),
      isOpen: true,
    }
    dispatch({ type: 'ADD_FOLDER', folder })
    setRenamingId(folder.id)
    setRenameValue('새 폴더')
  }

  const handleCreateNote = (parentId: string | null = null) => {
    const newNode = createNode({
      label: '새 노트',
      type: 'idea',
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      description: '',
    })
    dispatch({ type: 'ADD_NODE', node: newNode })

    const folderItem: FolderItem = {
      id: generateId(),
      name: newNode.label,
      parentId,
      type: 'note',
      nodeId: newNode.id,
      createdAt: Date.now(),
    }
    dispatch({ type: 'ADD_FOLDER', folder: folderItem })
    dispatch({ type: 'SET_SELECTED', nodeId: newNode.id })
    onViewChange('notes')
  }

  const handleStartRename = (item: FolderItem) => {
    setRenamingId(item.id)
    setRenameValue(item.name)
  }

  const handleFinishRename = () => {
    if (renamingId && renameValue.trim()) {
      dispatch({ type: 'RENAME_FOLDER', folderId: renamingId, name: renameValue.trim() })
      // Also update GraphNode label if it's a note
      const item = folders.find(f => f.id === renamingId)
      if (item?.type === 'note' && item.nodeId) {
        dispatch({ type: 'UPDATE_NODE', nodeId: item.nodeId, updates: { label: renameValue.trim() } })
      }
    }
    setRenamingId(null)
  }

  const handleContextMenu = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, itemId })
  }

  const handleDeleteItem = (itemId: string) => {
    const item = folders.find(f => f.id === itemId)
    if (item?.type === 'note' && item.nodeId) {
      dispatch({ type: 'REMOVE_NODE', nodeId: item.nodeId })
    }
    dispatch({ type: 'REMOVE_FOLDER', folderId: itemId })
    setContextMenu(null)
  }

  const handleNoteClick = (nodeId: string) => {
    dispatch({ type: 'SET_SELECTED', nodeId })
    onViewChange('notes')
  }

  // Render folder tree recursively
  const renderTree = (parentId: string | null, depth: number = 0) => {
    const children = childrenOf.get(parentId) || []
    const sorted = [...children].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })

    return sorted.map(item => {
      const isFolder = item.type === 'folder'
      const isOpen = item.isOpen ?? false
      const node = item.nodeId ? nodes.find(n => n.id === item.nodeId) : null
      const isSelected = node && state.selectedNodeId === node.id

      return (
        <div key={item.id}>
          <div
            className={`file-item ${isSelected ? 'file-item--active' : ''} ${isFolder ? 'file-item--folder' : ''}`}
            style={{ paddingLeft: 12 + depth * 16 }}
            onClick={() => {
              if (isFolder) {
                dispatch({ type: 'TOGGLE_FOLDER', folderId: item.id })
              } else if (item.nodeId) {
                handleNoteClick(item.nodeId)
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, item.id)}
          >
            {isFolder && (
              <svg className={`file-item__chevron ${isOpen ? 'file-item__chevron--open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            <span className="file-item__icon">
              {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
            </span>
            {renamingId === item.id ? (
              <input
                autoFocus
                className="file-item__rename"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setRenamingId(null) }}
                onBlur={handleFinishRename}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="file-item__name">
                {node ? node.label : item.name}
              </span>
            )}
            {!isFolder && node && (
              <span className="file-item__dot" style={{ background: node.description.trim() ? NODE_COLORS[node.type] : EMPTY_NODE_COLOR }} />
            )}
          </div>
          {isFolder && isOpen && renderTree(item.id, depth + 1)}
        </div>
      )
    })
  }

  return (
    <aside className="sidebar" onClick={() => setContextMenu(null)}>
      <div className="sidebar__header">
        <button className="sidebar__logo" onClick={() => onViewChange('graph')} title="Graph View">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="21.17" y1="8" x2="12" y2="8" />
            <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
            <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
          </svg>
        </button>
        <span className="sidebar__title" style={{ cursor: 'pointer' }} onClick={() => onViewChange('graph')}>Cosmos Note</span>
        <div className="sidebar__theme-toggle">
          <button className="btn-icon btn-icon--sm" onClick={() => setThemePickerOpen(!themePickerOpen)} title="테마 변경">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
          {themePickerOpen && (
            <div className="theme-picker">
              {themes.map(t => (
                <button
                  key={t.key}
                  className={`theme-picker__item ${theme === t.key ? 'theme-picker__item--active' : ''}`}
                  onClick={() => { setTheme(t.key); setThemePickerOpen(false) }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="sidebar__search">
        <svg className="sidebar__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="sidebar__search-input"
          type="text"
          placeholder="노트 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="sidebar__search-clear" onClick={() => setSearchQuery('')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      {/* Search results */}
      {filteredNodes && (
        <div className="sidebar__search-results">
          <div className="nav-section__label">검색 결과 ({filteredNodes.length})</div>
          {filteredNodes.slice(0, 10).map(n => (
            <button
              key={n.id}
              className="file-item"
              onClick={() => handleNoteClick(n.id)}
            >
              <span className="file-item__icon">📄</span>
              <span className="file-item__name">{n.label}</span>
              <span className="file-item__dot" style={{ background: n.description.trim() ? NODE_COLORS[n.type] : EMPTY_NODE_COLOR }} />
            </button>
          ))}
        </div>
      )}

      <nav className="sidebar__nav">
        {/* File Explorer */}
        <div className="nav-section">
          <div className="nav-section__header">
            <button className="nav-section__label nav-section__label--toggle" onClick={() => setExplorerOpen(!explorerOpen)}>
              <svg className={`nav-section__chevron ${explorerOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              파일 탐색기
            </button>
            <div className="nav-section__actions">
              <button className="nav-section__action-btn" onClick={() => handleCreateNote(null)} title="새 노트">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </button>
              <button className="nav-section__action-btn" onClick={() => handleCreateFolder(null)} title="새 폴더">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
            </div>
          </div>
          {explorerOpen && (
            <div className="file-tree">
              {renderTree(null)}
              {/* Unfoldered notes */}
              {unfolderedNodes.map(n => (
                <div
                  key={n.id}
                  className={`file-item ${state.selectedNodeId === n.id ? 'file-item--active' : ''}`}
                  style={{ paddingLeft: 12 }}
                  onClick={() => handleNoteClick(n.id)}
                >
                  <span className="file-item__icon">📄</span>
                  <span className="file-item__name">{n.label}</span>
                  <span className="file-item__dot" style={{ background: n.description.trim() ? NODE_COLORS[n.type] : EMPTY_NODE_COLOR }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent */}
        <div className="nav-section nav-section--compact">
          <button className="nav-section__label nav-section__label--toggle" onClick={() => setRecentOpen(!recentOpen)}>
            <svg className={`nav-section__chevron ${recentOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            최근 노트
          </button>
          {recentOpen && [...nodes]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map(n => (
              <div
                key={n.id}
                className={`file-item file-item--compact ${state.selectedNodeId === n.id ? 'file-item--active' : ''}`}
                onClick={() => handleNoteClick(n.id)}
              >
                <span className="file-item__dot" style={{ background: n.description.trim() ? NODE_COLORS[n.type] : EMPTY_NODE_COLOR }} />
                <span className="file-item__name">{n.label}</span>
              </div>
            ))}
        </div>

        {/* Recently Deleted */}
        {recentlyDeleted.length > 0 && (
          <div className="nav-section nav-section--compact nav-section--deleted">
            <button className="nav-section__label nav-section__label--toggle" onClick={() => setDeletedOpen(!deletedOpen)}>
              <svg className={`nav-section__chevron ${deletedOpen ? 'nav-section__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              최근 삭제
              <span className="nav-item__count">{recentlyDeleted.length}</span>
            </button>
            {deletedOpen && (
              <>
                {recentlyDeleted.slice(0, 5).map((d, i) => (
                  <div key={d.node.id + d.deletedAt} className="file-item file-item--compact file-item--deleted">
                    <span className="file-item__dot" style={{ background: EMPTY_NODE_COLOR }} />
                    <span className="file-item__name">{d.node.label}</span>
                    <button
                      className="file-item__restore"
                      onClick={() => dispatch({ type: 'RESTORE_NODE', deletedIndex: i })}
                      title="복원"
                    >
                      ↩
                    </button>
                  </div>
                ))}
                <button
                  className="file-item file-item--compact file-item--danger"
                  onClick={() => dispatch({ type: 'CLEAR_DELETED' })}
                >
                  전체 삭제
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button className="context-menu__item" onClick={() => {
            const item = folders.find(f => f.id === contextMenu.itemId)
            if (item) handleStartRename(item)
            setContextMenu(null)
          }}>
            이름 변경
          </button>
          {folders.find(f => f.id === contextMenu.itemId)?.type === 'folder' && (
            <>
              <button className="context-menu__item" onClick={() => { handleCreateNote(contextMenu.itemId); setContextMenu(null) }}>
                새 노트
              </button>
              <button className="context-menu__item" onClick={() => { handleCreateFolder(contextMenu.itemId); setContextMenu(null) }}>
                새 폴더
              </button>
            </>
          )}
          <div className="context-menu__divider" />
          <button className="context-menu__item context-menu__item--danger" onClick={() => handleDeleteItem(contextMenu.itemId)}>
            삭제
          </button>
        </div>
      )}

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{(localStorage.getItem('cosmos-user') || 'U')[0].toUpperCase()}</div>
          <span>{localStorage.getItem('cosmos-user') || 'User'}</span>
        </div>
      </div>
    </aside>
  )
}
