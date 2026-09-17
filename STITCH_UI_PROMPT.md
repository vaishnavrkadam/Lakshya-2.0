# STITCH UI GENERATION PROMPT: SHAURYA-LAKSHYA 2.0
> **System Prompt for Google Stitch & Generative UI Tools**  
> **Event:** NCC Air Rifle & Pistol Shooting Championship — Lakshya 2.0  
> **Hosts:** RV College of Engineering (RVCE) · 2/2 Coy 6 Karnataka Battalion NCC (Bangalore 'A' Group Kar & Goa Directorate) · Rashtreeya Sikshana Samithi Trust  
> **Official Industry Partner:** Gandiva Aero-pneumatic Research and Equipments Pvt Ltd (GARE)  
> **Range Equipment Partner:** Precihole Sports  

---

## 🎯 High-Level Objective
Generate a complete, responsive, tactical web UI for **SHAURYA-LAKSHYA 2.0**, an event management and live range tracking platform for an elite collegiate Air Rifle & Pistol shooting competition.

The entire aesthetic, typography, and visual hierarchy must be crafted **strictly around the visual theme of the official event poster**:
- Dark tactical carbon / matte black theme (`#0B0C10`, `#121318`, `#1B1C22`).
- Centered distressed military stencil typography for the event title.
- Concentric sniper crosshair / circular target reticle background.
- High-contrast combat crimson red accents (`#E51A1A` / `#DC2626`) and chalk-white lettering.
- Distinctive co-branding for **Gandiva Aero-pneumatic Research and Equipments Pvt Ltd (GARE)** and **NCC RVCE**.
- Clean, focused hero section featuring **only the Event Title in the center** and **3 primary action buttons**.
- Smooth scrolling down into an animated sponsor weapon showcase featuring interactive popup blueprints.

---

## 🎨 Design System & Visual Tokens

### 1. Color Palette
- **Backgrounds:**
  - Base Dark: `#0B0C10` (Tactical Carbon Black)
  - Card/Panel Background: `#12131A` (Gunmetal Matte)
  - Section Header / Elevate: `#171822` (Graphite Shadow)
  - Subtle Overlay / Well: `#0E0F14`
- **Accents & Combat Brand Colors:**
  - Primary Brand Crimson: `#E51A1A` (Target Bullseye Red)
  - Hover Crimson: `#C41515`
  - Glow Shadow: `rgba(229, 26, 26, 0.4)`
  - Tactical Gold / Amber: `#F59E0B` (Leaderboard & Medals)
  - Verified Green: `#10B981` (Check-in & Eligibility)
- **Typography & Borders:**
  - Display Title White: `#FFFFFF` (Clean Chalk White)
  - Distressed Red: `#E51A1A` (Title "2.0")
  - Body Text: `#D0D2DE`
  - Muted Technical Labels: `#888998`
  - Borders & Rings: `#262733` / `rgba(255, 255, 255, 0.15)`

### 2. Typography Rules
- **Event Title ("LAKSHYA 2.0"):** Heavy, weathered military stencil or bold distressed display grotesque (`font-black`, uppercase, tracking-tight).
  - `"LAKSHYA"` in stark chalk white with subtle text drop-shadow.
  - `"2.0"` in high-impact textured combat crimson (`#E51A1A`).
- **Sub-Headlines & Badges:** Monospace / technical grotesque (e.g. `Space Mono`, `IBM Plex Mono`, or `JetBrains Mono`), uppercase, tracked wide (`tracking-[0.25em]`).
- **Body & Metrics:** Clean humanist sans-serif (`IBM Plex Sans` or `Source Sans 3`) with crisp numeric tabular figures (`font-mono` for times, scores, ticket IDs).

---

## 📐 Page Structure & Layout Blueprints

### 1. Institutional Header & Logo Bar
Place at the very top of the page:
- **Left Crest:** Rashtreeya Sikshana Samithi Trust & RV College of Engineering crests.
- **Center / Co-Branded Lockup:**
  - Badge with `"NCC RVCE"` ✕ `"GARE"` (Gandiva Aero-pneumatic Research and Equipments Pvt Ltd bow & arrow logo).
  - Text: `"PRESENTS"`
