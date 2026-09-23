import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Ticket, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  ExternalLink,
  PlusCircle,
  ShieldCheck, 
  AlertCircle, 
  Award, 
  Download, 
  Eye, 
  Loader2, 
  X,
  Lock,
  Sprout,
  Medal
} from 'lucide-react';
import { REGISTRATION_FORM_URL, normalizeEmail } from '../config/lakshya';
import { downloadCertificatePdf, renderCertificateToCanvas, sanitizeCertificateFilename } from '../lib/certificates';
import { getSavedCertificateConfig } from '../config/certificateConfig';
import { getDocRef, getColRef, getDocs, onSnapshot } from '../lib/firebase';
import type { CertificateRequest, Booking, LeaderboardEntry } from '../types/lakshya';
import { computeRankedLeaderboard } from '../lib/ranking';
import CertificateRequestModal from './CertificateRequestModal';

let cachedLeaderboardData: { entries: LeaderboardEntry[]; timestamp: number } | null = null;
const LEADERBOARD_CACHE_TTL_MS = 60 * 1000;

export default function Profile({ setView }: { setView: (v: string) => void }) {
  const { currentUser, registration, userBookings, logout, loginWithGoogle, setOnboardingOpen } = useAuth();
  const [isDownloadingCert, setIsDownloadingCert] = useState(false);
  const [showCertPreview, setShowCertPreview] = useState(false);
  const [certRequest, setCertRequest] = useState<CertificateRequest | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const certCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch leaderboard entries to display official score and live rank with client-side cache
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() => {
    return cachedLeaderboardData?.entries || [];
  });

  useEffect(() => {
    const now = Date.now();
    if (cachedLeaderboardData && (now - cachedLeaderboardData.timestamp < LEADERBOARD_CACHE_TTL_MS)) {
      setLeaderboardEntries(cachedLeaderboardData.entries);
      return;
    }

    const colRef = getColRef<LeaderboardEntry>('leaderboard_entries');
    getDocs(colRef)
      .then((snap) => {
        const list: LeaderboardEntry[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LeaderboardEntry));
        cachedLeaderboardData = { entries: list, timestamp: Date.now() };
        setLeaderboardEntries(list);
      })
      .catch((err) => {
        console.error("Failed to load leaderboard entries in profile:", err);
      });
  }, []);

  const rankedRifle = useMemo(() => {
    return computeRankedLeaderboard(leaderboardEntries, 'Air Rifle');
  }, [leaderboardEntries]);

  const rankedPistol = useMemo(() => {
    return computeRankedLeaderboard(leaderboardEntries, 'Air Pistol');
  }, [leaderboardEntries]);

  // Subscribe to certificate request
  useEffect(() => {
    if (!currentUser?.email) {
      setCertRequest(null);
      return;
    }
    const cleanEmail = normalizeEmail(currentUser.email);
    const ref = getDocRef<CertificateRequest>('certificate_requests', cleanEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setCertRequest({ id: snap.id, ...snap.data() } as CertificateRequest);
      } else {
        setCertRequest(null);
      }
    });
    return () => unsub();
  }, [currentUser?.email]);

  useEffect(() => {
    if (showCertPreview && certCanvasRef.current) {
      const name = registration?.name || currentUser?.displayName || 'Competitor';
      renderCertificateToCanvas(name, getSavedCertificateConfig(), certCanvasRef.current).catch(console.error);
    }
  }, [showCertPreview, registration, currentUser]);

  const handleDownloadCert = async () => {
    if (isDownloadingCert) return;
    const participantName = registration?.name || currentUser?.displayName || 'Competitor';
    try {
      setIsDownloadingCert(true);
      await downloadCertificatePdf(participantName);
    } catch (err: any) {
      alert('Failed to generate certificate PDF: ' + (err.message || err));
    } finally {
      setIsDownloadingCert(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#12131A] border border-[#282B3A] text-center space-y-4">
        <User className="w-12 h-12 text-[#DC2626] mx-auto opacity-80" />
        <h2 className="font-headline-sm text-2xl text-[#F8FAFC] uppercase font-serif">Sign In Required</h2>
        <p className="font-mono text-xs text-[#64748B]">
          Log in with your Google account to access your registration profile and firing schedule records.
        </p>
        <button
          onClick={loginWithGoogle}
          className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold transition-colors"
        >
          [ Sign In with Google ]
        </button>
      </div>
    );
  }

  const cleanUserEmail = currentUser.email ? normalizeEmail(currentUser.email) : '';

  const rifleBooking = userBookings.find((b) => b.vertical === 'Air Rifle' && b.status === 'confirmed');
  const pistolBooking = userBookings.find((b) => b.vertical === 'Air Pistol' && b.status === 'confirmed');

  const userRifleRanked = rankedRifle.find(
    (e) => (e.participantEmail && normalizeEmail(e.participantEmail) === cleanUserEmail) ||
           (rifleBooking && e.id === rifleBooking.id)
  );

  const userPistolRanked = rankedPistol.find(
    (e) => (e.participantEmail && normalizeEmail(e.participantEmail) === cleanUserEmail) ||
           (pistolBooking && e.id === pistolBooking.id)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Logout */}
      <div className="border-b border-[#282B3A] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] block">
            SHOOTER IDENTITY & DOSSIER
          </span>
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-[#F8FAFC] uppercase tracking-wide font-serif">
            Competitor Profile
          </h1>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 border border-[#282B3A] bg-[#12131A] hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/60 text-[#64748B] font-mono text-xs uppercase tracking-wider rounded transition-colors self-start sm:self-auto flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-[#12131A] border border-[#282B3A] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282B3A] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1A1C26] border border-[#DC2626] text-[#F8FAFC] flex items-center justify-center font-mono text-2xl font-bold">
              {(registration?.name || currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">
                {registration?.name || currentUser.displayName || 'Shooter'}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] mt-0.5">
                <Mail className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>{currentUser.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {registration?.eligible ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/50 border border-emerald-800 text-emerald-400 text-xs font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED ROSTER
              </span>
            ) : (
              <button
                onClick={() => setOnboardingOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/50 border border-red-800 text-red-400 text-xs font-mono font-semibold hover:bg-red-900/50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                UNROSTERED — COMPLETE FORM
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">PARTICIPANT CATEGORY</span>
            <span className="font-mono font-bold text-[#F8FAFC] mt-0.5 block">{registration?.cadetType || 'Standard Competitor'}</span>
          </div>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">GENDER DIVISION</span>
            <span className="font-mono font-bold text-[#F8FAFC] mt-0.5 block">{registration?.gender || 'Unspecified'}</span>
          </div>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">INSTITUTION</span>
            <span className="font-mono font-bold text-[#F8FAFC] mt-0.5 block">{registration?.college || 'RVCE'}</span>
          </div>
          <div className="p-3 bg-[#0B0C10] border border-[#282B3A]">
            <span className="font-mono text-[10px] text-[#64748B] uppercase block">ALLOCATED SLOTS</span>
            <span className="font-mono font-bold text-[#DC2626] mt-0.5 block">{userBookings.length} of 2 Verticals</span>
          </div>
        </div>
      </div>

      {/* Disciplines & Bookings Dossier */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-lg text-[#F8FAFC] uppercase font-serif">Dual Discipline Allocations</h3>
          <span className="font-mono text-xs text-[#64748B]">Max 1 slot per discipline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Air Rifle Section */}
          <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#DC2626] font-bold block">
                  DISCIPLINE 01
                </span>
                <h4 className="font-headline-sm text-base text-[#F8FAFC] uppercase font-serif">10m Air Rifle Precision</h4>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#1A1C26] border border-[#282B3A] text-[#64748B]">
                18 Lanes
              </span>
            </div>

            {rifleBooking ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Ticket ID:</span>
                  <span className="font-bold text-[#F8FAFC]">{rifleBooking.ticketId}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Scheduled Slot:</span>
                  <span className="font-medium text-[#F8FAFC]">{rifleBooking.slotDateLabel} · {rifleBooking.slotTimeLabel}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Attendance:</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold ${
                    rifleBooking.checkedIn ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                  }`}>
                    {rifleBooking.checkedIn ? 'CHECKED IN' : 'PENDING CHECK-IN'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Official Score:</span>
                  <span className="font-bold text-[#DC2626] text-sm">
                    {userRifleRanked?.score !== null && userRifleRanked?.score !== undefined && userRifleRanked.score > 0
                      ? `${userRifleRanked.score.toFixed(1)} PTS`
                      : (rifleBooking.totalScore !== null && rifleBooking.totalScore !== undefined && rifleBooking.totalScore > 0
                          ? `${rifleBooking.totalScore.toFixed(1)} PTS`
                          : 'Pending Match')}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Live Ranking:</span>
                  {userRifleRanked?.rank ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/80 text-[11px]">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rank #{userRifleRanked.rank}</span>
                      <span className="text-[9px] text-[#94A3B8]">({rankedRifle.length} Shooters)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#64748B] italic">
                      {rifleBooking.checkedIn ? 'Scoring in progress' : 'Awaiting Match'}
                    </span>
                  )}
                </div>

                {userRifleRanked?.count10s !== undefined && userRifleRanked?.score ? (
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#94A3B8] bg-[#0B0C10] p-1.5 rounded border border-[#282B3A]">
                    <span>Accuracy Metrics:</span>
                    <span className="font-semibold text-[#F8FAFC]">
                      10s: {userRifleRanked.count10s ?? 0} · 9s: {userRifleRanked.count9s ?? 0} · 8s: {userRifleRanked.count8s ?? 0}
                    </span>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-[#282B3A]">
                  <button
                    onClick={() => setView('digital-pass')}
                    className="w-full py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>[ View Air Rifle Pass ]</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="font-mono text-xs text-[#64748B]">No confirmed Air Rifle allocation found.</p>
                <button
                  onClick={() => setView('slot-booking')}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>[ Book Air Rifle Slot ]</span>
                </button>
              </div>
            )}
          </div>

          {/* Air Pistol Section */}
          <div className="bg-[#12131A] border border-[#282B3A] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#DC2626] font-bold block">
                  DISCIPLINE 02
                </span>
                <h4 className="font-headline-sm text-base text-[#F8FAFC] uppercase font-serif">10m Air Pistol Match</h4>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#1A1C26] border border-[#282B3A] text-[#64748B]">
                6 Lanes
              </span>
            </div>

            {pistolBooking ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Ticket ID:</span>
                  <span className="font-bold text-[#F8FAFC]">{pistolBooking.ticketId}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Scheduled Slot:</span>
                  <span className="font-medium text-[#F8FAFC]">{pistolBooking.slotDateLabel} · {pistolBooking.slotTimeLabel}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Attendance:</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold ${
                    pistolBooking.checkedIn ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                  }`}>
                    {pistolBooking.checkedIn ? 'CHECKED IN' : 'PENDING CHECK-IN'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Official Score:</span>
                  <span className="font-bold text-[#DC2626] text-sm">
                    {userPistolRanked?.score !== null && userPistolRanked?.score !== undefined && userPistolRanked.score > 0
                      ? `${userPistolRanked.score.toFixed(1)} PTS`
                      : (pistolBooking.totalScore !== null && pistolBooking.totalScore !== undefined && pistolBooking.totalScore > 0
                          ? `${pistolBooking.totalScore.toFixed(1)} PTS`
                          : 'Pending Match')}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#64748B]">Live Ranking:</span>
                  {userPistolRanked?.rank ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/80 text-[11px]">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rank #{userPistolRanked.rank}</span>
                      <span className="text-[9px] text-[#94A3B8]">({rankedPistol.length} Shooters)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#64748B] italic">
                      {pistolBooking.checkedIn ? 'Scoring in progress' : 'Awaiting Match'}
                    </span>
                  )}
                </div>

                {userPistolRanked?.count10s !== undefined && userPistolRanked?.score ? (
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#94A3B8] bg-[#0B0C10] p-1.5 rounded border border-[#282B3A]">
                    <span>Accuracy Metrics:</span>
                    <span className="font-semibold text-[#F8FAFC]">
                      10s: {userPistolRanked.count10s ?? 0} · 9s: {userPistolRanked.count9s ?? 0} · 8s: {userPistolRanked.count8s ?? 0}
                    </span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-[#282B3A]">
                  <button
                    onClick={() => setView('digital-pass')}
                    className="w-full py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>[ View Air Pistol Pass ]</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="font-mono text-xs text-[#64748B]">No confirmed Air Pistol allocation found.</p>
                <button
                  onClick={() => setView('slot-booking')}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>[ Book Air Pistol Slot ]</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Participation Certificate Section */}
      {(() => {
        const checkedInBooking = userBookings.find((b) => b.status === 'confirmed' && b.checkedIn);
        const isApproved = certRequest?.status === 'Approved';
        const isPending = certRequest?.status === 'Request Submitted' || certRequest?.status === 'Under Review';
        const isRejected = certRequest?.status === 'Rejected';

        return (
          <div className="bg-[#12131A] border border-[#282B3A] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#282B3A] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#1A1C26] border border-[#DC2626] text-[#DC2626] rounded">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#DC2626] block font-bold">
                    OFFICIAL RECOGNITION DOSSIER
                  </span>
                  <h3 className="font-headline-sm text-xl text-[#F8FAFC] uppercase font-serif">
                    Participation Certificate
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {isApproved ? (
                  <>
                    <button
                      onClick={() => setShowCertPreview(true)}
                      className="px-3.5 py-2 bg-[#1A1C26] hover:bg-[#282B3A] border border-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={handleDownloadCert}
                      disabled={isDownloadingCert}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition-colors shadow-sm"
                    >
                      {isDownloadingCert ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </>
                      )}
                    </button>
                  </>
                ) : isPending ? (
                  <div className="px-4 py-2 bg-amber-950/40 border border-amber-800 text-amber-300 font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Under Review by Admin</span>
                  </div>
                ) : isRejected ? (
                  <button
                    onClick={() => setIsCertModalOpen(true)}
                    className="px-4 py-2 bg-red-950/70 hover:bg-red-900 border border-red-700 text-red-200 font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>Resubmit Sapling Proof</span>
                  </button>
                ) : checkedInBooking ? (
                  <button
                    onClick={() => setIsCertModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Sprout className="w-4 h-4" />
                    <span>[ Request Certificate ]</span>
                  </button>
                ) : (
                  <div 
                    title="Range Check-In and Sapling planting proof are required prior to requesting a certificate."
                    className="px-4 py-2 bg-[#12131A] border border-[#282B3A] text-[#64748B] font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-not-allowed opacity-75"
                  >
                    <Lock className="w-4 h-4 text-[#64748B]" />
                    <span>Check-In Required</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between text-xs font-mono text-[#64748B] gap-2 pt-1">
              <p>
                {isApproved ? (
                  <>
                    Awarded in recognition for participation in LAKSHYA 2.0 organized by NCC RVCE × GARE.
                    Issued to: <strong className="text-[#F8FAFC]">{registration?.name || currentUser?.displayName || 'Competitor'}</strong>
                  </>
                ) : isPending ? (
                  <span className="text-amber-300/90">
                    Your sapling planting proof is currently in the verification queue. Admin approval is required before download is permitted.
                  </span>
                ) : isRejected ? (
                  <span className="text-red-300">
                    Verification note: &quot;{certRequest?.rejectionReason || 'Please upload a clearer photograph.'}&quot; Click &quot;Resubmit Sapling Proof&quot; to update.
                  </span>
                ) : checkedInBooking ? (
                  <span className="text-emerald-300/90">
                    Range check-in verified! In accordance with Step 4 & 5, plant your sapling and upload a photograph to request your certificate.
                  </span>
                ) : (
                  <span>
                    Direct download is prohibited. Certificate dispatch follows: Registration → Slot Booking → Range Check-In → Plant Sapling → Admin Approval.
                  </span>
                )}
              </p>

              {isApproved && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Approved by Admin
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Certificate Live Preview Modal */}
      {showCertPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#12131A] border border-[#282B3A] rounded-xl max-w-4xl w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#DC2626]" />
                <h3 className="font-mono text-xs uppercase font-bold text-[#F8FAFC]">
                  Certificate Preview — {registration?.name || currentUser?.displayName || 'Competitor'}
                </h3>
              </div>
              <button
                onClick={() => setShowCertPreview(false)}
                className="p-1 text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1C26] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-[1024/723] bg-[#0B0C10] border border-[#282B3A] rounded overflow-hidden shadow-inner flex items-center justify-center">
              <canvas
                ref={certCanvasRef}
                className="w-full h-full object-contain block"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#282B3A]">
              <span className="font-mono text-[11px] text-[#64748B]">
                High-Resolution Print Quality (A4 Landscape · 300 DPI)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCertPreview(false)}
                  className="px-3.5 py-1.5 font-mono text-xs text-[#64748B] hover:text-[#F8FAFC]"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadCert}
                  disabled={isDownloadingCert}
                  className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] disabled:opacity-50 text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isDownloadingCert ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sapling & Certificate Request Modal */}
      {(() => {
        const activeBooking = userBookings.find((b) => b.status === 'confirmed' && b.checkedIn) || userBookings.find((b) => b.status === 'confirmed');
        if (!activeBooking) return null;
        return (
          <CertificateRequestModal
            isOpen={isCertModalOpen}
            onClose={() => setIsCertModalOpen(false)}
            checkedInBooking={activeBooking}
            existingRequest={certRequest}
          />
        );
      })()}
    </div>
  );
}
