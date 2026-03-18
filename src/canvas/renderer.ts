import type { GraphNode } from '../types/graph'

const TWO_PI = Math.PI * 2

function isLightTheme(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'light'
}

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const spacing = 40
  const dotRadius = 0.8
  const alpha = Math.min(0.15, 0.08 / Math.max(scale, 0.3))
  const light = isLightTheme()
  ctx.fillStyle = light ? `rgba(100, 80, 180, ${alpha * 1.5})` : `rgba(167, 139, 250, ${alpha})`

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
  const isPlanetEdge = source.radius >= 14 || target.radius >= 14
  const light = isLightTheme()
  if (light) {
    ctx.strokeStyle = isPlanetEdge ? 'rgba(80, 60, 140, 0.25)' : 'rgba(80, 60, 140, 0.15)'
  } else {
    ctx.strokeStyle = isPlanetEdge ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.10)'
  }
  ctx.lineWidth = isPlanetEdge ? 1 : 0.6
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.setLineDash([])
}

// Helper: parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/**
 * Draw a PLANET node (radius >= 14) — simplified
 * Solid circle + soft glow + subtle highlight
 */
function drawPlanet(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  _time: number,
  isSearchMatch: boolean
) {
  const { x, y, color } = node
  const baseR = isHovered ? 9 : isSelected ? 8.5 : isSearchMatch ? 8.5 : 7.5
  const [cr, cg, cb] = hexToRgb(color)

  // Soft glow
  const glowR = baseR * 2.5
  const glow = ctx.createRadialGradient(x, y, baseR * 0.6, x, y, glowR)
  glow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.2)`)
  glow.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, TWO_PI)
  ctx.fillStyle = glow
  ctx.fill()

  // Search match ring
  if (isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 5, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.7
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Planet body — simple gradient sphere
  const surface = ctx.createRadialGradient(
    x - baseR * 0.25, y - baseR * 0.25, baseR * 0.1,
    x, y, baseR
  )
  surface.addColorStop(0, `rgba(${Math.min(255, cr + 50)}, ${Math.min(255, cg + 50)}, ${Math.min(255, cb + 50)}, 1)`)
  surface.addColorStop(0.7, color)
  surface.addColorStop(1, `rgba(${Math.floor(cr * 0.5)}, ${Math.floor(cg * 0.5)}, ${Math.floor(cb * 0.5)}, 1)`)

  ctx.beginPath()
  ctx.arc(x, y, baseR, 0, TWO_PI)
  ctx.fillStyle = surface
  ctx.fill()

  // Small highlight spot
  ctx.beginPath()
  ctx.arc(x - baseR * 0.3, y - baseR * 0.3, baseR * 0.3, 0, TWO_PI)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fill()

  // Empty node: dashed ring
  if (!node.description.trim() && !isHovered && !isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 3, 0, TWO_PI)
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = isLightTheme() ? 'rgba(80, 60, 140, 0.2)' : 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 0.6
    ctx.stroke()
    ctx.setLineDash([])
  }
}

/**
 * Draw a STAR node (radius < 14) — bright dot with twinkle
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  time: number,
  isSearchMatch: boolean
) {
  const { x, y, color } = node
  const [cr, cg, cb] = hexToRgb(color)

  const baseR = node.radius >= 10 ? 3 : 2.5
  const r = isHovered ? baseR + 1.5 : isSelected ? baseR + 1 : isSearchMatch ? baseR + 1 : baseR

  // Twinkle
  const idHash = node.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const twinkle = 0.6 + Math.sin(time * 0.002 + idHash * 0.1) * 0.4

  // Soft glow
  const glowR = r + 6 * twinkle
  const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, glowR)
  glow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${(0.35 * twinkle).toFixed(2)})`)
  glow.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, TWO_PI)
  ctx.fillStyle = glow
  ctx.fill()

  // Search match ring
  if (isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, r + 4, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.7
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Core dot — white center fading to color
  const core = ctx.createRadialGradient(x, y, 0, x, y, r)
  core.addColorStop(0, '#ffffff')
  core.addColorStop(0.5, color)
  core.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0.5)`)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TWO_PI)
  ctx.fillStyle = core
  ctx.fill()

  // Empty node indicator
  if (!node.description.trim() && !isHovered && !isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, r + 2, 0, TWO_PI)
    ctx.setLineDash([2, 2])
    ctx.strokeStyle = isLightTheme() ? 'rgba(80, 60, 140, 0.15)' : 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 0.4
    ctx.stroke()
    ctx.setLineDash([])
  }
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  time: number,
  isSearchMatch: boolean = false
) {
  if (node.radius >= 14) {
    drawPlanet(ctx, node, isHovered, isSelected, time, isSearchMatch)
  } else {
    drawStar(ctx, node, isHovered, isSelected, time, isSearchMatch)
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
  const isPlanet = node.radius >= 14

  const light = isLightTheme()

  if (isPlanet) {
    const fontSize = showLabel ? 11.5 : 10
    const weight = showLabel ? '600' : '500'
    ctx.font = `${weight} ${fontSize}px 'Pretendard Variable', system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = light ? '#1a1a2e' : '#f0f0ff'
    ctx.globalAlpha = showLabel ? 1 : 0.85
    ctx.fillText(node.label, node.x + 12, node.y)
    ctx.globalAlpha = 1
  } else {
    const fontSize = showLabel ? 9 : 7.5
    const weight = showLabel ? '500' : '400'
    ctx.font = `${weight} ${fontSize}px 'Pretendard Variable', system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = light
      ? (showLabel ? '#1a1a2e' : '#555580')
      : (showLabel ? '#ddddf0' : '#7777a0')
    ctx.globalAlpha = showLabel ? 1 : 0.5
    ctx.fillText(node.label, node.x + 7, node.y)
    ctx.globalAlpha = 1
  }
}
