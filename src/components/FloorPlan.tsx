import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../store'
import type { Table } from '../types'
import { isAlert, truncate } from '../utils'

interface Props {
  onSelectTable: (table: Table) => void
  walkInMode?: boolean
  onCancelWalkIn?: () => void
}

interface Transform {
  scale: number
  x: number
  y: number
}

const MIN_SCALE = 0.5
const MAX_SCALE = 4
const INITIAL: Transform = { scale: 1, x: 0, y: 0 }

export function FloorPlan({ onSelectTable, walkInMode = false, onCancelWalkIn }: Props) {
  const { floorPlan, groups, moveMode, cancelMoveMode } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>(INITIAL)
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const didDrag = useRef(false)

  const clampTransform = (t: Transform): Transform => {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale))
    return { scale: s, x: t.x, y: t.y }
  }

  const resetZoom = () => setTransform(INITIAL)

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = -e.deltaY * 0.001
    setTransform(prev => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * (1 + delta)))
      const ratio = newScale / prev.scale
      return clampTransform({
        scale: newScale,
        x: mx - ratio * (mx - prev.x),
        y: my - ratio * (my - prev.y),
      })
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ── Touch: pinch-to-zoom + drag-to-pan ───────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      lastPinchDist.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      lastPinchMid.current = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx: transform.x,
        ty: transform.y,
      }
      didDrag.current = false
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      const mid = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      }
      const container = containerRef.current
      if (!container || !lastPinchDist.current || !lastPinchMid.current) return
      const rect = container.getBoundingClientRect()
      const pinchX = mid.x - rect.left
      const pinchY = mid.y - rect.top
      const scaleFactor = dist / lastPinchDist.current
      setTransform(prev => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * scaleFactor))
        const ratio = newScale / prev.scale
        return clampTransform({
          scale: newScale,
          x: pinchX - ratio * (pinchX - prev.x),
          y: pinchY - ratio * (pinchY - prev.y),
        })
      })
      lastPinchDist.current = dist
      lastPinchMid.current = mid
    } else if (e.touches.length === 1 && dragStart.current) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true
      if (didDrag.current) {
        setTransform(prev => ({
          ...prev,
          x: dragStart.current!.tx + dx,
          y: dragStart.current!.ty + dy,
        }))
      }
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastPinchDist.current = null
      lastPinchMid.current = null
    }
    if (e.touches.length === 0) dragStart.current = null
  }

  // ── Mouse drag-to-pan ─────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
    didDrag.current = false
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true
    if (didDrag.current) {
      setTransform(prev => ({
        ...prev,
        x: dragStart.current!.tx + dx,
        y: dragStart.current!.ty + dy,
      }))
    }
  }

  const onMouseUp = () => { dragStart.current = null }

  // ── Table interaction (only fire if not dragging) ─────────────────────────
  const handleTableClick = (_e: React.MouseEvent | React.TouchEvent, table: Table) => {
    if (didDrag.current) return
    if (moveMode.active) {
      if (table.status === 'free') onSelectTable(table)
    } else if (walkInMode) {
      if (table.status === 'free') onSelectTable(table)
    } else {
      onSelectTable(table)
    }
  }

  // ── Colours ───────────────────────────────────────────────────────────────
  const getGroup = (groupId?: string) => groupId ? groups.find(g => g.id === groupId) : undefined

  const getTableColor = (table: Table) => {
    if (moveMode.active) {
      const sourceTable = floorPlan.tables.find(t => t.currentGroupId === moveMode.groupId)
      if (table.id === sourceTable?.id)
        return { bg: '#fbbf24', border: '#f59e0b', text: '#92400e' }
      if (table.status === 'free')
        return { bg: '#22c55e', border: '#16a34a', text: '#fff' }
      return { bg: '#d1d5db', border: '#9ca3af', text: '#9ca3af' }
    }
    if (walkInMode) {
      if (table.status === 'free')
        return { bg: '#22c55e', border: '#16a34a', text: '#fff' }
      return { bg: '#d1d5db', border: '#9ca3af', text: '#9ca3af' }
    }
    if (table.status === 'free') return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' }
    const group = getGroup(table.currentGroupId)
    if (group && isAlert(group.seatedAt))
      return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
    return { bg: '#dcfce7', border: '#22c55e', text: '#166534' }
  }

  const sections = [...new Set(floorPlan.tables.map(t => t.section).filter(Boolean))]

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {moveMode.active && (
        <div className="shrink-0 bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-10">
          <span>
            🔀 Moving{' '}
            <strong>{groups.find(g => g.id === moveMode.groupId)?.name}</strong>
            {' — tap a free table'}
          </span>
          <button
            onClick={cancelMoveMode}
            className="ml-4 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      )}
      {walkInMode && !moveMode.active && (
        <div className="shrink-0 bg-green-600 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-10">
          <span>➕ Walk-in — tap a free table to seat a party</span>
          <button
            onClick={onCancelWalkIn}
            className="ml-4 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => setTransform(p => clampTransform({ ...p, scale: p.scale * 1.25 }))}
          className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 active:scale-95"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setTransform(p => clampTransform({ ...p, scale: p.scale * 0.8 }))}
          className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 active:scale-95"
          aria-label="Zoom out"
        >−</button>
        {(transform.scale !== 1 || transform.x !== 0 || transform.y !== 0) && (
          <button
            onClick={resetZoom}
            className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-center hover:bg-gray-50 active:scale-95"
            aria-label="Reset zoom"
          >⌂</button>
        )}
      </div>

      {/* Zoom level indicator */}
      {transform.scale !== 1 && (
        <div className="absolute top-2 right-4 z-20 bg-black/40 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
          {Math.round(transform.scale * 100)}%
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: didDrag.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            willChange: 'transform',
          }}
        >
          <div className="absolute inset-0 p-4">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              style={{ touchAction: 'none' }}
            >
              {sections.includes('Bar') && (
                <>
                  <line x1="5" y1="68" x2="95" y2="68" stroke="#d1d5db" strokeWidth="0.3" strokeDasharray="1,1" />
                  <text x="50" y="71" textAnchor="middle" fontSize="2.5" fill="#9ca3af" fontWeight="600" fontFamily="system-ui">
                    ─── BAR AREA ───
                  </text>
                </>
              )}
              {floorPlan.tables.map(table => {
                const { bg, border, text } = getTableColor(table)
                const group = getGroup(table.currentGroupId)
                const { position: { x, y }, size: { w, h } } = table
                const isSource = moveMode.active && table.currentGroupId === moveMode.groupId
                const isAvailableInMove = moveMode.active && table.status === 'free'

                return (
                  <g
                    key={table.id}
                    onClick={(e) => handleTableClick(e as React.MouseEvent, table)}
                    style={{
                      cursor: moveMode.active && table.status !== 'free' && !isSource
                        ? 'default'
                        : 'pointer',
                    }}
                  >
                    <rect
                      x={x} y={y} width={w} height={h}
                      rx={table.shape === 'round' ? Math.min(w, h) / 2 : 2}
                      ry={table.shape === 'round' ? Math.min(w, h) / 2 : 2}
                      fill={bg}
                      stroke={border}
                      strokeWidth={isSource || isAvailableInMove ? 0.5 : 0.3}
                      style={{ transition: 'fill 0.3s, stroke 0.3s' }}
                    />
                    <text
                      x={x + w / 2} y={y + h * 0.28}
                      textAnchor="middle" fontSize="2.2" fontWeight="700"
                      fill={text} fontFamily="system-ui"
                    >
                      {table.number}
                    </text>
                    <text
                      x={x + w / 2} y={y + h * 0.55}
                      textAnchor="middle" fontSize="2"
                      fill={text} fontFamily="system-ui" fontWeight="500"
                    >
                      {group ? truncate(group.name, 10) : (isAvailableInMove ? '✓ FREE' : 'FREE')}
                    </text>
                    {group && (
                      <text
                        x={x + w / 2} y={y + h * 0.82}
                        textAnchor="middle" fontSize="1.8"
                        fill={text} fontFamily="system-ui"
                      >
                        {'●'.repeat(Math.min(group.covers, 5))}{group.covers > 5 ? '+' : ''}
                        {group.note ? ' 📝' : ''}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
