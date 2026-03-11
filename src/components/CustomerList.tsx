import { useStore } from '../store'
import type { Group } from '../types'
import { formatTime, isAlert } from '../utils'
import { CoverDots } from './CoverDots'

interface Props {
  onSelectGroup: (group: Group) => void
  onAddWalkIn: () => void
}

export function CustomerList({ onSelectGroup, onAddWalkIn }: Props) {
  const { groups, floorPlan } = useStore()
  const seated = [...groups]
    .filter(g => g.status === 'seated')
    .sort((a, b) => a.seatedAt - b.seatedAt)

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Seated ({seated.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {seated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <span className="text-4xl mb-3">🍽</span>
            <p className="text-sm">No parties seated yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {seated.map(group => {
              const table = floorPlan.tables.find(t => t.id === group.tableId)
              const alert = isAlert(group.seatedAt)
              return (
                <li
                  key={group.id}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[64px]"
                  onClick={() => onSelectGroup(group)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">{group.name}</span>
                        {group.note && <span className="text-xs">📝</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CoverDots covers={group.covers} className={alert ? 'text-amber-500' : 'text-gray-400'} />
                        <span className={`text-xs ${alert ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          {formatTime(group.seatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className={`shrink-0 px-2 py-1 rounded text-xs font-bold ${alert ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {table?.number ?? '?'}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="shrink-0 p-4 border-t border-gray-200 bg-white">
        <button
          onClick={onAddWalkIn}
          className="w-full py-3 rounded-xl bg-[#1a1a2e] text-white font-semibold text-sm hover:bg-[#2a2a4e] active:scale-95 transition-all"
        >
          + Add Walk-in
        </button>
      </div>
    </div>
  )
}