- **Right Context:** 2/2 Coy 6 Karnataka Battalion NCC · Bangalore 'A' Group Kar & Goa Directorate.
- **Company Legal Branding:** Full legal entity name displayed:  
  **`Gandiva Aero-pneumatic Research and Equipments Pvt Ltd`**

---

### 2. Centered Hero Section (Strict Landing Page Constraint)
The hero view must center strictly on the event title and 3 core actions:

1. **Background Concentric Target Rings:**
   - 4 concentric circular target rings centered on the screen imitating the official 10m target card in the poster.
   - Outer rings in thin translucent white (`border-white/20`).
   - Center inner ring in glowing crimson (`#E51A1A`) with crosshair hash marks intersecting at center.
2. **Center Event Title:**
   - Word 1: **`LAKSHYA`** (Giant distressed stencil typography in white).
   - Word 2: **`2.0`** (Giant distressed stencil typography in `#E51A1A`).
   - Subtitle: **`10M RIFLE AND PISTOL SHOOTING EXPERIENCE`** (Uppercase technical monospace tracking).
3. **Poster Badge Highlights Bar:**
   - Compact tactical pills beneath the title:
     - 🎯 `15 SHOTS`
     - 🌱 `PLANT A SAPLING`
     - 📅 `26th & 27th SEPTEMBER`
     - 📍 `RVCE CAMPUS`
     - 🏆 `TOP 8 TO FINALS`
     - ⚔️ `FEATURING WEAPON DISPLAY PCP AIR RIFLES`
     - 🎖️ `10 ACTIVITY POINTS`
     - 💰 `REGISTRATION FEE ₹350/-`
4. **Three Primary Center Buttons (No Clutter):**
   - **Button 1 (Primary Crimson Fill):** `[ 🎯 Select Firing Slot / Register ]`
     - Triggers slot booking or onboarding form.
   - **Button 2 (Gunmetal Bordered):** `[ 🎫 Retrieve Digital Pass ]`
     - Checks user authentication; if not logged in, opens Google login modal; if logged in, displays their official pass with QR code, slot time, and ticket ID.
   - **Button 3 (Ghost Translucent):** `[ 📊 Live Leaderboard Access ]`
     - Opens instant real-time live standings with Male/Female filtering.
5. **Scroll Indicator:**
   - Bouncing down-chevron: *"Scroll down to inspect official sponsor rifles & weapons"*.

---

### 3. Scrolling Down: Sponsor Weapons Showcase (PCP Air Rifles & Pistols)
When scrolling down, reveal an interactive weapon display sponsored by **Gandiva Aero-pneumatic Research and Equipments Pvt Ltd (GARE)** and **Precihole Sports**:

- **Section Title:** `FEATURING WEAPON DISPLAY · PCP AIR RIFLES & MATCH PISTOLS`
- **Subtext:** Indigenous Aero-Pneumatic Technology engineered by Gandiva & Olympic Standards by Precihole Sports.
- **Weapons Grid (3 columns on desktop, 1 on mobile):**
  1. **Gandiva Match Pro X1** — Olympic Precision 10m Competition PCP (300 Bar Carbon, .177 Caliber, Choked Match Barrel, Micro-Diopter).
  2. **Achilles X3 Match PCP** — Precision Match Grade PCP Target Rifle.
  3. **PX120 Minotaur Tactical** — Bullpup Design with Center-of-Mass Shoulder Stability.
  4. **PP75 Champion 10m** — Elite Single-Handed 10m Air Pistol (Anatomical Walnut Grip).
  5. **Benchrest Special Extreme** — Sub-MOA Heavy Match Benchrest Platform.
  6. **PP55 Match Pro Junior** — Cadet Match Precision Air Pistol.
