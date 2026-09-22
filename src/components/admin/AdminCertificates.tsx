import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Registration, Booking, CertificateRequest } from '../../types/lakshya';
import { useAuth } from '../../context/AuthContext';
import { getColRef, getDocRef, onSnapshot, updateDoc, serverTimestamp } from '../../lib/firebase';
import {
  CertificateConfig,
  AVAILABLE_FONTS,
  DEFAULT_CERTIFICATE_CONFIG,
  getSavedCertificateConfig,
  saveCertificateConfig,
  resetCertificateConfig
} from '../../config/certificateConfig';
import {
  renderCertificateToCanvas,
  downloadCertificatePdf,
  generateBulkCertificatesPdf,
  sanitizeCertificateFilename
} from '../../lib/certificates';
import {
  Award,
  Download,
  Eye,
  Sliders,
  RotateCcw,
  Search,
  CheckCircle2,
  Users,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  FileDown,
  ChevronRight,
  Filter,
  Sprout,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface AdminCertificatesProps {
  registrations: Registration[];
  bookings: Booking[];
}

export default function AdminCertificates({ registrations, bookings }: AdminCertificatesProps) {
  const { currentUser } = useAuth();

  // Primary sub-view: 'queue' (Grant Certificates) vs 'template' (Typography & Bulk)
  const [activeSubView, setActiveSubView] = useState<'queue' | 'template'>('queue');

  // Certificate requests state
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState<boolean>(true);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestSearch, setRequestSearch] = useState<string>('');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{ url: string; name: string } | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<CertificateRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<CertificateConfig>(getSavedCertificateConfig);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // Participant selection & filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'attended'>('eligible');
  const [verticalFilter, setVerticalFilter] = useState<'all' | 'Air Rifle' | 'Air Pistol'>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Registration | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Generation / Loading state
  const [isGeneratingSingle, setIsGeneratingSingle] = useState<boolean>(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Canvas preview ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Override preview name for edge-case testing
  const [testNameOverride, setTestNameOverride] = useState<string | null>(null);

  // Map of attended emails
  const attendedEmails = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (b.checkedIn) {
        set.add(b.participantEmail.toLowerCase());
      }
    });
    return set;
  }, [bookings]);

  // Map of vertical bookings
  const verticalMap = useMemo(() => {
    const rifle = new Set<string>();
    const pistol = new Set<string>();
    bookings.forEach((b) => {
      if (b.status === 'confirmed') {
        const em = b.participantEmail.toLowerCase();
        if (b.vertical === 'Air Rifle') rifle.add(em);
        if (b.vertical === 'Air Pistol') pistol.add(em);
      }
    });
    return { rifle, pistol };
  }, [bookings]);

  // Clean distinct registrations
  const distinctRegistrations = useMemo(() => {
    const seen = new Set<string>();
    return registrations.filter((r) => {
      if ((r as any).isAlias) return false;
      const em = (r.email || r.id || '').toLowerCase().trim();
      if (!em || seen.has(em)) return false;
      seen.add(em);
      return true;
    });
  }, [registrations]);

  // Filtered participant roster
  const filteredParticipants = useMemo(() => {
    return distinctRegistrations.filter((r) => {
      const email = (r.email || r.id || '').toLowerCase().trim();
      const name = (r.name || '').toLowerCase().trim();
      const usn = (r.usn || '').toLowerCase().trim();
      const q = searchQuery.toLowerCase().trim();

      if (q && !email.includes(q) && !name.includes(q) && !usn.includes(q)) {
        return false;
      }

      if (eligibilityFilter === 'eligible' && !r.eligible) {
        return false;
      }
      if (eligibilityFilter === 'attended' && !attendedEmails.has(email)) {
        return false;
      }

      if (verticalFilter === 'Air Rifle' && !verticalMap.rifle.has(email)) {
        return false;
      }
      if (verticalFilter === 'Air Pistol' && !verticalMap.pistol.has(email)) {
        return false;
      }

      return true;
    });
  }, [distinctRegistrations, searchQuery, eligibilityFilter, verticalFilter, attendedEmails, verticalMap]);

  // Auto-select first participant on initial load
  useEffect(() => {
    if (!selectedParticipant && filteredParticipants.length > 0) {
      setSelectedParticipant(filteredParticipants[0]);
    }
  }, [filteredParticipants, selectedParticipant]);

  // Active name for rendering on preview canvas
  const activeDisplayName = testNameOverride ?? (selectedParticipant?.name || 'Participant Name');

  // Render to canvas whenever participant or config changes
  useEffect(() => {
    let active = true;
    if (canvasRef.current) {
      setPreviewError(null);
      renderCertificateToCanvas(activeDisplayName, config, canvasRef.current).catch((err) => {
        if (active) setPreviewError(err.message || 'Failed to render certificate preview');
      });
    }
    return () => {
      active = false;
    };
  }, [activeDisplayName, config]);

  // Handlers for config changes
  const handleConfigChange = (partial: Partial<CertificateConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    saveCertificateConfig(updated);
  };

  const handleResetConfig = () => {
    const def = resetCertificateConfig();
    setConfig(def);
  };

  // Bulk selection toggles
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParticipants.map((p) => p.id)));
    }
  };

  // Listen to certificate requests collection in real-time
  useEffect(() => {
    const colRef = getColRef<CertificateRequest>('certificate_requests');
    const unsub = onSnapshot(colRef, (snap) => {
      const list: CertificateRequest[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as CertificateRequest);
      });
      list.sort((a, b) => {
        const tA = a.requestedAt?.seconds || 0;
        const tB = b.requestedAt?.seconds || 0;
        return tB - tA;
      });
      setRequests(list);
      setRequestsLoading(false);
    }, (err) => {
      console.error('Failed to listen to certificate_requests:', err);
      setRequestsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApproveRequest = async (req: CertificateRequest) => {
    try {
      setActionLoadingId(req.id);
      const docRef = getDocRef('certificate_requests', req.id);
      await updateDoc(docRef, {
        status: 'Approved',
        rejectionReason: null,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || 'admin',
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      alert('Failed to approve request: ' + (err.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectingRequest) return;
    try {
      setActionLoadingId(rejectingRequest.id);
      const docRef = getDocRef('certificate_requests', rejectingRequest.id);
      await updateDoc(docRef, {
        status: 'Rejected',
        rejectionReason: rejectionReasonInput.trim() || 'Sapling photo proof requires resubmission.',
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || 'admin',
        updatedAt: serverTimestamp(),
      });
      setRejectingRequest(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      alert('Failed to reject request: ' + (err.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const q = requestSearch.toLowerCase().trim();
      const name = (r.participantName || '').toLowerCase();
      const email = (r.participantEmail || '').toLowerCase();
      const usn = (r.usn || '').toLowerCase();
      const ticket = (r.ticketId || '').toLowerCase();

      if (q && !name.includes(q) && !email.includes(q) && !usn.includes(q) && !ticket.includes(q)) {
        return false;
      }

      if (requestStatusFilter === 'pending') {
        return r.status === 'Request Submitted' || r.status === 'Under Review';
      }
      if (requestStatusFilter === 'approved') {
        return r.status === 'Approved';
      }
      if (requestStatusFilter === 'rejected') {
        return r.status === 'Rejected';
      }

      return true;
    });
  }, [requests, requestSearch, requestStatusFilter]);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'Request Submitted' || r.status === 'Under Review').length;
  }, [requests]);

  const approvedRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'Approved').length;
  }, [requests]);

  const rejectedRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'Rejected').length;
  }, [requests]);

  // Single PDF download handler
  const handleDownloadSingle = async () => {
    if (!selectedParticipant && !testNameOverride) return;
    if (isGeneratingSingle) return; // Prevent duplicate generation

    try {
      setIsGeneratingSingle(true);
      await downloadCertificatePdf(activeDisplayName, config);
    } catch (err: any) {
      alert('Error generating certificate PDF: ' + err.message);
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  // Bulk PDF generation handler
  const handleDownloadBulk = async () => {
    const targetParticipants = filteredParticipants.filter((p) => selectedIds.has(p.id));
    if (targetParticipants.length === 0) {
      alert('Please select at least one participant for bulk generation.');
      return;
    }
    if (isBulkGenerating) return; // Prevent duplicate trigger

    try {
      setIsBulkGenerating(true);
      setBulkProgress({ current: 0, total: targetParticipants.length, name: 'Initializing...' });

      await generateBulkCertificatesPdf(
        targetParticipants.map((p) => ({ name: p.name, email: p.email })),
        config,
        (current, total, name) => {
          setBulkProgress({ current, total, name });
        }
      );
    } catch (err: any) {
      alert('Error during bulk certificate generation: ' + err.message);
    } finally {
      setIsBulkGenerating(false);
      setBulkProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Switcher: Grant Certificates Queue vs Typography & Bulk */}
      <div className="flex items-center gap-2 border-b border-[#282B3A] pb-3">
        <button
          onClick={() => setActiveSubView('queue')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded flex items-center gap-2 transition-all ${
            activeSubView === 'queue'
              ? 'bg-[#DC2626] text-[#F8FAFC] shadow-sm'
              : 'bg-[#12131A] text-[#64748B] border border-[#282B3A] hover:text-[#F8FAFC]'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Certificate Request Queue</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-white text-[#DC2626] font-bold rounded-full">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubView('template')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold rounded flex items-center gap-2 transition-all ${
            activeSubView === 'template'
              ? 'bg-[#DC2626] text-[#F8FAFC] shadow-sm'
              : 'bg-[#12131A] text-[#64748B] border border-[#282B3A] hover:text-[#F8FAFC]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Template Designer & Bulk Export</span>
        </button>
      </div>

      {activeSubView === 'queue' ? (
        <div className="space-y-6">
          {/* Header & Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#12131A] border border-[#282B3A] rounded">
              <span className="font-mono text-[10px] text-[#64748B] uppercase block">Total Requests</span>
              <span className="font-mono text-2xl font-bold text-[#F8FAFC]">{requests.length}</span>
            </div>
            <div className="p-4 bg-[#12131A] border border-amber-900/60 bg-amber-950/20 rounded">
              <span className="font-mono text-[10px] text-amber-400 uppercase block">Pending Review</span>
              <span className="font-mono text-2xl font-bold text-amber-300">{pendingRequestsCount}</span>
            </div>
            <div className="p-4 bg-[#12131A] border border-emerald-900/60 bg-emerald-950/20 rounded">
              <span className="font-mono text-[10px] text-emerald-400 uppercase block">Approved</span>
              <span className="font-mono text-2xl font-bold text-emerald-300">{approvedRequestsCount}</span>
            </div>
            <div className="p-4 bg-[#12131A] border border-red-900/60 bg-red-950/20 rounded">
              <span className="font-mono text-[10px] text-red-400 uppercase block">Rejected</span>
              <span className="font-mono text-2xl font-bold text-red-300">{rejectedRequestsCount}</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12131A] p-4 border border-[#282B3A] rounded">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
              <input
                type="text"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                placeholder="Search participant name, email, USN, or ticket ID..."
                className="w-full pl-9 pr-4 py-2 bg-[#0B0C10] border border-[#282B3A] text-xs font-mono text-[#F8FAFC] rounded placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRequestStatusFilter(filter)}
                  className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded transition-all whitespace-nowrap ${
                    requestStatusFilter === filter
                      ? 'bg-[#DC2626] text-[#F8FAFC] font-bold'
                      : 'bg-[#0B0C10] text-[#64748B] border border-[#282B3A] hover:text-[#F8FAFC]'
                  }`}
                >
                  {filter === 'all' && `All (${requests.length})`}
                  {filter === 'pending' && `Pending (${pendingRequestsCount})`}
                  {filter === 'approved' && `Approved (${approvedRequestsCount})`}
                  {filter === 'rejected' && `Rejected (${rejectedRequestsCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Request List */}
          {requestsLoading ? (
            <div className="py-20 text-center space-y-3 bg-[#12131A] border border-[#282B3A] rounded">
              <Loader2 className="w-8 h-8 text-[#DC2626] animate-spin mx-auto" />
              <p className="font-mono text-xs text-[#64748B]">Loading certificate request queue...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#12131A] border border-[#282B3A] rounded">
              <Sprout className="w-10 h-10 text-[#64748B] mx-auto opacity-60" />
              <p className="font-mono text-sm text-[#F8FAFC] font-bold uppercase">No Certificate Requests Found</p>
              <p className="font-mono text-xs text-[#64748B]">
                {requestSearch ? 'No submissions match your query.' : 'Participants will appear here once they plant their sapling and request their certificate.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'Request Submitted' || req.status === 'Under Review';
                const isApproved = req.status === 'Approved';
                const isRejected = req.status === 'Rejected';
                const isActionBusy = actionLoadingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-5 bg-[#12131A] border border-[#282B3A] hover:border-[#DC2626]/40 rounded shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                  >
                    {/* Left: Participant Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#F8FAFC]">
                          {req.participantName}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#1A1C26] border border-[#DC2626]/60 text-[#DC2626] rounded">
                          {req.vertical || 'Air Rifle'}
                        </span>
                        {req.ticketId && (
                          <span className="px-2 py-0.5 text-[10px] font-mono text-[#94A3B8] bg-[#0B0C10] border border-[#282B3A] rounded">
                            {req.ticketId}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Checked In
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-[#64748B]">
                        <div>
                          <span className="text-[#94A3B8]">Email:</span> {req.participantEmail}
                        </div>
                        {req.usn && (
                          <div>
                            <span className="text-[#94A3B8]">USN:</span> {req.usn}
                          </div>
                        )}
                        <div>
                          <span className="text-[#94A3B8]">College:</span> {req.college || 'RVCE'}
                        </div>
                      </div>

                      {req.rejectionReason && isRejected && (
                        <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded text-xs font-mono text-red-300">
                          <strong>Rejection reason:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Middle: Sapling Proof (Drive Link & Photo Preview) */}
                    <div className="flex items-center gap-3 shrink-0">
                      {req.photoUrl ? (
                        <div
                          onClick={() => setSelectedPhotoModal({ url: req.photoUrl, name: req.participantName })}
                          className="relative group cursor-pointer w-20 h-20 bg-[#0B0C10] border border-[#282B3A] hover:border-[#DC2626] rounded overflow-hidden shadow shrink-0 transition-all"
                          title="Click to inspect high-resolution sapling photo"
                        >
                          <img
                            src={req.photoUrl}
                            alt="Sapling planting proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-[#0B0C10] border border-[#282B3A] rounded flex flex-col items-center justify-center text-[#64748B] font-mono text-[10px] text-center p-1 space-y-1">
                          <ExternalLink className="w-5 h-5 text-cyan-400" />
                          <span className="text-[9px] text-[#94A3B8]">Drive Proof</span>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs font-mono">
                        <span className="text-[10px] uppercase text-[#64748B] block font-semibold">Sapling Proof</span>
                        {req.driveLink && (
                          <a
                            href={req.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0C10] hover:bg-[#1A1C26] border border-cyan-800/80 hover:border-cyan-500 text-cyan-300 font-mono text-xs rounded transition-all shadow-sm font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Open Drive Link</span>
                          </a>
                        )}
                        {req.photoUrl && (
                          <button
                            onClick={() => setSelectedPhotoModal({ url: req.photoUrl, name: req.participantName })}
                            className="text-xs text-[#DC2626] hover:underline flex items-center gap-1 font-semibold block pt-0.5"
                          >
                            <Eye className="w-3 h-3" /> Inspect Photo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Badge & Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-[#282B3A]">
                      <div className="flex items-center gap-2">
                        {isApproved && (
                          <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs font-mono font-bold rounded flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="px-3 py-1 bg-amber-950/60 border border-amber-700 text-amber-300 text-xs font-mono font-bold rounded flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Under Review
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-3 py-1 bg-red-950/60 border border-red-700 text-red-300 text-xs font-mono font-bold rounded flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isApproved && (
                          <button
                            onClick={() => handleApproveRequest(req)}
                            disabled={isActionBusy}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs uppercase tracking-wider font-bold rounded flex items-center gap-1.5 shadow transition-colors"
                          >
                            {isActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Approve</span>
                          </button>
                        )}
                        {!isRejected && (
                          <button
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectionReasonInput('');
                            }}
                            disabled={isActionBusy}
                            className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700 disabled:opacity-50 text-red-200 font-mono text-xs uppercase tracking-wider font-bold rounded flex items-center gap-1.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner & Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#282B3A] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-[#DC2626] font-bold">
                  CERTIFICATE DISPATCH TERMINAL
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-semibold rounded">
                  CANVA ARTWORK ACTIVE
                </span>
              </div>
              <h2 className="font-headline-md text-2xl text-[#F8FAFC] uppercase tracking-wide font-serif mt-0.5">
                Participation Certificate Generation
              </h2>
              <p className="font-mono text-xs text-[#64748B] mt-1">
                Dynamic high-resolution name typography rendered over official Lakshya 2.0 participation template.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-auto">
              <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className={`px-3.5 py-2 font-mono text-xs uppercase tracking-wider flex items-center gap-2 border transition-all ${
              showConfigPanel
                ? 'bg-[#DC2626] text-[#F8FAFC] border-[#DC2626]'
                : 'bg-[#12131A] text-[#F8FAFC] border-[#282B3A] hover:bg-[#1A1C26]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>[ Config & Typography ]</span>
          </button>

          <button
            onClick={handleDownloadBulk}
            disabled={selectedIds.size === 0 || isBulkGenerating}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] disabled:opacity-40 disabled:cursor-not-allowed text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            {isBulkGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generating Batch...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Bulk Export ({selectedIds.size})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bulk Progress Indicator */}
      {bulkProgress && (
        <div className="p-4 bg-[#12131A] border border-[#DC2626]/60 space-y-2 rounded">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#F8FAFC] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
              Rendering: <strong className="text-[#DC2626]">{bulkProgress.name}</strong>
            </span>
            <span className="text-[#64748B]">
              {bulkProgress.current} of {bulkProgress.total} (
              {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2 bg-[#1A1C26] rounded-full overflow-hidden border border-[#282B3A]">
            <div
              className="h-full bg-[#DC2626] transition-all duration-150"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Typography Configuration Panel (Collapsible) */}
      {showConfigPanel && (
        <div className="p-5 bg-[#12131A] border border-[#282B3A] rounded space-y-4 animate-fade-in shadow-md">
          <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#DC2626]" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">
                Typography & Coordinate Calibration
              </h3>
            </div>
            <button
              onClick={handleResetConfig}
              className="text-xs font-mono text-[#64748B] hover:text-[#DC2626] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Font Family */}
            <div className="space-y-1.5">
              <label className="text-[#64748B] uppercase block">Font Family</label>
              <select
                value={config.fontFamily}
                onChange={(e) => handleConfigChange({ fontFamily: e.target.value })}
                className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] rounded text-xs"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Font Size */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[#64748B] uppercase">Font Size</label>
                <span className="text-[#DC2626] font-bold">{config.fontSize}px</span>
              </div>
              <input
                type="range"
                min="32"
                max="76"
                step="1"
                value={config.fontSize}
                onChange={(e) => handleConfigChange({ fontSize: Number(e.target.value) })}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>

            {/* X Position (Center %) */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[#64748B] uppercase">X Center Alignment</label>
                <span className="text-[#DC2626] font-bold">{config.xPercent}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="70"
                step="0.5"
                value={config.xPercent}
                onChange={(e) => handleConfigChange({ xPercent: Number(e.target.value) })}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>

            {/* Y Position (Baseline %) */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[#64748B] uppercase">Y Baseline Position</label>
                <span className="text-[#DC2626] font-bold">{config.yPercent}%</span>
              </div>
              <input
                type="range"
                min="44"
                max="58"
                step="0.2"
                value={config.yPercent}
                onChange={(e) => handleConfigChange({ yPercent: Number(e.target.value) })}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>

            {/* Font Color */}
            <div className="space-y-1.5">
              <label className="text-[#64748B] uppercase block">Font Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.fontColor}
                  onChange={(e) => handleConfigChange({ fontColor: e.target.value })}
                  className="w-8 h-8 rounded border border-[#282B3A] bg-transparent cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={config.fontColor}
                  onChange={(e) => handleConfigChange({ fontColor: e.target.value })}
                  className="flex-1 p-1.5 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] rounded text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* Max Text Width % */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[#64748B] uppercase">Max Width Before Auto-Shrink</label>
                <span className="text-[#DC2626] font-bold">{config.maxWidthPercent}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="85"
                step="1"
                value={config.maxWidthPercent}
                onChange={(e) => handleConfigChange({ maxWidthPercent: Number(e.target.value) })}
                className="w-full accent-[#DC2626] cursor-pointer"
              />
            </div>

            {/* Font Weight */}
            <div className="space-y-1.5">
              <label className="text-[#64748B] uppercase block">Font Weight</label>
              <select
                value={config.fontWeight}
                onChange={(e) => handleConfigChange({ fontWeight: e.target.value as any })}
                className="w-full p-2 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] rounded text-xs"
              >
                <option value="normal">Normal (Default)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi-Bold (600)</option>
                <option value="bold">Bold (700)</option>
              </select>
            </div>

            {/* Text Transform / Uppercase */}
            <div className="space-y-1.5">
              <label className="text-[#64748B] uppercase block">Uppercase Transform</label>
              <label className="flex items-center gap-2 p-2 bg-[#0B0C10] border border-[#282B3A] rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.uppercase}
                  onChange={(e) => handleConfigChange({ uppercase: e.target.checked })}
                  className="accent-[#DC2626]"
                />
                <span className="text-[#F8FAFC]">Force UPPERCASE</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual-Column Layout: Left Roster | Right Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Participants Table & Filter (5 Cols on XL) */}
        <div className="xl:col-span-5 bg-[#12131A] border border-[#282B3A] rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#DC2626]" />
              <h3 className="font-mono text-xs uppercase font-bold text-[#F8FAFC]">
                Participant Roster ({filteredParticipants.length})
              </h3>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-mono text-[#DC2626] hover:underline flex items-center gap-1"
            >
              {selectedIds.size === filteredParticipants.length && filteredParticipants.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Select All Filtered</span>
                </>
              )}
            </button>
          </div>

          {/* Search & Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shooter name, email, or USN..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#0B0C10] border border-[#282B3A] text-xs text-[#F8FAFC] rounded placeholder:text-[#64748B] focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <select
                value={eligibilityFilter}
                onChange={(e) => setEligibilityFilter(e.target.value as any)}
                className="p-1.5 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] rounded text-[11px]"
              >
                <option value="eligible">Eligible Shooters Only</option>
                <option value="attended">Attended Match Only</option>
                <option value="all">All Registrations</option>
              </select>

              <select
                value={verticalFilter}
                onChange={(e) => setVerticalFilter(e.target.value as any)}
                className="p-1.5 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] rounded text-[11px]"
              >
                <option value="all">All Disciplines</option>
                <option value="Air Rifle">Air Rifle</option>
                <option value="Air Pistol">Air Pistol</option>
              </select>
            </div>
          </div>

          {/* Participants Scroll List */}
          <div className="max-h-[560px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#1A1C26]">
            {filteredParticipants.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-[#64748B]">
                No participants match the selected filter.
              </div>
            ) : (
              filteredParticipants.map((p) => {
                const isSelected = selectedParticipant?.id === p.id;
                const isChecked = selectedIds.has(p.id);
                const attended = attendedEmails.has((p.email || p.id).toLowerCase());

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedParticipant(p);
                      setTestNameOverride(null);
                    }}
                    className={`pt-2 pb-2 px-2.5 flex items-center justify-between cursor-pointer rounded transition-all ${
                      isSelected
                        ? 'bg-[#1A1C26] border border-[#DC2626]/70 text-[#F8FAFC]'
                        : 'hover:bg-[#1A1C26]/50 text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(p.id);
                        }}
                        className="text-[#64748B] hover:text-[#DC2626]"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#DC2626]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#F8FAFC] truncate">
                          {p.name || 'Unnamed Competitor'}
                        </div>
                        <div className="text-[10px] font-mono text-[#64748B] truncate">
                          {p.email} {p.usn ? `· ${p.usn}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {attended && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded">
                          Attended
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? 'text-[#DC2626] translate-x-0.5' : 'text-[#64748B]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Preview & Single Export (7 Cols on XL) */}
        <div className="xl:col-span-7 bg-[#12131A] border border-[#282B3A] rounded p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#282B3A] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] block">
                WYSIWYG HIGH-DPI CANVAS PREVIEW
              </span>
              <h3 className="font-headline-sm text-lg text-[#F8FAFC] uppercase font-serif">
                {activeDisplayName}
              </h3>
              {selectedParticipant && (
                <span className="font-mono text-[11px] text-[#64748B]">
                  {selectedParticipant.email} · {selectedParticipant.college || 'RVCE'}
                </span>
              )}
            </div>

            <button
              onClick={handleDownloadSingle}
              disabled={isGeneratingSingle}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] disabled:opacity-50 text-[#F8FAFC] font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto shadow-md"
            >
              {isGeneratingSingle ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Edge-Case Name Preset Testing */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] text-[#64748B] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#DC2626]" /> Quick Layout Stress Tests:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <button
                onClick={() => setTestNameOverride(null)}
                className={`px-2.5 py-1 border rounded transition-colors ${
                  testNameOverride === null
                    ? 'bg-[#DC2626] border-[#DC2626] text-[#F8FAFC] font-bold'
                    : 'bg-[#0B0C10] border-[#282B3A] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Shooter: {selectedParticipant?.name || 'Standard'}
              </button>
              <button
                onClick={() => setTestNameOverride('Om')}
                className={`px-2 py-1 border rounded transition-colors ${
                  testNameOverride === 'Om'
                    ? 'bg-[#DC2626] border-[#DC2626] text-[#F8FAFC] font-bold'
                    : 'bg-[#0B0C10] border-[#282B3A] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Short: &quot;Om&quot;
              </button>
              <button
                onClick={() => setTestNameOverride('Mohammed Ali Abdul Rahman')}
                className={`px-2 py-1 border rounded transition-colors ${
                  testNameOverride === 'Mohammed Ali Abdul Rahman'
                    ? 'bg-[#DC2626] border-[#DC2626] text-[#F8FAFC] font-bold'
                    : 'bg-[#0B0C10] border-[#282B3A] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Multi-word: &quot;Mohammed Ali Abdul Rahman&quot;
              </button>
              <button
                onClick={() => setTestNameOverride('Dr. Chandrashekar Venkataraman Subramaniam')}
                className={`px-2 py-1 border rounded transition-colors ${
                  testNameOverride === 'Dr. Chandrashekar Venkataraman Subramaniam'
                    ? 'bg-[#DC2626] border-[#DC2626] text-[#F8FAFC] font-bold'
                    : 'bg-[#0B0C10] border-[#282B3A] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Long (Auto-Scale): &quot;Dr. Chandrashekar Venkataraman Subramaniam&quot;
              </button>
              <button
                onClick={() => setTestNameOverride("René D'Souza-O'Connor & Co.")}
                className={`px-2 py-1 border rounded transition-colors ${
                  testNameOverride === "René D'Souza-O'Connor & Co."
                    ? 'bg-[#DC2626] border-[#DC2626] text-[#F8FAFC] font-bold'
                    : 'bg-[#0B0C10] border-[#282B3A] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Special Chars: &quot;René D&apos;Souza-O&apos;Connor&quot;
              </button>
            </div>
          </div>

          {/* Certificate Interactive Canvas Preview Display */}
          <div className="relative w-full aspect-[1024/723] bg-[#0B0C10] border border-[#282B3A] rounded overflow-hidden shadow-2xl flex items-center justify-center">
            {previewError ? (
              <div className="text-center p-6 space-y-2 text-[#EF4444] font-mono text-xs">
                <p>{previewError}</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
                style={{ imageRendering: 'auto' }}
              />
            )}
          </div>

          {/* Filename preview & specs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-[#64748B] pt-2 border-t border-[#282B3A] gap-2">
            <div>
              Target Filename:{' '}
              <strong className="text-[#F8FAFC]">
                {sanitizeCertificateFilename(activeDisplayName)}
              </strong>
            </div>
            <div>Aspect: 1.414 (A4 Landscape Print Format · 300 DPI)</div>
          </div>
        </div>
      </div>
    </div>
    )}

      {/* Full Size Sapling Photo Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#12131A] border border-[#282B3A] rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs uppercase font-bold text-[#F8FAFC]">
                  Sapling Planting Verification — {selectedPhotoModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1C26] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full max-h-[70vh] bg-black rounded border border-[#282B3A] overflow-hidden flex items-center justify-center">
              <img
                src={selectedPhotoModal.url}
                alt="Sapling planting full proof"
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#282B3A]">
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="px-4 py-2 bg-[#1A1C26] hover:bg-[#282B3A] text-[#F8FAFC] font-mono text-xs uppercase tracking-wider rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#12131A] border border-[#282B3A] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#282B3A] pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                <h3 className="font-mono text-xs uppercase font-bold text-[#F8FAFC]">
                  Return Request / Specify Reason
                </h3>
              </div>
              <button
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReasonInput('');
                }}
                className="p-1 text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1C26] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <p className="text-[#94A3B8]">
                Returning certificate request for <strong>{rejectingRequest.participantName}</strong>. The participant will be informed and allowed to resubmit.
              </p>
              <label className="text-[#64748B] uppercase block text-[10px]">
                Reason for Rejection / Instructions (Optional):
              </label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g., Sapling photograph is blurry or invalid. Please re-upload a clear picture."
                className="w-full p-2.5 bg-[#0B0C10] border border-[#282B3A] text-[#F8FAFC] rounded text-xs focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#282B3A]">
              <button
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReasonInput('');
                }}
                className="px-3.5 py-1.5 font-mono text-xs text-[#64748B] hover:text-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={actionLoadingId === rejectingRequest.id}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#E51A1A] disabled:opacity-50 text-white font-mono text-xs uppercase tracking-widest font-bold rounded shadow transition-colors flex items-center gap-1.5"
              >
                {actionLoadingId === rejectingRequest.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
