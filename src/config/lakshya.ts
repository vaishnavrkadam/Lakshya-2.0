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
  'vaishnavrkadam.cs25@rvce.edu.in'
] as const;

export const DEFAULT_SLOT_CAPACITY: Record<LakshyaVertical, number> = {
  'Air Rifle': 60,
  'Air Pistol': 60,
};

export const EVENT_DATES = [
  { dateKey: '2026-09-26', dateLabel: '26th September 2026' },
  { dateKey: '2026-09-27', dateLabel: '27th September 2026' },
] as const;

export const STANDARD_HOURLY_SLOTS = [
  { timeLabel: '08:00 - 09:00 HRS', startMinutes: 480, endMinutes: 540 },
  { timeLabel: '09:00 - 10:00 HRS', startMinutes: 540, endMinutes: 600 },
  { timeLabel: '10:00 - 11:00 HRS', startMinutes: 600, endMinutes: 660 },
  { timeLabel: '11:00 - 12:00 HRS', startMinutes: 660, endMinutes: 720 },
  { timeLabel: '12:00 - 13:00 HRS', startMinutes: 720, endMinutes: 780 },
  { timeLabel: '13:00 - 14:00 HRS', startMinutes: 780, endMinutes: 840 },
  { timeLabel: '14:00 - 15:00 HRS', startMinutes: 840, endMinutes: 900 },
  { timeLabel: '15:00 - 16:00 HRS', startMinutes: 900, endMinutes: 960 },
] as const;

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
