export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(seatedAt: number): string {
  const mins = Math.floor((Date.now() - seatedAt) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function isAlert(seatedAt: number): boolean {
  return Date.now() - seatedAt > 90 * 60 * 1000
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function coverDots(covers: number): string {
  if (covers <= 6) return '●'.repeat(covers)
  return '●'.repeat(6) + ` +${covers - 6}`
}
