import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Table, TableShape } from '../types'
import { computeSectionDividers } from '../utils'
import { TableSettingsPanel } from './TableSettingsPanel'

interface Props {
  tables: Table[]
  onTablesChange: (tables: Table[]) => void
}

interface Transform {
  scale: number
  x: number
  y: number
}

interface DragState {
  tableId: string
  startClientX: number
  startClientY: number
  startTableX: number
  startTableY: number
  tableW: number
  tableH: number
  hasMoved: boolean
}

interface PanState {
  startClientX: number
  startClientY: number
  startTx: number
  startTy: number
  hasMoved: boolean
}

const MIN_SCALE = 0.5
const MAX_SCALE = 4
const INITIAL: Transform = { scale: 1, x: 0, y: 0 }

function findOverlaps(tables: Table[]): Set<string> {
  const overlapping = new Set<string>()
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const a = tables[i], b = tables[j]
      if (
        a.position.x < b.position.x + b.size.w &&
        a.position.x + a.size.w > b.position.x &&
        a.position.y < b.position.y + b.size.h &&
        a.position.y + a.size.h > b.position.y
      ) {
        overlapping.add(a.id)
        overlapping.add(b.id)
      }
    }
  }
  return overlapping
}

function getNextTableNumber(tables: Table[]): string {
  const nums = tables.map(t => {
    const m = t.number.match(/\d+$/)
    return m ? parseInt(m[0]) : 0
  })
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `T${max + 1}`
}

