<div align="center">
  <img src="public/assets/logos/Lakshya.webp" alt="Lakshya 2.0 Logo" width="120" />
  <h1>LAKSHYA 2.0 — Event Command & Range Operations Platform</h1>
  <p><strong>Annual Air Rifle & Air Pistol Shooting Championship Platform — Shaurya Committee × NCC RVCE</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React 18.3" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.7" />
    <img src="https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white" alt="Vite 6.2" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4.0" />
    <img src="https://img.shields.io/badge/Firebase-Firestore_%7C_Auth_%7C_Hosting-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
  </p>
</div>

---

## Overview & Problem Statement

Organizing a collegiate competitive shooting championship involves coordinating **hundreds of student participants** across multiple disciplines (**10m Air Rifle** and **10m Air Pistol**), enforcing strict firing-bay capacity limits per relay slot, verifying range check-ins at physical entry gates, recording round-by-round target scores, computing gender-wise and discipline-wise standings in real time, and issuing verified participation and merit certificates.

**Lakshya 2.0** replaces fragmented spreadsheets and manual paper passes with a unified, real-time web platform built for the **Shaurya Committee & National Cadet Corps (NCC), Rashtreeya Vidyalaya College of Engineering (RVCE)** in technical partnership with **Gagan Narang Sports Promotion Foundation (GNSPF) — House of Glory** and **Khelo India**.

---

## Key Features

### Participant Experience
- **Google OAuth & Institutional Eligibility Verification (`AuthContext`, `OnboardingModal`):** Sign in with Google (`@rvce.edu.in` or registered email), match against the pre-registered intake roster (`registrations`), and complete gender division onboarding (`Men` / `Women`) for division-specific leaderboards.
- **Atomic Relay Slot Booking (`SlotBooking`):** Browse live firing slots filtered by date (`2026-09-26` and `2026-09-27`) and discipline (`Air Rifle` / `Air Pistol`). Transactional booking enforces per-slot capacity limits (`slots.booked < slots.capacity`), prevents duplicate bookings per discipline (`{eventId}_{email}_{verticalSlug}`), and blocks overlapping time slots across disciplines on the same date.
- **Digital Firing Pass & QR Code Generation (`DigitalPass`):** Generates a high-contrast QR firing pass (`qrcode.react`) with print/PDF support and direct **Google Calendar** event links.
- **Participant Profile & Digital Scorecard (`Profile`):** View round-by-round (3 rounds × 5 shots) shot breakdowns, official totals, inner-10 (`X`) counts, and live booking status across disciplines.
- **Eco-Verified Certificate Pipeline (`CertificateRequestModal`, `src/lib/certificates.ts`):** Checked-in participants upload sapling-plantation proof (client-side compressed JPEG via HTML5 Canvas) for admin verification, unlocking high-resolution **Participation** and **Top-3 Merit** certificates rendered dynamically on HTML5 Canvas with custom typography (`Playfair Display`, `Cinzel`) and exported as PDF or PNG.
- **Live Public Leaderboard (`LiveLeaderboard`):** Real-time standings filterable by discipline (`Air Rifle` / `Air Pistol`), gender division (`Men` / `Women`), and competition stage (`Qualification` vs. `Top-10 Finals`), ranked by total score, inner-10 count, and reverse round tie-breakers (`src/lib/ranking.ts`).
- **Interactive Range Briefing & Arsenal Showcase (`Overview`):** Detailed breakdown of 8 indigenous and match-grade air weapons (*G10-Karbin, Viper, Falcon Thumbhole/Beech Wood, GM10 Club, AP-X, Bhim, Theseus*), range safety protocols, and competition schedule.

