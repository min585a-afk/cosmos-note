import type { GraphNode } from '../types/graph'

const TWO_PI = Math.PI * 2

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const spacing = 40
  const dotRadius = 0.8
  const alpha = Math.min(0.15, 0.08 / Math.max(scale, 0.3))
  ctx.fillStyle = `rgba(124, 106, 255, ${alpha})`

  const startX = Math.floor(-w / spacing) * spacing - spacing
  const startY = Math.floor(-h / spacing) * spacing - spacing
  const endX = Math.ceil(w / spacing) * spacing + spacing
  const endY = Math.ceil(h / spacing) * spacing + spacing

  for (let x = startX; x <= endX; x += spacing) {
    for (let y = startY; y <= endY; y += spacing) {
      ctx.beginPath()
      ctx.arc(x, y, dotRadius, 0, TWO_PI)
      ctx.fill()
    }
  }
}

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  source: GraphNode,
  target: GraphNode,
  _isActive: boolean = false,
  _time: number = 0
) {
  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.lineTo(target.x, target.y)
  ctx.strokeStyle = 'rgba(150, 140, 200, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()
}

export function drawDraftEdge(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  ctx.beginPath()
  ctx.setLineDash([6, 4])
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.strokeStyle = 'rgba(124, 106, 255, 0.5)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  _time: number
) {
  const { x, y, color } = node

  // Obsidian-style: simple filled circle, size varies by state
  const r = isHovered ? 7 : isSelected ? 6 : 4.5

  // Soft glow around node (color-matched)
  const glowR = isHovered ? r + 14 : isSelected ? r + 12 : r + 8
  const glow = ctx.createRadialGradient(x, y, r, x, y, glowR)
  glow.addColorStop(0, color + '35')
  glow.addColorStop(1, color + '00')
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, TWO_PI)
  ctx.fillStyle = glow
  ctx.fill()

  // Main circle - solid color fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TWO_PI)
  ctx.fillStyle = color
  ctx.fill()
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  _time: number
) {
  const showLabel = isHovered || isSelected

  // Only show labels when hovered/selected, or always show at a reasonable zoom
  ctx.font = `${showLabel ? '12px' : '10px'} Inter, system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = showLabel ? '#e8e8f0' : '#8888a0'
  ctx.globalAlpha = showLabel ? 1 : 0.7
  ctx.fillText(node.label, node.x + 12, node.y)
  ctx.globalAlpha = 1
}
