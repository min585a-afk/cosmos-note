import type { Viewport } from '../types/graph'

export function worldToScreen(wx: number, wy: number, vp: Viewport): { x: number; y: number } {
  return {
    x: wx * vp.scale + vp.x,
    y: wy * vp.scale + vp.y,
  }
}

export function screenToWorld(sx: number, sy: number, vp: Viewport): { x: number; y: number } {
  return {
    x: (sx - vp.x) / vp.scale,
    y: (sy - vp.y) / vp.scale,
  }
}

export function applyViewport(ctx: CanvasRenderingContext2D, vp: Viewport) {
  ctx.setTransform(vp.scale, 0, 0, vp.scale, vp.x, vp.y)
}
