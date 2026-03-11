import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { AppState, Group } from './types'
import { DEFAULT_FLOOR_PLAN } from './defaultFloorPlan'

interface Store extends AppState {
  // Actions
  seatGroup: (tableId: string, name: string, covers: number, note: string) => void
  markAsLeft: (groupId: string) => void
  moveGroup: (groupId: string, newTableId: string) => void
  updateNote: (groupId: string, note: string) => void
  // UI state
  moveMode: { active: boolean; groupId: string | null }
  startMoveMode: (groupId: string) => void
  cancelMoveMode: () => void
  toast: { message: string; id: number } | null
  showToast: (message: string) => void
  dismissToast: () => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      floorPlan: DEFAULT_FLOOR_PLAN,
      groups: [],
      moveMode: { active: false, groupId: null },
      toast: null,

      seatGroup: (tableId, name, covers, note) => {
        const groupId = uuidv4()
        const group: Group = {
          id: groupId,
          name,
          covers,
          tableId,
          seatedAt: Date.now(),
          status: 'seated',
          note,
        }
        set(state => ({
          groups: [...state.groups, group],
          floorPlan: {
            ...state.floorPlan,
            tables: state.floorPlan.tables.map(t =>
              t.id === tableId
                ? { ...t, status: 'seated' as const, currentGroupId: groupId }
                : t
            ),
          },
        }))
      },

      markAsLeft: (groupId) => {
        const { groups, floorPlan } = get()
        const group = groups.find(g => g.id === groupId)
        if (!group) return
        const table = floorPlan.tables.find(t => t.id === group.tableId)
        const leftAt = Date.now()
        const timeStr = new Date(leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        set(state => ({
          groups: state.groups.filter(g => g.id !== groupId),
          floorPlan: {
            ...state.floorPlan,
            tables: state.floorPlan.tables.map(t =>
              t.id === group.tableId
                ? { ...t, status: 'free' as const, currentGroupId: undefined }
                : t
            ),
          },
        }))
        get().showToast(`Table ${table?.number} cleared — ${group.name} left at ${timeStr}`)
      },

      moveGroup: (groupId, newTableId) => {
        const { groups } = get()
        const group = groups.find(g => g.id === groupId)
        if (!group) return
        const oldTableId = group.tableId
        set(state => ({
          groups: state.groups.map(g =>
            g.id === groupId ? { ...g, tableId: newTableId } : g
          ),
          floorPlan: {
            ...state.floorPlan,
            tables: state.floorPlan.tables.map(t => {
              if (t.id === oldTableId) return { ...t, status: 'free' as const, currentGroupId: undefined }
              if (t.id === newTableId) return { ...t, status: 'seated' as const, currentGroupId: groupId }
              return t
            }),
          },
          moveMode: { active: false, groupId: null },
        }))
      },

      updateNote: (groupId, note) => {
        set(state => ({
          groups: state.groups.map(g =>
            g.id === groupId ? { ...g, note } : g
          ),
        }))
      },

      startMoveMode: (groupId) => {
        set({ moveMode: { active: true, groupId } })
      },

      cancelMoveMode: () => {
        set({ moveMode: { active: false, groupId: null } })
      },

      showToast: (message) => {
        const id = Date.now()
        set({ toast: { message, id } })
        setTimeout(() => {
          const { toast } = get()
          if (toast?.id === id) set({ toast: null })
        }, 3000)
      },

      dismissToast: () => set({ toast: null }),
    }),
    {
      name: 'table-tracker-state',
      partialize: (state) => ({
        floorPlan: state.floorPlan,
        groups: state.groups,
      }),
    }
  )
)
