import type { GraphNode, GraphEdge } from '../types/graph'

// Extract keywords from a node for matching
function extractKeywords(node: GraphNode): Set<string> {
  const words = new Set<string>()

  // From tags
  for (const tag of node.tags) {
    words.add(tag.toLowerCase())
  }

  // From label — split into meaningful tokens
  const labelTokens = node.label
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)

  for (const token of labelTokens) {
    words.add(token)
  }

  // From description — extract key terms (skip [[links]])
  if (node.description) {
    const cleanDesc = node.description.replace(/\[\[[^\]]+\]\]/g, ' ')
    const descTokens = cleanDesc
      .toLowerCase()
      .replace(/[^\w가-힣\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2)

    for (const token of descTokens) {
      words.add(token)
    }
  }

  // Remove common stop words
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'this', 'that', 'with', 'from',
    '그리고', '하지만', '그래서', '또한', '이것', '저것', '어떤', '무엇',
    '있는', '없는', '하는', '되는', '것을', '이를',
  ])

  for (const word of stopWords) {
    words.delete(word)
  }

  words.add(node.type)
  return words
}

// Find similarity between two keyword sets
function calculateSimilarity(a: Set<string>, b: Set<string>): number {
  let matches = 0
  for (const word of a) {
    if (b.has(word)) matches++
    // Partial match (substring) only for Korean words (3+ chars)
    for (const bWord of b) {
      if (word !== bWord && word.length >= 3 && bWord.length >= 3) {
        if (word.includes(bWord) || bWord.includes(word)) {
          matches += 0.5
        }
      }
    }
  }
  return matches
}

/**
 * Extract [[wikilink]] targets from a node's description
 */
function extractWikiLinks(description: string): string[] {
  const links: string[] = []
  const regex = /\[\[([^\]]+)\]\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(description)) !== null) {
    links.push(match[1].toLowerCase())
  }
  return links
}

/**
 * Find nodes that should be auto-linked to a given node.
 * Checks: shared keywords, shared tags, same type, [[wikilinks]]
 */
export function findAutoLinks(
  newNode: GraphNode,
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[],
  generateEdgeId: () => string
): GraphEdge[] {
  const edges: GraphEdge[] = []

  // Track existing connections
  const connectedPairs = new Set<string>()
  for (const edge of existingEdges) {
    connectedPairs.add(`${edge.source}:${edge.target}`)
    connectedPairs.add(`${edge.target}:${edge.source}`)
  }

  const isConnected = (a: string, b: string) =>
    connectedPairs.has(`${a}:${b}`)

  // 1. [[Wikilink]] connections — strongest signal, always link
  const wikiLinks = extractWikiLinks(newNode.description)
  for (const linkName of wikiLinks) {
    const target = existingNodes.find(n =>
      n.id !== newNode.id && n.label.toLowerCase() === linkName
    )
    if (target && !isConnected(newNode.id, target.id)) {
      edges.push({
        id: generateEdgeId(),
        source: newNode.id,
        target: target.id,
      })
      connectedPairs.add(`${newNode.id}:${target.id}`)
      connectedPairs.add(`${target.id}:${newNode.id}`)
    }
  }

  // Also check: do any existing nodes have [[this node's label]] in their description?
  const myLabel = newNode.label.toLowerCase()
  for (const node of existingNodes) {
    if (node.id === newNode.id) continue
    if (isConnected(newNode.id, node.id)) continue
    const theirLinks = extractWikiLinks(node.description)
    if (theirLinks.includes(myLabel)) {
      edges.push({
        id: generateEdgeId(),
        source: node.id,
        target: newNode.id,
      })
      connectedPairs.add(`${newNode.id}:${node.id}`)
      connectedPairs.add(`${node.id}:${newNode.id}`)
    }
  }

  // 2. Keyword-based similarity connections
  const newKeywords = extractKeywords(newNode)
  const scored: Array<{ node: GraphNode; score: number }> = []

  for (const node of existingNodes) {
    if (node.id === newNode.id) continue
    if (isConnected(newNode.id, node.id)) continue

    const existingKeywords = extractKeywords(node)
    let score = calculateSimilarity(newKeywords, existingKeywords)

    // Bonus for shared tags (strong signal — intentional categorization)
    const sharedTags = newNode.tags.filter(t => node.tags.includes(t))
    score += sharedTags.length * 2.5

    // Bonus: label contains in label (e.g., "디자인" ⊂ "UI 디자인")
    const nl = newNode.label.toLowerCase()
    const ol = node.label.toLowerCase()
    if (nl.length >= 2 && ol.length >= 2) {
      if (nl.includes(ol) || ol.includes(nl)) score += 2
    }

    if (score >= 2.5) {
      scored.push({ node, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const maxAutoLinks = 3 - edges.length // Already have wikilink edges
  const topMatches = scored.slice(0, Math.max(0, maxAutoLinks))

  for (const match of topMatches) {
    edges.push({
      id: generateEdgeId(),
      source: newNode.id,
      target: match.node.id,
    })
  }

  return edges
}
