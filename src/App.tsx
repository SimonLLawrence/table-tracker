import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { CustomerList } from './components/CustomerList'
import { FloorPlan } from './components/FloorPlan'
import { FloorPlanEditor } from './components/FloorPlanEditor'
import { BottomSheet } from './components/BottomSheet'
import { SeatPartySheet } from './components/SeatPartySheet'
import { GroupDetailSheet } from './components/GroupDetailSheet'
import { MoveConfirmDialog } from './components/MoveConfirmDialog'
import { Toast } from './components/Toast'
import { useStore } from './store'
import type { Group, Table } from './types'

type ActiveSheet =
  | { type: 'seat'; table: Table }
  | { type: 'group'; group: Group }
  | null

type MobileTab = 'guests' | 'floor'

export default function App() {
  const [sheet, setSheet] = useState<ActiveSheet>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('guests')
  const [moveDest, setMoveDest] = useState<Table | null>(null)
  const [walkInMode, setWalkInMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draftTables, setDraftTables] = useState<Table[]>([])
  const { groups, moveMode, floorPlan, saveFloorPlan, showToast } = useStore()

  // Clear moveDest when moveMode becomes inactive
  useEffect(() => {
    if (!moveMode.active) setMoveDest(null)
  }, [moveMode.active])

  // Exit walk-in mode if a sheet opens or move mode activates
  useEffect(() => {
    if (sheet || moveMode.active) setWalkInMode(false)
  }, [sheet, moveMode.active])

  const enterEditMode = () => {
    setDraftTables(floorPlan.tables.map(t => ({ ...t })))
    setEditMode(true)
    setWalkInMode(false)
    setSheet(null)
  }

  const saveLayout = () => {
    saveFloorPlan({ ...floorPlan, tables: draftTables })
    setEditMode(false)
    setDraftTables([])
    showToast('Layout saved')
  }

  const cancelLayout = () => {
    setEditMode(false)
    setDraftTables([])
  }

  const handleDraftTablesChange = useCallback((tables: Table[]) => {
    setDraftTables(tables)
  }, [])

  const handleTableClick = (table: Table) => {
    if (walkInMode) {
      if (table.status === 'free') {
        setWalkInMode(false)
        setSheet({ type: 'seat', table })
      }
      return
    }

    if (moveMode.active && moveMode.groupId) {
      if (table.status === 'free') setMoveDest(table)
      return
    }

    if (table.status === 'free') {
      setSheet({ type: 'seat', table })
    } else if (table.currentGroupId) {
      const group = groups.find(g => g.id === table.currentGroupId)
      if (group) setSheet({ type: 'group', group })
    }
  }

  const handleSelectGroup = (group: Group) => {
    setSheet({ type: 'group', group })
  }

  const handleAddWalkIn = () => {
    setWalkInMode(true)
    setMobileTab('floor')
  }

  const hasSeatedGroups = groups.some(g => g.status === 'seated')

  if (editMode) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 select-none">
        <Header
          editMode
          onSaveLayout={saveLayout}
          onCancelLayout={cancelLayout}
        />
        <div className="flex-1 overflow-hidden">
          <FloorPlanEditor
            tables={draftTables}
            onTablesChange={handleDraftTablesChange}
          />
        </div>
        <Toast />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 select-none">
      <Header
        hasSeatedGroups={hasSeatedGroups}
        onEditLayout={enterEditMode}
      />

      {/* Tablet layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-[30%] min-w-[260px] max-w-[320px] border-r border-gray-200 overflow-hidden flex flex-col">
          <CustomerList
            onSelectGroup={handleSelectGroup}
            onAddWalkIn={handleAddWalkIn}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <FloorPlan
            onSelectTable={handleTableClick}
            walkInMode={walkInMode}
            onCancelWalkIn={() => setWalkInMode(false)}
          />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        {/* Tab bar — top, always visible */}
        <div className="shrink-0 flex border-b border-gray-200 bg-white z-10">
          <button
            onClick={() => setMobileTab('guests')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'guests'
                ? 'text-[#1a1a2e] border-b-2 border-[#1a1a2e]'
                : 'text-gray-400'
            }`}
          >
            👥 Guests
          </button>
          <button
            onClick={() => setMobileTab('floor')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'floor'
                ? 'text-[#1a1a2e] border-b-2 border-[#1a1a2e]'
                : 'text-gray-400'
            }`}
          >
            🗺 Floor
          </button>
        </div>
        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'guests' ? (
            <CustomerList
              onSelectGroup={handleSelectGroup}
              onAddWalkIn={handleAddWalkIn}
            />
          ) : (
            <FloorPlan
              onSelectTable={handleTableClick}
              walkInMode={walkInMode}
              onCancelWalkIn={() => setWalkInMode(false)}
            />
          )}
        </div>
      </div>

      {/* Bottom sheets */}
      <BottomSheet open={sheet?.type === 'seat'} onClose={() => setSheet(null)}>
        {sheet?.type === 'seat' && (
          <SeatPartySheet table={sheet.table} onClose={() => setSheet(null)} />
        )}
      </BottomSheet>

      <BottomSheet open={sheet?.type === 'group'} onClose={() => setSheet(null)}>
        {sheet?.type === 'group' && (
          <GroupDetailSheet group={sheet.group} onClose={() => setSheet(null)} />
        )}
      </BottomSheet>

      {/* Move confirm dialog */}
      {moveMode.active && moveMode.groupId && moveDest && (
        <MoveConfirmDialog
          groupId={moveMode.groupId}
          destTable={moveDest}
          onCancel={() => setMoveDest(null)}
        />
      )}

      <Toast />
    </div>
  )
}
