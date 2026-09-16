# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Mystic Roast domain rules

- Treat payment and kitchen state as independent.
- Submitting an order does not touch stock.
- Accepting atomically reserves the current revision through a server RPC.
- Starting preparation atomically consumes that reservation exactly once.
- Ready and Complete never consume inventory.
- Do not put privileged inventory or financial mutation logic in the client.
- Preserve revisions, idempotency, audit trails, refunds/reversals, and unused/waste handling.
