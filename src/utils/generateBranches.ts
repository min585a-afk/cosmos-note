import type { GraphNode, GraphEdge, NodeType } from '../types/graph'
import { createNode, generateId } from '../state/graphReducer'

const BRANCH_TEMPLATES: Array<{ prefix: string; type: NodeType }> = [
  { prefix: 'Define goals for', type: 'task' },
  { prefix: 'Research about', type: 'idea' },
  { prefix: 'Action plan for', type: 'work' },
  { prefix: 'Resources for', type: 'personal' },
  { prefix: 'Key questions about', type: 'idea' },
]

const SUB_TEMPLATES: Array<{ prefix: string; type: NodeType }> = [
  { prefix: 'Step 1:', type: 'task' },
  { prefix: 'Alternative:', type: 'idea' },
  { prefix: 'Reference:', type: 'personal' },
]

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
    description: `Brainstorming: ${topic}`,
    tags: ['brainstorm'],
    radius: 14,
  })
  nodes.push(root)

  // Primary branches (3-5)
  const branchCount = 3 + Math.floor(Math.random() * 3)
  const angleStep = (Math.PI * 2) / branchCount
  const branchRadius = 180

  for (let i = 0; i < branchCount; i++) {
    const template = BRANCH_TEMPLATES[i % BRANCH_TEMPLATES.length]
    const angle = angleStep * i - Math.PI / 2
    const bx = centerX + Math.cos(angle) * branchRadius + (Math.random() - 0.5) * 40
    const by = centerY + Math.sin(angle) * branchRadius + (Math.random() - 0.5) * 40

    const branch = createNode({
      label: `${template.prefix} ${topic}`,
      type: template.type,
      x: bx,
      y: by,
      description: '',
      tags: ['branch'],
      radius: 10,
    })
    nodes.push(branch)
    edges.push({ id: generateId(), source: root.id, target: branch.id })

    // Sub-branches (0-2 per branch)
    const subCount = Math.floor(Math.random() * 3)
    for (let j = 0; j < subCount; j++) {
      const subTemplate = SUB_TEMPLATES[j % SUB_TEMPLATES.length]
      const subAngle = angle + (j - subCount / 2) * 0.5
      const subRadius = branchRadius + 120
      const sx = centerX + Math.cos(subAngle) * subRadius + (Math.random() - 0.5) * 30
      const sy = centerY + Math.sin(subAngle) * subRadius + (Math.random() - 0.5) * 30

      const sub = createNode({
        label: `${subTemplate.prefix} ${template.prefix.toLowerCase()} ${topic}`,
        type: subTemplate.type,
        x: sx,
        y: sy,
        description: '',
        tags: ['sub-branch'],
        radius: 8,
      })
      nodes.push(sub)
      edges.push({ id: generateId(), source: branch.id, target: sub.id })
    }
  }

  return { nodes, edges }
}