function getMostCommonSection(tables: Table[]): string {
  const counts = new Map<string, number>()
  for (const t of tables) {
    if (t.section) counts.set(t.section, (counts.get(t.section) ?? 0) + 1)
  }
  if (counts.size === 0) return 'Main'
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export function FloorPlanEditor({ tables: initialTables, onTablesChange }: Props) {
  const [localTables, setLocalTables] = useState<Table[]>(initialTables)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [transform, setTransform] = useState<Transform>(INITIAL)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const lastPinchDist = useRef<number | null>(null)
  const localTablesRef = useRef(localTables)

  // Keep ref in sync with state (used by global event handlers)
  useEffect(() => { localTablesRef.current = localTables }, [localTables])

  const clampTransform = useCallback((t: Transform): Transform => ({
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale)),
    x: t.x,
    y: t.y,
  }), [])

  // Convert client position to SVG coordinate (0–100)
  const toSVGCoords = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    return {
      x: (clientX - rect.left) * 100 / rect.width,
      y: (clientY - rect.top) * 100 / rect.height,
    }
  }, [])

  // Find the topmost table at an SVG coordinate
  const getTableAt = useCallback((svgX: number, svgY: number): Table | undefined => {
    const tables = localTablesRef.current
    // Reverse so last-rendered (top) is found first
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i]
      if (
        svgX >= t.position.x && svgX <= t.position.x + t.size.w &&
        svgY >= t.position.y && svgY <= t.position.y + t.size.h
      ) return t
    }
    return undefined
  }, [])

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
      return {
        scale: newScale,
        x: mx - ratio * (mx - prev.x),
        y: my - ratio * (my - prev.y),
      }
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ── Global drag handlers (active while isDragging) ────────────────────────
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const drag = dragRef.current
      if (!drag) return

      let clientX: number, clientY: number
      if ('touches' in e) {
        if (e.touches.length === 0) return
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = (e as MouseEvent).clientX
        clientY = (e as MouseEvent).clientY
      }

      const dx = clientX - drag.startClientX
      const dy = clientY - drag.startClientY
      if (!drag.hasMoved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return

      drag.hasMoved = true
      e.preventDefault()

      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect || svgRect.width === 0) return

      const dxSvg = dx * 100 / svgRect.width
      const dySvg = dy * 100 / svgRect.height

      const newX = Math.max(0, Math.min(100 - drag.tableW, drag.startTableX + dxSvg))
      const newY = Math.max(0, Math.min(100 - drag.tableH, drag.startTableY + dySvg))

      setLocalTables(prev => prev.map(t =>
        t.id === drag.tableId ? { ...t, position: { x: newX, y: newY } } : t
      ))
    }

    const handleUp = () => {
      const drag = dragRef.current
      if (!drag) { setIsDragging(false); return }

      if (!drag.hasMoved) {
        // Tap: open settings panel
        setSelectedTableId(drag.tableId)
      } else {
        // Drag complete: commit to parent
        onTablesChange(localTablesRef.current)
      }
      dragRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, onTablesChange])

  // ── Pointer down: start table drag or pan ─────────────────────────────────
  const handlePointerDown = useCallback((clientX: number, clientY: number): boolean => {
    const svgPos = toSVGCoords(clientX, clientY)
    if (!svgPos) return false

    const table = getTableAt(svgPos.x, svgPos.y)
    if (table) {
      dragRef.current = {
        tableId: table.id,
        startClientX: clientX,
        startClientY: clientY,
        startTableX: table.position.x,
        startTableY: table.position.y,
        tableW: table.size.w,
        tableH: table.size.h,
        hasMoved: false,
      }
      setIsDragging(true)
      return true // table drag started
    }

    // Tap on empty space: deselect
    setSelectedTableId(null)
    return false // start pan
  }, [toSVGCoords, getTableAt])

  // ── Mouse events on container ─────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const startedTableDrag = handlePointerDown(e.clientX, e.clientY)
    if (!startedTableDrag) {
      panRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTx: transform.x,
        startTy: transform.y,
        hasMoved: false,
      }
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) return
    if (!panRef.current) return
    const dx = e.clientX - panRef.current.startClientX
    const dy = e.clientY - panRef.current.startClientY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panRef.current.hasMoved = true
    setTransform(prev => ({
      ...prev,
      x: panRef.current!.startTx + dx,
      y: panRef.current!.startTy + dy,
    }))
  }

  const onMouseUp = () => {
    panRef.current = null
  }

  // ── Touch events on container ─────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (isDragging) return
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      lastPinchDist.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      panRef.current = null
    } else if (e.touches.length === 1) {
      const touch = e.touches[0]
      const startedTableDrag = handlePointerDown(touch.clientX, touch.clientY)
      if (!startedTableDrag) {
        panRef.current = {
          startClientX: touch.clientX,
          startClientY: touch.clientY,
          startTx: transform.x,
          startTy: transform.y,
          hasMoved: false,
        }
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging) return
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      const mid = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
      const container = containerRef.current
      if (!container || !lastPinchDist.current) return
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
    } else if (e.touches.length === 1 && panRef.current) {
      const touch = e.touches[0]
      const dx = touch.clientX - panRef.current.startClientX
      const dy = touch.clientY - panRef.current.startClientY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panRef.current.hasMoved = true
      setTransform(prev => ({
        ...prev,
        x: panRef.current!.startTx + dx,
        y: panRef.current!.startTy + dy,
      }))
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) lastPinchDist.current = null
    if (e.touches.length === 0) panRef.current = null
  }

  // ── Add table ─────────────────────────────────────────────────────────────
  const handleAddTable = () => {
    const nextNum = getNextTableNumber(localTables)
    const mostCommonSection = getMostCommonSection(localTables)
    const newTable: Table = {
      id: uuidv4(),
      number: nextNum,
      capacity: 4,
      shape: 'square' as TableShape,
      position: { x: 41, y: 41 },
      size: { w: 18, h: 12 },
      section: mostCommonSection,
      status: 'free',
    }
    const updated = [...localTables, newTable]
    setLocalTables(updated)
    onTablesChange(updated)
    setSelectedTableId(newTable.id)
  }

  // ── Settings save ─────────────────────────────────────────────────────────
  const handleSettingsSave = (
    tableId: string,
    updates: Partial<Table>,
    renameSection?: { from: string; to: string }
  ) => {
    let updated = localTables.map(t =>
      t.id === tableId ? { ...t, ...updates } : t
    )
    if (renameSection) {
      updated = updated.map(t =>
        t.section === renameSection.from ? { ...t, section: renameSection.to } : t
      )
    }
    setLocalTables(updated)
    onTablesChange(updated)
    setSelectedTableId(null)
  }

  // ── Delete table ──────────────────────────────────────────────────────────
  const handleDeleteTable = (tableId: string) => {
    const updated = localTables.filter(t => t.id !== tableId)
    setLocalTables(updated)
    onTablesChange(updated)
    setSelectedTableId(null)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const overlapping = findOverlaps(localTables)
  const sectionDividers = computeSectionDividers(localTables)
  const allSections = [...new Set(localTables.map(t => t.section).filter(Boolean))] as string[]
  const sectionCounts: Record<string, number> = {}
  for (const t of localTables) {
    if (t.section) sectionCounts[t.section] = (sectionCounts[t.section] ?? 0) + 1
  }
  const selectedTable = selectedTableId ? localTables.find(t => t.id === selectedTableId) : undefined
  const currentDraggingId = isDragging ? dragRef.current?.tableId : undefined

  const resetZoom = () => setTransform(INITIAL)

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* Edit mode banner */}
      <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm z-10">
        <span className="text-amber-800 font-medium">
          ✏️ Layout Editor — drag tables to reposition
        </span>
        <button
          onClick={handleAddTable}
          className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 active:scale-95 transition-all"
        >
          + Add Table
        </button>
      </div>

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
        <div className="absolute top-12 right-4 z-20 bg-black/40 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
          {Math.round(transform.scale * 100)}%
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
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
              ref={svgRef}
              viewBox="0 0 100 100"
              className="w-full h-full"
              style={{ touchAction: 'none' }}
            >
              {/* Grid pattern */}
              <defs>
                <pattern id="editGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.25" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#editGrid)" />

              {/* Section dividers */}
              {sectionDividers.map(d => (
                <g key={d.label}>
                  <line
                    x1="5" y1={d.y} x2="95" y2={d.y}
                    stroke="#d1d5db" strokeWidth="0.3" strokeDasharray="1,1"
                  />
                  <text
                    x="50" y={d.y + 3}
                    textAnchor="middle" fontSize="2.5"
                    fill="#9ca3af" fontWeight="600" fontFamily="system-ui"
                  >
                    ─── {d.label.toUpperCase()} ───
                  </text>
                </g>
              ))}

              {/* Tables */}
              {localTables.map(table => {
                const isSelected = table.id === selectedTableId
                const isOverlapping = overlapping.has(table.id)
                const isDraggingThis = table.id === currentDraggingId
                const { x, y } = table.position
                const { w, h } = table.size
                const rx = table.shape === 'round' ? Math.min(w, h) / 2 : 2

                return (
                  <g
                    key={table.id}
                    style={{ cursor: isDraggingThis ? 'grabbing' : 'grab' }}
                  >
                    {/* Selection highlight ring */}
                    {isSelected && (
                      <rect
                        x={x - 1.5} y={y - 1.5}
                        width={w + 3} height={h + 3}
                        rx={rx + 1.5}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="0.8"
                      />
                    )}

                    {/* Table body */}
                    <rect
                      x={x} y={y} width={w} height={h}
                      rx={rx} ry={rx}
                      fill={isOverlapping ? '#fef9c3' : '#f3f4f6'}
                      stroke={isOverlapping ? '#ef4444' : isSelected ? '#f59e0b' : '#9ca3af'}
                      strokeWidth={isSelected || isOverlapping ? 0.6 : 0.4}
                      strokeDasharray="1.5,0.8"
                      style={{ transition: 'fill 0.15s, stroke 0.15s' }}
                    />

                    {/* Table number */}
                    <text
                      x={x + w / 2} y={y + h * 0.4}
                      textAnchor="middle" fontSize="2.8" fontWeight="700"
                      fill={isOverlapping ? '#b45309' : '#374151'}
                      fontFamily="system-ui"
                    >
                      {table.number}
                    </text>

                    {/* Capacity */}
                    <text
                      x={x + w / 2} y={y + h * 0.72}
                      textAnchor="middle" fontSize="1.8"
                      fill="#9ca3af" fontFamily="system-ui"
                    >
                      cap {table.capacity}
                    </text>

                    {/* Drag handle ⠿ in top-right corner */}
                    <text
                      x={x + w - 1} y={y + 3.5}
                      textAnchor="end" fontSize="2.2"
                      fill={isSelected ? '#f59e0b' : '#c4c4c4'}
                      fontFamily="system-ui"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      ⠿
                    </text>

                    {/* Overlap warning */}
                    {isOverlapping && (
                      <text
                        x={x + w / 2} y={y + h * 0.95}
                        textAnchor="middle" fontSize="1.6"
                        fill="#ef4444" fontFamily="system-ui" fontWeight="600"
                      >
                        ⚠ overlap
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Table settings panel */}
      {selectedTable && (
        <TableSettingsPanel
          table={selectedTable}
          allSections={allSections}
          sectionCounts={sectionCounts}
          onSave={handleSettingsSave}
          onDelete={handleDeleteTable}
          onClose={() => setSelectedTableId(null)}
        />
      )}
    </div>
  )
}
