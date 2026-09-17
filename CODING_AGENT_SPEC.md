# LAKSHYA 2.0 — CODING AGENT MASTER SPEC

## 1. Mission
Build a production-ready event-registration, dual-discipline slot-booking, ticket/QR, attendance, live-leaderboard and admin-management website for **Lakshya 2.0**.

Lakshya 2.0 is a yearly shooting event where participants shoot with **Air Rifle** and/or **Air Pistol**.

The current header layout/navigation is already defined and should remain structurally recognisable. Only the visual design system should be redesigned.

The three logos in the header will be supplied by the owner. Do not replace them with placeholder logo art in production.

## 2. Non-negotiable design direction

### Typography
Do NOT use:
- Inter
- Roboto
- Arial
- Space Grotesk
- system sans-serif

Use a distinctive display typeface for headlines (examples: Instrument Serif, Playfair Display, Space Mono) and a restrained humanist/serif family for body/UI copy.

Recommended direction:
- Headlines: Instrument Serif or Playfair Display
- UI/body: IBM Plex Sans, Source Sans 3, or another clearly specified non-system humanist family
- Technical identifiers / ticket IDs: Space Mono

### Palette
Do NOT use:
- purple/indigo gradients
- pure black `#000000` backgrounds
- floating radial glow blobs

Preferred visual direction:
- warm editorial cream / bone background
- charcoal / ink text
- one deliberate safety-orange / amber accent
- restrained borders, no decorative noise

Suggested palette tokens:
- `--paper: #F3EEE3`
- `--paper-2: #E8E0D2`
- `--ink: #171717`
- `--muted: #6F6A61`
- `--accent: #E79A19`
- `--line: #CFC6B6`
- `--success: #315D4C`
- `--danger: #9B2C2C`

These are design suggestions, not hard requirements; maintain the same visual logic.

### Layout
Avoid:
- generic 4-card bento grids
- centered hero image mockups
- decorative logo clouds
- meaningless stat strips
- empty cards that only contain borders
- lazy all-caps pill badges with arbitrary letter spacing

Use:
- asymmetric editorial grid
- strong typographic hierarchy
- purposeful whitespace
- visible section dividers
- compact utilitarian tables for admin data
- motion that reinforces navigation/state changes

### Motion
Use subtle, functional animation:
- route/page reveal
- slot availability transitions
- ticket generation reveal
- leaderboard rank movement
- QR/ticket reveal
- table filtering
- modal transitions

Do not use perpetual decorative animations.

## 3. Routes / screens

### Public
1. `/` or Overview
2. `/slot-booking`
3. `/digital-pass`
4. `/live-leaderboard`
5. `/profile`
6. `/register`
7. `/admin/*`

Keep the existing header's high-level navigation structure: Overview, Slot Booking, Digital Pass, Live Leaderboard, Profile, Admin, and the account control.

### Admin routes
- `/admin`
- `/admin/registrations`
- `/admin/slots`
- `/admin/bookings`
- `/admin/attendance`
- `/admin/leaderboard`
- `/admin/reports`
- `/admin/scan`
- `/admin/audit`

## 4. Google Login + registration eligibility

### Required flow
1. User clicks Google login.
2. Firebase Google OAuth completes.
3. Normalize `auth.email` to lowercase.
4. Look up `registrations/{email}`.
5. If registration exists and is eligible, open Profile / Slot Booking.
6. If registration does not exist, show a clear onboarding state:
   - explain that registration is required before slot booking
   - primary action: `CLICK HERE TO REGISTER`
   - open the configured Google Form URL
7. Do not create a booking for an unregistered email.

### Important distinction
Google authentication is **identity verification**, not event registration.

The imported/directly-entered event registration record is the source of truth for whether a person is allowed to book.

## 5. Participant profile

The profile page should show:
- registered name
- registered email
- registration details available from `registrations`
- Air Rifle booking, if any
- Air Pistol booking, if any
- date/time of each booked slot
- ticket ID
- QR code for each booking
- check-in/attendance state for each booking
- live score and position per vertical, when available
- logout button

A person can therefore have **two separate digital passes**, one per vertical.

## 6. Slot booking rules

### Core rule
A user may book at most one slot in each vertical:
- one Air Rifle booking maximum
- one Air Pistol booking maximum

A person may book both verticals.

### Slot document
Every slot belongs to one vertical and one event date/time. Capacity is defined per slot.

Current source schema states:
- Air Rifle capacity = 18
- Air Pistol capacity = 6

Use these as the initial capacities unless the admin changes slot configuration before launch.

