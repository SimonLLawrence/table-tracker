import type { Table } from './types'

const VIEW_PAD = 10

export function computeViewBox(tables: Table[]): string {
  if (!tables.length) return `${-VIEW_PAD} ${-VIEW_PAD} ${100 + VIEW_PAD * 2} ${100 + VIEW_PAD * 2}`
  const minX = Math.min(...tables.map(t => t.position.x))
  const minY = Math.min(...tables.map(t => t.position.y))
  const maxX = Math.max(...tables.map(t => t.position.x + t.size.w))
  const maxY = Math.max(...tables.map(t => t.position.y + t.size.h))
  return `${minX - VIEW_PAD} ${minY - VIEW_PAD} ${maxX - minX + VIEW_PAD * 2} ${maxY - minY + VIEW_PAD * 2}`
}

export function computeSectionDividers(tables: Table[]): { y: number; label: string }[] {
  const sectionBounds = new Map<string, { minY: number; maxY: number }>()
  for (const t of tables) {
    if (!t.section) continue
    const b = sectionBounds.get(t.section)
    const top = t.position.y
    const bottom = t.position.y + t.size.h
    if (!b) sectionBounds.set(t.section, { minY: top, maxY: bottom })
    else { b.minY = Math.min(b.minY, top); b.maxY = Math.max(b.maxY, bottom) }
  }
  const sorted = [...sectionBounds.entries()].sort(
    (a, b) => (a[1].minY + a[1].maxY) / 2 - (b[1].minY + b[1].maxY) / 2
  )
  const dividers: { y: number; label: string }[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const divY = (sorted[i][1].maxY + sorted[i + 1][1].minY) / 2
    dividers.push({ y: divY, label: sorted[i + 1][0] })
  }
  return dividers
}

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
