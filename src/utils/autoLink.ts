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

  // From description — extract key terms
  if (node.description) {
    const descTokens = node.description
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

  // Also add the node type as a keyword
  words.add(node.type)

  return words
}

// Find similarity between two keyword sets
function calculateSimilarity(a: Set<string>, b: Set<string>): number {
  let matches = 0
  for (const word of a) {
    if (b.has(word)) matches++
    // Also check partial matches (substring)
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
 * Find nodes that should be auto-linked to a new node
 * based on shared keywords, tags, and categories.
 * Returns edge objects to be added.
 */
export function findAutoLinks(
  newNode: GraphNode,
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[],
  generateEdgeId: () => string
): GraphEdge[] {
  const newKeywords = extractKeywords(newNode)
  const edges: GraphEdge[] = []

  // Track existing connections
  const connectedPairs = new Set<string>()
  for (const edge of existingEdges) {
    connectedPairs.add(`${edge.source}:${edge.target}`)
    connectedPairs.add(`${edge.target}:${edge.source}`)
  }

  // Score each existing node
  const scored: Array<{ node: GraphNode; score: number }> = []

  for (const node of existingNodes) {
    if (node.id === newNode.id) continue

    // Skip if already connected
    if (connectedPairs.has(`${newNode.id}:${node.id}`)) continue

    const existingKeywords = extractKeywords(node)
    let score = calculateSimilarity(newKeywords, existingKeywords)

    // Bonus for same type
    if (node.type === newNode.type) score += 0.5

    // Bonus for shared tags (stronger signal)
    const sharedTags = newNode.tags.filter(t => node.tags.includes(t))
    score += sharedTags.length * 2

    if (score >= 1.5) {
      scored.push({ node, score })
    }
  }

  // Sort by score and take top connections (max 3)
  scored.sort((a, b) => b.score - a.score)
  const topMatches = scored.slice(0, 3)

  for (const match of topMatches) {
    edges.push({
      id: generateEdgeId(),
      source: newNode.id,
      target: match.node.id,
    })
  }

  return edges
}
