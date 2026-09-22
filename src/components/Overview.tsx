import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, 
  Ticket, 
  Trophy, 
  Crosshair, 
  ArrowDown, 
  Maximize2,
  ChevronRight, 
  ChevronLeft,
  X,
  Phone,
  Mail,
  HelpCircle
} from 'lucide-react';

interface WeaponSpec {
  id: string;
  name: string;
  subtitle: string;
  sponsor: string;
  type: 'Air Rifle' | 'Air Pistol';
  caliber: string;
  velocity: string;
  cylinderPressure: string;
  barrelLength: string;
  weight: string;
  trigger: string;
  sights: string;
  description: string;
  features: string[];
  imageSrc: string;
}

const SPONSOR_WEAPONS: WeaponSpec[] = [
  {
    id: 'gandiva-pcp-match',
    name: 'Gandiva Match Pro X1',
    subtitle: 'Olympic Precision 10m Competition PCP',
    sponsor: 'Gandiva Aero-pneumatic Research and Equipments Pvt Ltd',
    type: 'Air Rifle',
    caliber: '.177 (4.5mm) Match Grade Flathead',
    velocity: '175 m/s (575 fps) Regulated Consistency',
    cylinderPressure: '300 Bar Ultra-High Pressure Carbon Tank',
    barrelLength: '450 mm Match Choked Lothar Walther',
    weight: '4.2 kg Balanced Match Weight',
    trigger: 'Two-Stage Fully Adjustable Match Blade (50g–100g)',
    sights: 'Precision 20-Click Micro-Diopter with Anti-Glare Iris',
    description: 'Developed by Gandiva Aero-pneumatic Research and Equipments Pvt Ltd (GARE), the Gandiva Match Pro X1 represents cutting-edge domestic aero-pneumatic engineering engineered specifically for ISSF 10m target competitions.',
    features: [
      'In-line pneumatic regulator with <0.8% velocity variance',
      'Anodized aerospace aluminum chassis with fully articulated cheekpiece',
      'Dry-fire training mechanism with zero hammer wear',
      'Counter-balanced recoil compensator for zero muzzle rise'
    ],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7YfMWFIBEEi_mjbxFAttfDm8j8x6FKwhMPoNQI_W5uEwcoYD3RGBhjZJ9yw9SvKOMAdjhJo61nPK8aWA9X5a-c1X0sRYp9RyojZ8FAFwVEuMGKVVHoU458tSIRshuqfuPnCUSPo_WxrsTOacaWpkY3KNYejtGSz8wSX_GWdKECsnIbAsCfE-oKK10BRXzO10hqpu-ZuGqqRBN2KEQ6jBrGstkdQ1TYYXxMtwjB7ed-MXs9BN8GEK7'
  },
  {
    id: 'achilles-x3',
    name: 'Achilles X3 Match PCP',
    subtitle: 'Championship Precision Match Rifle',
    sponsor: 'Precihole Sports',
    type: 'Air Rifle',
    caliber: '.177 (4.5mm) Competition Pellets',
    velocity: '180 m/s Regulated',
    cylinderPressure: '200 Bar Quick-Fill Pneumatic',
    barrelLength: '480 mm Precision Rifle Barrel',
    weight: '3.9 kg Match Stock',
    trigger: 'Precision Match 2-Stage Blade',
    sights: 'Tunnel Front Sight & Match Rear Aperture',
    description: 'A battle-tested 10-meter precision match rifle built for collegiate and national shooters requiring razor-thin grouping on regulation concentric rings.',
    features: [
      'Precision steel shroud with built-in air stripper',
      'Adjustable butt plate with vertical and tilt correction',
      'Ambidextrous match grip with stippled palm swell'
    ],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzFg3tQRHB7cudLZizC8trgWsot1b20hBrqKhBB1lQci07Qvxee2yixHvBSVBb15Lv6yJeSwhZHDbz3S6wWiZckd6GeszAN6oLYwvS0RLhtg26WF_GL2JCLzyK_sYB12rlqazOWLPZEMC1gY1oyEwuPhXU7GijVAcsyVpvwN13RBa1rKQwhrv_y9QAH_FpWtCoxmMikjsSxQn3nIS9EzeYUlRJmr7QAPH77AVkMgLrybjEg8E3H4Kj'
  },
  {
    id: 'minotaur-px120',
    name: 'PX120 Minotaur Tactical',
    subtitle: 'Tactical Bullpup Pneumatic Design',
    sponsor: 'Gandiva & Precihole Collaborative Display',
    type: 'Air Rifle',
    caliber: '.177 (4.5mm) High Ballistic Coefficient',
    velocity: '240 m/s Tactical Velocity',
    cylinderPressure: '250 Bar Titanium Cylinder',
    barrelLength: '520 mm Shrouded Barrel',
    weight: '3.6 kg Compact Tactical Format',
    trigger: 'Crisp Single-Stage Tactical Clean Break',
    sights: 'Picatinny Rail for Optical & Diopter Systems',
    description: 'Compact bullpup architecture shifting center of mass directly into the shooter’s shoulder pocket for superior stability and rapid stance transitions.',
    features: [
      'Bullpup forward linkage with zero trigger creep',
      'Integral suppressor baffle array for quiet discharge',
      'Side-lever biathlon-style cocking mechanism'
    ],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWtehKwhFga6uil6TEh6FH3hrpGlV1tdzZSLliAZMFtx93v9zlpydgE_AycK8i971gr6_pswnGCPCAGaSr-jLB90DIXTdAG1HjDT4Bc9uAQmxK9unGrC4hEo153CpTj9nQHbcChcvdND-vQDZz4r3YsKxv9rG7KQMP5KQViyd8smnG520GO0AoFjzmH24T1XA_n4QkHhUgBFWTcosk7Oab-T2C27k8vDa5eWHAunsj_WK46qSN6vr9'
  },
  {
    id: 'pp75-champion',
    name: 'PP75 Champion 10m',
    subtitle: 'Elite Single-Handed 10m Match Pistol',
    sponsor: 'Precihole Sports',
    type: 'Air Pistol',
    caliber: '.177 (4.5mm) Match Pellets',
    velocity: '150 m/s Regulated Match Velocity',
    cylinderPressure: '200 Bar Detachable Front Cylinder with Pressure Gauge',
    barrelLength: '240 mm Polygon Rifled Match Tube',
    weight: '980 grams ISSF Legal Match Weight',
    trigger: 'Ball-Bearing Supported 500g Regulation Trigger',
    sights: 'Micro-Click Elevation and Windage Rear Notch',
    description: 'The standard of competitive 10-meter air pistol shooting. Designed for uncompromised one-handed balance, micro recoil absorption, and razor sight picture stability.',
    features: [
      'Anatomical walnut grip with adjustable palm rest shelf',
      'Low bore axis directly aligned with wrist tendon',
      'Air stabilizer porting exhausting gas upward to counter muzzle jump'
    ],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2YxHqBWwye5JH3F1CUO5idebOBAd7Dm_SfN9nVR_CYm61oZftUd2XENOOHZKI-r7nrJehJ4sejJhBKW80wdb-4o4OoEFRgn4_-Fs2FCvFVTBOZOOw3YWm9af_FOAiECRRTtbhIRbYbXqDbhLSJrg8rJ5V7w8QLgQUkDi0BFhkqWWJYwwHJ-MgmxNbj8a2jPLJOMa_PHvnCNbI7B-YLxe3HfnGMeXn5ntimNCZv_dg5WAd_DqXYDMW'
  },
  {
    id: 'benchrest-special',
    name: 'Benchrest Special Extreme',
    subtitle: 'Sub-MOA Precision Bench Rest System',
    sponsor: 'Gandiva Aero-pneumatic Research and Equipments Pvt Ltd',
    type: 'Air Rifle',
    caliber: '.177 (4.5mm) Selected Match Lots',
    velocity: '190 m/s Flat Trajectory',
    cylinderPressure: '300 Bar Extended Capacity Reservoir',
    barrelLength: '550 mm Heavy Match Profile',
    weight: '4.8 kg Heavy Bench Platform',
    trigger: 'Ultralight Match Trigger (< 30 grams)',
    sights: 'Benchrest Optical Rail & High Precision Reticle Mounts',
    description: 'Engineered for extreme sub-millimeter group sizes at 10 to 25 meters, featuring a heavy harmonic resonance barrel collar and flat benchrest fore-end.',
    features: [
      'Wide flat aluminum fore-end for zero torque on mechanical rests',
      'Precision regulated air metering chamber',
      'Hand-lapped crown with 11-degree target bevel'
    ],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgO0ynpqlBonf0HHTJ_gcxKN8h4fMOmRPCq0T5fbPGp9Vy1rwYYMU389uEXYzrEYOB0DUURooxyXbBbUrl3rogW92BF40cgcaIgOljFnqptzPJ3HcwLgTjyPpAWeknULo0B1Uw6de9TqCFONeMFDdiEbkt80GYYXozhEcb7lDW6ienhVslFhfGjU0AUmmJ0BMxAti-fXl7zRgsQSFK1Nh0JgjH10nXDty-T0T67p74Pc6eEcoe5Dfd'
  },
  {
    id: 'pp55-match-pro',
    name: 'PP55 Match Pro Junior',
    subtitle: 'Match Precision Pistol',
    sponsor: 'Precihole Sports',
    type: 'Air Pistol',
    caliber: '.177 (4.5mm) Diabolo Pellets',
    velocity: '145 m/s Controlled Velocity',
    cylinderPressure: '200 Bar Pneumatic Reservoir',
    barrelLength: '210 mm Precision Barrel',
    weight: '850 grams Lightweight Match Frame',
    trigger: 'Adjustable Two-Stage Match Trigger',
    sights: 'Contrasting Target Notch Sight',
    description: 'Specially engineered for competitive shooters developing grip posture, breathing rhythm, and sight alignment without premature wrist muscle fatigue.',
    features: [
      'Modular grip inserts accommodating various hand sizes',
      'Smooth stroke cocking arm with low effort cycle',
      'Regulation ISSF minimum trigger weight compliance'
    ],
    imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXfcHTnPlL-zU2nQrBVz8IpOtwlNKSB8uLB2OlzZ7EG315-Xml8U7Zz_UzoyUWozXemR1ZLc9Dz3YmQ_scsVyz8RoAXIUs1iiwGcJ2yq67c-PYkSpjFo5w23s1fbcvxV3maUBdhlM5rZZ3L0-farO_NMsx7Uo_0_UUjyWFewXcOoTvT4sTzdSzqqsBEv7Wd3s4mt5R0ONSC-h6x-9sIbjWNRURYi7P_sjUx4_Odj5as2hyec_7tu8U'
  }
];

