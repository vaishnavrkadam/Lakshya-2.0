import type { LakshyaVertical } from '../types/lakshya';

export const LAKSHYA_EVENT_ID =
  (import.meta as any).env?.VITE_EVENT_ID || 'lakshya-2.0';

export const LAKSHYA_APP_ID =
  (import.meta as any).env?.VITE_FIREBASE_APP_ID || 'shaurya-lakshya-event';

export const REGISTRATION_FORM_URL =
  (import.meta as any).env?.VITE_REGISTRATION_FORM_URL || 'https://forms.gle/lakshya2026';

export const ADMIN_EMAILS: readonly string[] = [
  'nccrvce2025@gmail.com',
  'nccrvceshaurya@gmail.com',
  'lokakshas.cs24@rvce.edu.in',
  'shaurya.lakshya.admin@gmail.com',
  'rvcecdtlokakshasridhar@gmail.com',
  'vaishnavkadam57@gmail.com',
  'vaishnavrkadam.cs25@rvce.edu.in',
  'rvcecdtvaishnav@gmail.com',
  'isirishetty06@gmail.com',
  'katomsjnv@gmail.com',
] as const;

export const DEFAULT_SLOT_CAPACITY: Record<LakshyaVertical, number> = {
  'Air Rifle': 40,
  'Air Pistol': 16,
};

export const EVENT_DATES = [
  { dateKey: '2026-09-26', dateLabel: '26 September 2026' },
  { dateKey: '2026-09-27', dateLabel: '27 September 2026' },
] as const;

export interface LakshyaScheduledSlot {
  slotId: string;
  timeLabel: string;
  startMinutes: number;
  endMinutes: number;
}

// Day 1 — 26 September: 7 bookable slots, Lunch Break (12:00–12:30) omitted
export const DAY_1_SLOTS: readonly LakshyaScheduledSlot[] = [
  { slotId: 'slot-1', timeLabel: '07:30–09:00', startMinutes: 450, endMinutes: 540 },
  { slotId: 'slot-2', timeLabel: '08:30–10:00', startMinutes: 510, endMinutes: 600 },
  { slotId: 'slot-3', timeLabel: '09:30–11:00', startMinutes: 570, endMinutes: 660 },
  { slotId: 'slot-4', timeLabel: '10:30–12:00', startMinutes: 630, endMinutes: 720 },
  { slotId: 'slot-5', timeLabel: '12:30–14:00', startMinutes: 750, endMinutes: 840 },
  { slotId: 'slot-6', timeLabel: '13:30–15:00', startMinutes: 810, endMinutes: 900 },
  { slotId: 'slot-7', timeLabel: '14:30–16:00', startMinutes: 870, endMinutes: 960 },
] as const;

// Day 2 — 27 September: 6 bookable slots, Lunch Break (12:00–12:30) omitted, Finals (15:00–16:30) non-bookable
export const DAY_2_SLOTS: readonly LakshyaScheduledSlot[] = [
  { slotId: 'slot-1', timeLabel: '07:30–09:00', startMinutes: 450, endMinutes: 540 },
  { slotId: 'slot-2', timeLabel: '08:30–10:00', startMinutes: 510, endMinutes: 600 },
  { slotId: 'slot-3', timeLabel: '09:30–11:00', startMinutes: 570, endMinutes: 660 },
  { slotId: 'slot-4', timeLabel: '10:30–12:00', startMinutes: 630, endMinutes: 720 },
  { slotId: 'slot-5', timeLabel: '12:30–14:00', startMinutes: 750, endMinutes: 840 },
  { slotId: 'slot-6', timeLabel: '13:30–15:00', startMinutes: 810, endMinutes: 900 },
] as const;

export const OFFICIAL_SCHEDULE_BY_DATE: Record<string, readonly LakshyaScheduledSlot[]> = {
  '2026-09-26': DAY_1_SLOTS,
  '2026-09-27': DAY_2_SLOTS,
};

export const STANDARD_HOURLY_SLOTS = DAY_1_SLOTS;

export const SCORE_RANGE = {
  min: 0,
  max: 10,
};

export function normalizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : '';
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
}

export function verticalSlug(vertical: LakshyaVertical): string {
  return vertical.toLowerCase().replace(/\s+/g, '-');
}

export function deterministicBookingId(
  eventId: string,
  email: string,
  vertical: LakshyaVertical,
): string {
  return `${eventId}_${normalizeEmail(email)}_${verticalSlug(vertical)}`;
}

export function generateTicketId(): string {
  const chars = '0123456789ABCDEF';
  let rand = '';
  const array = new Uint8Array(3);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 3; i++) {
      rand += array[i].toString(16).padStart(2, '0').toUpperCase();
    }
  } else {
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `TKT-${rand}`;
}

export function generateQrToken(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    let str = '';
    for (let i = 0; i < array.length; i++) {
      str += String.fromCharCode(array[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
