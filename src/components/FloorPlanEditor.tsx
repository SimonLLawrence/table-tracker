import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Table, TableShape } from '../types'
import { computeSectionDividers, computeViewBox } from '../utils'
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

// Extra padding used when converting client → SVG coords; must match computeViewBox's VIEW_PAD
const COORD_PAD = 10

const MIN_SCALE = 0.4
const MAX_SCALE = 5
const INITIAL: Transform = { scale: 1, x: 0, y: 0 }

interface DragState {
  kind: 'table'
  tableId: string
  startClientX: number
  startClientY: number
  startTableX: number
  startTableY: number
  tableW: number
  tableH: number
  moved: boolean
}

interface PanState {
  kind: 'pan'
  startClientX: number
  startClientY: number
  startTx: number
  startTy: number
}

type PointerState = DragState | PanState | null

function findOverlaps(tables: Table[]): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const a = tables[i], b = tables[j]
      if (
        a.position.x < b.position.x + b.size.w &&
        a.position.x + a.size.w > b.position.x &&
        a.position.y < b.position.y + b.size.h &&
        a.position.y + a.size.h > b.position.y
      ) { out.add(a.id); out.add(b.id) }
    }
  }
  return out
}

function nextTableNumber(tables: Table[]): string {
  const nums = tables.map(t => { const m = t.number.match(/\d+$/); return m ? parseInt(m[0]) : 0 })
  return `T${(nums.length ? Math.max(...nums) : 0) + 1}`
}

