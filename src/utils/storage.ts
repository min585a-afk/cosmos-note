import type { GraphNode, GraphEdge, DeletedNode, FolderItem } from '../types/graph'

const STORAGE_KEY = 'cosmos-note-data'

interface SavedData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  recentlyDeleted?: DeletedNode[]
  folders?: FolderItem[]
  version: number
}

export function saveToStorage(nodes: GraphNode[], edges: GraphEdge[], recentlyDeleted?: DeletedNode[], folders?: FolderItem[]) {
  try {
    const data: SavedData = { nodes, edges, recentlyDeleted, folders, version: 1 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function loadFromStorage(): { nodes: GraphNode[]; edges: GraphEdge[]; recentlyDeleted?: DeletedNode[]; folders?: FolderItem[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: SavedData = JSON.parse(raw)
    if (!data.nodes || !data.edges) return null
    // Migrate nodes: add size field if missing
    const migratedNodes = data.nodes.map(n => ({
      ...n,
      size: n.size ?? (n.radius >= 14 ? 3 : 2) as 1 | 2 | 3 | 4 | 5,
      statuses: n.statuses ?? [],
    }))
    return { nodes: migratedNodes, edges: data.edges, recentlyDeleted: data.recentlyDeleted, folders: data.folders }
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
