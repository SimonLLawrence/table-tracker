import { useState } from 'react'
import type { Table, TableShape } from '../types'

interface Props {
  table: Table
  allSections: string[]
  sectionCounts: Record<string, number>
  onSave: (tableId: string, updates: Partial<Table>, renameSection?: { from: string; to: string }) => void
  onDelete: (tableId: string) => void
  onClose: () => void
}

export function TableSettingsPanel({ table, allSections, sectionCounts, onSave, onDelete, onClose }: Props) {
  const [number, setNumber] = useState(table.number)
  const [capacity, setCapacity] = useState(table.capacity)
  const [shape, setShape] = useState<TableShape>(table.shape)
  const [section, setSection] = useState(table.section ?? '')
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionInput, setNewSectionInput] = useState('')
  const [renameAll, setRenameAll] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const originalSection = table.section ?? ''
  const activeSection = showNewSection ? newSectionInput.trim() : section
  const sectionChanged = activeSection !== originalSection && activeSection !== ''
  const otherTablesInOldSection = originalSection ? (sectionCounts[originalSection] ?? 0) - 1 : 0

  const handleSave = () => {
    const updates: Partial<Table> = {
      number: number.trim() || table.number,
      capacity,
      shape,
      section: activeSection || undefined,
    }
    const renameSection = renameAll && sectionChanged && originalSection
      ? { from: originalSection, to: activeSection }
      : undefined
    onSave(table.id, updates, renameSection)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 shrink-0 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Table Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-sm"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Number / Label */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Table Number / Label
            </label>
            <input
              value={number}
              onChange={e => setNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g. T1, Bar 2"
            />
          </div>

          {/* Capacity stepper */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCapacity(c => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-xl font-bold text-gray-700 flex items-center justify-center transition-all"
              >
                −
              </button>
              <span className="text-2xl font-bold text-gray-900 w-8 text-center">{capacity}</span>
              <button
                onClick={() => setCapacity(c => Math.min(20, c + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-xl font-bold text-gray-700 flex items-center justify-center transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* Shape toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Shape</label>
            <div className="flex gap-2">
              {(['square', 'round', 'rectangle'] as TableShape[]).map(s => (
                <button
                  key={s}
                  onClick={() => setShape(s)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-colors ${
                    shape === s
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Section</label>
            {!showNewSection ? (
              <div className="space-y-2">
                <select
                  value={section}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setShowNewSection(true)
                      setNewSectionInput('')
                      setRenameAll(false)
                    } else {
                      setSection(e.target.value)
                      setRenameAll(false)
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {allSections.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__new__">+ Add new section…</option>
                </select>
                {sectionChanged && otherTablesInOldSection > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={renameAll}
                      onChange={e => setRenameAll(e.target.checked)}
                      className="rounded accent-amber-600"
                    />
                    Rename all &ldquo;{originalSection}&rdquo; tables to &ldquo;{section}&rdquo;?
                    <span className="text-gray-400">({otherTablesInOldSection} other)</span>
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newSectionInput}
                  onChange={e => setNewSectionInput(e.target.value)}
                  placeholder="New section name…"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={() => { setShowNewSection(false); setSection(table.section ?? '') }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Pick existing section
                </button>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-amber-700 text-white font-semibold hover:bg-amber-800 active:scale-95 transition-all"
          >
            Save Changes
          </button>

          {/* Delete */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl bg-white border border-red-300 text-red-600 font-semibold hover:bg-red-50 active:scale-95 transition-all"
            >
              Delete Table
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700 font-medium mb-3">
                Remove {table.number}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onDelete(table.id)}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Bottom padding for safe area */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
