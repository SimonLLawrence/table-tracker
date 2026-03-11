# Table Tracker — Product Specification

**Version:** 1.0  
**Date:** 2026-03-11  
**Status:** Draft

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Core Features](#2-core-features)
3. [Key User Flows](#3-key-user-flows)
4. [Screen-by-Screen Breakdown](#4-screen-by-screen-breakdown)
5. [UI/UX Principles](#5-uiux-principles)
6. [Data Model](#6-data-model)
7. [Edge Cases & Considerations](#7-edge-cases--considerations)

---

## 1. App Overview

### Purpose

Table Tracker is a lightweight, real-time restaurant floor management tool for front-of-house staff. It replaces paper notes and mental overhead with a clear, visual snapshot of the dining room: who's sitting where, any special notes, and which tables are free.

The goal is speed — staff should be able to assign a table, move a group, or mark a customer as left in two or three taps, without menus, modals, or faff.

### Target Users

| Role | Primary Use |
|---|---|
| **Host / Maître d'** | Assign arriving guests to tables, manage waitlist |
| **Floor Manager** | Monitor room status, reassign tables, track turnover |
| **Waiting Staff** | Check table assignments, add notes, mark tables as cleared |

**Not** a POS, ordering, or billing system. Just the floor.

### Platforms

- **Primary:** iPad / Android tablet (landscape preferred)
- **Secondary:** iPhone / Android phone (portrait/landscape, single-panel mode)
- **Web:** Progressive Web App (PWA) for browser-based use on fixed terminals
- **Offline-capable:** Local state persists if connectivity drops; syncs on reconnect

---

## 2. Core Features

### Must-Have (v1.0)

- **Visual floor plan** — drag-positioned table layout reflecting the real room
- **Customer/group assignment** — tap a table, name the group, it's assigned
- **Customer list panel** — scrollable list of all seated groups, sorted by arrival
- **Move customer** — reassign a group to a different table in two taps
- **Notes per group** — free-text notes attached to each seated party
- **Mark as left** — confirm a party has departed, table returns to available
- **Table status colours** — at-a-glance state (free / seated / needs attention)
- **Party size** — track cover count per table

### Nice-to-Have (v1.1+)

- **Waitlist** — queue of waiting parties with estimated wait time
- **Time-at-table** — elapsed time since seating, configurable alert threshold
- **Table history** — log of parties who sat at each table today
- **Multi-room / section support** — tabs or swipe between rooms
- **Staff assignment** — which server owns which table(s)
- **Reservations integration** — pull upcoming bookings from OpenTable / Resy
- **Push notifications** — alert staff when a table has been waiting too long

---

## 3. Key User Flows

### 3.1 Assign a Table

```
Guest arrives
      │
      ▼
Host taps empty table on floor plan
      │
      ▼
Assignment modal opens
      │
      ├─ Enter party name (e.g. "Johnson" or "Table of 4")
      ├─ Enter cover count
      └─ Optional: add a note
      │
      ▼
Tap "Seat" button
      │
      ▼
Table changes to SEATED state (colour changes)
Party appears in customer list (left panel)
```

### 3.2 Move a Customer to Another Table

```
Staff sees a party needs to move
      │
      ▼
Tap seated party in customer list  ──OR──  Long-press / tap table on floor plan
      │
      ▼
Detail view / options menu appears
      │
      ▼
Tap "Move Table"
      │
      ▼
Floor plan highlights available tables
      │
      ▼
Staff taps destination table
      │
      ▼
Confirmation prompt: "Move Johnson → Table 7?"
      │
      ▼
Confirm → party reassigned, both tables update instantly
```

### 3.3 Add a Note

```
Staff taps party in customer list  ──OR──  Taps their table on floor plan
      │
      ▼
Detail view opens
      │
      ▼
Tap "Add Note" / tap existing note to edit
      │
      ▼
Note modal opens with text field
      │
      ▼
Type note (e.g. "Nut allergy", "Birthday cake coming", "Waiting for one more")
      │
      ▼
Tap "Save"
      │
      ▼
Note icon appears on table and in customer list
```

### 3.4 Mark Customer as Left

```
Party is leaving or has left
      │
      ▼
Tap party in customer list  ──OR──  Tap their table on floor plan
      │
      ▼
Detail view opens
      │
      ▼
Tap "Mark as Left"
      │
      ▼
Confirmation prompt (prevents accidental taps)
"Mark Johnson as left? Table 5 will be cleared."
      │
      ├─ Cancel → dismiss, no change
      └─ Confirm →
            │
            ▼
         Party removed from customer list
         Table returns to AVAILABLE state
         (Optional: brief "Table 5 — cleared" toast)
```

---

## 4. Screen-by-Screen Breakdown

### 4.1 Main Screen — Split View

The primary interface. Left panel lists seated parties; right panel shows the floor plan. On tablets, both panels are visible simultaneously. On phones, panels stack (customer list above, floor plan below) or toggle via a tab bar.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🍽 Table Tracker          [Wed 11 Mar · 19:42]          [⚙ Settings]       │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  SEATED (6)          │                                                       │
│  ──────────────────  │        ┌──────┐          ┌──────┐                    │
│                      │        │  T1  │          │  T2  │                    │
│  ┌────────────────┐  │        │  ●●  │          │ FREE │                    │
│  │ Johnson    T5  │  │        │Smith │          │      │                    │
│  │ ●●●  19:10     │  │        └──────┘          └──────┘                    │
│  │ 📝 Nut allergy │  │                                                       │
│  └────────────────┘  │   ┌──────┐     ┌──────┐     ┌──────┐                │
│                      │   │  T3  │     │  T4  │     │  T5  │                │
│  ┌────────────────┐  │   │ FREE │     │  ●●● │     │  ●●● │                │
│  │ Smith      T1  │  │   │      │     │ Patel│     │Johns.│                │
│  │ ●●  19:15      │  │   └──────┘     └──────┘     └──────┘                │
│  └────────────────┘  │                                                       │
│                      │        ┌──────┐     ┌──────────────┐                 │
│  ┌────────────────┐  │        │  T6  │     │     T7       │                 │
│  │ Patel      T4  │  │        │  ●●  │     │   FREE  (6)  │                │
│  │ ●●●  19:22     │  │        │ Lee  │     │              │                 │
│  └────────────────┘  │        └──────┘     └──────────────┘                 │
│                      │                                                       │
│  ┌────────────────┐  │   ┌──────────────┐          ┌──────┐                │
│  │ Lee        T6  │  │   │     T8       │          │  T9  │                │
│  │ ●●  19:28      │  │   │  ●●●●●  Bar  │          │ FREE │                │
│  └────────────────┘  │   │ (private)    │          │      │                │
│                      │   └──────────────┘          └──────┘                │
│  ┌────────────────┐  │                                                       │
│  │ Bar party  T8  │  │                                                       │
│  │ ●●●●●  19:05   │  │   ═══════════════ [ BAR AREA ] ══════════════        │
│  │ 📝 Private     │  │                                                       │
│  └────────────────┘  │        ┌──────┐     ┌──────┐     ┌──────┐            │
│                      │        │  B1  │     │  B2  │     │  B3  │            │
│  ┌────────────────┐  │        │ FREE │     │  ●   │     │  ●●  │            │
│  │ [table 2 more] │  │        └──────┘     └──────┘     └──────┘            │
│  └────────────────┘  │                                                       │
│                      │                                                       │
│  [+ Add Walk-in]     │                               [🗺 Full Floor View]   │
└──────────────────────┴──────────────────────────────────────────────────────┘

LEGEND:  FREE = available   ● = 1 cover   📝 = has note
         Table colours:  [ white/grey = free ]  [ green = seated ]  [ amber = alert ]
```

**Left Panel — Customer List**

Each list item shows:
- Party name
- Table number badge
- Cover dots (●) — one per person, max 6 shown then "+N"
- Arrival time
- Note icon if note exists

List is sorted by arrival time (oldest first). Tap any row to open the detail view.

**Right Panel — Floor Plan**

Tables rendered as rounded rectangles, sized proportionally to cover capacity. Position mirrors real room layout (configured once by manager). Each table shows:
- Table number
- Status label (FREE or party name, truncated)
- Cover dots if seated

Tap any table to interact. Pinch-to-zoom on tablet.

---

### 4.2 Table Detail / Assignment Modal

Triggered by tapping a table or a customer list row. Slides up from bottom (sheet modal).

**Empty table:**

```
┌───────────────────────────────────────┐
│  ╔═══════════════════════════════════╗ │
│  ║          TABLE 5                  ║ │
│  ║         Seats up to 4             ║ │
│  ╚═══════════════════════════════════╝ │
│                                       │
│  Party name                           │
│  ┌─────────────────────────────────┐  │
│  │  e.g. "Johnson" or "Table of 3" │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Covers                               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6+│ │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │
│                                       │
│  Note (optional)                      │
│  ┌─────────────────────────────────┐  │
│  │                                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │           ✓  SEAT PARTY         │  │
│  └─────────────────────────────────┘  │
│                                       │
│              [ Cancel ]               │
└───────────────────────────────────────┘
```

**Occupied table (party detail):**

```
┌───────────────────────────────────────┐
│  ╔═══════════════════════════════════╗ │
│  ║   Johnson · Table 5 · 3 covers    ║ │
│  ║   Seated 19:10  (32 mins ago)     ║ │
│  ╚═══════════════════════════════════╝ │
│                                       │
│  📝 Note                              │
│  ┌─────────────────────────────────┐  │
│  │  Nut allergy — check with chef  │  │
│  └─────────────────────────────────┘  │
│                        [Edit note]    │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │        ↔  MOVE TABLE            │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │        📝 ADD / EDIT NOTE       │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │        ✕  MARK AS LEFT          │  │  ← destructive — red
│  └─────────────────────────────────┘  │
│                                       │
│              [ Close ]                │
└───────────────────────────────────────┘
```

---

### 4.3 Move Customer Flow

After tapping "Move Table", the floor plan enters **move mode**. The current table pulses/highlights. Available tables are brightened; occupied tables dim.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔀 Moving: Johnson (Table 5) — tap a destination table                      │
│  ─────────────────────────────────────────────────────  [ Cancel Move ]     │
├──────────────────────┬──────────────────────────────────────────────────────┤
│  SEATED (6)          │                                                       │
│  (list dims during   │        ┌──────┐          ┌──────┐                    │
│   move mode)         │        │  T1  │          │  T2  │  ← bright green    │
│                      │        │ ░░░░ │          │ FREE │     (tap to move)  │
│                      │        │Smith │          │ ✓    │                    │
│  ┌────────────────┐  │        └──────┘          └──────┘                    │
│  │ Johnson    T5  │  │       (dimmed,             ↑ available               │
│  │ ●●●  MOVING…   │  │        occupied)                                     │
│  │ ← tap to cancel│  │   ┌──────┐     ┌──────┐     ┌──────┐                │
│  └────────────────┘  │   │  T3  │     │  T4  │     │  T5  │                │
│                      │   │ FREE │     │ ░░░░ │     │★★★★★│ ← source table │
│                      │   │ ✓    │     │Patel │     │Johns.│   (pulsing)    │
│                      │   └──────┘     └──────┘     └──────┘                │
│                      │                                                       │
│                      │        ┌──────┐     ┌──────────────┐                 │
│                      │        │  T6  │     │     T7       │                 │
│                      │        │ ░░░░ │     │   FREE  (6)  │  ← available   │
│                      │        │ Lee  │     │   ✓          │                 │
│                      │        └──────┘     └──────────────┘                 │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

Once a destination is tapped:

```
┌─────────────────────────────────────┐
│                                     │
│    Move Johnson to Table 2?         │
│                                     │
│    Table 2 is free · seats 2        │
│    ⚠ Party has 3 covers             │  ← warn if destination is small
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │    Cancel    │ │  ✓  Confirm  │  │
│  └──────────────┘ └──────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

### 4.4 Add / Edit Note Modal

Simple modal, deliberately minimal. Opens when "Add Note" or "Edit Note" is tapped.

```
┌─────────────────────────────────────┐
│                                     │
│   📝 Note for Johnson (T5)          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │  Nut allergy — check with chef  ││
│  │                                 ││
│  │                                 ││
│  └─────────────────────────────────┘│
│   0 / 200 characters                │
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │    Cancel    │ │  💾  Save    │  │
│  └──────────────┘ └──────────────┘  │
│                                     │
│  [ 🗑 Clear note ]                  │  ← only shown if note already exists
│                                     │
└─────────────────────────────────────┘
```

- Max 200 characters (keeps notes scannable)
- Keyboard auto-opens on modal launch
- Save dismisses and updates note icon on table and list

---

### 4.5 Mark as Left — Confirmation

Destructive action — always confirm. No undo after confirm (party disappears).

```
┌─────────────────────────────────────┐
│                                     │
│       ✕  Mark as Left?              │
│                                     │
│   Party:   Johnson                  │
│   Table:   5                        │
│   Seated:  19:10  (34 mins)         │
│   Covers:  3                        │
│                                     │
│   Table 5 will return to            │
│   ✓ Available                       │
│                                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │    Cancel    │ │ ✕ Confirm    │  │  ← red button
│  └──────────────┘ └──────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

On confirm:
- Party removed from the customer list immediately
- Table snaps back to FREE state (grey/white) on floor plan
- Brief toast notification: *"Table 5 cleared — Johnson left at 19:44"*

---

### 4.6 Phone Layout (Portrait)

On a phone, the split view collapses. A tab bar at the bottom switches between panels.

```
┌───────────────────────────┐
│  🍽 Table Tracker   19:42  │
├───────────────────────────┤
│                           │
│  SEATED (6)               │
│                           │
│  ┌─────────────────────┐  │
│  │ Johnson    T5  ●●●  │  │
│  │ 19:10   📝           │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Smith      T1  ●●   │  │
│  │ 19:15               │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Patel      T4  ●●●  │  │
│  │ 19:22               │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Lee        T6  ●●   │  │
│  │ 19:28               │  │
│  └─────────────────────┘  │
│                           │
│                           │
│                           │
│  [+ Add Walk-in]          │
├───────────────────────────┤
│  [ 👥 Guests ] [ 🗺 Floor ]│
└───────────────────────────┘
```

Tapping "Floor" switches to the floor plan view. Tapping any table or party opens the same detail sheet modal as tablet.

---

## 5. UI/UX Principles

### Speed First

Every common action must be completable in **3 taps or fewer**:
- Seat a party: tap table → enter name → tap Seat
- Add a note: tap party → tap Add Note → type → tap Save
- Mark as left: tap party → tap Mark as Left → tap Confirm
- Move table: tap party → tap Move → tap destination → tap Confirm

If it takes more than 3 taps, reconsider the flow.

### Tap Targets

- All interactive elements: minimum **44×44pt** touch target (Apple HIG / Material guidance)
- Cover count buttons: large, pill-shaped, easy to tap with a single finger
- Confirmation buttons: full-width where possible to reduce miss-taps
- Destructive buttons (Mark as Left): always red, always require a second confirmation

### Visual Hierarchy

- **Table status** communicates at a glance via colour:
  - ⬜ Light grey / white — FREE
  - 🟩 Green — SEATED
  - 🟨 Amber — Alert (e.g. seated > 90 mins, configurable)
  - 🟥 Red — Needs attention (manual flag, future feature)
- Notes icon (📝) visible on both the list row and the floor plan table tile
- Cover count shown as dots, not a number, to be scannable at distance

### Responsiveness

| Screen | Layout |
|---|---|
| Tablet landscape ≥ 768px | Side-by-side: list (30%) + floor plan (70%) |
| Tablet portrait ≥ 600px | Side-by-side at reduced list width |
| Phone landscape | Side-by-side, list collapsible |
| Phone portrait | Stacked tabs: list / floor plan |

Floor plan scales via CSS transforms to fill available space. Tables reposition fluidly; labels scale down on small screens.

### Modal Behaviour

- All modals slide up from the bottom (sheet pattern — familiar on both iOS and Android)
- Dismiss by swiping down or tapping outside the modal
- Keyboard-aware: modal shifts up when soft keyboard appears
- No full-screen takeovers for simple actions; keep context visible behind the sheet

### Feedback & Confirmation

- Immediate visual feedback on tap (table colour changes instantly, optimistic update)
- Sync errors shown as a subtle banner, not a blocking alert
- Toast notifications for completed actions (3-second auto-dismiss)
- No loading spinners for local state changes

### Accessibility

- All interactive elements have accessible labels
- Colour status supplemented by shape/pattern (not colour-only)
- Font sizes respect system accessibility settings
- High contrast mode supported

---

## 6. Data Model

### Table

```
Table {
  id:          UUID
  number:      String         // "T1", "B3", "P2" etc.
  label:       String?        // Optional friendly name e.g. "Window Seat"
  capacity:    Int            // Max covers
  shape:       Enum           // "square" | "round" | "rectangle"
  position:    { x: Float, y: Float }   // % of floor plan canvas
  size:        { w: Float, h: Float }   // relative units
  section:     String?        // e.g. "Main", "Bar", "Terrace"
  status:      Enum           // "free" | "seated" | "reserved" | "unavailable"
  currentGroup: UUID?         // FK → Group.id (null if free)
}
```

### Group (Party / Customer)

```
Group {
  id:           UUID
  name:         String        // "Johnson", "Table of 3", "Walk-in 4"
  covers:       Int           // Number of people
  tableId:      UUID          // FK → Table.id
  seatedAt:     Timestamp
  leftAt:       Timestamp?    // null until they leave
  status:       Enum          // "seated" | "left"
  notes:        Note[]        // Array of notes
  tags:         String[]      // Future: "birthday", "vip", "allergy"
}
```

### Note

```
Note {
  id:           UUID
  groupId:      UUID          // FK → Group.id
  body:         String        // Max 200 chars
  createdAt:    Timestamp
  updatedAt:    Timestamp
  createdBy:    String?       // Staff name / device ID (future)
}
```

### FloorPlan

```
FloorPlan {
  id:           UUID
  name:         String        // "Main Dining", "Terrace"
  tables:       Table[]
  backgroundImage: URL?       // Optional — actual room image underlay
  updatedAt:    Timestamp
}
```

### Session / Service

```
Service {
  id:           UUID
  date:         Date
  label:        String?       // "Lunch", "Dinner"
  startedAt:    Timestamp
  endedAt:      Timestamp?
  groups:       Group[]       // All groups for this service
}
```

### State Transitions

```
Table:
  free → seated   (group assigned)
  seated → free   (group marks as left)
  free → unavailable  (manually closed)
  unavailable → free  (manually reopened)

Group:
  seated → left   (mark as left)
  seated → seated  (move table — group.tableId changes, two tables update)
```

---

## 7. Edge Cases & Considerations

### Concurrent Edits (Multi-Device)

The app will typically run on 2–3 devices simultaneously (host stand + manager tablet + phone). Race conditions are possible.

- **Last write wins** for most fields (name, note, covers) — conflicts are rare and low stakes
- **Table assignment conflicts**: if two devices try to seat different parties at the same table simultaneously, the server must reject the second attempt and return an error
- Client shows: *"Table 5 was just taken — please choose another"*
- Use WebSockets or Server-Sent Events for real-time push of state changes

### Accidentally Marking a Party as Left

- Confirmation dialog acts as the primary guard
- Consider a **soft delete with 60-second undo** toast: *"Johnson marked as left — Undo"*
- After 60 seconds (or if another action occurs), the record archives

### Moving to an Occupied Table

- UI should prevent tapping an occupied table during move mode (dim it, don't respond to tap)
- Edge case: if a table becomes occupied between initiating move and confirming, server returns error
- Client shows: *"Table 7 was just seated — pick another"*

### Party Size Exceeds Table Capacity

- Warn but do not block: restaurants routinely squeeze
- Warning banner in modal: *"⚠ Table 5 seats 4 — party has 6 covers"*
- Staff can proceed; the decision is theirs

### Floor Plan Not Configured

- First-run experience: show a simple setup wizard to add tables
- Default floor plan: numbered grid (T1–T12) as a starting point
- Manager can drag tables to match real layout; save persists across devices

### No Network

- All reads from local cache
- Writes queue locally (IndexedDB or SQLite)
- Banner: *"Offline — changes will sync when connected"*
- On reconnect: flush queue, apply changes, handle any conflicts

### Long Party Names

- Truncate at ~12 characters in the floor plan tile with ellipsis
- Full name always visible in list panel and detail modal
- No truncation in modals

### Large Cover Counts

- Cover dots max at 6 on the tile; show "+N" for overflow
- List panel shows numeric count for clarity when > 6

### End of Service / Reset

- Manager taps "End Service" (in settings or a dedicated button)
- Confirmation: *"This will archive all current parties and reset the floor. Continue?"*
- All seated groups archived to service history; all tables return to FREE
- A new service record begins

### Printer / Kitchen Slip Integration (Future)

- Notes could be printed to a kitchen printer on demand
- Out of scope for v1 but data model should not preclude it (notes are first-class objects)

### Time Zone / Clock

- All timestamps stored in UTC
- Displayed in venue's local timezone (set in app settings, not device timezone)
- Prevents confusion if a staff member's phone is set to the wrong zone

---

*End of specification.*

---

**Document maintained by:** TheClaw  
**Questions / revisions:** Update this file and re-share with the dev team.
