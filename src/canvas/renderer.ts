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
  time: number = 0
) {
  const mx = (source.x + target.x) / 2
  const my = (source.y + target.y) / 2
  const dx = (target.x - source.x) * 0.2
  const pulse = 0.25 + Math.sin(time * 0.001) * 0.08

  // Glow layer
  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.quadraticCurveTo(mx + dx, my - dx * 0.5, target.x, target.y)
  ctx.strokeStyle = `rgba(124, 106, 255, ${pulse * 0.4})`
  ctx.lineWidth = 4
  ctx.stroke()

  // Sharp line
  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.quadraticCurveTo(mx + dx, my - dx * 0.5, target.x, target.y)
  ctx.strokeStyle = `rgba(140, 120, 255, ${pulse})`
  ctx.lineWidth = 1.5
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
  time: number
) {
  const { x, y, radius, color, createdAt } = node
  const age = time - createdAt
  const fadeIn = Math.min(1, age / 500)
  const pulse = 1 + Math.sin(time * 0.002 + x * 0.01) * 0.15
  const r = radius * pulse * fadeIn

  ctx.globalAlpha = fadeIn

  // Outer glow
  const glowRadius = r * (isHovered ? 6 : isSelected ? 5 : 4)
  const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, glowRadius)
  glow.addColorStop(0, color + '80')
  glow.addColorStop(0.3, color + '40')
  glow.addColorStop(0.6, color + '15')
  glow.addColorStop(1, color + '00')
  ctx.beginPath()
  ctx.arc(x, y, glowRadius, 0, TWO_PI)
  ctx.fillStyle = glow
  ctx.fill()

  // Core circle
  const coreGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
  coreGrad.addColorStop(0, '#ffffff')
  coreGrad.addColorStop(0.4, color)
  coreGrad.addColorStop(1, color + 'aa')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TWO_PI)
  ctx.fillStyle = coreGrad
  ctx.fill()

  // Bright center
  ctx.beginPath()
  ctx.arc(x, y, r * 0.35, 0, TWO_PI)
  ctx.fillStyle = '#ffffffcc'
  ctx.fill()

  // Selection ring
  if (isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, r + 4, 0, TWO_PI)
    ctx.strokeStyle = color + 'aa'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.globalAlpha = 1
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  time: number
) {
  const age = time - node.createdAt
  const fadeIn = Math.min(1, age / 500)
  const showLabel = isHovered || isSelected

  ctx.globalAlpha = fadeIn * (showLabel ? 1 : 0.85)
  ctx.font = `500 ${showLabel ? '13px' : '11px'} Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const label = node.label
  const yOffset = node.radius * 2.2 + 6

  // Text background for readability
  const metrics = ctx.measureText(label)
  const tw = metrics.width + 12
  const th = showLabel ? 18 : 16
  ctx.fillStyle = 'rgba(8, 9, 13, 0.65)'
  ctx.fillRect(node.x - tw / 2, node.y + yOffset - 3, tw, th)

  // Text
  ctx.fillStyle = showLabel ? '#ffffff' : '#c0c4d6'
  ctx.fillText(label, node.x, node.y + yOffset)

  ctx.globalAlpha = 1
}
