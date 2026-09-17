# Lakshya 2.0 — Coding Agent Build Package

This package is the implementation handoff for the Lakshya 2.0 shooting-event website.

## Product
Lakshya 2.0 is an annual Air Rifle / Air Pistol shooting event. The existing header navigation/layout should remain structurally the same, but the visual design should be replaced according to `CODING_AGENT_SPEC.md`.

The three header logos will be supplied separately by the project owner and should be placed in `public/assets/logos/`.

## Core Firebase model
The app uses Google Authentication + Cloud Firestore. The new model intentionally separates:
- registration identity/data (`registrations`)
- event slot inventory (`slots`)
- actual vertical-specific bookings (`bookings`)
- live leaderboard data (`leaderboard_entries`)
- operational audit history (`audit_logs`)

This is necessary because one person may participate in both Air Rifle and Air Pistol, which cannot be modeled safely as a single slot/category on one participant record.

## Important implementation rule
A user may have at most **one booking per vertical**. Therefore the system supports:
- Air Rifle only
- Air Pistol only
- both Air Rifle + Air Pistol

Each booking gets its own Ticket ID and QR payload.

## Files
- `CODING_AGENT_SPEC.md` — complete build brief, UX, flows, acceptance criteria and implementation guidance
- `DATABASE_SCHEMA_LAKSHYA_2_0.md` — revised Firestore schema
- `firestore.rules` — baseline security rules
- `firestore.indexes.json` — recommended query indexes
- `src/types/lakshya.ts` — TypeScript contract for frontend/admin code
- `src/config/lakshya.ts` — constants and environment configuration
- `src/lib/bookingPayload.ts` — canonical QR payload creation/parsing helpers
- `seed/slot-template.json` — slot document template
- `.env.example` — environment variable contract

## Existing-project integration
Copy these files into the existing project rather than starting a second app. Preserve the existing header route structure and navigation labels unless the coding agent has a reason to rename a route.

## Trusted backend
The `functions/` directory contains the recommended callable transaction layer for production. The frontend should call these functions for self booking, manual allocation, QR check-in and score updates rather than trying to perform privileged multi-document mutations from the browser.
