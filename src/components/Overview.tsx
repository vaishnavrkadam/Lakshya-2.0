import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Crosshair, 
  Calendar, 
  Trophy, 
  ShieldCheck, 
  ChevronRight, 
  Target, 
  Clock, 
  MapPin, 
  ExternalLink,
  Award,
  Ticket,
  Sparkles,
  Info,
  X,
  Flame,
  ArrowDown
} from 'lucide-react';
import { REGISTRATION_FORM_URL } from '../config/lakshya';

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
    imageSrc: '/achilles.jpg'
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
    imageSrc: '/achilles.jpg'
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
    imageSrc: '/minotaur.jpg'
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
    imageSrc: '/pp75.jpg'
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
    imageSrc: '/benchrest.jpg'
  },
  {
    id: 'pp55-match-pro',
    name: 'PP55 Match Pro Junior',
    subtitle: 'Cadet Match Precision Pistol',
    sponsor: 'Precihole Sports',
    type: 'Air Pistol',
    caliber: '.177 (4.5mm) Diabolo Pellets',
    velocity: '145 m/s Controlled Velocity',
    cylinderPressure: '200 Bar Pneumatic Reservoir',
    barrelLength: '210 mm Precision Barrel',
    weight: '850 grams Lightweight Cadet Frame',
    trigger: 'Adjustable Two-Stage Match Trigger',
    sights: 'Contrasting Target Notch Sight',
    description: 'Specially engineered for cadet shooters developing grip posture, breathing rhythm, and sight alignment without premature wrist muscle fatigue.',
    features: [
      'Modular grip inserts accommodating various hand sizes',
      'Smooth stroke cocking arm with low effort cycle',
      'Regulation ISSF minimum trigger weight compliance'
    ],
    imageSrc: '/pp55.jpg'
  }
];

