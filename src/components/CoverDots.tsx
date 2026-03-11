interface Props {
  covers: number
  className?: string
}

export function CoverDots({ covers, className = '' }: Props) {
  const dots = Math.min(covers, 6)
  const extra = covers > 6 ? covers - 6 : 0
  return (
    <span className={`text-xs select-none ${className}`}>
      {'●'.repeat(dots)}{extra > 0 ? ` +${extra}` : ''}
    </span>
  )
}
