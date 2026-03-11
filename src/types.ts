export type TableShape = 'square' | 'round' | 'rectangle'
export type TableStatus = 'free' | 'seated' | 'reserved' | 'unavailable'
export type GroupStatus = 'seated' | 'left'

export interface Table {
  id: string
  number: string
  label?: string
  capacity: number
  shape: TableShape
  position: { x: number; y: number } // percentage of canvas
  size: { w: number; h: number }      // relative units
  section?: string
  status: TableStatus
  currentGroupId?: string
}

export interface Group {
  id: string
  name: string
  covers: number
  tableId: string
  seatedAt: number   // timestamp ms
  leftAt?: number
  status: GroupStatus
  note: string       // single note string, max 200 chars
}

export interface FloorPlan {
  id: string
  name: string
  tables: Table[]
}

export interface AppState {
  floorPlan: FloorPlan
  groups: Group[]
}
