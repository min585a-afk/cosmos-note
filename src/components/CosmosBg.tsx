import { useMemo } from 'react'

function generateStars(count: number, size: 'sm' | 'md' | 'lg') {
  return Array.from({ length: count }, (_, i) => {
    const x = Math.random() * 100
    const y = Math.random() * 100
    const shouldTwinkle = Math.random() > 0.6
    const duration = 2 + Math.random() * 4
    const delay = Math.random() * 5
    return (
      <div
        key={`${size}-${i}`}
        className={`star star--${size}${shouldTwinkle ? ' star--twinkle' : ''}`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          '--duration': `${duration}s`,
          '--delay': `${delay}s`,
        } as React.CSSProperties}
      />
    )
  })
}

export function CosmosBg() {
  const stars = useMemo(
    () => [
      ...generateStars(50, 'sm'),
      ...generateStars(20, 'md'),
      ...generateStars(10, 'lg'),
    ],
    []
  )

  return (
    <div className="cosmos-bg">
      <div className="stars-layer">{stars}</div>
      <div className="nebula nebula--1" />
      <div className="nebula nebula--2" />
      <div className="nebula nebula--3" />
    </div>
  )
}
