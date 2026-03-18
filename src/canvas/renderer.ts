import type { GraphNode } from '../types/graph'

const TWO_PI = Math.PI * 2

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const spacing = 40
  const dotRadius = 0.8
  const alpha = Math.min(0.15, 0.08 / Math.max(scale, 0.3))
  ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`

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
  ctx.strokeStyle = 'rgba(191, 90, 242, 0.15)'
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
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  _time: number,
  isSearchMatch: boolean = false
) {
  const { x, y, color } = node

  // Size hierarchy: title nodes (14) bigger, branches (10) smaller
  const baseR = node.radius >= 14 ? 6 : node.radius >= 10 ? 3.5 : 3
  const r = isHovered ? baseR + 2 : isSelected ? baseR + 1.5 : isSearchMatch ? baseR + 1.5 : baseR

  // Per-node glow variation based on id hash
  const idHash = node.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const glowVariation = 0.4 + (Math.abs(idHash % 100) / 100) * 0.6  // 0.4 ~ 1.0

  // Neon glow - stronger for search matches, varied per node
  const baseGlowR = isHovered ? r + 20 : isSelected ? r + 18 : isSearchMatch ? r + 22 : r + 12
  const glowR = baseGlowR * glowVariation + baseGlowR * 0.3
  const baseAlpha = isSearchMatch ? 0x70 : 0x5a
  const glowAlphaNum = Math.round(baseAlpha * glowVariation)
  const glowAlpha = glowAlphaNum.toString(16).padStart(2, '0')
  const glow = ctx.createRadialGradient(x, y, r, x, y, glowR)
  glow.addColorStop(0, color + glowAlpha)
  glow.addColorStop(1, color + '00')
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, TWO_PI)
  ctx.fillStyle = glow
  ctx.fill()

  // Search match: pulsing ring
  if (isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, r + 5, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Main circle
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TWO_PI)
  ctx.fillStyle = color
  ctx.fill()

  // Empty node indicator: dashed ring
  if (!node.description.trim() && !isHovered && !isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, r + 3, 0, TWO_PI)
    ctx.setLineDash([2, 2])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.setLineDash([])
  }
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  _time: number,
  isSearchMatch: boolean = false
) {
  const showLabel = isHovered || isSelected || isSearchMatch
  const isTitle = node.radius >= 14

  const fontSize = isTitle ? (showLabel ? 11 : 10) : (showLabel ? 9.5 : 8.5)
  const weight = isTitle ? '600' : (showLabel ? '500' : '400')
  ctx.font = `${weight} ${fontSize}px 'Pretendard Variable', system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = isTitle ? '#f8f8ff' : (showLabel ? '#f0f0f8' : '#9999b0')
  ctx.globalAlpha = isTitle ? 1 : (showLabel ? 1 : 0.7)
  ctx.fillText(node.label, node.x + 12, node.y)
  ctx.globalAlpha = 1
}
