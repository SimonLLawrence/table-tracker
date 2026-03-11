import { useStore } from '../store'
import type { Table } from '../types'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  groupId: string
  destTable: Table
  onCancel: () => void
}

export function MoveConfirmDialog({ groupId, destTable, onCancel }: Props) {
  const { groups, moveGroup } = useStore()
  const group = groups.find(g => g.id === groupId)
  if (!group) return null

  const capacityWarning = destTable.capacity < group.covers

  const handleConfirm = () => {
    moveGroup(groupId, destTable.id)
    onCancel() // clears moveDest and closes dialog
  }

  return (
    <ConfirmDialog
      title={`Move ${group.name} to ${destTable.number}?`}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmLabel="✓ Confirm"
      confirmClassName="bg-green-500 hover:bg-green-600 text-white"
    >
      <div className="space-y-2 text-sm text-gray-700">
        <div>{destTable.number} is free · seats {destTable.capacity}</div>
        {capacityWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 font-medium">
            ⚠ Party has {group.covers} covers — table seats {destTable.capacity}
          </div>
        )}
      </div>
    </ConfirmDialog>
  )
}
