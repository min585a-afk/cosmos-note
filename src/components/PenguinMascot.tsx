import { useRef, useEffect, useState } from 'react'

// 16x16 pixel art: penguin in spacesuit
// Colors: 0=transparent, 1=helmet(light blue), 2=visor(dark), 3=body(white), 4=belly(light gray), 5=feet(orange), 6=beak(orange), 7=eye(white), 8=suit trim(silver), 9=backpack(gray)
const PENGUIN_SPRITE = [
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

const COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#88ccff',  // helmet
  2: '#1a2040',  // visor
  3: '#e8e8f0',  // body
  4: '#c8c8d8',  // belly
  5: '#ff9933',  // feet
  6: '#ffaa44',  // beak
  7: '#ffffff',  // eye
  8: '#aabbcc',  // suit trim
  9: '#778899',  // backpack
}

export function PenguinMascot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = 2
    canvas.width = 16 * scale
    canvas.height = 16 * scale
    ctx.imageSmoothingEnabled = false

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = PENGUIN_SPRITE[y][x]
        if (c === 0) continue
        ctx.fillStyle = COLORS[c]
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }, [])

  const handleClick = () => {
    setBounce(true)
    setTimeout(() => setBounce(false), 500)
  }

  return (
    <div
      className="penguin-mascot"
      onClick={handleClick}
      title="Cosmo the Penguin"
      style={{
        transform: bounce ? 'scale(1.3) translateY(-4px)' : undefined,
      }}
    >
      <canvas ref={canvasRef} style={{ width: 32, height: 32 }} />
    </div>
  )
}