### Range Safety Officer (RSO) & Admin Command Suite
- **Operations Dashboard (`AdminDashboard`):** Real-time telemetry across total registrations, active relay occupancy, check-in progress, scored relays, and quick operational shortcuts.
- **Live Camera & Hardware QR Check-In (`AdminScan`):** Real-time webcam QR scanner (`jsQR` + `navigator.mediaDevices.getUserMedia`), uploaded QR image decoding, and USB barcode/QR scanner support. Validates slot assignment, prevents duplicate check-ins, and records immutable audit logs.
- **Relay Slot Management (`AdminSlots`):** Create, edit, activate/deactivate, or bulk-seed Day 1 & Day 2 firing relays (including Men's & Women's Championship Finals slots) and reconcile slot booking counts against active bookings.
- **Manual Allocation & Reassignment (`AdminAllocations`):** Force-allocate, move, or cancel participant bookings across relays with transactional seat-count adjustment.
- **Target Scoring & Finals Qualification (`AdminLeaderboard`):** Interactive 3-round × 5-shot scoring workflow with inner-10 (`X`) tracking, disqualification (`DQ`) management, and automated **Top-10 Finals Shortlisting** per discipline and gender division.
- **Intake Roster, Certificates & Reports (`AdminRegistrations`, `AdminCertificates`, `AdminReports`, `AdminAudit`):** Search/edit participant intake records, review sapling verification requests, calibrate certificate typography live (`certificateConfig.ts`), export official PDF/CSV range rosters and results (`jspdf` + `jspdf-autotable`), and inspect the immutable operational audit trail (`audit_logs`).

---

## System Architecture & Data Model

```mermaid
flowchart LR
  subgraph Intake["1. Registration Intake"]
    GF["Google Form / Sheets"] -->|Apps Script Trigger| GAS["seed/GoogleAppsScript_Lakshya.js"]
  end

  subgraph Firebase["2. Firebase Backend"]
    Auth["Firebase Auth (Google OAuth)"]
    FS[("Cloud Firestore\n/artifacts/{APP_ID}/public/data/*")]
    Rules["Firestore Security Rules\n(RBAC & Transactional Constraints)"]
    CF["Cloud Functions (Optional)\nfunctions/src/index.ts"]
  end

  subgraph Client["3. React 18 + TypeScript SPA"]
    Student["Participant Portal\n(Overview, SlotBooking, DigitalPass,\nProfile, LiveLeaderboard)"]
    Admin["RSO / Admin Suite\n(Dashboard, Scan, Slots, Allocations,\nScoring, Registrations, Certificates, Reports)"]
  end

  GAS -->|REST Upsert| FS
  Student <-->|Auth Token| Auth
  Admin <-->|Admin Allowlist| Auth
  Student <-->|Real-Time Listeners & Transactions| Rules
  Admin <-->|Real-Time Listeners & Transactions| Rules
  Rules <--> FS
  CF -.->|Admin SDK (Optional)| FS
```

### Firestore Collection Hierarchy
All collections reside under `/artifacts/{APP_ID}/public/data/`:

| Collection | Document ID Format | Purpose |
| :--- | :--- | :--- |
| `registrations` | `{normalizedEmail}` | Authoritative participant intake roster, vertical eligibility (`Air Rifle`, `Air Pistol`, `Both`), and gender division. |
| `slots` | `{slotId}` | Firing relays, date/time windows, discipline (`vertical`), `capacity`, `booked` counter, and `isActive` state. |
| `bookings` | `{appId}_{email}_{verticalSlug}` | Individual discipline firing passes, check-in timestamps, DQ status, and score references. |
| `leaderboard_entries` | `{bookingId}` | Public live standings with `totalScore`, `innerTens`, `roundScores`, `gender`, and `isFinalist` flags. |
| `scorecards` | `{bookingId}` | Detailed 3-round × 5-shot arrays (`roundScores`, `shots`, `innerTens`, `totalScore`) for official scoring. |
| `certificate_requests` | `{normalizedEmail}` | Sapling verification photo (`saplingImageData`), review status, and certificate download telemetry. |
| `system_settings` | `certificate_config` | Live typography and coordinate configuration for dynamic certificate rendering. |
| `audit_logs` | Auto-ID | Immutable append-only operational trail for check-ins, manual allocations, scoring, and DQs. |