### Booking UX
1. User selects vertical.
2. UI loads available dates/times for that vertical.
3. Capacity is visible as available/total.
4. Full slots are disabled.
5. User confirms.
6. Booking transaction runs atomically.
7. A booking document is created.
8. Slot `booked` count increments atomically.
9. A ticket ID and opaque QR token are generated.
10. The booking pass appears immediately in the profile/digital-pass page.

### Concurrency
Do not implement booking as separate `read -> write -> increment` operations. It must be atomic using Firestore transaction logic or a trusted callable/backend transaction.

## 7. Ticket + QR design

### Ticket ID
Use a human-friendly ID such as:
`TKT-7F2A9C`

### QR payload
QR should not expose unnecessary personal information.

Canonical payload fields:
- version
- eventId
- bookingId
- ticketId
- vertical
- qrToken
- issuedAt

The QR is a verification credential, not the source of truth. On scan, the admin portal must validate the token against Firestore.

### Scan flow
1. Admin opens Scan.
2. Camera scanner reads the QR.
3. Client parses the payload.
4. Client fetches the booking by `bookingId`.
5. Validate `ticketId`, `vertical`, `qrToken`.
6. If invalid, show `INVALID PASS`.
7. If valid and not checked in, show participant and booking details + `MARK ATTENDED`.
8. Admin confirms.
9. Booking is atomically updated to checked-in state.
10. Repeat scan of an already checked-in pass must show `ALREADY ATTENDED` and the original timestamp/operator rather than creating another check-in.

## 8. Admin manual allocation

Admin must be able to:
- search a registered person by name/email
- choose Air Rifle or Air Pistol
- choose a slot
- allocate manually
- optionally override a full slot with an explicit override permission
- generate ticket + QR exactly like normal booking
- change/reassign a booking before event start
- cancel a booking

Every manual change should create an `audit_logs` record.

Never silently mutate slot counts. Reassignment/cancellation must adjust counts atomically.

## 9. Admin dashboard

The admin dashboard should provide useful operational summaries rather than decorative cards.

Minimum dashboard data:
- total registered people
- total Air Rifle bookings
- total Air Pistol bookings
- unbooked registered people
- checked-in Air Rifle
- checked-in Air Pistol
- remaining capacity by vertical
- registrations/bookings by date

Use compact tables, progress bars, and charts only where they answer an operational question.

## 10. Slot management

Admin can:
- create slot
- edit date/time
- edit capacity
- enable/disable slot
- view current booked count
- view participant list for slot

Slot list should support filters:
- date
- vertical
- availability state

## 11. Registration management

Admin registration page should show:
- name
- email
- source (`google_form`, `manual`, `imported`)
- registration time
- eligible flag
- booking status for each vertical
- overall booking status

There must be a dedicated view:
`Registered but not booked`

This means:
- no Air Rifle + no Air Pistol booking, or
- optionally a vertical-specific unbooked list

Provide filters for both.

## 12. Live leaderboard

There are **two independent leaderboards**:
- Air Rifle
- Air Pistol

Never merge their rankings.

### Participant view
When a logged-in registered participant opens Live Leaderboard:
- show the relevant vertical leaderboard(s)
- highlight their own row
- show score
- show rank when score exists
- show `SCORE NOT UPDATED` when score has not been entered yet

### Ranking rule
Default ordering:
1. score descending
2. tie-breaker: latest score update ascending (or an explicitly configured tie-break rule)
3. stable fallback: participant name ascending

The implementation must isolate ranking logic in one utility so the event can change tie-breaking later.

### Score range
Admin score input should accept `0–10` for the event's current live-score panel.

Allow decimal values if the event uses decimal shot scores.

### Dynamic updates
Use Firestore realtime listeners so score changes are reflected without a full page reload.

## 13. Score administration

Admin leaderboard panel should allow:
- find participant/booking
- enter score
- edit score
- mark DQ
- enter notes
- update score

Score should be attached to the vertical-specific booking, not to a single global participant document.

When a score changes, update:
- `leaderboard_entries`
- booking score fields / denormalized summary as defined in schema
- `updatedAt`

Create an audit entry for score edits.

## 14. Reports

Admin Reports page must have a button to generate a PDF report.

### Report 1 — Slot roster
For every slot:
- date
- time
- vertical
- capacity
- booked count
- participant names
- participant emails
- ticket IDs
- attendance state

### Report 2 — Registered but not booked
Separate report/page containing registered users with no booking for the selected vertical or all verticals.

### Report 3 — Occupancy
Separate page/section showing each slot and:
- capacity
- booked
- remaining
- occupancy percentage

