import { v4 as uuidv4 } from 'uuid'
import type { FloorPlan } from './types'

export const DEFAULT_FLOOR_PLAN: FloorPlan = {
  id: 'default',
  name: 'Main Dining Room',
  tables: [
    // Main room — 3 columns, 3 rows
    { id: uuidv4(), number: 'T1', capacity: 2, shape: 'square',    position: { x: 10, y: 8  }, size: { w: 14, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T2', capacity: 2, shape: 'square',    position: { x: 30, y: 8  }, size: { w: 14, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T3', capacity: 4, shape: 'square',    position: { x: 55, y: 8  }, size: { w: 18, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T4', capacity: 4, shape: 'square',    position: { x: 10, y: 28 }, size: { w: 18, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T5', capacity: 4, shape: 'square',    position: { x: 35, y: 28 }, size: { w: 18, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T6', capacity: 6, shape: 'rectangle', position: { x: 62, y: 26 }, size: { w: 22, h: 14 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T7', capacity: 2, shape: 'round',     position: { x: 10, y: 48 }, size: { w: 14, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T8', capacity: 4, shape: 'square',    position: { x: 32, y: 48 }, size: { w: 18, h: 12 }, section: 'Main', status: 'free' },
    { id: uuidv4(), number: 'T9', capacity: 8, shape: 'rectangle', position: { x: 58, y: 47 }, size: { w: 28, h: 14 }, section: 'Main', status: 'free' },
    // Bar area
    { id: uuidv4(), number: 'B1', capacity: 2, shape: 'round',     position: { x: 10, y: 74 }, size: { w: 14, h: 12 }, section: 'Bar', status: 'free' },
    { id: uuidv4(), number: 'B2', capacity: 2, shape: 'round',     position: { x: 32, y: 74 }, size: { w: 14, h: 12 }, section: 'Bar', status: 'free' },
    { id: uuidv4(), number: 'B3', capacity: 4, shape: 'square',    position: { x: 55, y: 74 }, size: { w: 18, h: 12 }, section: 'Bar', status: 'free' },
  ],
}
