import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Target, 
  Ticket, 
  Trophy, 
  Crosshair, 
  ArrowDown, 
  ChevronRight, 
  ChevronLeft,
  X,
  Eye,
  ShieldCheck,
  Phone,
  Mail,
  HelpCircle
} from 'lucide-react';

interface WeaponSpec {
  id: string;
  name: string;
  manufacturer: string;
  category: '10m Competition Rifle' | '10m Competition Pistol';
  calibre: string;
  barrelLength?: string;
  weight?: string;
  velocity?: string;
  description: string;
  imageSrc: string;
  thumbSrc?: string;
}

const WEAPONS_DATA: WeaponSpec[] = [
  {
    id: 'ap-x',
    name: 'AP-X',
    manufacturer: 'GARE',
    category: '10m Competition Pistol',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '237 mm',
    weight: '1 kg',
    velocity: '500 fps (Adjustable)',
    description: 'AP-X is a Latch action Pre-Charged Pneumatic Air Pistol for amateur and professional shooters. It has a short barrel and comes with open sights.',
    imageSrc: '/assets/weapons/ap-x.webp',
    thumbSrc: '/assets/weapons/ap-x-thumb.webp',
  },
  {
    id: 'gm10-club',
    name: 'GM10 CLUB',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '480 mm',
    weight: '2.3 kg',
    velocity: '500 fps (10.34 gr pellet)',
    description: 'The GM-10 Club is an entry level Pre-Charged Pneumatic Air Rifle designed for club use. It has peep sights which may be easily changed with open sights, if required. The stock is ambidextrous.',
    imageSrc: '/assets/weapons/gm10-club.webp',
    thumbSrc: '/assets/weapons/gm10-club-thumb.webp',
  },
  {
    id: 'viper',
    name: 'VIPER',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '480 mm',
    weight: '2.3 kg',
    velocity: '850 fps (10.34 gr pellet)',
    description: 'Viper is a latch action PCP Air Rifle built on the sturdy GM-10 platform. It features 480 mm barrel with 12 grooves. The highlight of this model is the all weather synthetic stock which is light, sturdy and ambidextrous. Viper is available in both suppressed as well as open sight options.',
    imageSrc: '/assets/weapons/viper.webp',
    thumbSrc: '/assets/weapons/viper-thumb.webp',
  },
  {
    id: 'g10-karbin',
    name: 'G10 KARBIN',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '480 mm',
    weight: '2.6 kg',
    velocity: '850 fps (10.34 pellet)',
    description: 'Karbin is an ultra-compact, precision Pre-Charged Pneumatic airgun from Gandiva Advanced Research and Equipments Pvt Ltd. It is built on the sturdy and reliable GM-10 platform with an extended trigger assembly and compact stock to enable accurate shooting from enclosed areas where a full length rifle is hard to manoeuvre. The rifle comes with a factory fitted Picatinny rail mount for mounting telescopic sights. The factory fit suppressor ensures a reduced sound report. Karbin comes in a variety of colour options and the stock design is ambidextrous.',
    imageSrc: '/assets/weapons/g10-karbin.webp',
    thumbSrc: '/assets/weapons/g10-karbin-thumb.webp',
  },
  {
    id: 'theseus',
    name: 'THESEUS',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '550 mm',
    weight: '4.1 kg',
    velocity: '850 fps (10.34 gr pellet)',
    description: 'Theseus is a handy, compact, fully regulated and suppressed PCP air weapon from GARE featuring 550mm barrel for accuracy, 650 cc air reservoir - capable of 180 shots in one refill. Ideal for fun plinking. The gun comes with picattiny scope rail to mount scope and adjustable two stage trigger.',
    imageSrc: '/assets/weapons/theseus.webp',
    thumbSrc: '/assets/weapons/theseus-thumb.webp',
  },
  {
    id: 'bhim',
    name: 'BHIM',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '480 mm',
    weight: '4.2 kg',
    velocity: '850 fps (10.34 gr pellet)',
    description: 'BHIM is a latch action Pre-Charged Pneumatic Air Rifle with a large reservoir and provides the largest number of shots per fill among any Indian made PCP. The Airgun is also factory fit with a suppressor which provides reduced sound report.',
    imageSrc: '/assets/weapons/bhim.webp',
    thumbSrc: '/assets/weapons/bhim-thumb.webp',
  },
  {
    id: 'falcon-thumbhole',
    name: 'FALCON THUMBHOLE STOCK',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '550 mm',
    weight: '4.2 kg',
    velocity: '850 fps (10.34 gr pellet)',
    description: "Falcon is a long range bench rest rifle from GARE. It has a 550 mm rifled barrel—the longest among any Indian made air weapon. The thumbhole stock and lever type safety add to its uniqueness. The Falcon is every air gun lover's dream of a long range precision air weapon.",
    imageSrc: '/assets/weapons/falcon-thumbhole.webp',
    thumbSrc: '/assets/weapons/falcon-thumbhole-thumb.webp',
  },
  {
    id: 'falcon-beechwood',
    name: 'FALCON BEECH WOOD STOCK',
    manufacturer: 'GARE',
    category: '10m Competition Rifle',
    calibre: '0.177" / 4.5 mm',
    barrelLength: '550 mm',
    weight: '4.2 kg',
    velocity: '850 fps (10.34 gr pellet)',
    description: "Falcon is a long range bench rest rifle from GARE. It has a 550 mm rifled barrel—the longest among any Indian made air weapon. The beech wood stock and lever type safety add to its uniqueness. The Falcon is every air gun lover's dream of a long range precision air weapon.",
    imageSrc: '/assets/weapons/falcon-beechwood.webp',
    thumbSrc: '/assets/weapons/falcon-beechwood-thumb.webp',
  },
];

