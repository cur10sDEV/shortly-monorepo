interface Props {
  className?: string
  label?: string
}

export function Skeleton({ className = '', label }: Props) {
  return <div role="status" aria-label={label ?? 'loading'} className={`rounded-lg shimmer ${className}`} />
}
