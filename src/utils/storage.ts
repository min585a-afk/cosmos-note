import type { GraphNode, GraphEdge, DeletedNode, CalendarEvent } from '../types/graph'

const STORAGE_KEY = 'cosmos-note-data'

interface SavedData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  recentlyDeleted?: DeletedNode[]
  calendarEvents?: CalendarEvent[]
  version: number
}

export function saveToStorage(nodes: GraphNode[], edges: GraphEdge[], recentlyDeleted?: DeletedNode[], calendarEvents?: CalendarEvent[]) {
  try {
    const data: SavedData = { nodes, edges, recentlyDeleted, calendarEvents, version: 1 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function loadFromStorage(): { nodes: GraphNode[]; edges: GraphEdge[]; recentlyDeleted?: DeletedNode[]; calendarEvents?: CalendarEvent[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: SavedData = JSON.parse(raw)
    if (!data.nodes || !data.edges) return null
    return { nodes: data.nodes, edges: data.edges, recentlyDeleted: data.recentlyDeleted, calendarEvents: data.calendarEvents }
  } catch {
    return null
  }
}

/**
 * Export a node as markdown string
 */
export function nodeToMarkdown(node: GraphNode, connectedLabels: string[]): string {
  const lines: string[] = []

  lines.push(`# ${node.label}`)
  lines.push('')

  // Metadata
  lines.push(`> Type: ${node.type}`)
  lines.push(`> Created: ${new Date(node.createdAt).toLocaleString('ko-KR')}`)
  if (node.tags.length > 0) {
    lines.push(`> Tags: ${node.tags.map(t => `#${t}`).join(' ')}`)
  }
  lines.push('')

  // Body
  if (node.description) {
    lines.push(node.description)
    lines.push('')
  }

  // Backlinks
  if (connectedLabels.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## Linked Notes')
    for (const label of connectedLabels) {
      lines.push(`- [[${label}]]`)
    }
  }

  return lines.join('\n')
}

/**
 * Export all notes as a combined markdown file
 */
export function exportAllAsMarkdown(nodes: GraphNode[], edges: GraphEdge[]): string {
  const sections: string[] = []

  for (const node of nodes) {
    const connected = edges
      .filter(e => e.source === node.id || e.target === node.id)
      .map(e => {
        const otherId = e.source === node.id ? e.target : e.source
        return nodes.find(n => n.id === otherId)?.label ?? ''
      })
      .filter(Boolean)

    sections.push(nodeToMarkdown(node, connected))
  }

  return sections.join('\n\n---\n\n')
}
