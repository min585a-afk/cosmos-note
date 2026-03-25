import type { GraphNode } from '../types/graph'

// 16x16 pixel art: penguin in spacesuit
const SPRITE = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,8,8,8,1,1,1,0,0,0,0],
  [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
  [0,0,0,1,2,2,7,2,2,7,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  [0,0,0,1,2,2,2,6,6,2,2,2,1,0,0,0],
  [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
  [0,0,0,0,1,1,8,8,8,1,1,0,0,0,0,0],
  [0,0,9,8,3,3,3,3,3,3,3,3,8,9,0,0],
  [0,0,9,8,3,3,4,4,4,4,3,3,8,9,0,0],
  [0,0,0,3,3,4,4,4,4,4,4,3,3,0,0,0],
  [0,0,0,3,3,4,4,4,4,4,4,3,3,0,0,0],
  [0,0,3,3,3,3,4,4,4,4,3,3,3,3,0,0],
  [0,0,3,3,0,3,3,3,3,3,3,0,3,3,0,0],
  [0,0,0,0,0,5,5,0,0,5,5,0,0,0,0,0],
  [0,0,0,0,5,5,5,0,0,5,5,5,0,0,0,0],
]

// Flipped sprite for walking left
const SPRITE_FLIP = SPRITE.map(row => [...row].reverse())

const COLORS: Record<number, string> = {
  0: '', // transparent
  1: '#88ccff',
  2: '#1a2040',
  3: '#e8e8f0',
  4: '#c8c8d8',
  5: '#ff9933',
  6: '#ffaa44',
  7: '#ffffff',
  8: '#aabbcc',
  9: '#778899',
}

export interface PenguinState {
  x: number
  y: number
  targetX: number
  targetY: number
  targetNodeId: string | null
  speed: number
  facingLeft: boolean
  idle: boolean
  idleTimer: number
  bobPhase: number
}

export function createPenguinState(): PenguinState {
  return {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    targetNodeId: null,
    speed: 0.4,
    facingLeft: false,
    idle: true,
    idleTimer: 0,
    bobPhase: 0,
  }
}

export function updatePenguin(penguin: PenguinState, nodes: GraphNode[], time: number) {
  // Pick a new target when idle for long enough
  if (penguin.idle) {
    penguin.idleTimer += 16 // ~60fps
    if (penguin.idleTimer > 3000 + Math.random() * 4000) {
      // Pick random node to walk to
      if (nodes.length > 0) {
        const target = nodes[Math.floor(Math.random() * nodes.length)]
        penguin.targetX = target.x + (Math.random() - 0.5) * 30
        penguin.targetY = target.y + 15 + Math.random() * 10
        penguin.targetNodeId = target.id
        penguin.idle = false
        penguin.idleTimer = 0
      }
    }
  } else {
    // Walk toward target
    const dx = penguin.targetX - penguin.x
    const dy = penguin.targetY - penguin.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 2) {
      penguin.idle = true
      penguin.idleTimer = 0
    } else {
      const step = Math.min(penguin.speed, dist)
      penguin.x += (dx / dist) * step
      penguin.y += (dy / dist) * step
      penguin.facingLeft = dx < 0
    }
  }

  // Bob animation
  penguin.bobPhase = time * 0.003
}

export function drawPenguin(ctx: CanvasRenderingContext2D, penguin: PenguinState) {
  const sprite = penguin.facingLeft ? SPRITE_FLIP : SPRITE
  const pixelSize = 1 // 1 world unit per pixel = 16x16 world units total
  const bobY = penguin.idle ? Math.sin(penguin.bobPhase) * 0.5 : Math.sin(penguin.bobPhase * 3) * 1

  const ox = penguin.x - 8 * pixelSize
  const oy = penguin.y - 16 * pixelSize + bobY

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const c = sprite[y][x]
      if (c === 0) continue
      ctx.fillStyle = COLORS[c]
      ctx.fillRect(ox + x * pixelSize, oy + y * pixelSize, pixelSize, pixelSize)
    }
  }

  // Small shadow
  ctx.beginPath()
  ctx.ellipse(penguin.x, penguin.y + 1, 5, 1.5, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.fill()
}