export default function Overview({ setView }: { setView: (v: string) => void }) {
  const { currentUser, registration, loginWithGoogle, setOnboardingOpen } = useAuth();
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponSpec | null>(null);

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

  return (
    <div className="bg-[#0B0C10] text-[#E0E0E0] min-h-screen">
      {/* Institutional Top Bar (Matching Poster Header) */}
      <section className="border-b border-[#222329] bg-[#0E0F14] py-3 text-center px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="text-left">
            <div className="text-[10px] tracking-widest uppercase text-[#888890]">
              Rashtreeya Sikshana Samithi Trust
            </div>
            <div className="font-semibold text-white tracking-wide">
              RV COLLEGE OF ENGINEERING
            </div>
            <div className="text-[10px] text-[#A0A0AA]">
              2/2 COY 6 KARNATAKA BATTALION NCC · BANGALORE 'A' GROUP KAR & GOA DIRECTORATE
            </div>
          </div>

          {/* Co-Branding Title */}
          <div className="flex items-center gap-3 bg-[#17181F] px-4 py-1.5 rounded-full border border-[#2D2E36]">
            <span className="font-bold tracking-wider text-white">NCC RVCE</span>
            <span className="text-[#E51A1A] font-extrabold text-sm">✕</span>
            <div className="flex items-center gap-1.5">
              {/* Bow and Arrow Vector for GARE */}
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M18 6H9M18 6V15" />
                <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
              </svg>
              <span className="font-bold tracking-widest text-[#E51A1A]">GARE</span>
            </div>
          </div>

          {/* Company Legal Name */}
          <div className="text-right hidden lg:block">
            <div className="text-[9px] uppercase tracking-widest text-[#888890]">Official Industrial Partner</div>
            <div className="text-xs font-semibold text-white">
              Gandiva Aero-pneumatic Research and Equipments Pvt Ltd
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section: Centered Poster Typography & Target Reticle */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-[#222329] flex flex-col items-center justify-center text-center">
        {/* Concentric Target Background Rings (Matching the Poster) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-[850px] h-[850px] rounded-full border border-white/20 flex items-center justify-center">
            <div className="w-[680px] h-[680px] rounded-full border border-white/30 flex items-center justify-center">
              <div className="w-[500px] h-[500px] rounded-full border border-white/40 flex items-center justify-center">
                {/* Red Target Ring from Poster */}
                <div className="w-[340px] h-[340px] rounded-full border-2 border-[#E51A1A]/70 flex items-center justify-center animate-pulse">
                  <div className="w-[180px] h-[180px] rounded-full border border-[#E51A1A]/90 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#E51A1A] shadow-[0_0_20px_#E51A1A]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Target Crosshair Lines */}
          <div className="absolute w-full h-[1px] bg-white/10"></div>
          <div className="absolute h-full w-[1px] bg-white/10"></div>
        </div>

        {/* Tactical Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E51A1A]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Center Content Box */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* PRESENTS Subheading */}
          <div className="inline-block">
            <span className="text-xs sm:text-sm font-mono tracking-[0.35em] text-[#B0B0BA] uppercase">
              PRESENTS
            </span>
          </div>

          {/* Main Poster Typography Title: LAKSHYA 2.0 */}
          <div className="space-y-2 select-none">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter uppercase font-sans drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
              <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                LAKSHYA
              </span>
              <span className="ml-3 sm:ml-5 text-[#E51A1A] drop-shadow-[0_0_25px_rgba(229,26,26,0.6)]">
                2.0
              </span>
            </h1>

            {/* Sub-headline from Poster */}
            <p className="text-sm sm:text-lg md:text-xl font-mono tracking-[0.25em] text-[#D0D0DA] uppercase font-bold">
              10M RIFLE AND PISTOL SHOOTING EXPERIENCE
            </p>
          </div>



          {/* EXACTLY 3 PRIMARY CENTER ACTION BUTTONS */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
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

            {/* Button 3: Live Leaderboard Access */}
            <button
              onClick={handleLeaderboardCta}
              className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-white/5 border border-white/30 text-white font-bold text-sm tracking-wider uppercase rounded-lg shadow-sm flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Live Leaderboard</span>
            </button>
          </div>

          {/* Scroll Down Indicator */}
          <div className="pt-8 text-xs font-mono text-[#888892] flex items-center justify-center gap-2 animate-bounce">
            <ArrowDown className="w-4 h-4 text-[#E51A1A]" />
            <span>Scroll down to inspect official sponsor rifles & weapons</span>
          </div>
        </div>
      </section>

      {/* Sponsor Company Banner */}
      <section className="bg-[#101117] py-6 border-b border-[#222329]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1C1D27] border border-[#2D2E3B] flex items-center justify-center text-[#E51A1A]">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#8E909E] block">
                Official Shooting Technology Partner
              </span>
              <h3 className="font-bold text-lg text-white">
                Gandiva Aero-pneumatic Research and Equipments Pvt Ltd
              </h3>
            </div>
          </div>

          <div className="text-xs font-mono text-[#A0A2B0] text-center md:text-right">
            <span>Indigenous PCP Match Engineering · Bangalore, India</span>
            <div className="text-[11px] text-[#808290] mt-0.5">Featuring Precihole Sports Olympic Range Standards</div>
          </div>
        </div>
      </section>

      {/* SCROLLING DOWN: Pictures of Rifles of Sponsors with Animated Popups */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#222329] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#E51A1A]">
              <Crosshair className="w-4 h-4" />
              <span>FEATURING WEAPON DISPLAY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-1">
              PCP Air Rifles & Match Pistols
            </h2>
          </div>
          <p className="text-xs font-mono text-[#888892] max-w-md md:text-right">
            Click on any competition weapon below to pop up full ballistic blueprints, cylinder bar pressures, and match triggers.
          </p>
        </div>

        {/* Weapons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SPONSOR_WEAPONS.map((weapon) => (
            <div
              key={weapon.id}
              onClick={() => setSelectedWeapon(weapon)}
              className="bg-[#14151C] border border-[#262733] hover:border-[#E51A1A] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between"
            >
              {/* Image & Type Badge */}
              <div className="h-52 bg-[#0E0F14] overflow-hidden relative flex items-center justify-center p-4">
                <img
                  src={weapon.imageSrc}
                  alt={weapon.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback visually if image file missing
                    (e.target as HTMLElement).style.opacity = '0.4';
                  }}
                />
                <span className="absolute top-3 right-3 text-[10px] font-mono px-2.5 py-1 bg-[#0B0C10]/90 text-white border border-[#2D2E3B] rounded-md uppercase tracking-wider font-bold">
                  {weapon.type}
                </span>
                <span className="absolute bottom-3 left-3 text-[9px] font-mono px-2 py-0.5 bg-[#E51A1A]/20 text-[#E51A1A] rounded border border-[#E51A1A]/40 font-bold uppercase">
                  Click for Blueprint
                </span>
              </div>

              {/* Weapon Meta */}
              <div className="p-5 space-y-3">
                <div>
                  <span className="text-[10px] font-mono text-[#888892] uppercase block tracking-wider">
                    {weapon.sponsor}
                  </span>
                  <h4 className="text-xl font-bold text-white group-hover:text-[#E51A1A] transition-colors">
                    {weapon.name}
                  </h4>
                  <p className="text-xs text-[#A0A2B0] mt-1">{weapon.subtitle}</p>
                </div>

                {/* Micro Specs */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#22232E] text-[11px] font-mono text-[#787A8A]">
                  <div>
                    <span className="block text-[9px] text-[#555666] uppercase">Caliber</span>
                    <span className="text-white font-medium">{weapon.caliber.split(' ')[0]}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#555666] uppercase">Fill Pressure</span>
                    <span className="text-white font-medium">{weapon.cylinderPressure.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="px-5 py-3 bg-[#111218] border-t border-[#22232E] flex items-center justify-between text-xs font-mono text-[#B0B2C0] group-hover:text-white">
                <span>View Ballistic Specs</span>
                <ChevronRight className="w-4 h-4 text-[#E51A1A] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POPUP MODAL: Interactive Weapon Details with CSS Animation */}
      {selectedWeapon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#12131A] border border-[#2D2E3B] text-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative overflow-hidden animate-scale-up">
            {/* Red Accent Top Glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E51A1A] to-transparent"></div>

            {/* Header with Close */}
            <div className="flex items-start justify-between gap-4 border-b border-[#22232E] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#E51A1A] tracking-widest uppercase font-bold">
                  {selectedWeapon.sponsor}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  {selectedWeapon.name}
                </h3>
                <p className="text-xs font-mono text-[#8E909E]">{selectedWeapon.subtitle}</p>
              </div>

              <button
                onClick={() => setSelectedWeapon(null)}
                className="p-2 text-[#787A8A] hover:text-white hover:bg-[#1E1F29] rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
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

            {/* Features Bullet List */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#E51A1A] uppercase tracking-wider font-bold block">
                Engineering Highlights
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

            {/* Modal Bottom CTA */}
            <div className="pt-4 border-t border-[#22232E] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#6E7080]">
                Official competition arm approved by RSO.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedWeapon(null)}
                  className="w-full sm:w-auto px-4 py-2 border border-[#3A3C4A] hover:bg-[#1E1F29] rounded-lg text-xs font-mono font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedWeapon(null);
                    handleBookingCta();
                  }}
                  className="w-full sm:w-auto px-6 py-2 bg-[#E51A1A] hover:bg-[#C41515] text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider shadow"
                >
                  Book Slot with Weapon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety and Range Protocols */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#222329]">
        <div className="bg-[#12131A] border border-[#262733] rounded-2xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#22232E] pb-4">
            <ShieldCheck className="w-7 h-7 text-[#E51A1A]" />
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                Range Safety & Firing Rules
              </h3>
              <p className="text-xs font-mono text-[#8E909E]">
                Supervised by Certified NCC Range Safety Officers (RSO)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#9FA1B0] leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-bold text-white font-mono text-sm">1. Pass Verification</h4>
              <p>
                Present your digital pass QR code at the range registration desk 15 minutes prior to your scheduled slot. Only verified candidates are admitted to the firing firing bays.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-white font-mono text-sm">2. Safe Barrel Protocol</h4>
              <p>
                Rifles and pistols must be pointed down-range towards the stop butts at all times. Actions remain open until the Range Officer commands "LOAD" and "COMMENCE FIRING".
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-white font-mono text-sm">3. Certified Scoring</h4>
              <p>
                Target scorecards are marked by range adjudicators immediately following each 10-shot round. Scores and tie-breaker tens sync directly to the live broadcast leaderboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
