import { useState } from 'react'
import { useStore } from '../store'
import type { Group } from '../types'
import { formatTime, formatDuration, isAlert } from '../utils'
import { NoteModal } from './NoteModal'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  group: Group
  onClose: () => void
}

export function GroupDetailSheet({ group, onClose }: Props) {
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const { floorPlan, markAsLeft, startMoveMode, groups } = useStore()
  // Re-read group from store to get latest data (avoid stale closures)
  const liveGroup = groups.find(g => g.id === group.id) ?? group
  const table = floorPlan.tables.find(t => t.id === liveGroup.tableId)
  const alert = isAlert(liveGroup.seatedAt)

  const handleMoveTable = () => {
    startMoveMode(liveGroup.id)
    onClose()
  }

  const handleMarkAsLeft = () => {
    markAsLeft(liveGroup.id)
    setShowLeaveConfirm(false)
    onClose()
  }

  return (
    <>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className={`rounded-xl p-4 text-center ${alert ? 'bg-amber-50 border border-amber-200' : 'bg-[#1a1a2e]'}`}>
          <div className={`text-xl font-bold ${alert ? 'text-amber-800' : 'text-white'}`}>
            {liveGroup.name} · {table?.number} · {liveGroup.covers} covers
          </div>
          <div className={`text-sm mt-1 ${alert ? 'text-amber-600' : 'text-blue-200'}`}>
            Seated {formatTime(liveGroup.seatedAt)} ({formatDuration(liveGroup.seatedAt)} ago)
            {alert && ' ⚠ Long stay'}
          </div>
        </div>

        {/* Note display */}
        {liveGroup.note && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-yellow-700 mb-1">📝 Note</div>
                <p className="text-sm text-gray-800">{liveGroup.note}</p>
              </div>
              <button
                onClick={() => setShowNoteModal(true)}
                className="text-xs text-yellow-600 font-medium hover:text-yellow-800 shrink-0 py-1"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <button
          onClick={handleMoveTable}
          className="w-full py-4 rounded-xl border-2 border-[#1a1a2e] text-[#1a1a2e] font-semibold text-sm hover:bg-[#1a1a2e] hover:text-white active:scale-95 transition-all"
        >
          ↔ Move Table
        </button>

        <button
          onClick={() => setShowNoteModal(true)}
          className="w-full py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 active:scale-95 transition-all"
        >
          📝 {liveGroup.note ? 'Edit Note' : 'Add Note'}
        </button>

        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full py-4 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-95 transition-all"
        >
          ✕ Mark as Left
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-gray-500 text-sm hover:bg-gray-100 transition-colors"
        >
          Close
        </button>
      </div>

      {showNoteModal && (
        <NoteModal
          group={liveGroup}
          onClose={() => setShowNoteModal(false)}
        />
      )}

      {showLeaveConfirm && (
        <ConfirmDialog
          title="Mark as Left?"
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={handleMarkAsLeft}
          confirmLabel="✕ Confirm"
          confirmClassName="bg-red-500 hover:bg-red-600 text-white"
        >
          <div className="space-y-2 text-sm text-gray-700">
            <div><span className="font-medium">Party:</span> {liveGroup.name}</div>
            <div><span className="font-medium">Table:</span> {table?.number}</div>
            <div><span className="font-medium">Seated:</span> {formatTime(liveGroup.seatedAt)} ({formatDuration(liveGroup.seatedAt)})</div>
            <div><span className="font-medium">Covers:</span> {liveGroup.covers}</div>
            <div className="mt-3 text-green-700 font-medium">Table {table?.number} will return to ✓ Available</div>
          </div>
        </ConfirmDialog>
      )}
    </>
  )
}
