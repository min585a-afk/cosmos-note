import type { GraphNode, GraphEdge, NodeType } from '../types/graph'
import { createNode, generateId } from '../state/graphReducer'

interface TopicTemplate {
  label: string
  type: NodeType
  description: string
}

// Generate contextual sub-topics based on the input
function generateSubTopics(topic: string): TopicTemplate[] {
  const lower = topic.toLowerCase()

  // Question patterns → generate answer-style branches
  if (lower.startsWith('how') || lower.includes('어떻게') || lower.includes('방법')) {
    return [
      { label: '핵심 개념 정리', type: 'idea', description: `${topic}에 대한 핵심 개념` },
      { label: '실행 단계', type: 'task', description: `실천할 수 있는 구체적인 단계` },
      { label: '참고 자료', type: 'personal', description: `관련 자료 및 레퍼런스` },
      { label: '주의할 점', type: 'work', description: `피해야 할 실수와 주의사항` },
    ]
  }

  if (lower.startsWith('why') || lower.includes('왜') || lower.includes('이유')) {
    return [
      { label: '근본 원인', type: 'idea', description: `근본적인 원인 분석` },
      { label: '배경 맥락', type: 'work', description: `이 질문의 배경과 맥락` },
      { label: '영향과 결과', type: 'task', description: `이것이 미치는 영향` },
      { label: '해결 방향', type: 'personal', description: `가능한 해결 방향` },
    ]
  }

  if (lower.startsWith('what') || lower.includes('무엇') || lower.includes('뭐')) {
    return [
      { label: '정의와 개념', type: 'idea', description: `핵심 정의` },
      { label: '특징과 장점', type: 'work', description: `주요 특징` },
      { label: '활용 사례', type: 'task', description: `실제 활용 사례` },
      { label: '관련 주제', type: 'personal', description: `연관된 다른 주제` },
    ]
  }

  // Default: general topic exploration
  return [
    { label: '핵심 포인트', type: 'idea', description: `${topic}의 핵심` },
    { label: '실행 계획', type: 'task', description: `실천 가능한 계획` },
    { label: '아이디어', type: 'idea', description: `관련 아이디어` },
    { label: '메모', type: 'personal', description: `추가 생각과 메모` },
  ]
}

export function generateBranches(
  topic: string,
  centerX: number = 0,
  centerY: number = 0
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Root node
  const root = createNode({
    label: topic,
    type: 'idea',
    x: centerX,
    y: centerY,
    description: topic,
    tags: ['root'],
    radius: 14,
  })
  nodes.push(root)

  // Generate contextual branches
  const subTopics = generateSubTopics(topic)
  const branchCount = 3 + Math.floor(Math.random() * 2) // 3-4 branches
  const angleStep = (Math.PI * 2) / branchCount
  const branchRadius = 140

  for (let i = 0; i < Math.min(branchCount, subTopics.length); i++) {
    const template = subTopics[i]
    const angle = angleStep * i - Math.PI / 2
    const bx = centerX + Math.cos(angle) * branchRadius + (Math.random() - 0.5) * 30
    const by = centerY + Math.sin(angle) * branchRadius + (Math.random() - 0.5) * 30

    const branch = createNode({
      label: template.label,
      type: template.type,
      x: bx,
      y: by,
      description: template.description,
      tags: ['branch'],
      radius: 10,
    })
    nodes.push(branch)
    edges.push({ id: generateId(), source: root.id, target: branch.id })
  }

  return { nodes, edges }
}