For complete field-level schemas, composite indexes, and entity relationships, see **[`DATABASE_SCHEMA_LAKSHYA_2_0.md`](DATABASE_SCHEMA_LAKSHYA_2_0.md)**.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18.3, TypeScript 5.7, Vite 6.2 |
| **Styling & Icons** | Tailwind CSS 4.0 (`@tailwindcss/vite`), Lucide React |
| **Backend & Database** | Firebase Authentication (Google Sign-In), Cloud Firestore (real-time listeners + ACID transactions), Firebase Hosting |
| **QR & Media Processing** | `qrcode.react` (QR pass rendering), `jsqr` (webcam & image QR scanning), HTML5 Canvas API (image compression & certificate rendering) |
| **Document & Report Export** | `jspdf` & `jspdf-autotable` (PDF firing passes, certificates, relay rosters & leaderboard reports), CSV export utilities |
| **Automation & Cloud** | Google Apps Script (`seed/GoogleAppsScript_Lakshya.js`), Firebase Cloud Functions v2 (`functions/`) |

---

## Repository Structure

```text
Lakshya-2.0/
├── public/
│   └── assets/
│       ├── certificates/                  # High-res WebP & PNG fallback certificate templates
│       ├── logos/                         # Official RVCE, NCC, GARE & Lakshya logos + favicon
│       └── weapons/                       # Optimized WebP weapon gallery & thumbnails
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminAllocations.tsx       # Admin manual booking, slot moves & cancellations
│   │   │   ├── AdminAudit.tsx             # Immutable operational audit log viewer
│   │   │   ├── AdminCertificates.tsx      # Sapling proof review, layout calibration & cert issuer
│   │   │   ├── AdminDashboard.tsx         # Live range telemetry & operational command overview
│   │   │   ├── AdminLayout.tsx            # Admin navigation shell & role guard
│   │   │   ├── AdminLeaderboard.tsx       # Round-by-round scoring UI, DQ control & Finals qualifier
│   │   │   ├── AdminRegistrations.tsx     # Intake roster search, eligibility & walk-in registration
│   │   │   ├── AdminReports.tsx           # PDF & CSV export for relay rosters and final standings
│   │   │   ├── AdminScan.tsx              # Live camera/USB QR firing pass scanner & check-in gate
│   │   │   └── AdminSlots.tsx             # Relay slot CRUD, capacity reconciliation & schedule seeding
│   │   ├── CertificateRequestModal.tsx    # Participant sapling upload & certificate download modal
│   │   ├── DigitalPass.tsx                # Digital QR firing pass, print view & Google Calendar link
│   │   ├── Header.tsx                     # Navigation bar, auth switcher & role-aware tabs
│   │   ├── LiveLeaderboard.tsx            # Live filterable public standings (Discipline / Gender / Finals)
│   │   ├── OnboardingModal.tsx            # First-login gender division confirmation modal
│   │   ├── Overview.tsx                   # Landing page, interactive arsenal showcase & schedule briefing
│   │   ├── Profile.tsx                    # Participant booking dashboard, scorecard & certificate portal
│   │   └── SlotBooking.tsx                # Real-time relay selector with conflict & capacity guards
│   ├── config/
│   │   ├── certificateConfig.ts           # Certificate coordinate defaults & Firestore sync helpers
│   │   └── lakshya.ts                     # Event dates, admin allowlist, slot seeds & discipline constants
│   ├── context/
│   │   └── AuthContext.tsx                # Firebase Auth state, registration listener & RBAC provider
│   ├── lib/
│   │   ├── bookingPayload.ts              # Deterministic booking & leaderboard payload builders
│   │   ├── certificates.ts                # HTML5 Canvas certificate renderer & PDF/PNG generators
│   │   ├── firebase.ts                    # Firebase SDK initialization & environment configuration
│   │   ├── ranking.ts                     # ISSF-style tie-breaker sorting & podium rank calculation
│   │   └── reports.ts                     # PDF/CSV generator for relay sheets and results
│   ├── types/
│   │   └── lakshya.ts                     # Core TypeScript domain interfaces
│   ├── App.tsx                            # Root view router & lazy-loaded module orchestration
│   ├── index.css                          # Tailwind v4 configuration, tactical theme tokens & print CSS
│   └── main.tsx                           # Application entrypoint
├── functions/                             # Optional Firebase Cloud Functions (Node 20 / TypeScript)
├── seed/
│   ├── GoogleAppsScript_Lakshya.js        # Google Forms/Sheets -> Firestore automated intake sync script
│   └── slot-template.json                 # Sample Firestore slot document schema
├── DATABASE_SCHEMA_LAKSHYA_2_0.md         # Comprehensive Firestore ER diagram & collection specification
├── firebase.json                          # Firebase Hosting, Firestore rules/indexes & Functions config
├── firestore.indexes.json                 # Composite Firestore indexes for slots, bookings & leaderboard
└── firestore.rules                        # Production Firestore security rules
```

