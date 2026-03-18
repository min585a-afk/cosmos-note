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
  // Slightly brighter edge if connecting planet to star
  const isPlanetEdge = source.radius >= 14 || target.radius >= 14
  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.lineTo(target.x, target.y)
  ctx.strokeStyle = isPlanetEdge ? 'rgba(191, 90, 242, 0.18)' : 'rgba(191, 90, 242, 0.12)'
  ctx.lineWidth = isPlanetEdge ? 1.2 : 0.8
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
 * Draw a PLANET node (radius >= 14, main notes)
 * - Large sphere with gradient surface
 * - Atmospheric glow
 * - Subtle orbital ring
 */
function drawPlanet(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  time: number,
  isSearchMatch: boolean
) {
  const { x, y, color } = node
  const baseR = isHovered ? 10 : isSelected ? 9 : isSearchMatch ? 9 : 8
  const [cr, cg, cb] = hexToRgb(color)

  // Outer atmospheric glow (large, soft)
  const idHash = node.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const glowPulse = 0.85 + Math.sin(time * 0.001 + idHash) * 0.15
  const atmoR = baseR * 3.5 * glowPulse
  const atmo = ctx.createRadialGradient(x, y, baseR * 0.5, x, y, atmoR)
  atmo.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.25)`)
  atmo.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, 0.08)`)
  atmo.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
  ctx.beginPath()
  ctx.arc(x, y, atmoR, 0, TWO_PI)
  ctx.fillStyle = atmo
  ctx.fill()

  // Search match: pulsing ring
  if (isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 6, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Planet surface — radial gradient for 3D sphere look
  const surfaceGrad = ctx.createRadialGradient(
    x - baseR * 0.3, y - baseR * 0.3, baseR * 0.1,
    x, y, baseR
  )
  surfaceGrad.addColorStop(0, `rgba(${Math.min(255, cr + 80)}, ${Math.min(255, cg + 80)}, ${Math.min(255, cb + 80)}, 1)`)
  surfaceGrad.addColorStop(0.5, color)
  surfaceGrad.addColorStop(1, `rgba(${Math.floor(cr * 0.4)}, ${Math.floor(cg * 0.4)}, ${Math.floor(cb * 0.4)}, 1)`)

  ctx.beginPath()
  ctx.arc(x, y, baseR, 0, TWO_PI)
  ctx.fillStyle = surfaceGrad
  ctx.fill()

  // Highlight spot (specular reflection)
  const spotGrad = ctx.createRadialGradient(
    x - baseR * 0.35, y - baseR * 0.35, 0,
    x - baseR * 0.35, y - baseR * 0.35, baseR * 0.5
  )
  spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)')
  spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.beginPath()
  ctx.arc(x, y, baseR, 0, TWO_PI)
  ctx.fillStyle = spotGrad
  ctx.fill()

  // Orbital ring (ellipse)
  if (isHovered || isSelected) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-0.3)
    ctx.scale(1, 0.35)
    ctx.beginPath()
    ctx.arc(0, 0, baseR + 6, 0, TWO_PI)
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.3)`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // Empty node indicator
  if (!node.description.trim() && !isHovered && !isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 3, 0, TWO_PI)
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.setLineDash([])
  }
}

/**
 * Draw a STAR node (radius < 14, branch/leaf notes)
 * - Small bright point with cross-shine rays
 * - Subtle twinkle animation
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

  // Twinkle based on node id + time
  const idHash = node.id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const twinkle = 0.6 + Math.sin(time * 0.002 + idHash * 0.1) * 0.4  // 0.2 ~ 1.0

  // Soft glow
  const glowR = r + 8 * twinkle
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR)
  glow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${(0.4 * twinkle).toFixed(2)})`)
  glow.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, TWO_PI)
  ctx.fillStyle = glow
  ctx.fill()

  // Cross-shine rays (4-point star shape)
  if (twinkle > 0.7 || isHovered || isSelected) {
    const rayLen = (r + 4) * twinkle
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.3 * twinkle).toFixed(2)})`
    ctx.lineWidth = 0.6

    // Vertical ray
    ctx.beginPath()
    ctx.moveTo(x, y - rayLen)
    ctx.lineTo(x, y + rayLen)
    ctx.stroke()

    // Horizontal ray
    ctx.beginPath()
    ctx.moveTo(x - rayLen, y)
    ctx.lineTo(x + rayLen, y)
    ctx.stroke()
  }

  // Search match: ring
  if (isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, r + 4, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.8
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Core bright dot
  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r)
  coreGrad.addColorStop(0, '#ffffff')
  coreGrad.addColorStop(0.4, color)
  coreGrad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0.6)`)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TWO_PI)
  ctx.fillStyle = coreGrad
  ctx.fill()

  // Empty node indicator
  if (!node.description.trim() && !isHovered && !isSelected) {
    ctx.beginPath()
    ctx.arc(x, y, r + 2, 0, TWO_PI)
    ctx.setLineDash([2, 2])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 0.5
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
  const isPlanet = node.radius >= 14

  if (isPlanet) {
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

  if (isPlanet) {
    // Planet labels: always visible, bold
    const fontSize = showLabel ? 12 : 10.5
    const weight = showLabel ? '700' : '600'
    ctx.font = `${weight} ${fontSize}px 'Pretendard Variable', system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    const labelX = node.x + (isHovered ? 14 : 12)

    // Text shadow for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillText(node.label, labelX + 1, node.y + 1)

    ctx.fillStyle = '#f8f8ff'
    ctx.globalAlpha = showLabel ? 1 : 0.9
    ctx.fillText(node.label, labelX, node.y)
    ctx.globalAlpha = 1
  } else {
    // Star labels: only on hover/select
    const fontSize = showLabel ? 9.5 : 8
    const weight = showLabel ? '500' : '400'
    ctx.font = `${weight} ${fontSize}px 'Pretendard Variable', system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = showLabel ? '#e8eaf0' : '#8888a0'
    ctx.globalAlpha = showLabel ? 1 : 0.6
    ctx.fillText(node.label, node.x + 8, node.y)
    ctx.globalAlpha = 1
  }
}