export default function Overview({ setView }: { setView: (v: string) => void }) {
  const { currentUser, registration, loginWithGoogle, setOnboardingOpen } = useAuth();
  // Carousel State
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponSpec | null>(null);
  const thumbnailScrollRef = useRef<HTMLDivElement | null>(null);

  const activeWeapon = WEAPONS_DATA[activeIndex];

  // Auto-slide carousel every 6 seconds when modal is not open
  useEffect(() => {
    if (selectedWeapon !== null) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % WEAPONS_DATA.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedWeapon, activeIndex]);

  // Lock body scroll when weapon modal is active
  useEffect(() => {
    if (selectedWeapon) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedWeapon]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % WEAPONS_DATA.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + WEAPONS_DATA.length) % WEAPONS_DATA.length);
  };

  const scrollThumbnailsLeft = () => {
    if (thumbnailScrollRef.current) {
      thumbnailScrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollThumbnailsRight = () => {
    if (thumbnailScrollRef.current) {
      thumbnailScrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
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
                src="/assets/logos/NCC Logo.webp" 
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
                src="/assets/logos/GARE Logo.webp" 
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

      {/* FEATURED WEAPON SHOWCASE SECTION (MATCHING REFERENCE MOCKUP) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 select-none">
        
        {/* Section Title Header (Matching Mockup) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#222329] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#E51A1A] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#E51A1A] animate-pulse"></span>
              <span>OFFICIAL COMPETITION WEAPONS</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight font-sans">
              GARE <span className="text-[#E51A1A]">WEAPONS</span>
            </h2>
            <div className="text-xs font-mono text-[#787A8C] tracking-[0.25em] uppercase mt-1">
              PRECISION / PERFORMANCE / TRUSTED BY CHAMPIONS
            </div>
          </div>

          {/* GARE Logo Branding Block (Top Right in Mockup) */}
          <div className="flex items-center gap-3 bg-[#11121B] px-5 py-2.5 rounded-xl border border-[#252638] shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#E51A1A]/10 flex items-center justify-center border border-[#E51A1A]/30">
              <Target className="w-5 h-5 text-[#E51A1A]" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider text-white flex items-center gap-1 font-sans">
                <span className="text-[#E51A1A]">GARE</span>
              </div>
              <div className="text-[9px] font-mono text-[#8E909E] tracking-tight uppercase">
                PRECISION IN EVERY SHOT
              </div>
            </div>
          </div>
        </div>

        {/* MAIN SHOWCASE CONTAINER (MATCHING MOCKUP FRAME) */}
        <div className="relative bg-[#0E0F16] border border-[#E51A1A]/40 rounded-2xl p-4 sm:p-8 shadow-[0_0_35px_rgba(229,26,26,0.12)] transition-all duration-300">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[440px]" key={activeWeapon.id}>
            
            {/* LEFT SIDE: WEAPON DISPLAY BOX WITH RED AMBIENT SPOTLIGHT GLOW */}
            <div className="lg:col-span-7 relative bg-[#07080D] rounded-xl border border-[#1A1C2A] p-6 sm:p-10 flex items-center justify-center min-h-[280px] sm:min-h-[360px] overflow-hidden group">
              
              {/* Red Floor Ambient Spotlight Glow (Matching Mockup) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-32 bg-[#E51A1A]/20 blur-2xl rounded-full pointer-events-none"></div>

              {/* Watermark at bottom right of image container */}
              <div className="absolute bottom-3 right-4 font-black font-sans text-xl text-white/5 uppercase tracking-widest pointer-events-none">
                GARE
              </div>

              {/* Left Arrow Button (Inside Image Box) */}
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#141520]/80 border border-[#2D2E42] text-white flex items-center justify-center hover:bg-[#E51A1A] hover:border-[#E51A1A] transition-all z-20 shadow-lg active:scale-95"
                title="Previous Weapon"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Featured Weapon Image */}
              <img
                src={activeWeapon.imageSrc}
                alt={activeWeapon.name}
                className="max-h-[250px] sm:max-h-[320px] max-w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] transform group-hover:scale-105 transition-transform duration-500 ease-out z-10"
              />

              {/* Right Arrow Button (Inside Image Box) */}
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#141520]/80 border border-[#2D2E42] text-white flex items-center justify-center hover:bg-[#E51A1A] hover:border-[#E51A1A] transition-all z-20 shadow-lg active:scale-95"
                title="Next Weapon"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Carousel Pagination Dots Centered At Bottom Of Image Container */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                {WEAPONS_DATA.map((w, idx) => (
                  <button
                    key={w.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2 transition-all rounded-full ${
                      idx === activeIndex
                        ? 'w-6 bg-[#E51A1A] shadow-[0_0_8px_#E51A1A]'
                        : 'w-2 bg-[#282B3A] hover:bg-[#55586A]'
                    }`}
                    title={`Go to ${w.name}`}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT SIDE: WEAPON DETAILS (MATCHING MOCKUP SPECIFICATIONS GRID) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              
              {/* Brand Title & Weapon Name */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#E51A1A] font-bold text-xs font-mono uppercase tracking-widest">
                  <Target className="w-4 h-4" />
                  <span>GARE</span>
                </div>

                <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight font-sans">
                  {activeWeapon.name}
                </h3>

                <div className="text-xs font-mono text-[#A0A2B0]">
                  {activeWeapon.category}
                </div>

                {/* Thin Red Accent Divider */}
                <div className="w-12 h-0.5 bg-[#E51A1A] mt-2"></div>
              </div>

              {/* Specifications Grid (4 Tiles with Circular Icons - Matching Mockup) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Spec 1: Calibre */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141520] border border-[#2B2C40] flex items-center justify-center shrink-0 text-[#E51A1A]">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Calibre</span>
                    <span className="font-bold text-white text-sm">{activeWeapon.calibre}</span>
                  </div>
                </div>

                {/* Spec 2: Barrel Length */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141520] border border-[#2B2C40] flex items-center justify-center shrink-0 text-[#E51A1A]">
                    <Crosshair className="w-5 h-5" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Barrel Length</span>
                    <span className="font-bold text-white text-sm">{activeWeapon.barrelLength || '450 mm'}</span>
                  </div>
                </div>

                {/* Spec 3: Weight */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141520] border border-[#2B2C40] flex items-center justify-center shrink-0 text-[#E51A1A]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Weight</span>
                    <span className="font-bold text-white text-sm">{activeWeapon.weight || '4.2 kg'}</span>
                  </div>
                </div>

                {/* Spec 4: Velocity */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#141520] border border-[#2B2C40] flex items-center justify-center shrink-0 text-[#E51A1A]">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Velocity</span>
                    <span className="font-bold text-white text-sm">{activeWeapon.velocity || '170 m/s'}</span>
                  </div>
                </div>
              </div>

              {/* View Details Button (Matching Mockup Pill Style) */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedWeapon(activeWeapon)}
                  className="w-full sm:w-auto px-8 py-3 bg-[#11121A] hover:bg-[#E51A1A] text-white border border-[#E51A1A]/70 hover:border-[#E51A1A] text-xs font-mono font-bold tracking-widest uppercase rounded-full flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-[0_0_15px_rgba(229,26,26,0.2)]"
                >
                  <Eye className="w-4 h-4" />
                  <span>VIEW DETAILS</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* BOTTOM THUMBNAIL SELECTOR BAR (MATCHING MOCKUP CARD BAR) */}
        <div className="relative bg-[#0E0F16] border border-[#202130] rounded-2xl p-4 flex items-center gap-3">
          
          {/* Scroll Left Arrow */}
          <button
            onClick={scrollThumbnailsLeft}
            className="w-9 h-9 rounded-xl bg-[#141520] border border-[#2D2E42] text-white flex items-center justify-center hover:bg-[#E51A1A] transition-colors shrink-0"
            title="Scroll Left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Horizontally Scrollable Mini Cards Container */}
          <div 
            ref={thumbnailScrollRef}
            className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1 px-1 flex-1 max-w-full"
          >
            {WEAPONS_DATA.map((weapon, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={weapon.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`shrink-0 w-48 bg-[#090A10] p-3 rounded-xl border text-left transition-all relative ${
                    isActive
                      ? 'border-[#E51A1A] shadow-[0_0_15px_rgba(229,26,26,0.3)] scale-[1.02]'
                      : 'border-[#1C1E2B] opacity-70 hover:opacity-100 hover:border-[#383A4E]'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="w-full h-20 bg-[#05060A] rounded-lg p-2 mb-2 flex items-center justify-center border border-[#161724]">
                    <img
                      src={weapon.thumbSrc || weapon.imageSrc}
                      alt={weapon.name}
                      loading="lazy"
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Thumbnail Details */}
                  <div className="space-y-0.5 font-mono">
                    <div className="flex items-center gap-1 text-[9px] text-[#E51A1A] font-bold uppercase">
                      <Target className="w-3 h-3" />
                      <span>{weapon.manufacturer}</span>
                    </div>
                    <div className="text-xs font-bold text-white font-sans truncate">
                      {weapon.name}
                    </div>
                    <div className="text-[9px] text-[#717382] truncate">
                      {weapon.category}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Arrow */}
          <button
            onClick={scrollThumbnailsRight}
            className="w-9 h-9 rounded-xl bg-[#141520] border border-[#2D2E42] text-white flex items-center justify-center hover:bg-[#E51A1A] transition-colors shrink-0"
            title="Scroll Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

        </div>

      </section>

      {/* STREAMLINED WEAPON DETAILS MODAL */}
      {selectedWeapon && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedWeapon(null)}
        >
          <div 
            className="bg-[#12131A] border border-[#2B2C3B] text-white rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9)] max-w-lg w-full overflow-hidden relative animate-scale-up flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red Top Accent Strip */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[#E51A1A] to-transparent"></div>

            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#22232E] flex items-start justify-between gap-4 bg-[#12131A]">
              <div>
                <span className="text-[10px] font-mono text-[#E51A1A] font-bold uppercase tracking-widest bg-[#E51A1A]/10 px-2.5 py-0.5 rounded border border-[#E51A1A]/20">
                  {selectedWeapon.manufacturer}
                </span>
                <h3 className="text-2xl font-bold text-white mt-1.5 font-sans">
                  {selectedWeapon.name}
                </h3>
                <p className="text-xs font-mono text-[#8E909E] mt-0.5">
                  {selectedWeapon.category}
                </p>
              </div>

              <button
                onClick={() => setSelectedWeapon(null)}
                className="p-1.5 text-[#888A98] hover:text-white hover:bg-[#1E1F29] rounded-lg transition-colors border border-transparent hover:border-[#333544]"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Weapon Image Box */}
              <div className="h-52 sm:h-60 bg-[#08090D] rounded-xl border border-[#1E202C] p-4 flex items-center justify-center shadow-inner relative overflow-hidden">
                <img
                  src={selectedWeapon.imageSrc}
                  alt={selectedWeapon.name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
                />
              </div>

              {/* Concise Description */}
              <p className="text-xs sm:text-sm font-mono text-[#A0A2B0] leading-relaxed border-l-2 border-[#E51A1A] pl-3 py-1">
                {selectedWeapon.description}
              </p>

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0B0C10] p-4 rounded-xl border border-[#1F202C] text-xs font-mono">
                <div className="bg-[#0D0E14] p-2.5 rounded border border-[#1C1E29]">
                  <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Calibre</span>
                  <span className="font-semibold text-white text-sm">{selectedWeapon.calibre}</span>
                </div>

                {selectedWeapon.barrelLength && (
                  <div className="bg-[#0D0E14] p-2.5 rounded border border-[#1C1E29]">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Barrel Length</span>
                    <span className="font-semibold text-white text-sm">{selectedWeapon.barrelLength}</span>
                  </div>
                )}

                {selectedWeapon.weight && (
                  <div className="bg-[#0D0E14] p-2.5 rounded border border-[#1C1E29]">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Weight</span>
                    <span className="font-semibold text-white text-sm">{selectedWeapon.weight}</span>
                  </div>
                )}

                {selectedWeapon.velocity && (
                  <div className="bg-[#0D0E14] p-2.5 rounded border border-[#1C1E29]">
                    <span className="text-[10px] text-[#717382] uppercase block tracking-wider">Velocity</span>
                    <span className="font-semibold text-white text-sm">{selectedWeapon.velocity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0E0F15] border-t border-[#22232E] flex justify-end">
              <button
                onClick={() => setSelectedWeapon(null)}
                className="w-full sm:w-auto px-6 py-2 bg-[#181923] hover:bg-[#E51A1A] text-white border border-[#2B2C3C] hover:border-[#E51A1A] text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all shadow-sm"
              >
                Close
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
              NCC RVCE Event
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Contact 1 */}
            <div className="bg-[#0B0C10] border border-[#282B3A] p-4 rounded-lg space-y-1.5 hover:border-[#DC2626]/60 transition-colors">
              <div className="text-[#64748B] text-[10px] uppercase tracking-wider font-semibold">
                Company Senior Under Officer
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
