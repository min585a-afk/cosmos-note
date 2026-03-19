import type { GraphNode } from '../types/graph'
import { STATUS_EMOJI } from '../types/graph'

const TWO_PI = Math.PI * 2

type ThemeName = 'cosmos' | 'dot' | 'light'

function getTheme(): ThemeName {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'dot' || t === 'light') return t
  return 'cosmos'
}

function isLightTheme(): boolean {
  return getTheme() === 'light'
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
  _time: number = 0,
  thickness: number = 1.0,
  showArrow: boolean = false
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
  ctx.lineWidth = (isPlanetEdge ? 1 : 0.6) * thickness
  ctx.stroke()

  // Arrow
  if (showArrow) {
    const dx = target.x - source.x
    const dy = target.y - source.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return
    const ux = dx / len
    const uy = dy / len
    const arrowLen = 6 * thickness
    const tipX = target.x - ux * (target.radius >= 14 ? 10 : 5)
    const tipY = target.y - uy * (target.radius >= 14 ? 10 : 5)
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(tipX - ux * arrowLen + uy * arrowLen * 0.4, tipY - uy * arrowLen - ux * arrowLen * 0.4)
    ctx.lineTo(tipX - ux * arrowLen - uy * arrowLen * 0.4, tipY - uy * arrowLen + ux * arrowLen * 0.4)
    ctx.closePath()
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
  }
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
  isSearchMatch: boolean,
  sizeMul: number = 1.0
) {
  const { x, y, color } = node
  const rScale = node.radius / 14  // scale relative to default planet radius
  const baseR = (isHovered ? 9 : isSelected ? 8.5 : isSearchMatch ? 8.5 : 7.5) * sizeMul * rScale
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
  isSearchMatch: boolean,
  sizeMul: number = 1.0
) {
  const { x, y, color } = node
  const [cr, cg, cb] = hexToRgb(color)

  const rScale = node.radius / 10  // scale relative to default star radius
  const baseR = (node.radius >= 10 ? 3 : 2.5) * sizeMul * rScale
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

/**
 * Dot theme: small colored dots, no glow/gradient
 */
function drawDotNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  isSearchMatch: boolean,
  sizeMul: number = 1.0
) {
  const { x, y, color } = node
  const isPlanet = node.radius >= 14
  const baseR = (isPlanet ? (isHovered ? 6 : isSelected ? 5.5 : 5) : (isHovered ? 4 : isSelected ? 3.5 : 3)) * sizeMul

  // Hover/select ring
  if (isSelected || isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 3, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.6
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Simple solid dot
  ctx.beginPath()
  ctx.arc(x, y, baseR, 0, TWO_PI)
  ctx.fillStyle = color
  ctx.fill()

  // Hover highlight
  if (isHovered) {
    ctx.beginPath()
    ctx.arc(x, y, baseR, 0, TWO_PI)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

/**
 * Light/basic theme: black filled circles, clean minimal style
 */
function drawBasicNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  isSearchMatch: boolean,
  sizeMul: number = 1.0
) {
  const { x, y, color } = node
  const [cr, cg, cb] = hexToRgb(color)
  const isPlanet = node.radius >= 14
  const baseR = (isPlanet ? (isHovered ? 8 : isSelected ? 7.5 : 7) : (isHovered ? 5 : isSelected ? 4.5 : 4)) * sizeMul

  // Selected/search ring
  if (isSelected || isSearchMatch) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 4, 0, TWO_PI)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Dark filled circle with colored border
  ctx.beginPath()
  ctx.arc(x, y, baseR, 0, TWO_PI)
  ctx.fillStyle = node.description.trim() ? `rgba(${cr}, ${cg}, ${cb}, 0.15)` : 'rgba(30, 30, 50, 0.8)'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = isPlanet ? 2 : 1.5
  ctx.stroke()

  // Inner dot
  if (node.description.trim()) {
    ctx.beginPath()
    ctx.arc(x, y, baseR * 0.35, 0, TWO_PI)
    ctx.fillStyle = color
    ctx.fill()
  }

  // Hover effect
  if (isHovered) {
    ctx.beginPath()
    ctx.arc(x, y, baseR + 2, 0, TWO_PI)
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.3)`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawNodeIcon(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  baseR: number
) {
  if (!node.icon) return
  const fontSize = Math.max(8, baseR * 1.3)
  ctx.font = `${fontSize}px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(node.icon, node.x, node.y + 1)
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isHovered: boolean,
  isSelected: boolean,
  time: number,
  isSearchMatch: boolean = false,
  sizeMul: number = 1.0
) {
  const theme = getTheme()

  if (theme === 'dot') {
    drawDotNode(ctx, node, isHovered, isSelected, isSearchMatch, sizeMul)
  } else if (theme === 'light') {
    drawBasicNode(ctx, node, isHovered, isSelected, isSearchMatch, sizeMul)
  } else {
    // Cosmos theme - original
    if (node.radius >= 14) {
      drawPlanet(ctx, node, isHovered, isSelected, time, isSearchMatch, sizeMul)
    } else {
      drawStar(ctx, node, isHovered, isSelected, time, isSearchMatch, sizeMul)
    }
  }

  // Draw icon on top of node (all themes)
  if (node.icon) {
    const r = node.radius * sizeMul * 0.55
    drawNodeIcon(ctx, node, r)
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

export function drawStatusIndicators(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  time: number,
  sizeMul: number = 1.0
) {
  const statuses = node.statuses
  if (!statuses || statuses.length === 0) return

  const baseR = node.radius * sizeMul
  const orbitR = baseR + 12
  const orbitSpeed = 0.0005
  const baseAngle = time * orbitSpeed

  for (let i = 0; i < statuses.length; i++) {
    const angle = baseAngle + (i * TWO_PI) / statuses.length
    const sx = node.x + Math.cos(angle) * orbitR
    const sy = node.y + Math.sin(angle) * orbitR

    const emoji = STATUS_EMOJI[statuses[i]]
    const indicatorR = 7

    // Dark circle background
    ctx.beginPath()
    ctx.arc(sx, sy, indicatorR, 0, TWO_PI)
    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Emoji
    ctx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, sx, sy + 1)
  }
}
