import { useState } from 'react'
import { useStore } from '../store'
import type { Group } from '../types'

interface Props {
  group: Group
  onClose: () => void
}

export function NoteModal({ group, onClose }: Props) {
  const [text, setText] = useState(group.note)
  const updateNote = useStore(s => s.updateNote)

  const handleSave = () => {
    updateNote(group.id, text.trim())
    onClose()
  }

  const handleClear = () => {
    updateNote(group.id, '')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-900">📝 Note for {group.name}</h3>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value.slice(0, 200))}
          placeholder="Nut allergy, birthday, waiting for one more…"
          rows={4}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="text-right text-xs text-gray-400 -mt-2">{text.length}/200</div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#2a2a4e] active:scale-95 transition-all"
          >
            💾 Save
          </button>
        </div>
        {group.note && (
          <button
            onClick={handleClear}
            className="w-full py-3 rounded-xl text-red-500 text-sm hover:bg-red-50 transition-colors"
          >
            🗑 Clear note
          </button>
        )}
      </div>
    </div>
  )
}
