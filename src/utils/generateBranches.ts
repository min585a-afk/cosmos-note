import type { GraphNode, GraphEdge, NodeType } from '../types/graph'
import { createNode, generateId } from '../state/graphReducer'

interface BranchTemplate {
  label: string
  type: NodeType
  description: string
}

// Generate analytical/questioning sub-nodes that help explore the topic
function generateAnalyticalBranches(topic: string): BranchTemplate[] {
  const lower = topic.toLowerCase()

  // Image/creative requests
  if (lower.includes('이미지') || lower.includes('그림') || lower.includes('디자인') || lower.includes('만들')) {
    return [
      { label: '어떤 스타일을 원하는걸까?', type: 'idea', description: '사실적? 일러스트? 미니멀?' },
      { label: '용도는 무엇일까?', type: 'work', description: '프레젠테이션? SNS? 인쇄?' },
      { label: '핵심 요소는?', type: 'task', description: '꼭 포함되어야 할 것들' },
      { label: '참고할 레퍼런스가 있을까?', type: 'personal', description: '비슷한 느낌의 예시' },
    ]
  }

  // Problem/worry patterns
  if (lower.includes('어떻게') || lower.includes('방법') || lower.includes('하고싶')) {
    return [
      { label: '현재 상황은 어떤가?', type: 'work', description: '지금 상태를 정리해보자' },
      { label: '목표가 뭘까?', type: 'idea', description: '달성하고 싶은 결과' },
      { label: '장애물은?', type: 'task', description: '방해가 되는 것들' },
      { label: '바로 할 수 있는 건?', type: 'personal', description: '지금 당장 시작할 수 있는 것' },
    ]
  }

  // Decision/choice patterns
  if (lower.includes('할까') || lower.includes('좋을까') || lower.includes('vs') || lower.includes('선택')) {
    return [
      { label: '각 선택지의 장점은?', type: 'idea', description: '좋은 점 정리' },
      { label: '리스크는 뭐가 있을까?', type: 'task', description: '잠재적 위험 요소' },
      { label: '지금 가장 중요한 기준은?', type: 'work', description: '우선순위 판단 기준' },
      { label: '나중에 후회하지 않을 선택은?', type: 'personal', description: '장기적 관점' },
    ]
  }

  // Default: analytical exploration
  return [
    { label: '이것의 핵심은 뭘까?', type: 'idea', description: '가장 중요한 포인트' },
    { label: '왜 이것을 생각하게 됐을까?', type: 'personal', description: '동기와 맥락' },
    { label: '다음 단계는?', type: 'task', description: '구체적인 액션' },
    { label: '관련된 다른 생각은?', type: 'work', description: '연결될 수 있는 것들' },
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

  // Generate analytical branches
  const branches = generateAnalyticalBranches(topic)
  const branchCount = 3 + Math.floor(Math.random() * 2) // 3-4
  const angleStep = (Math.PI * 2) / branchCount
  const branchRadius = 140

  for (let i = 0; i < Math.min(branchCount, branches.length); i++) {
    const template = branches[i]
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
