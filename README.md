# Mystic Roast KDS / POS

Tablet-first staff application for Mystic Roast, built with Expo SDK 57, React Native, TypeScript, and Expo Router. The same app adapts to staff phones.

## Included in this starter

- Three kitchen workflow tabs: **Orders**, **Preparing**, and **Ready**
- Responsive one-, two-, or three-column ticket grid
- New customer orders and accepted orders in one Orders tab
- Direct actions for Accept, Start Preparing, Mark Ready, and Complete
- Independent unpaid, part-paid, and paid state
- Completion guard when payment remains due
- Staff order composer with Mystic Roast menu samples
- Order detail screen with customer, payment, revision, and lifecycle context
- Warm cream, olive, and brown Mystic Roast visual system
- Typed domain model and an in-memory store designed to be replaced by Supabase adapters

## Run locally

```bash
npm install
npm run start
```

Then open the project in Expo Go, an Android/iOS simulator, or press `w` for web.

## Current boundary

This repository is an interactive UI starter. It deliberately uses mock data and does **not** mutate the live Mystic Roast Supabase project.

The production integration must preserve these rules:

1. Customer/staff submission performs no stock action.
2. Accept atomically validates and reserves the current order revision.
3. Payment is financial only; it does not consume inventory or move kitchen status.
4. Start Preparing atomically converts the current reservation to consumption exactly once.
5. Ready and Complete do not consume stock again.
6. Edits before preparation create a revision and recalculate reservation deltas.
7. Reductions after preparation require an explicit `unused` or `waste` classification.

See [docs/CODEX_IMPLEMENTATION_PROMPT.md](docs/CODEX_IMPLEMENTATION_PROMPT.md) for the full implementation handoff.