function commonSection(tables: Table[]): string {
  const c = new Map<string, number>()
  for (const t of tables) if (t.section) c.set(t.section, (c.get(t.section) ?? 0) + 1)
  return c.size === 0 ? 'Main' : [...c.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export function FloorPlanEditor({ tables: initialTables, onTablesChange }: Props) {
  const [localTables, setLocalTables] = useState<Table[]>(initialTables)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [transform, setTransform] = useState<Transform>(INITIAL)

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointerRef = useRef<PointerState>(null)
  const lastPinchDist = useRef<number | null>(null)
  const tablesRef = useRef(localTables)
  const selectedIdRef = useRef<string | null>(null)
  const setSelectedIdRef = useRef(setSelectedId)

  useEffect(() => { tablesRef.current = localTables }, [localTables])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  const clamp = (t: Transform): Transform => ({
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale)),
    x: t.x, y: t.y,
  })

  // Convert client → SVG coords (getBoundingClientRect on the SVG accounts for zoom/pan)
  const toSVG = useCallback((clientX: number, clientY: number) => {
    const svgEl = svgRef.current
    if (!svgEl) return null
    const rect = svgEl.getBoundingClientRect()
    if (!rect.width) return null
    // Parse the current viewBox to get origin and size
    const vb = svgEl.viewBox.baseVal
    return {
      x: vb.x + (clientX - rect.left) * vb.width / rect.width,
      y: vb.y + (clientY - rect.top) * vb.height / rect.height,
    }
  }, [])

  const getTableAt = useCallback((svgX: number, svgY: number): Table | undefined => {
    const ts = tablesRef.current
    for (let i = ts.length - 1; i >= 0; i--) {
      const t = ts[i]
      if (svgX >= t.position.x && svgX <= t.position.x + t.size.w &&
          svgY >= t.position.y && svgY <= t.position.y + t.size.h) return t
    }
  }, [])

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setTransform(prev => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * (1 - e.deltaY * 0.001)))
      const ratio = newScale / prev.scale
      return clamp({ scale: newScale, x: mx - ratio * (mx - prev.x), y: my - ratio * (my - prev.y) })
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ── Always-on global move/up handlers (fixes fast-tap bug) ───────────────
  useEffect(() => {
    const getClient = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) {
        return e.touches.length > 0
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : ('changedTouches' in e && e.changedTouches.length > 0)
            ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
            : null
      }
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const ptr = pointerRef.current
      if (!ptr) return
      const client = getClient(e)
      if (!client) return

      if (ptr.kind === 'table') {
        const dx = client.x - ptr.startClientX
        const dy = client.y - ptr.startClientY
        if (!ptr.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
        ptr.moved = true
        e.preventDefault()

        const svgRect = svgRef.current?.getBoundingClientRect()
        if (!svgRect || svgRect.width === 0) return
        // Use the SVG's current viewBox size for accurate coordinate mapping
        const vb = svgRef.current?.viewBox.baseVal
        const vbW = vb?.width ?? 120
        const vbH = vb?.height ?? 120
        const dxSvg = dx * vbW / svgRect.width
        const dySvg = dy * vbH / svgRect.height

        // Allow tables to be placed in a generous area beyond the original 0-100 space
        const minX = -COORD_PAD * 3
        const minY = -COORD_PAD * 3
        const maxX = 100 + COORD_PAD * 3 - ptr.tableW
        const maxY = 100 + COORD_PAD * 3 - ptr.tableH

        const newX = Math.max(minX, Math.min(maxX, ptr.startTableX + dxSvg))
        const newY = Math.max(minY, Math.min(maxY, ptr.startTableY + dySvg))

        tablesRef.current = tablesRef.current.map(t =>
          t.id === ptr.tableId ? { ...t, position: { x: newX, y: newY } } : t
        )
        setLocalTables([...tablesRef.current])

      } else if (ptr.kind === 'pan') {
        const dx = client.x - ptr.startClientX
        const dy = client.y - ptr.startClientY
        setTransform(prev => ({ ...prev, x: ptr.startTx + dx, y: ptr.startTy + dy }))
      }
    }

    const handleUp = (_e: MouseEvent | TouchEvent) => {
      const ptr = pointerRef.current
      if (!ptr) return

      if (ptr.kind === 'table') {
        if (!ptr.moved) {
          // Pure tap — open settings
          setSelectedIdRef.current(ptr.tableId)
        } else {
          // Drag ended — commit
          onTablesChange(tablesRef.current)
        }
        setDraggingId(null)
      }

      pointerRef.current = null
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
  }, [onTablesChange])

  // ── Pointer down (mouse + touch) ──────────────────────────────────────────
  const handlePointerDown = useCallback((clientX: number, clientY: number, currentTransform: Transform) => {
    const svgPos = toSVG(clientX, clientY)
    if (!svgPos) return

    const table = getTableAt(svgPos.x, svgPos.y)
    if (table) {
      pointerRef.current = {
        kind: 'table',
        tableId: table.id,
        startClientX: clientX,
        startClientY: clientY,
        startTableX: table.position.x,
        startTableY: table.position.y,
        tableW: table.size.w,
        tableH: table.size.h,
        moved: false,
      }
      setDraggingId(table.id)
    } else {
      // Tap on empty canvas — deselect and start pan
      setSelectedId(null)
      pointerRef.current = {
        kind: 'pan',
        startClientX: clientX,
        startClientY: clientY,
        startTx: currentTransform.x,
        startTy: currentTransform.y,
      }
    }
  }, [toSVG, getTableAt])

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    handlePointerDown(e.clientX, e.clientY, transform)
  }

  // ── Touch events ──────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pointerRef.current = null
      const [a, b] = [e.touches[0], e.touches[1]]
      lastPinchDist.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
    } else if (e.touches.length === 1) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, transform)
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      const mid = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
      const el = containerRef.current
      if (!el || !lastPinchDist.current) return
      const rect = el.getBoundingClientRect()
      const px = mid.x - rect.left, py = mid.y - rect.top
      const factor = dist / lastPinchDist.current
      setTransform(prev => {
        const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
        const r = s / prev.scale
        return clamp({ scale: s, x: px - r * (px - prev.x), y: py - r * (py - prev.y) })
      })
      lastPinchDist.current = dist
    }
  }

  const onTouchEnd = (_e: React.TouchEvent) => {
    lastPinchDist.current = null
  }

  // ── Add table — placed at current viewport centre ─────────────────────────
  const handleAddTable = () => {
    // Find the SVG coordinate at the centre of the visible container
    const el = containerRef.current
    let cx = 41, cy = 41
    if (el) {
      const rect = el.getBoundingClientRect()
      const centre = toSVG(rect.left + rect.width / 2, rect.top + rect.height / 2)
      if (centre) { cx = centre.x - 9; cy = centre.y - 6 } // offset by half table size (18x12)
    }

    const newTable: Table = {
      id: uuidv4(),
      number: nextTableNumber(localTables),
      capacity: 4,
      shape: 'square' as TableShape,
      position: { x: cx, y: cy },
      size: { w: 18, h: 12 },
      section: commonSection(localTables),
      status: 'free',
    }
    const updated = [...localTables, newTable]
    tablesRef.current = updated
    setLocalTables(updated)
    onTablesChange(updated)
    setSelectedId(newTable.id)
  }

  // ── Settings handlers ─────────────────────────────────────────────────────
  const handleSettingsSave = (
    tableId: string,
    updates: Partial<Table>,
    renameSection?: { from: string; to: string }
  ) => {
    let updated = localTables.map(t => t.id === tableId ? { ...t, ...updates } : t)
    if (renameSection) {
      updated = updated.map(t => t.section === renameSection.from ? { ...t, section: renameSection.to } : t)
    }
    tablesRef.current = updated
    setLocalTables(updated)
    onTablesChange(updated)
    setSelectedId(null)
  }

  const handleDeleteTable = (tableId: string) => {
    const updated = localTables.filter(t => t.id !== tableId)
    tablesRef.current = updated
    setLocalTables(updated)
    onTablesChange(updated)
    setSelectedId(null)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const overlapping = findOverlaps(localTables)
  const sectionDividers = computeSectionDividers(localTables)
  const viewBox = computeViewBox(localTables)
  const allSections = [...new Set(localTables.map(t => t.section).filter(Boolean))] as string[]
  const sectionCounts: Record<string, number> = {}
  for (const t of localTables) if (t.section) sectionCounts[t.section] = (sectionCounts[t.section] ?? 0) + 1
  const selectedTable = selectedId ? localTables.find(t => t.id === selectedId) : undefined

  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* Banner */}
      <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm z-10">
        <span className="text-amber-800 font-medium">
          ✏️ Layout Editor — drag tables · tap to edit · pinch to zoom
        </span>
        <button
          onClick={handleAddTable}
          className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 active:scale-95 transition-all"
        >
          + Add Table
        </button>
      </div>

      {/* Zoom buttons */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <button onClick={() => setTransform(p => clamp({ ...p, scale: p.scale * 1.25 }))}
          className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 active:scale-95">+</button>
        <button onClick={() => setTransform(p => clamp({ ...p, scale: p.scale * 0.8 }))}
          className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 text-xl font-bold text-gray-700 flex items-center justify-center hover:bg-gray-50 active:scale-95">−</button>
        {(transform.scale !== 1 || transform.x !== 0 || transform.y !== 0) && (
          <button onClick={() => setTransform(INITIAL)}
            className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-center hover:bg-gray-50 active:scale-95">⌂</button>
        )}
      </div>

      {transform.scale !== 1 && (
        <div className="absolute top-12 right-4 z-20 bg-black/40 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
          {Math.round(transform.scale * 100)}%
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: pointerRef.current?.kind === 'table' ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          willChange: 'transform',
        }}>
          <div className="absolute inset-0 p-2">
            <svg
              ref={svgRef}
              viewBox={viewBox}
              className="w-full h-full"
              style={{ touchAction: 'none' }}
            >
              {/* Grid — rendered behind everything using a large rect */}
              <defs>
                <pattern id="editGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.3" />
                </pattern>
              </defs>
              {/* Large grid background — always covers the visible area */}
              <rect x="-500" y="-500" width="1000" height="1000" fill="url(#editGrid)" />

              {/* Section dividers */}
              {sectionDividers.map(d => (
                <g key={d.label}>
                  <line x1="0" y1={d.y} x2="100" y2={d.y}
                    stroke="#d1d5db" strokeWidth="0.3" strokeDasharray="1,1" />
                  <text x="50" y={d.y + 3.5}
                    textAnchor="middle" fontSize="2.5" fill="#9ca3af" fontWeight="600" fontFamily="system-ui">
                    ─── {d.label.toUpperCase()} ───
                  </text>
                </g>
              ))}

              {/* Tables */}
              {localTables.map(table => {
                const isSelected = table.id === selectedId
                const isDragging = table.id === draggingId
                const isOver = overlapping.has(table.id)
                const { x, y } = table.position
                const { w, h } = table.size
                const rx = table.shape === 'round' ? Math.min(w, h) / 2 : 2

                // Colour scheme:
                // dragging → blue (being moved)
                // selected → amber (settings open)
                // overlap  → red/yellow warning
                // default  → grey
                const fillColor = isDragging
                  ? '#dbeafe'
                  : isOver
                    ? '#fef9c3'
                    : isSelected
                      ? '#fef3c7'
                      : '#f3f4f6'
                const strokeColor = isDragging
                  ? '#3b82f6'
                  : isOver
                    ? '#ef4444'
                    : isSelected
                      ? '#f59e0b'
                      : '#9ca3af'
                const textColor = isDragging
                  ? '#1d4ed8'
                  : isOver
                    ? '#b45309'
                    : isSelected
                      ? '#92400e'
                      : '#374151'

                return (
                  <g key={table.id} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
                    {/* Glow ring while dragging */}
                    {isDragging && (
                      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4}
                        rx={rx + 2} fill="none" stroke="#93c5fd" strokeWidth="1.2" opacity="0.6" />
                    )}
                    {/* Selection ring */}
                    {(isSelected || isDragging) && (
                      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2}
                        rx={rx + 1} fill="none"
                        stroke={isDragging ? '#3b82f6' : '#f59e0b'}
                        strokeWidth="0.8" />
                    )}
                    <rect x={x} y={y} width={w} height={h} rx={rx} ry={rx}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isDragging || isSelected || isOver ? 0.6 : 0.4}
                      strokeDasharray={isDragging ? 'none' : '1.5,0.8'}
                      style={{ transition: isDragging ? 'none' : 'fill 0.15s, stroke 0.15s' }}
                    />
                    <text x={x + w / 2} y={y + h * 0.4}
                      textAnchor="middle" fontSize="2.8" fontWeight="700"
                      fill={textColor} fontFamily="system-ui"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {table.number}
                    </text>
                    <text x={x + w / 2} y={y + h * 0.72}
                      textAnchor="middle" fontSize="1.8" fill={isDragging ? '#3b82f6' : '#9ca3af'} fontFamily="system-ui"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {isDragging ? 'moving…' : `cap ${table.capacity}`}
                    </text>
                    <text x={x + w - 1} y={y + 3.5}
                      textAnchor="end" fontSize="2.2"
                      fill={isDragging ? '#3b82f6' : isSelected ? '#f59e0b' : '#c4c4c4'} fontFamily="system-ui"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      ⠿
                    </text>
                    {isOver && !isDragging && (
                      <text x={x + w / 2} y={y + h * 0.95}
                        textAnchor="middle" fontSize="1.6" fill="#ef4444"
                        fontFamily="system-ui" fontWeight="600"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
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
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
