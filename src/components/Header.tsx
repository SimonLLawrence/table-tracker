import { useEffect, useState } from 'react'

interface Props {
  editMode?: boolean
  hasSeatedGroups?: boolean
  onEditLayout?: () => void
  onSaveLayout?: () => void
  onCancelLayout?: () => void
}

export function Header({ editMode, hasSeatedGroups, onEditLayout, onSaveLayout, onCancelLayout }: Props) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (editMode) {
    return (
      <header className="bg-amber-800 text-white flex items-center justify-between px-4 py-3 shrink-0">
        <span className="font-bold text-lg tracking-tight">✏️ Editing Layout</span>
        <div className="flex gap-2">
          <button
            onClick={onCancelLayout}
            className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSaveLayout}
            className="px-3 py-1.5 rounded-lg bg-white text-amber-900 hover:bg-amber-50 text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-[#1a1a2e] text-white flex items-center justify-between px-4 py-3 shrink-0">
      <span className="font-bold text-lg tracking-tight">🍽 Table Tracker</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-blue-200 font-medium">
          {time.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          {' · '}
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={onEditLayout}
          title={hasSeatedGroups ? 'Guests are seated — layout can still be edited' : 'Edit Layout'}
          className="relative p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Edit Layout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {hasSeatedGroups && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
          )}
        </button>
      </div>
    </header>
  )
}