- **Card Micro-Interactions:**
  - Card hover lifts by 6px with a subtle crimson border glow.
  - Image scales up subtly (`scale-105`) with smooth transition.
  - Clicking any card triggers an **animated modal popup** detailing full ballistics:
    - Caliber (`.177 / 4.5mm`)
    - Regulated Muzzle Velocity (`175 m/s`)
    - Cylinder Working Pressure (`200–300 Bar`)
    - Match Trigger Specifications (`2-Stage Adjustable 50g–100g`)
    - Engineering Highlights (`Recoil compensator, In-line regulator, Anti-glare diopter`)
    - CTA in popup: `[ Book Slot with Weapon ]`

---

### 4. Digital Pass & Authentication Flow
- **Authentication:** Google OAuth authentication.
- **Pass Retrieval Modal / Screen:**
  - If unauthenticated, displays: *"Sign in with your registered Google account to retrieve your official firing range digital pass."*
  - If authenticated & booked, renders the tactical **Digital Pass**:
    - Pass Header: `LAKSHYA 2.0 OFFICIAL FIRING CREDENTIAL`
    - Participant Name & Verified Email.
    - Discipline Badge: `Air Rifle (10m)` or `Air Pistol (10m)`.
    - Ticket ID in monospace: `TKT-8A3F2C`.
    - Firing Slot Window: `26th September 2026 · 10:00 - 11:00 HRS`.
    - Real-Time Attendance Status: `Checked In` (Green) or `Pending Range Arrival` (Amber).
    - Centered dynamic QR Code with encrypted validation token for Range Safety Officer scanner station.
    - `[ Print Pass / Save PDF ]` action button.

---

### 5. Slot Booking System (Schedule & Rules)
- **Dates & Slots:**
  - **26th September:** 8 hourly slots (08:00 to 16:00 HRS) — 60 participants capacity per slot.
  - **27th September:** 8 hourly slots (08:00 to 16:00 HRS) — 60 participants capacity per slot.
- **Disciplines:** Air Rifle (10m) and Air Pistol (10m).
- **Rules:**
  - Only pre-approved emails on the allowlist can book.
  - Real-time remaining capacity bar (e.g., `42 / 60 Slots Filled`).
  - One booking per discipline per email enforced at database level.
  - Atomic confirmation with auto-generated Ticket ID and QR code.

---

### 6. Live Leaderboard System (Tie-Breaker & Gender Filtering)
- **Filter Tabs:**
  - Vertical Switcher: `[ Air Rifle Standings ]` | `[ Air Pistol Standings ]`
  - Gender Filter Tabs: `[ All Categories ]` | `[ Male ]` | `[ Female ]`
  - Live Search Box: Fast search by shooter name or ticket ID.
