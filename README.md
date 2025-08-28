# Game Master App (Starter)

Starter scaffold for a React + Vite + TypeScript + Tailwind + Supabase app.

## Getting Started

1. Install dependencies:

```bash
npm install # or pnpm install / yarn
```

2. Create a `.env` file with your Supabase credentials:

```bash
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

3. Start the dev server:

```bash
npm run dev
```

4. Build:

```bash
npm run build
```

5. Test:

```bash
npm test
```

## Routes

- `/dashboard` main dashboard
- `/shop1` and `/shop2` shops

## What’s Implemented

- Project scaffold: React + Vite + TypeScript + Tailwind + Vitest
- Supabase client with REACT*APP*/VITE\_ env support
- Routing: `/dashboard`, `/shop1`, `/shop2`
- Realtime: subscriptions for `players`, `inventory`, `app_state`, `shops`, `shop_items`
- Optimistic UI and background sync via React Query
  - Tokens: instant +/- with optimistic mutate
  - LEDs: main/top/bottom texts with optimistic persist to `app_state`
  - Day advance: optimistic day++; server updates players (AP=2, hunger/thirst -1 clamped ≥ -2), then invalidates
  - Players: inline edit for first/last name, avatar URL, HP (clamped to max), AP, hunger, thirst, fatigue, and core stats (orientation, strength, resistance, charisma, agility, dexterity, intuition); auto-mark dead when HP ≤ 0; order stable via `order`
  - Inventory: list with inline add/edit/remove; optimistic CRUD
  - Shops: pages show items only if unlocked; disabled items are grayed and not purchasable; Buy has confirmation and optimistic token/inventory updates
- GM-only (Dashboard):
  - Unlock toggles for Shop 1/Shop 2
  - Manage Items modal per shop (edit/add/remove) with optimistic updates

## Remaining Work

### Day progression

- Confirmation modal for advancing day.
- Manual edit of the day value (not just the button).

### Shops

- Atomic purchase (RPC) that deducts tokens and upserts inventory in one transaction.

### Inventory

- Optional: edit via modal with nicer UX (current inline inputs work but spec mentions an edit modal).
- Optional: quantity guards for normal flows (manual override can still bypass).

### Manual override coverage

- Ensure every displayed value is editable in-place: tokens (direct input as well as +/-), day (direct input), LED texts (done), all player stats (see above), shop unlock status, shop items.

### Realtime/offline

- Generalize offline queue to all mutations (players, inventory, LEDs, shops, purchases, day advance), not just tokens.
- Connectivity detection and queued retry for failures.
- Verify realtime is enabled for all tables and that UI reflects remote changes everywhere (players/shops already wired; ensure LEDs/inventory/app_state remain consistent).

### Business rules

- Hunger/thirst range −2..+2 in normal flows (clamp only in automatic/day progression; manual edits can bypass).
- Tokens never negative in regular flow (already guarded); keep same check on RPC side.

### UI/UX

- Accessible, reusable modal component for confirmations (used for purchases/day).
- LED style already in place; ensure consistent styling across pages.
- Minor: improve Shop locked messaging and GM-only controls layout.

### Testing/QA

- Unit tests for components (PlayerCard edits, TokenCounter, InventoryList, LEDDisplay).
- Integration tests for Supabase queries and the two RPCs (advance day, purchase).
- QA checklist items from spec: death grayscale, day progression correctness, insufficient tokens handling, manual overrides persistence, refresh persistence.
