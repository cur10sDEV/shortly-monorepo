interface Props {
  points: number[]
  width?: number
  height?: number
  label?: string
}

export function Sparkline({ points, width = 96, height = 28, label }: Props) {
  const max = Math.max(...points, 1)
  const stepX = points.length > 1 ? width / (points.length - 1) : width
  const coords = points.map((v, i) => {
    const x = (i * stepX).toFixed(1)
    const y = (height - 3 - (v / max) * (height - 6)).toFixed(1)
    return `${x},${y}`
  })
  const lastX = ((points.length - 1) * stepX).toFixed(1)
  const lastY = (height - 3 - (points[points.length - 1] / max) * (height - 6)).toFixed(1)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? 'click trend'}
      className="shrink-0"
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="var(--paper-teal)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="var(--paper-teal)" />
    </svg>
  )
}