- **Leaderboard Table Columns:**
  - `Rank` (Gold medal #1, Silver #2, Bronze #3, #4+).
  - `Shooter Details` (Name, Email, Gender tag).
  - `Tie-Breaker Stats`: Count of 10s (`X × 10s`), Count of 9s (`Y × 9s`), Penalty points.
  - `Final Net Score` (0.0 to 10.9 or multi-shot total).
  - `Status`: `Verified` (Green) or `Disqualified` (Red).
- **Tie-Breaker Ranking Hierarchy:**
  1. Total Net Score (Highest first)
  2. Count of 10s (Highest first)
  3. Count of 9s (Highest first)
  4. Count of 8s (Highest first)
  5. Earliest Score Timestamp

---

### 7. Range Official & Admin Scoring Interface
- **Access Control:** Restricted strictly to authorized admin emails (`ADMIN_EMAILS`).
- **Expandable Participant Scoring Cards:**
  - Click a shooter card to expand their official 10-shot scorecard.
  - **Round Selector:** Round 1 (Official), Round 2 (Re-Entry), Round 3...
  - **10 Individual Shot Inputs:** Number inputs (0.0 to 10.9) for Shots 1 through 10.
  - **Penalty Points Deduction:** Input for rule deductions.
  - **Live Automatic Calculation:**
    - Shots Sum = `Shot 1 + ... + Shot 10`
    - Net Score = `max(0, Shots Sum - Penalty)`
    - Real-time count of 10s and 9s.
  - **Disqualification Checkbox:** Mark specific scorecard/round as DQ without wiping other rounds.
  - **Schedule Management:** Single-click seeding of 26th & 27th September schedules (8 slots, 60 capacity each).
  - **Email Allowlist Bulk Import:** Textarea to paste raw lists of approved emails/names for instant authorization.
  - **CSV Data Export:** Direct download buttons for:
    - Full Registrations CSV
    - Bookings & Attendance CSV
    - Detailed 10-Shot Scores & Leaderboard CSV

---

## 💻 Sample Tailwind CSS Component Snippet: Centered Hero & 3 Buttons

```tsx
<div className="relative min-h-[90vh] flex flex-col items-center justify-center text-center bg-[#0B0C10] px-4 overflow-hidden">
  {/* Concentric Sniper Reticle Backdrop */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
    <div className="w-[700px] h-[700px] rounded-full border border-white/20 flex items-center justify-center">
      <div className="w-[500px] h-[500px] rounded-full border border-white/30 flex items-center justify-center">
        <div className="w-[300px] h-[300px] rounded-full border-2 border-[#E51A1A]/80 flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 rounded-full bg-[#E51A1A]"></div>
        </div>
      </div>
    </div>
    <div className="absolute w-full h-[1px] bg-white/10"></div>
    <div className="absolute h-full w-[1px] bg-white/10"></div>
  </div>

  {/* Co-Branding Banner */}
  <div className="relative z-10 flex items-center gap-2 px-4 py-1.5 mb-6 bg-[#161720] border border-[#2D2E3B] rounded-full text-xs font-mono text-[#A0A2B2]">
    <span className="font-bold text-white">NCC RVCE</span>
    <span className="text-[#E51A1A]">✕</span>
    <span className="font-bold text-[#E51A1A]">GARE</span>
    <span className="text-[#6E7080]">· Gandiva Aero-pneumatic Research & Equipments</span>
  </div>

  {/* Poster Stencil Typography Event Title */}
  <div className="relative z-10 space-y-3 select-none">
    <p className="text-xs sm:text-sm font-mono tracking-[0.35em] text-[#888998] uppercase">
      PRESENTS
    </p>
    <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter uppercase font-sans">
      <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">LAKSHYA</span>
      <span className="ml-3 text-[#E51A1A] drop-shadow-[0_0_30px_rgba(229,26,26,0.6)]">2.0</span>
    </h1>
    <p className="text-xs sm:text-base md:text-lg font-mono tracking-[0.25em] text-[#D0D2DE] uppercase font-bold">
      10M RIFLE AND PISTOL SHOOTING EXPERIENCE
    </p>
  </div>

  {/* 3 Central Primary Action Buttons */}
  <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xl">
    <button className="w-full sm:w-auto px-8 py-4 bg-[#E51A1A] hover:bg-[#C41515] text-white font-bold text-sm tracking-wider uppercase rounded-lg shadow-[0_0_25px_rgba(229,26,26,0.4)] transition-all hover:scale-105 active:scale-95">
      Select Firing Slot
    </button>
    <button className="w-full sm:w-auto px-8 py-4 bg-[#1B1C24] hover:bg-[#252733] border border-[#3A3C4A] text-white font-bold text-sm tracking-wider uppercase rounded-lg transition-all hover:scale-105 active:scale-95">
      Retrieve Digital Pass
    </button>
    <button className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-white/5 border border-white/30 text-white font-bold text-sm tracking-wider uppercase rounded-lg transition-all hover:scale-105 active:scale-95">
      Live Leaderboard
    </button>
  </div>
</div>
```

---

## 🚀 Execution Instructions for Stitch
1. Generate the entire UI based on this theme: strictly preserve the dark tactical contrast, concentric target reticle graphics, distressed stencil title styling, and the exact 3 center button layout.
2. Ensure **Gandiva Aero-pneumatic Research and Equipments Pvt Ltd (GARE)** is prominently credited alongside **NCC RVCE**.
3. Include the scrolling sponsor weapon display with animated popup cards that open detailed ballistic specs when clicked.
4. Provide the login modal flow for participants retrieving passes or booking slots.
5. Provide the Live Leaderboard with gender toggles (Male / Female / All) and tie-breaker statistics (count of 10s, 9s).