### Implementation
Client-side PDF generation with `jsPDF` + `autoTable` is acceptable. Keep report creation deterministic and printable. No decorative cover page is required.

## 15. Header

Keep the existing header layout/navigation concept.

Three logos are injected as real assets by the owner.

The redesign should focus on:
- stronger typography
- editorial spacing
- sharper active-nav treatment
- better account control
- better mobile collapse
- no glossy gaming-dashboard look

The navigation should remain usable at desktop and mobile widths.

## 16. Local caching

The original project used localStorage mirrors. Retain caching only as a rendering optimization.

Firestore must remain authoritative.

Never trust localStorage for:
- eligibility
- capacity
- booking ownership
- QR validity
- score
- attendance

Suggested versioned keys:
- `lakshya20_registrations_v1`
- `lakshya20_slots_v1`
- `lakshya20_bookings_v1`
- `lakshya20_leaderboard_v1`

## 17. Security requirements

### Admin
Only the verified admin identities configured in Firebase security rules should access admin data/actions.

### Participant
Authenticated users can read their own profile-related data.

They must not be able to:
- alter their score
- alter another user's booking
- mark themselves attended
- change capacity
- create a booking for another email
- change another user's QR token

### Public/client input
Never rely on hidden UI controls as authorization.

Security must be enforced in Firestore rules and, for complex operations, trusted backend code.

## 18. Suggested frontend libraries

Use the existing app stack where possible.

Compatible choices:
- Firebase Auth
- Firebase Firestore
- React Router
- QR rendering: `qrcode.react` or `react-qr-code`
- QR scanning: `html5-qrcode`
- PDF: `jspdf` + `jspdf-autotable`
- Charts only where genuinely useful
- Motion: Framer Motion or a light CSS/WAAPI solution

Do not add large libraries for problems that can be solved with CSS or the existing stack.

## 19. Data loading strategy

### Participant pages
Prefer direct lookups by normalized email and booking references.

### Admin pages
Use indexed queries and pagination where appropriate.

### Leaderboard
Query `leaderboard_entries` by vertical and score ordering. Do not calculate rank by reading every participant document on every UI render.

For the highlighted user's exact rank, compute from the same ordered result set or implement a backend rank query if scale requires it.

## 20. Acceptance criteria

The build is not complete until all of the following work:

### Identity
- Google login succeeds.
- Existing registered person can log in.
- Unregistered Google account is redirected to the registration Google Form.
- Logout works.

### Booking
- Registered person can book Air Rifle once.
- Registered person can book Air Pistol once.
- Same person can book both.
- Same vertical cannot be booked twice by the same person.
- Full slots cannot be overbooked under concurrent attempts.

### Pass
- Every booking has unique ticket ID.
- Every booking has unique QR token.
- Both verticals produce separate passes.
- QR scan validates and check-in is recorded exactly once.

### Admin
- Admin can manually allocate.
- Admin can view slot rosters.
- Admin can see registered-but-unbooked.
- Admin can see occupancy.
- Admin can generate PDF report(s).
- Admin can upload/update scores.

### Leaderboard
- Air Rifle ranking is independent.
- Air Pistol ranking is independent.
- Scores update live.
- User's own row is highlighted.
- Unscored user sees a clear pending state.

### Security
- Non-admin cannot access admin functions.
- Participant cannot change protected booking/score/attendance fields.
- QR token is verified server-side / against Firestore before check-in.

## 21. Environment contract

At minimum provide:
- Firebase API key / auth domain / project ID / storage bucket / messaging sender ID / app ID
- `VITE_REGISTRATION_FORM_URL`
- `VITE_EVENT_ID=lakshya-2.0`

Do not commit real production secrets to the repository.

## 22. Build order for the coding agent

1. Read the existing codebase and preserve current route/header structure.
2. Replace only the visual system and page layouts.
3. Implement Firebase auth + registration eligibility.
4. Implement revised Firestore data model.
5. Implement atomic booking.
6. Implement digital passes + QR.
7. Implement admin allocation and scan/check-in.
8. Implement leaderboard and score administration.
9. Implement PDF reports.
10. Add security rules/tests.
11. Add responsive behavior.
12. Run a final end-to-end acceptance test.

## 23. Do not do

- Do not collapse both verticals into one participant `category` field.
- Do not keep a single `slotId` on the user as the source of booking truth.
- Do not use client-side localStorage as authorization.
- Do not expose email/name inside QR unless there is a specific operational requirement.
- Do not make admin authorization depend solely on a hidden frontend route.
- Do not implement capacity updates as non-atomic writes.
- Do not use banned fonts or visual styles listed above.
