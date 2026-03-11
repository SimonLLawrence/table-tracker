import { useState } from 'react'
import { useStore } from '../store'
import type { Table } from '../types'

interface Props {
  table: Table
  onClose: () => void
}

export function SeatPartySheet({ table, onClose }: Props) {
  const defaultName = `Table ${table.number.replace(/^T/, '')}`
  const [name, setName] = useState(defaultName)
  const [isPrefilled, setIsPrefilled] = useState(true)
  const [covers, setCovers] = useState(2)
  const [note, setNote] = useState('')
  const seatGroup = useStore(s => s.seatGroup)

  const handleSeat = () => {
    if (!name.trim()) return
    seatGroup(table.id, name.trim(), covers, note.trim())
    onClose()
  }

  const coverOptions = [1, 2, 3, 4, 5, 6]

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 text-center text-white">
        <div className="text-2xl font-bold">{table.number}</div>
        <div className="text-sm text-blue-200 mt-1">Seats up to {table.capacity}</div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Party name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value)
            setIsPrefilled(false)
          }}
          onKeyDown={e => {
            if (isPrefilled && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
              // First real character typed — clear the prefilled name
              setName(e.key)
              setIsPrefilled(false)
              e.preventDefault()
            } else if (e.key === 'Enter') {
              handleSeat()
            }
          }}
          onFocus={e => {
            // Select all on focus so user can see it's pre-filled and easily replace it
            if (isPrefilled) e.target.select()
          }}
          placeholder='e.g. "Johnson" or "Table of 3"'
          className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isPrefilled
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-900'
          }`}
          maxLength={40}
        />
      </div>

      {/* Covers */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Covers</label>
        <div className="flex gap-2 flex-wrap">
          {coverOptions.map(n => (
            <button
              key={n}
              onClick={() => setCovers(n)}
              className={`flex-1 min-w-[44px] py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                covers === n
                  ? 'bg-[#1a1a2e] border-[#1a1a2e] text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {n === 6 ? '6+' : n}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 200))}
          placeholder="Allergies, special requests…"
          rows={2}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="text-right text-xs text-gray-400 mt-1">{note.length}/200</div>
      </div>

      {/* Actions */}
      <button
        onClick={handleSeat}
        disabled={!name.trim()}
        className="w-full py-4 rounded-xl bg-green-500 text-white font-bold text-base hover:bg-green-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ✓ Seat Party
      </button>
      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl text-gray-500 text-sm hover:bg-gray-100 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