---

## Local Development Setup

### Prerequisites
- **Node.js** `>= 20.x` and **npm** `>= 10.x`
- A **Firebase project** with **Authentication** (Google provider enabled) and **Cloud Firestore** enabled.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/vaishnavrkadam/Lakshya-2.0.git
cd Lakshya-2.0
npm ci
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the repository root and populate it with your Firebase Web App configuration:
```bash
cp .env.example .env
```

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_APP_ID_PATH=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_APP_ENV=production
VITE_EVENT_ID=lakshya-2.0
VITE_REGISTRATION_FORM_URL=https://forms.google.com/REPLACE_ME
```
> **Note on Firebase Client Identifiers:** `VITE_FIREBASE_*` values are standard public Firebase Web SDK identifiers bundled at build time. Access control is enforced server-side via [`firestore.rules`](firestore.rules) and Firebase Authentication.

### 3. Start the Development Server
```bash
npm run dev
```
The app will start at `http://localhost:5173`.

### 4. Type-Check & Build for Production
```bash
# Type-check TypeScript sources and build optimized production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Firebase Deployment & Operations

### Deploying Security Rules, Indexes, and Hosting
The frontend uses direct client-side Firestore transactions guarded by [`firestore.rules`](firestore.rules), allowing full production operation on the **Firebase Spark (Free) plan** without requiring Cloud Functions billing:

```bash
# Authenticate with Firebase CLI
npx firebase-tools login

# Deploy Firestore security rules and composite indexes
npx firebase-tools deploy --only firestore:rules,firestore:indexes

# Build and deploy frontend to Firebase Hosting
npm run build
npx firebase-tools deploy --only hosting
```

### Optional: Deploying Cloud Functions (Blaze Plan)
An optional backend callable function suite is provided in [`functions/`](functions/README.md) for server-side transactional enforcement if upgrading to the Firebase Blaze plan:
```bash
cd functions
npm ci
npm run build
npx firebase-tools deploy --only functions
```

### Google Sheets Intake Automation (`seed/GoogleAppsScript_Lakshya.js`)
To sync Google Form participant registrations directly into Firestore:
1. Open your Google Sheet linked to the registration form and navigate to **Extensions → Apps Script**.
2. Paste the contents of [`seed/GoogleAppsScript_Lakshya.js`](seed/GoogleAppsScript_Lakshya.js).
3. In **Project Settings → Script Properties**, set:
   - `FIREBASE_API_KEY`: Your Firebase Web API key
   - `ADMIN_PASSWORD`: Password for the designated Firebase Auth admin sync account
4. Run `setupTrigger()` once to register an automatic `onFormSubmit` trigger, or run `syncAllRegistrations()` for a full manual sync.
