import type { GraphNode, GraphEdge } from '../types/graph'

// Check if a character is Korean
function isKorean(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return (code >= 0xAC00 && code <= 0xD7AF) || // Hangul Syllables
         (code >= 0x3130 && code <= 0x318F)     // Hangul Compatibility Jamo
}

// Extract keywords from a node for matching (NO type — type should NOT cause auto-link)
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
    '있는', '없는', '하는', '되는', '것을', '이를', '위한', '대한',
  ])

  for (const word of stopWords) {
    words.delete(word)
  }

  // NOTE: Do NOT add node.type — same type alone should never cause auto-link
  return words
}

// Korean prefix matching — share 2+ Korean char prefix
function koreanPrefixMatch(a: string, b: string): boolean {
  if (a.length < 2 || b.length < 2) return false
  if (!isKorean(a[0])) return false
  const minLen = Math.min(a.length, b.length)
  let shared = 0
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) shared++
    else break
  }
  return shared >= 2
}

// Find similarity between two keyword sets (only real content keywords)
function calculateSimilarity(a: Set<string>, b: Set<string>): number {
  let matches = 0
  for (const word of a) {
    if (b.has(word)) {
      matches += 1.5 // Exact keyword match is strong signal
      continue
    }
    // Only check advanced matching for longer words to avoid false positives
    for (const bWord of b) {
      if (word === bWord) continue
      // Substring match for words 3+ chars (stricter to avoid false matches)
      if (word.length >= 3 && bWord.length >= 3) {
        if (word.includes(bWord) || bWord.includes(word)) {
          matches += 0.7
          continue
        }
      }
      // Korean prefix/stem match (e.g., 디자인 ↔ 디자이너)
      if (word.length >= 2 && bWord.length >= 2 && koreanPrefixMatch(word, bWord)) {
        matches += 0.8
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
 * Links based on: shared tags, shared keywords in title/content, [[wikilinks]]
 * Does NOT link based on same node type alone.
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
      // Korean prefix match for labels (e.g., "디자이너" ↔ "디자인 노트")
      else {
        const nlTokens = nl.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
        const olTokens = ol.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
        for (const nt of nlTokens) {
          for (const ot of olTokens) {
            if (koreanPrefixMatch(nt, ot)) score += 1.5
          }
        }
      }
    }

    // Cross-match: label keywords ↔ description keywords
    const nlTokens = nl.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    const odesc = (node.description || '').toLowerCase().replace(/[^\w가-힣\s]/g, ' ')
    for (const token of nlTokens) {
      if (token.length >= 2 && odesc.includes(token)) score += 1.0
    }
    const olTokens2 = ol.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    const ndesc = (newNode.description || '').toLowerCase().replace(/[^\w가-힣\s]/g, ' ')
    for (const token of olTokens2) {
      if (token.length >= 2 && ndesc.includes(token)) score += 1.0
    }

    // Only connect if real content similarity exists (threshold 2.0)
    if (score >= 2.0) {
      scored.push({ node, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const maxAutoLinks = 5 - edges.length
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

/**
 * Find related nodes by similarity score (for "연관 노트 추천")
 */
export function findRelatedNodes(
  node: GraphNode,
  allNodes: GraphNode[],
  existingEdges: GraphEdge[],
  limit: number = 5
): Array<{ node: GraphNode; score: number; reason: string }> {
  const keywords = extractKeywords(node)
  const results: Array<{ node: GraphNode; score: number; reason: string }> = []

  const connectedIds = new Set<string>()
  for (const e of existingEdges) {
    if (e.source === node.id) connectedIds.add(e.target)
    if (e.target === node.id) connectedIds.add(e.source)
  }

  for (const other of allNodes) {
    if (other.id === node.id) continue
    if (connectedIds.has(other.id)) continue

    const otherKeywords = extractKeywords(other)
    let score = calculateSimilarity(keywords, otherKeywords)
    const reasons: string[] = []

    // Shared tags
    const sharedTags = node.tags.filter(t => other.tags.includes(t))
    if (sharedTags.length > 0) {
      score += sharedTags.length * 2.5
      reasons.push(`공통 태그: ${sharedTags.join(', ')}`)
    }

    // Label similarity
    const nl = node.label.toLowerCase()
    const ol = other.label.toLowerCase()
    if (nl.includes(ol) || ol.includes(nl)) {
      score += 2
      reasons.push('제목 유사')
    }

    // Korean prefix
    const nlTokens = nl.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    const olTokens = ol.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    for (const nt of nlTokens) {
      for (const ot of olTokens) {
        if (koreanPrefixMatch(nt, ot)) {
          score += 1.5
          reasons.push(`키워드 유사: ${nt}↔${ot}`)
        }
      }
    }

    // Content cross-match
    const odesc = (other.description || '').toLowerCase()
    for (const token of nlTokens) {
      if (token.length >= 2 && odesc.includes(token)) {
        score += 1.0
        reasons.push(`내용에 "${token}" 포함`)
      }
    }

    if (score >= 1.5) {
      results.push({ node: other, score, reason: reasons[0] || '키워드 유사' })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit)
}

/**
 * Suggest tags based on node content
 */
export function suggestTags(node: GraphNode, allNodes: GraphNode[]): string[] {
  const text = `${node.label} ${node.description}`.toLowerCase()
  const suggestions = new Set<string>()

  // Collect all existing tags in the system
  const tagCounts = new Map<string, number>()
  for (const n of allNodes) {
    for (const tag of n.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  // Suggest existing tags that match node content
  for (const [tag] of tagCounts) {
    if (node.tags.includes(tag)) continue
    if (text.includes(tag.toLowerCase())) {
      suggestions.add(tag)
    }
    // Korean prefix match
    const tokens = text.replace(/[^\w가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    for (const token of tokens) {
      if (koreanPrefixMatch(token, tag.toLowerCase())) {
        suggestions.add(tag)
      }
    }
  }

  // Extract potential new tags from content
  const keywords: Record<string, string[]> = {
    '디자인': ['디자인', 'ui', 'ux', '레이아웃', '컬러', '폰트', 'figma', 'css', '스타일'],
    '개발': ['코드', '개발', 'api', '서버', '프론트', '백엔드', 'react', 'typescript', '컴포넌트'],
    '기획': ['기획', '전략', '분석', '리서치', '사용자', '시장', '비즈니스'],
    '마케팅': ['마케팅', '광고', 'sns', '콘텐츠', '브랜딩', '캠페인'],
    '학습': ['학습', '공부', '강의', '책', '튜토리얼', '자격증'],
  }

  for (const [tag, kws] of Object.entries(keywords)) {
    if (node.tags.includes(tag)) continue
    if (kws.some(k => text.includes(k))) {
      suggestions.add(tag)
    }
  }

  return [...suggestions].slice(0, 5)
}