export default function Overview({ setView }: { setView: (v: string) => void }) {
  const { currentUser, registration, loginWithGoogle, setOnboardingOpen } = useAuth();
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponSpec | null>(null);

  // Gallery slider state (Single-Card Stack Display)
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<number>(0);

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % SPONSOR_WEAPONS.length);
  };

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + SPONSOR_WEAPONS.length) % SPONSOR_WEAPONS.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedWeapon) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWeapon]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    setDragOffset(currentX - dragStartRef.current);
  };

  const handleTouchEnd = () => {
    if (dragOffset > 70) {
      handlePrev();
    } else if (dragOffset < -70) {
      handleNext();
    }
    setDragOffset(0);
    setIsDragging(false);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - dragStartRef.current);
  };

  const handleMouseUp = () => {
    if (dragOffset > 70) {
      handlePrev();
    } else if (dragOffset < -70) {
      handleNext();
    }
    setDragOffset(0);
    setIsDragging(false);
  };

  // 1. Slot Booking CTA Handler
  const handleBookingCta = () => {
    if (!currentUser) {
      loginWithGoogle();
    } else if (!registration || !registration.eligible) {
      setOnboardingOpen(true);
    } else {
      setView('slot-booking');
    }
  };

  // 2. Retrieve Pass CTA Handler
  const handlePassCta = () => {
    if (!currentUser) {
      loginWithGoogle();
    } else {
      setView('digital-pass');
    }
  };

  // 3. Leaderboard CTA Handler
  const handleLeaderboardCta = () => {
    setView('live-leaderboard');
  };

  const currentWeapon = SPONSOR_WEAPONS[activeIdx];

  return (
    <div className="bg-[#0B0C10] text-[#E0E0E0] min-h-screen">
      {/* HERO SECTION: Centered Poster Typography & Co-Branded Presentation */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-[#222329] flex flex-col items-center justify-center text-center">
        {/* Concentric Target Background Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-[850px] h-[850px] rounded-full border border-white/20 flex items-center justify-center">
            <div className="w-[680px] h-[680px] rounded-full border border-white/30 flex items-center justify-center">
              <div className="w-[500px] h-[500px] rounded-full border border-white/40 flex items-center justify-center">
                <div className="w-[340px] h-[340px] rounded-full border-2 border-[#E51A1A]/70 flex items-center justify-center animate-pulse">
                  <div className="w-[180px] h-[180px] rounded-full border border-[#E51A1A]/90 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#E51A1A] shadow-[0_0_20px_#E51A1A]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute w-full h-[1px] bg-white/10"></div>
          <div className="absolute h-full w-[1px] bg-white/10"></div>
        </div>

        {/* Tactical Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E51A1A]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Center Content Box */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Main Title & Subtitle */}
          <div className="space-y-3 select-none">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter uppercase font-sans drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
              <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                LAKSHYA
              </span>
              <span className="ml-3 sm:ml-5 text-[#E51A1A] drop-shadow-[0_0_25px_rgba(229,26,26,0.6)]">
                2.0
              </span>
            </h1>

            <p className="text-sm sm:text-lg md:text-xl font-mono tracking-[0.25em] text-[#D0D0DA] uppercase font-bold">
              10M RIFLE AND PISTOL SHOOTING EXPERIENCE
            </p>
          </div>

          {/* Presented by NCC RVCE & GARE (with integrated logos) */}
          <div className="pt-2 pb-1 flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-[#12131A]/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-[#282B3A] max-w-fit mx-auto shadow-lg">
            <span className="font-mono text-xs sm:text-sm text-[#94A3B8] uppercase tracking-wider">
              Presented by
            </span>

            {/* NCC RVCE Logo & Label */}
            <div className="flex items-center gap-2">
              <img 
                src="/assets/logos/NCC Logo.png" 
                alt="NCC RVCE Logo" 
                className="h-6 sm:h-7 w-auto object-contain filter drop-shadow-[0_0_6px_rgba(220,38,38,0.4)]"
              />
              <span className="font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] tracking-wider uppercase">
                NCC RVCE
              </span>
            </div>

            <span className="text-[#DC2626] font-bold text-sm">✕</span>

            {/* GARE Logo & Label */}
            <div className="flex items-center gap-2">
              <img 
                src="/assets/logos/GARE Logo.png" 
                alt="GARE Logo" 
                className="h-6 sm:h-7 w-auto object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]"
              />
              <span className="font-mono text-xs sm:text-sm font-bold text-[#E51A1A] tracking-widest uppercase">
                GARE
              </span>
            </div>
          </div>

          {/* 3 PRIMARY CENTER ACTION BUTTONS */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
            {/* Button 1: Registering / Booking Slot */}
            <button
              onClick={handleBookingCta}
              className="w-full sm:w-auto px-8 py-4 bg-[#E51A1A] hover:bg-[#C41515] text-white font-bold text-sm tracking-wider uppercase rounded-lg shadow-[0_0_25px_rgba(229,26,26,0.4)] flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <Target className="w-5 h-5" />
              <span>Select Firing Slot</span>
            </button>

            {/* Button 2: Retrieving Pass */}
            <button
              onClick={handlePassCta}
              className="w-full sm:w-auto px-8 py-4 bg-[#1B1C24] hover:bg-[#252733] border border-[#3A3C4A] text-white font-bold text-sm tracking-wider uppercase rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <Ticket className="w-5 h-5 text-[#E51A1A]" />
              <span>Retrieve Digital Pass</span>
            </button>

            {/* Button 3: Live Leaderboard */}
            <button
              onClick={handleLeaderboardCta}
              className="w-full sm:w-auto px-8 py-4 bg-[#1B1C24] hover:bg-[#252733] border border-[#3A3C4A] text-white font-bold text-sm tracking-wider uppercase rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <Trophy className="w-5 h-5 text-[#E51A1A]" />
              <span>View Leaderboard</span>
            </button>
          </div>

          {/* Scroll Down Indicator */}
          <div className="pt-6 text-xs font-mono text-[#888892] flex items-center justify-center gap-2 animate-bounce">
            <ArrowDown className="w-4 h-4 text-[#E51A1A]" />
            <span>Scroll down to inspect official sponsor rifles & weapons</span>
          </div>
        </div>
      </section>

      {/* GALLERY DISPLAY: Single Weapon Card Showcase with Interactive Slide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 select-none">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#222329] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#E51A1A]">
              <Crosshair className="w-4 h-4" />
              <span>OFFICIAL MATCH ARMORY & EQUIPMENT</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-1 font-sans">
              Sponsor Weapons Gallery
            </h2>
          </div>
          <p className="text-xs font-mono text-[#888892] max-w-md md:text-right">
            Swipe or use controls to inspect models · Click active weapon to open full ballistic specifications.
          </p>
        </div>

        {/* Tactical Telemetry & Index Counter Bar */}
        <div className="flex items-center justify-between font-mono text-xs text-[#888892] px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E51A1A] animate-pulse"></span>
            <span className="text-white font-bold tracking-widest uppercase">
              MODEL {String(activeIdx + 1).padStart(2, '0')} / {String(SPONSOR_WEAPONS.length).padStart(2, '0')}
            </span>
            <span className="text-[#555666]">|</span>
            <span className="text-[#E51A1A] font-semibold">{currentWeapon.type}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {SPONSOR_WEAPONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`h-1.5 transition-all rounded-full ${
                  i === activeIdx ? 'w-8 bg-[#E51A1A]' : 'w-2 bg-[#2D2E3B] hover:bg-[#555666]'
                }`}
                title={`Go to model ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Gallery Interactive Viewport (Single Card Stack with Drag/Swipe Animation) */}
        <div className="relative max-w-3xl mx-auto my-4">
          {/* Background Card Preview (giving stacked 3D depth) */}
          <div className="absolute inset-0 max-w-2xl mx-auto scale-[0.94] translate-y-4 bg-[#0E0F14] border border-[#222329] rounded-2xl opacity-40 blur-[0.5px] pointer-events-none hidden sm:block"></div>

          {/* Active Front Card */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isDragging) {
                handleMouseUp();
              }
            }}
            onClick={() => {
              if (Math.abs(dragOffset) < 10) {
                setSelectedWeapon(currentWeapon);
              }
            }}
            style={{
              transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className="relative bg-[#14151C] border border-[#282B3A] hover:border-[#DC2626] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group transition-colors"
          >
            {/* Visual Header Strip */}
            <div className="px-6 py-4 bg-[#0E0F14] border-b border-[#222329] flex items-center justify-between">
              <span className="px-2.5 py-1 bg-[#E51A1A]/15 text-[#E51A1A] font-mono text-[10px] font-bold uppercase tracking-wider rounded">
                {currentWeapon.sponsor.includes('Gandiva') ? 'GARE SERIES' : 'PRECIHOLE MATCH'}
              </span>
              <span className="font-mono text-xs text-[#888892] flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-[#E51A1A]" />
                <span className="hidden sm:inline">Click for Specs</span>
              </span>
            </div>

            {/* High-Resolution Weapon Image Profile */}
            <div className="h-64 sm:h-80 bg-[#090A0E] flex items-center justify-center p-6 relative overflow-hidden">
              <img
                src={currentWeapon.imageSrc}
                alt={currentWeapon.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] group-hover:scale-105 transition-transform duration-500"
              />

              <div className="absolute top-4 left-4 font-mono text-[10px] text-[#666677] uppercase tracking-widest">
                PRECISION TARGET ARCHITECTURE
              </div>

              <div className="absolute bottom-3 right-4 px-3 py-1 bg-[#0B0C10]/90 border border-[#2D2E3B] text-[10px] font-mono text-[#E51A1A] font-bold uppercase tracking-wider rounded">
                [ Click Card to Inspect ]
              </div>
            </div>

            {/* Card Information Body */}
            <div className="p-6 sm:p-8 space-y-4">
              <div>
                <span className="font-mono text-xs text-[#E51A1A] uppercase tracking-wider block font-bold">
                  {currentWeapon.subtitle}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-0.5 font-sans">
                  {currentWeapon.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#888892] mt-1 leading-relaxed">
                  {currentWeapon.description}
                </p>
              </div>

              {/* Technical Specifications Matrix */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#222329] font-mono text-xs">
                <div className="bg-[#0B0C10] p-2.5 rounded border border-[#222329]">
                  <span className="block text-[9px] text-[#666675] uppercase">CALIBER</span>
                  <span className="text-white font-bold">{currentWeapon.caliber.split(' ')[0]}</span>
                </div>
                <div className="bg-[#0B0C10] p-2.5 rounded border border-[#222329]">
                  <span className="block text-[9px] text-[#666675] uppercase">VELOCITY</span>
                  <span className="text-white font-bold">{currentWeapon.velocity.split(' ')[0]} m/s</span>
                </div>
                <div className="bg-[#0B0C10] p-2.5 rounded border border-[#222329]">
                  <span className="block text-[9px] text-[#666675] uppercase">PRESSURE</span>
                  <span className="text-white font-bold">{currentWeapon.cylinderPressure.split(' ')[0]} Bar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Left & Right Tactical Slider Navigation Controls */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrev}
              className="px-5 py-2.5 bg-[#14151C] hover:bg-[#E51A1A] border border-[#282B3A] text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg flex items-center gap-2 transition-all shadow-md group"
            >
              <ChevronLeft className="w-4 h-4 text-[#E51A1A] group-hover:text-white" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-mono text-[#666675] hidden sm:block">
              Drag or use arrow keys to navigate
            </span>

            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#14151C] hover:bg-[#E51A1A] border border-[#282B3A] text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg flex items-center gap-2 transition-all shadow-md group"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 text-[#E51A1A] group-hover:text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* DETAILED BLUEPRINT MODAL: Single Weapon Specifications */}
      {selectedWeapon && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedWeapon(null)}
        >
          <div 
            className="bg-[#12131A] border border-[#2D2E3B] text-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red Accent Top Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#E51A1A] to-transparent z-10"></div>

            {/* Pinned Sticky Header with Close Button */}
            <div className="shrink-0 px-6 py-4 sm:px-8 sm:py-5 border-b border-[#22232E] flex items-start justify-between gap-4 bg-[#12131A] z-10">
              <div>
                <span className="text-[10px] font-mono text-[#E51A1A] tracking-widest uppercase font-bold">
                  {selectedWeapon.sponsor}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5 font-sans">
                  {selectedWeapon.name}
                </h3>
                <p className="text-xs font-mono text-[#8E909E]">{selectedWeapon.subtitle}</p>
              </div>

              <button
                onClick={() => setSelectedWeapon(null)}
                className="p-2 text-[#888A98] hover:text-white hover:bg-[#1E1F29] rounded-lg transition-colors border border-transparent hover:border-[#333544]"
                title="Close Blueprint"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* High-res Modal Image */}
              <div className="h-44 sm:h-52 bg-[#090A0E] rounded-xl border border-[#22232E] flex items-center justify-center p-4">
                <img
                  src={selectedWeapon.imageSrc}
                  alt={selectedWeapon.name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#B0B2C0] leading-relaxed">
                {selectedWeapon.description}
              </p>

              {/* Technical Ballistics Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#0B0C10] p-4 rounded-xl border border-[#22232E] text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#666675] uppercase block">Caliber</span>
                  <span className="font-semibold text-white">{selectedWeapon.caliber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#666675] uppercase block">Muzzle Velocity</span>
                  <span className="font-semibold text-white">{selectedWeapon.velocity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#666675] uppercase block">Working Pressure</span>
                  <span className="font-semibold text-white">{selectedWeapon.cylinderPressure}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#666675] uppercase block">Barrel Length</span>
                  <span className="font-semibold text-white">{selectedWeapon.barrelLength}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#666675] uppercase block">Total Weight</span>
                  <span className="font-semibold text-white">{selectedWeapon.weight}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#666675] uppercase block">Match Trigger</span>
                  <span className="font-semibold text-white">{selectedWeapon.trigger}</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-[#E51A1A] uppercase tracking-wider font-bold block">
                  Engineering Specifications
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#9FA1B0]">
                  {selectedWeapon.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#E51A1A] font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pinned Sticky Bottom: ALWAYS VISIBLE CLOSE BUTTON */}
            <div className="shrink-0 px-6 py-4 sm:px-8 border-t border-[#22232E] flex items-center justify-between bg-[#0E0F15] z-10">
              <span className="text-[11px] font-mono text-[#6E7080] hidden sm:inline">
                Official competition arm approved by NCC Range Safety Officers.
              </span>
              <button
                onClick={() => setSelectedWeapon(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1B1C24] hover:bg-[#E51A1A] hover:text-white border border-[#3A3C4A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-bold rounded-lg transition-all text-center"
              >
                [ Close Data ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. FOR QUERIES SECTION: Clean, styled, and fully responsive */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#222329]">
        <div className="bg-[#12131A] border border-[#282B3A] rounded-xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          {/* Subtle accent bar on top of card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#DC2626] to-transparent"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282B3A] pb-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                EVENT SUPPORT & COORDINATION
              </span>
              <h2 className="font-headline-sm text-2xl sm:text-3xl text-[#F8FAFC] uppercase font-serif mt-1">
                For Queries
              </h2>
            </div>
            <span className="text-xs font-mono text-[#64748B]">
              NCC RVCE Event Directorate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Contact 1 */}
            <div className="bg-[#0B0C10] border border-[#282B3A] p-4 rounded-lg space-y-1.5 hover:border-[#DC2626]/60 transition-colors">
              <div className="text-[#64748B] text-[10px] uppercase tracking-wider font-semibold">
                Cadet Senior Under Officer
              </div>
              <div className="text-[#F8FAFC] font-bold text-sm">
                CSUO Nandan Naniyappa
              </div>
              <a 
                href="tel:+917676707058"
                className="inline-flex items-center gap-2 text-[#DC2626] hover:text-[#E51A1A] font-semibold text-xs pt-1 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>+91 7676707058</span>
              </a>
            </div>

            {/* Contact 2 */}
            <div className="bg-[#0B0C10] border border-[#282B3A] p-4 rounded-lg space-y-1.5 hover:border-[#DC2626]/60 transition-colors">
              <div className="text-[#64748B] text-[10px] uppercase tracking-wider font-semibold">
                Senior Under Officer
              </div>
              <div className="text-[#F8FAFC] font-bold text-sm">
                SUO Jai Surya
              </div>
              <a 
                href="tel:+917899916500"
                className="inline-flex items-center gap-2 text-[#DC2626] hover:text-[#E51A1A] font-semibold text-xs pt-1 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>+91 7899916500</span>
              </a>
            </div>

            {/* Email Contact */}
            <div className="bg-[#0B0C10] border border-[#282B3A] p-4 rounded-lg space-y-1.5 hover:border-[#DC2626]/60 transition-colors">
              <div className="text-[#64748B] text-[10px] uppercase tracking-wider font-semibold">
                Official Helpdesk Email
              </div>
              <div className="text-[#F8FAFC] font-bold text-sm">
                Email
              </div>
              <a 
                href="mailto:nccrvce@rvce.edu.in"
                className="inline-flex items-center gap-2 text-[#DC2626] hover:text-[#E51A1A] font-semibold text-xs pt-1 transition-colors break-all"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>nccrvce@rvce.edu.in</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
