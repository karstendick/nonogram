# Marking Empty Without Right-Click

> **Source:** [issue #23 — On desktop, give a way to place X's without right-clicking](https://github.com/karstendick/nonogram/issues/23)

## Context

On desktop, the only way to place an X is to right-click, and the only way to place a run of them is
to right-click and drag. Right-drag is awkward on a trackpad and, on some, close to impossible.

The input path today ([Cell.tsx](../../src/components/Cell.tsx),
[Grid.tsx](../../src/components/Grid.tsx)):

- `Cell.handleMouseDown` calls `onCellDragStart(row, col, e.button === 2)` — a single boolean
  meaning "this was a right-click".
- `Grid.getToggleAction` branches on that boolean: right-click toggles `Empty` ↔ `MarkedEmpty`, left
  click toggles `Empty` ↔ `Filled` (unless `currentMode` is `MarkEmpty`, the mobile mode).
- `startDrag` stores the resulting action once; `continueDrag` replays that same action across the
  cells the drag covers. The kind of a drag is fixed at mousedown.

Mobile has the [ModeToggle](../../src/components/ModeToggle.tsx) for this, but it is `sm:hidden` and
stays that way — this spec does not touch it.

## Requirements

1. Shift + left-click marks a cell empty, and unmarks an already-marked cell, exactly as
   right-clicking does today.
2. Shift + left-drag places X's along a row or column, exactly as right-dragging does today,
   including the existing axis lock and the refusal to overwrite filled cells.
3. Right-click and right-drag keep working, unchanged.
4. The modifier is read once, at mousedown, and governs the whole drag.
5. The desktop help tooltip says so.

## Design Decisions

### Shift, not Ctrl, Alt or Cmd

- **Ctrl** is a right-click on macOS. Ctrl+click already fires `contextmenu` and arrives with
  `button === 0` and `ctrlKey` set, so binding it would collide with the platform's own gesture.
- **Alt** is claimed by several Linux window managers for alt+drag to move a window, which would eat
  the drag before the page sees it.
- **Cmd** exists only on macOS.
- **Shift** is free here. Its usual meaning — extend a text selection — cannot apply: the grid sets
  `select-none` and `handleMouseDown` already calls `preventDefault()`.

### The flag becomes an intent, not a button

`isRightClick` stops being accurate the moment two different gestures produce the same action, so it
is renamed to describe what it means — mark-empty — through `Cell`'s props and `Grid`'s
`getToggleAction`. `Cell` computes it as `e.button === 2 || e.shiftKey`; nothing downstream needs to
know which of the two the player used.

### The drag inherits the modifier from its first event

Releasing shift mid-drag keeps placing X's to the end of the stroke. This is not a special case —
`startDrag` already fixes the action at mousedown and `continueDrag` applies it unchanged, which is
what makes right-drag behave the same way. Sampling `shiftKey` per cell would let a single stroke
switch between filling and X-ing partway along, which is worse.

### Touch is untouched

`handleTouchStart` passes `false` and keeps doing so; touch devices have the ModeToggle.

### The tooltip gets one amended line, not a rework

The desktop help tooltip in [App.tsx](../../src/App.tsx) is hover-only and `hidden sm:block`, so it
cannot be reached by touch at all. That is a real problem, and it belongs to
[issue #21](https://github.com/karstendick/nonogram/issues/21) along with teaching the rules. Here it
only gains a mention of shift-click, so the new control is documented where the existing ones are.

## Implementation Plan

1. **`src/components/Cell.tsx`** — pass `e.button === 2 || e.shiftKey` from `handleMouseDown`;
   rename the prop and parameter from `isRightClick` to `markEmpty`.
2. **`src/components/Grid.tsx`** — rename the `getToggleAction` / `handleCellClick` /
   `handleCellDragStart` parameter to match. No logic change: the existing right-click branch is now
   the mark-empty branch.
3. **`src/App.tsx`** — amend the tooltip line to mention shift-click alongside right-click.
4. **Tests** — as below.

## Test Plan

**`tests/Grid.test.tsx`** (mirroring the existing right-click cases)

- Shift + left-click on an empty cell marks it empty.
- Shift + left-click on a marked-empty cell clears it.
- Shift + left-click on a filled cell is refused, like right-click on a filled cell.
- A shift + left-drag along a row marks the whole run empty.
- Plain left-click still fills, with no regression to the existing cases.

**e2e** — a desktop-project test that shift+clicking a cell renders an X, so the real browser's
event path is covered rather than only the synthetic one.

## Open Questions

- `Cell` has an Enter/Space `keyDown` handler, but cells are `tabIndex={-1}` and only the grid
  container is focusable, so that path is effectively unreachable today. Extending it (shift+Enter
  to mark empty) would mean making cells focusable and building grid keyboard navigation — a
  separate piece of work. Default: leave the keyboard path alone. _Resolved: leave it alone._
- If `currentMode` is somehow `MarkEmpty` on a desktop viewport — possible, since the mode is
  persisted and the toggle is only hidden, not disabled — plain click and shift+click both mark
  empty, and there is no modifier that fills. Default: accept it; shift always means mark-empty, and
  the mode is a mobile control. _Resolved: accept it._
