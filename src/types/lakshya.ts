export type LakshyaVertical = 'Air Rifle' | 'Air Pistol';

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';
export type BookingSource = 'self' | 'admin';
export type ScoreStatus = 'pending' | 'published' | 'final';
export type RegistrationSource = 'google_form' | 'manual' | 'imported';

export interface Registration {
  id: string; // normalized email
  name: string;
  email: string;
  googleUid?: string | null;
  gender?: string | null;
  cadetType?: string | null;
  source: RegistrationSource;
  eligible: boolean;
  registeredAt: any;
  updatedAt: any;
}

export interface Slot {
  id: string;
  eventId: string;
  vertical: LakshyaVertical;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  startMinutes: number;
  endMinutes: number;
  capacity: number;
  booked: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
}

export interface Scorecard {
  id: string; // bookingId_round_1
  bookingId: string;
  roundNumber: number; // 1, 2, ...
  shots: number[]; // 10 shots: [10, 9.5, ...]
  penalty: number; // deductions
  shotsSum: number;
  totalScore: number;
  count10s: number;
  count9s: number;
  count8s: number;
  isDQ: boolean;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Booking {
  id: string;
  eventId: string;
  participantEmail: string;
  participantName: string;
  participantGender?: string | null;
  vertical: LakshyaVertical;
  slotId: string;
  slotDateKey: string;
  slotDateLabel: string;
  slotTimeLabel: string;
  ticketId: string;
  qrToken: string;
  bookingSource: BookingSource;
  status: BookingStatus;
  checkedIn: boolean;
  checkedInAt: any | null;
  checkedInBy: string | null;
  totalScore: number | null;
  shots?: number[];
  penalty?: number;
  count10s?: number;
  count9s?: number;
  count8s?: number;
  roundNumber?: number;
  scorecards?: Scorecard[];
  scoreStatus?: ScoreStatus;
  isDQ: boolean;
  college?: string;
  cadetStatus?: string;
  emailKey?: string;
  registrationId?: string;
  slotStartMinutes?: number;
  bookedAt: any;
  updatedAt: any;
}

export interface LeaderboardEntry {
  id: string;
  bookingId: string;
  participantEmail: string;
  participantName: string;
  gender?: string | null;
  vertical: LakshyaVertical;
  score: number | null;
  shots?: number[];
  penalty?: number;
  count10s?: number;
  count9s?: number;
  count8s?: number;
  roundNumber?: number;
  scoreStatus: ScoreStatus;
  isDQ: boolean;
  lastScoreUpdatedAt: any | null;
  createdAt: any;
  updatedAt: any;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorEmail: string;
  vertical?: LakshyaVertical | null;
  metadata?: Record<string, any>;
  createdAt: any;
}

export interface LakshyaQrPayload {
  v: 1;
  eventId: string;
  bookingId: string;
  ticketId: string;
  vertical: LakshyaVertical;
  qrToken: string;
  issuedAt: string;
}
