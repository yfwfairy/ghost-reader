# Ghost Reader Library + Recent Shell Design

## 1. Summary

This spec defines the next Ghost Reader desktop shell for the main window. The app will keep a single persistent left navigation rail and switch the right content area between two bookshelf-facing views:

- `Library`: grid layout for all imported local books
- `Recent`: horizontal large-card layout for recently opened books that already have reading progress

The visual baseline must follow the user's Stitch designs, specifically:

- `Library with Leading Import Button`
- `Recent Encounters - Selected State`

The implementation target is not "inspired by" these screens. It should restore their visual system as closely as the current app architecture allows, including hover states, press states, blur, gradients, spacing, border opacity, depth, and motion timing.

## 2. Goals

- Turn the current bookshelf home into a two-tab desktop shell with a persistent left rail.
- Preserve the existing single-window reader flow.
- Match the approved Stitch visual language as closely as possible.
- Keep the information architecture simple: `Recent`, `Library`, `Settings`.
- Use real local Ghost Reader data only. Do not invent user profiles, cloud data, social status, or store content.

## 3. Non-Goals

- Do not add login, account, or profile UI.
- Do not add a store page.
- Do not add bottom summary modules from the Stitch `Recent` draft.
- Do not redesign the reader page in this task beyond keeping navigation compatible.
- Do not add fake search or fake filtering behavior in this iteration.

## 4. Information Architecture

### 4.1 Main Window Shell

The main window shell will have two persistent regions:

- Left rail: navigation and settings entry
- Right panel: active content view

The shell must remain stable when switching between `Recent` and `Library`. Only the right panel changes.

### 4.2 Left Rail

The left rail will include:

- Brand area for Ghost Reader
- `Recent` navigation item
- `Library` navigation item
- `Settings` entry pinned toward the bottom

The left rail must not include:

- User avatar
- User name
- Login state
- `Store`
- A sidebar import button

The active navigation item must visually match the Stitch-selected state treatment: elevated glass surface, stronger contrast, and a clearly active icon/text state.

## 5. Library View

### 5.1 Purpose

`Library` is the complete local bookshelf. It shows every imported local book regardless of reading status.

### 5.2 Layout

The right panel should mirror the structure of `Library with Leading Import Button`:

- Large page title
- Short subtitle
- Right-aligned search field shell for visual parity
- Bookshelf grid below the header

The first tile in the grid is a dedicated `Add to Library` card. It is part of the grid, not a sidebar action and not a separate hero button above the grid.

### 5.3 Library Grid Content

The grid contains:

1. `Add to Library` card in the first slot
2. One card for each imported book after that

Each real book card shows:

- Cover
- Title
- Author
- Reading progress line when progress exists
- Delete affordance

Format metadata may remain available, but should not visually dominate the Stitch card hierarchy.

### 5.4 Empty State

When the library is empty:

- Keep the page header visible
- Keep the grid container visible
- Show the `Add to Library` card as the primary actionable item
- Do not replace the full page with a separate empty-state panel

### 5.5 Interaction Rules

- Clicking the `Add to Library` card opens the existing import flow
- Dragging files over the library region should still activate import affordance styling
- Clicking a book opens the reader
- Deleting a book stays available from the card chrome

## 6. Recent View

### 6.1 Purpose

`Recent` is a focused view for books that the reader has already opened and progressed through.

### 6.2 Inclusion Rule

Only books with a saved reading progress record are allowed in `Recent`.

Books without reading progress never appear in `Recent`, even if they were imported recently.

### 6.3 Sorting Rule

`Recent` is sorted by the last opened/last reading activity time in descending order.

For this iteration, the app will use `ReadingProgress.updatedAt` as the source of truth for recent ordering.

### 6.4 Layout

The right panel should mirror the core structure of `Recent Encounters - Selected State`, but simplified to match Ghost Reader scope:

- Large page title
- Short supporting subtitle
- No extra bottom analytics or archive modules
- A vertical list of large horizontal cards

Each recent card shows:

- Cover on the left
- Title
- Author
- Reading percentage
- Last reading/opened time
- Progress bar

### 6.5 Empty State

When there are no recent books:

- Keep the page header visible
- Show a centered glass placeholder panel in the content area
- Explain that no recent reading trail exists yet
- Provide a single action that takes the user to `Library`

Do not render fake recent cards.

## 7. Stitch Fidelity Rules

The UI implementation must follow the Stitch visual system closely, not loosely.

### 7.1 Must-Match Visual Areas

- Sidebar width and spatial rhythm
- Card proportions and cover emphasis
- Rounded corners
- Blur-based glass surfaces
- Border softness and opacity
- Gradient usage
- Text hierarchy
- Hover lighting and slight scale-up
- Active navigation treatment
- Button press feedback
- Shadow softness
- Neutral dark palette

### 7.2 Styling Rules

- No bright accent recoloring outside the approved monochrome system
- No replacement with generic app-shell styling
- No fallback to flat cards if the blur treatment is technically possible
- No extra controls that are not present in the approved direction

If an effect from Stitch cannot be reproduced exactly in CSS/Electron, choose the closest visually equivalent effect instead of replacing it with a default utility-style control.

## 8. Data Mapping

### 8.1 Existing Data

The current data model already provides enough information for this scope:

- `BookRecord`
  - `id`
  - `title`
  - `author`
  - `coverDataUrl`
  - `format`
  - `importedAt`
  - `updatedAt`
- `ReadingProgress`
  - `bookId`
  - `percentage`
  - `updatedAt`

### 8.2 View Mapping

`Library`:

- Uses all imported books
- May enrich cards with progress if present

`Recent`:

- Joins books with progress records
- Filters to records with saved progress only
- Sorts by `ReadingProgress.updatedAt DESC`

No schema change is required for this task.

## 9. Navigation and Reader Flow

- The shell starts on `Library` unless the current app state routes directly into the reader.
- Clicking `Recent` or `Library` updates only the right content view.
- Clicking a book from either view opens the existing reader page.
- Leaving the reader returns to the same shell system rather than a detached older bookshelf layout.

## 10. Testing Strategy

Implementation must be covered by automated tests before production code changes are finalized.

Tests should verify:

- Left rail tab switching between `Recent` and `Library`
- `Library` shows all imported books
- `Library` keeps the grid-first import card
- `Recent` only shows books with progress
- `Recent` sorts by latest `ReadingProgress.updatedAt`
- `Recent` empty state renders placeholder panel
- `Library` empty state still renders the import card
- Clicking books from either view opens the reader

Visual fidelity itself will still need manual QA after implementation, especially for hover transitions, press states, spacing, blur, and depth.

## 11. Acceptance Criteria

- The main window uses a persistent left rail with `Recent`, `Library`, and `Settings`
- There is no profile area and no `Store`
- `Library` matches the Stitch grid direction and uses an in-grid `Add to Library` card
- `Recent` matches the Stitch horizontal-card direction and excludes books without progress
- `Recent` sorts by most recent reading activity
- `Recent` bottom mini-modules are removed
- `Recent` empty state shows a centered placeholder panel
- `Library` empty state still shows the import card in-grid
- Styling is implemented to closely follow Stitch motion, gradients, blur, borders, and interaction states
