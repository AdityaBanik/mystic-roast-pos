# UI state and server state

The app uses **Zustand for drafts and shared UI choices**, and **TanStack Query
for saved orders, menu queries and pending mutations**. They have different jobs;
saved tickets are not duplicated in Zustand.

| State | Owner | Lifetime |
| --- | --- | --- |
| Cart items, notes, customer, table, drawer step, menu filter | Scoped Zustand cart store | Current new/edit-order screen |
| Selected kitchen tab | Scoped Zustand UI store | App session |
| Saved tickets and menu | TanStack Query cache through repository | Current provider/session |
| Pending order actions | TanStack Query mutations plus repository-runtime locks | Until action settles |
| Small component-only forms/confirmations | React local state | Component lifetime |

New Order is menu-first: add items, open the bottom cart drawer, review quantities
and notes, then continue to a separate customer/order-type step. Name is required;
phone is optional in preview. Dine-in requires a table number. Switching to
takeaway clears the table. Going back to the cart preserves customer details.
Closing the drawer preserves the draft; leaving the screen asks before discarding.
Drafts are not persisted across app restarts and the drawer is not swipe-driven.

## Why Query with RPCs?

An RPC is just the asynchronous function that reads or changes server data.
TanStack Query manages the surrounding loading/error states, cache, pending
mutations and refetching. It is useful, but not required by Supabase. It avoids
having to rebuild those behaviors manually in Zustand or React Context.

The current repository remains preview/unavailable only. Query calls that same
interface; installing Query does not enable live access or bypass authorization.
The React contexts only provide stable scoped stores/runtime dependencies.

## Safety rules

- Query keys contain mode, user and branch. A future authenticated provider must
  be recreated and its old cache cleared on logout or branch changes.
- No optimistic kitchen/payment updates: use only the returned canonical ticket.
- No automatic mutation retries. A deliberate retry retains its operation ID and
  expected version in the current session. No durable offline mutation queue.
- One action per order at a time; old mutation responses cannot downgrade newer
  cached versions. Version conflicts invalidate the order query.
- Native foreground changes trigger Query focus reconciliation. Preview queries
  work without connectivity. A live adapter must add native connectivity tracking,
  online query behavior and explicit offline mutation rejection before shipping.
- Exactly-once consumption is a server transaction/idempotency guarantee, not a
  feature that Zustand or Query can provide. Preview tests do not prove it.

## Live integration, ordered by dependency/risk — not implemented

1. Establish Supabase Auth and verified staff/branch authorization. Existing
   service-only RPCs need a trusted API; never put service credentials or a trusted
   actor ID in the mobile app. Backend changes are outside this task.
2. Resolve staff order creation and fulfilment persistence gaps. Do not silently
   map staff takeaway orders to the existing customer QR create function.
3. Connect the repository to canonical menu/ticket reads and `manage_order`, using
   expected version and durable operation UUIDs. Keep inventory and finance on
   the server. Test ambiguous responses and cross-device concurrency.
4. Wire branch-scoped `order_events` Realtime notifications to invalidate the
   relevant order queries. Refetch canonical tickets on reconnect/foreground;
   events should not locally calculate stock or balances. Clean up subscriptions
   and caches when changing scope. Avoid one subscription per screen.
5. Validate native connectivity, access revocation, revision conflicts, payments,
   refunds, unused/waste dispositions and server-side inventory guarantees.
6. Device QA for keyboard, bottom-sheet scrolling, accessibility, navigation and
   printing; then add approved production assets and historical reporting.

References: [TanStack Query React Native](https://tanstack.com/query/latest/docs/framework/react/react-native),
[scoped Zustand stores](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props).
