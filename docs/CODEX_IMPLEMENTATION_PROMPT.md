# Codex implementation prompt — Mystic Roast staff KDS/POS

You are implementing the production staff application for **Mystic Roast**, a small café. Work inside this existing Expo React Native repository. First inspect the entire repo, its `AGENTS.md`, and the current Supabase schema/RPCs available to the workspace. Preserve working code and existing database behavior unless this prompt explicitly supersedes it.

## Product outcome

Build one staff-only application that combines the café's KDS and the POS functions it actually needs. It must work tablet-first on Android and iPad, remain usable on phones, and use:

- Expo SDK 57
- React Native + TypeScript
- Expo Router
- Supabase Auth, Postgres, RPCs, and Realtime

Do not split this into separate KDS and POS apps. The main navigation is exactly:

**Orders | Preparing | Ready**

History/search and settings are supporting screens, not fourth and fifth workflow tabs.

## Non-negotiable order and inventory model

The current authoritative lifecycle is:

`received → accepted → preparing → ready → completed` (or `cancelled`)

Treat payment and kitchen status as independent axes.

1. Customer or staff submits an order:
   - no stock validation, reservation, deduction, or consumption
   - status is `received`
2. Staff accepts:
   - call one idempotent server-side RPC
   - atomically validate current revision and branch authorization
   - validate ingredient availability
   - reserve ingredient demand in `order_stock_reservations`
   - status becomes `accepted` only after the transaction succeeds
3. Record payment:
   - financial action only
   - insert/update payment records and totals such as `net_paid` / `payment_status`
   - never consume ingredients
   - never clear reservations only because payment happened
   - never move the kitchen ticket
4. Start Preparing:
   - this is the inventory-consumption boundary
   - call one idempotent server-side RPC
   - validate current order revision and its reservation
   - convert reserved demand into actual inventory consumption exactly once
   - update `inventory_balances` and immutable inventory/consumption ledgers
   - mark the reservation consumed/released according to the existing schema
   - set `preparing_at` and status `preparing`
   - move the card only after the RPC succeeds
5. Mark Ready and Complete:
   - record timestamps/status only
   - never consume inventory again
   - block Complete while balance is due unless the existing backend exposes an authorized override

Never implement privileged stock logic in the React Native client. Do not use `sales` as the order table. Preserve existing refund, reversal, unused/waste, audit, idempotency, optimistic-version, and revision protections.

## Main KDS behavior

### Orders tab

Contains both:

- `received`: new QR/delivery/staff orders, not yet reserved; card actions are Edit and Accept/Reject
- `accepted`: stock reserved, waiting for prep; primary action is Start Preparing

Always make the internal state visually obvious. New orders should trigger an audible/local alert without forcibly switching the user's current tab. Show a count badge on the tab.

### Preparing tab

Contains actively prepared orders. The timer is based on `preparing_at`. Primary action is Mark Ready. V1 uses whole-order completion, not per-item bumping or station routing.

### Ready tab

Contains finished orders awaiting service, takeaway, or delivery handoff. Emphasize customer name and fulfilment type. Timer is based on `ready_at`. If unpaid, show a strong payment-due state and a Record Payment action.

### Ticket hierarchy

Order number and elapsed timer are most prominent, followed by fulfilment/source, customer name, quantities/items, and highly visible modifiers such as `NO ONION` or `EXTRA CHEESE`. Financial information is secondary but always available. Use progressive timer urgency and ensure urgency is not expressed by colour alone.

## POS functions in the same app

- `+ New Order` opens a staff order composer using the same canonical menu/cart/order-line representation as customer QR ordering.
- Staff can search menu items, add quantities, modifiers, notes, customer name/phone, and Dine-in/Takeaway/Delivery.
- A newly saved manual order begins as `received`; offer Save or Save & Accept, with acceptance still going through the server RPC.
- Tapping a ticket opens Order Detail.
- Before acceptance, staff can edit freely through an idempotent revision RPC.
- After acceptance but before preparation, saving creates a new revision and atomically adjusts reservation deltas.
- After preparation begins, do not allow casual deletion. Use the existing adjustment workflow and require removed consumed demand to be classified as `unused` or `waste`.
- Support Cash, UPI, partial, and split payments using backend payment RPCs.
- Provide cancel/refund/reversal actions only when supported by the current server policy.
- Provide receipt view/print preparation, revision/audit history, recent completed orders, and operational recall. Recall must not reverse inventory by itself.

## Supabase integration

Before coding data access, inspect the live schema and generated types. Reuse existing canonical tables/RPCs and exact enum values rather than inventing near-duplicates. Expected domains include orders, order lines/revisions, payments, reservations, inventory ledgers/balances, staff access, and order/KDS history.

- Authenticate staff and authorize by branch/role.
- Use RLS and server-only privileged writes.
- Generate database types and keep service adapters typed.
- Wrap Supabase access behind a repository/service layer; screens must not contain raw queries.
- Subscribe to relevant order/payment changes with Supabase Realtime.
- On reconnect or app resume, reconcile with a fresh authoritative query; Realtime is an invalidation/notification path, not the sole source of truth.
- Deduplicate notifications and mutations with stable IDs/idempotency keys.
- Use optimistic UI only where safe. Kitchen state must roll back/show a clear error when an RPC fails.

## UI direction

Continue the existing starter aesthetic:

- warm cream/parchment background
- olive green actions and active states
- deep brown typography
- restrained amber/red for warnings and urgency
- rounded cards and sheets
- generous spacing, large touch targets, strong contrast
- serif display text paired with a highly readable sans-serif UI face

Do not make it look like a generic dark enterprise KDS. Keep visual polish, but kitchen readability and speed win over decoration. Replace the temporary circle mark with the real Mystic Roast owl asset when it is available.

## Architecture and quality requirements

- Keep domain types separate from transport/database types.
- Implement a production order repository interface and retain a mock adapter for Storybook/tests/dev preview.
- Use a query/cache strategy appropriate for React Native and ensure mutations cannot double-submit.
- Add loading, empty, offline, reconnecting, stale-data, permission-denied, out-of-stock, revision-conflict, and generic failure states.
- Add accessibility labels, minimum 44×44 touch targets, screen-reader-friendly status text, and non-colour urgency cues.
- Add unit tests for lifecycle guards/payment independence and component tests for the three tab filters and action states.
- Add an integration test or reproducible harness proving Start Preparing cannot consume the same revision twice.
- Keep secrets out of git; document required `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` variables.
- Do not add station routing, item-level bumping, staggered prep, or analytics in V1 unless needed by the current schema to avoid regression.

## Suggested implementation sequence

1. Inspect repo, `AGENTS.md`, schema, RPCs, and generated database types.
2. Write a short gap analysis mapping current UI actions to existing RPCs. Do not mutate the database yet.
3. Introduce typed service/repository boundaries and environment configuration.
4. Add staff auth/branch context and authoritative initial order query.
5. Replace mock lifecycle actions with idempotent RPC mutations.
6. Add Realtime plus reconnect reconciliation.
7. Implement production Create/Edit/Payment/History flows.
8. Add failure/offline/conflict states and tests.
9. Run TypeScript, lint, tests, Expo doctor, and a production export/build check.

At the end, report:

- files changed
- schema/RPCs reused
- any backend gaps found
- tests/checks run and exact outcomes
- remaining V1 work

Do not silently weaken any inventory or idempotency rule to make the UI easier.
