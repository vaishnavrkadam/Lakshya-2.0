# Implementation Notes / Important Caveats

## 1. Why the schema changed
The original schema keeps one slot/category/ticket directly on a participant. That creates a hard limit of one vertical per person. Lakshya 2.0 needs two independent bookings per person, so bookings must become first-class records.

## 2. Strongest booking architecture
For production, prefer a trusted backend callable such as `createBooking` and `adminAllocateBooking` that performs all multi-document mutations in one Firestore transaction.

Client-side Firestore transactions can still be used, but the security model becomes significantly easier to reason about when the server owns:
- capacity checks
- deterministic booking uniqueness
- QR token generation
- ticket ID generation
- slot reassignment
- audit logs

## 3. Google Form import
The Google Form is an intake mechanism. It is not the live authorization source by itself. Import/sync its approved rows into `registrations` before booking opens.

## 4. QR token
Generate the opaque `qrToken` with a cryptographically secure random source. Never derive it from email, ticket ID, timestamp, or name.

## 5. Rank display
The Firestore result order is the source for leaderboard display. Keep rank calculation in a utility so the tie-break policy is easy to change.
