# Trusted backend functions

These callable functions provide the secure transaction layer for Lakshya 2.0.

- `createBooking` — self booking, one per vertical
- `adminAllocateBooking` — admin/manual allocation
- `checkInBooking` — QR validation + one-time attendance stamping
- `adminSetScore` — live score update / DQ

The Firebase Admin SDK bypasses Firestore security rules, so every callable function performs its own authorization and validation.

Before deployment, review the Firebase project/app ID convention and replace `LAKSHYA_APP_ID` as appropriate for the deployed namespace.
