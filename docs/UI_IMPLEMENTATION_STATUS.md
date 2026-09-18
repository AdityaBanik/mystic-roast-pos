# Frontend-only implementation — 2026-09-18

No backend, Supabase data, SQL, grants, RLS policies, functions or publications were changed.

## Current operating mode

Development defaults to a clearly labeled in-memory preview. Set
`EXPO_PUBLIC_ORDER_MODE=preview` explicitly to build a preview export. Any other
configured value, or an unset value in production, selects an unavailable adapter:
there is no silent fallback to sample data when a live connection fails.

All preview mutations are simulated. No inventory balances, recipe demand,
financial transactions or privileged database calls run in the app. Preview data
resets on reload. Sample identifiers must never be submitted to a live API.

## Implemented

- Exact kitchen/payment/source values, independent revision and version, and
  consumed-revision awareness. Missing fulfilment and private phone remain unknown
  when decoding a real ticket.
- Board with Orders/Preparing/Ready, visible new/reserved states, textual timer
  urgency, accessible actions, loading/retry/empty states and refund-attention link.
- Full cash/UPI and split-tender payment/refund forms, paise precision, input
  validation, explicit confirmation, no received-order payment, and no unsupported
  partial settlement or completed-order override.
- Searchable sample menu, quantities, combo selections, notes, preview customer
  and fulfilment controls, Save and Save & Accept. Unsaved drafts prompt before
  navigation; stale edit versions cannot silently overwrite newer state.
- Menu-first ordering with a bottom cart drawer and separate customer/order-type
  step. Dine-in requires a table; takeaway clears it. Customer phone is optional
  in preview. This does not change the live create RPC's requirements.
- Scoped Zustand cart/UI stores and TanStack Query for saved tickets/menu,
  native foreground refetching, pending actions and branch/user-scoped query keys.
  See [state management and integration plan](STATE_MANAGEMENT.md).
- Editing with stable line identities, immutable existing selections/prices,
  explicit unused/waste classifications, and Prepare Added Items for unconsumed
  revisions. Ready edits return to Preparing.
- Reject/cancel with reasons and preparation disposition; cancelled refunds stay
  visible in history/settlements.
- Session history/search, payment entries, event history, selectable/shareable
  preview receipts, and connection/settings information.
- Async repository interface, preview/unavailable adapters, mutation locks, stable
  in-session retry IDs, stale response protection, and resume reconciliation.
- Strict ticket decoder and manage_order payload builder that excludes client
  prices and actor IDs. No speculative server endpoint is called.
- Unit tests for guards, filters, monetary precision, conflict/replay behavior,
  edits, dispositions, refunds and transport mapping.

## Not implemented / dependent on unchanged backend

1. Live data access, Supabase Auth, actual staff/branch provisioning and Realtime.
   Public order RPCs are service-only; a verified server API must supply actor ID.
   No such API was found, and no Edge Function was deployed.
2. Live staff creation, optional walk-in contacts, editable customer headers,
   fulfilment and delivery-source persistence: current RPC/schema gaps remain.
3. Partial payment, received-order payment, completed-order refunds/payment
   corrections, recall and unpaid completion: unsupported by existing policy.
4. Durable/offline mutation outbox, persistent retry IDs across process restarts,
   live stale/offline/permission/stock error integration, and incoming-order sound
   alerts: require a real connection and device verification.
5. Full historical revision snapshots, private customer contact projection and
   full live payment/audit reads: current ticket RPC does not expose them.
6. Physical printing, tax invoice configuration, real owl asset and native-device
   accessibility/visual verification remain pending.
7. No live concurrency/inventory tests were run. Preview tests demonstrate UI
   behavior only and do not prove database consumption exactly once.

## Verification commands

`npm test`, `npm run typecheck`, `npm run lint`,
`npx expo export --platform web`, `npx expo-doctor`.

Results: 26/26 tests passed, including cart validation, isolated drafts, pending
mutation locks, stable retry IDs and stale mutation-response protection.
TypeScript, lint and diff whitespace checks passed.
Default production web export passed. Explicit preview export passed for web,
Android and iOS (JavaScript/Hermes bundles, not signed native application builds).
The preview export is generated under the ignored `.expo/ui-preview-export`.

Expo Doctor reports the pre-existing package-lock.json/pnpm-lock.yaml conflict.
The untracked pnpm lockfile was preserved rather than deleted. Browser automation
was unavailable in this environment; no visual/device QA is claimed.

The local Node 23.10 runtime produces engine warnings for Expo/Metro dependencies;
use a supported Node LTS release. Lockfile synchronization also reports 14 moderate
dependency advisories; no broad/forced dependency upgrades were applied.
