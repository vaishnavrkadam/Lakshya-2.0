import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

const EVENT_ID = 'lakshya-2.0';
const APP_ID = process.env.LAKSHYA_APP_ID || 'lakshya-2026';
const ADMIN_EMAILS = new Set([
  'nccrvce2025@gmail.com',
  'nccrvceshaurya@gmail.com',
  'lokakshas.cs24@rvce.edu.in',
  'shaurya.lakshya.admin@gmail.com',
  'rvcecdtlokakshasridhar@gmail.com',
  'vaishnavkadam57@gmail.com',
  'vaishnavrkadam.cs25@rvce.edu.in',
]);

type Vertical = 'Air Rifle' | 'Air Pistol';

function emailFromAuth(auth: { token: Record<string, unknown> } | undefined): string {
  const email = auth?.token.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw new HttpsError('unauthenticated', 'A Google-authenticated email is required.');
  }
  return email.trim().toLowerCase();
}

function requireAdmin(auth: { token: Record<string, unknown> } | undefined): string {
  const email = emailFromAuth(auth);
  if (!ADMIN_EMAILS.has(email)) {
    throw new HttpsError('permission-denied', 'Admin access is required.');
  }
  return email;
}

function verticalFromInput(value: unknown): Vertical {
  if (value === 'Air Rifle' || value === 'Air Pistol') return value;
  throw new HttpsError('invalid-argument', 'vertical must be Air Rifle or Air Pistol.');
}

function bookingIdFor(email: string, vertical: Vertical): string {
  return `${EVENT_ID}_${email}_${vertical.toLowerCase().replace(/\s+/g, '-')}`;
}

function makeTicketId(): string {
  return `TKT-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function makeQrToken(): string {
  return randomBytes(24).toString('base64url');
}

function appDataPath(collection: string, id: string): string {
  return `artifacts/${APP_ID}/public/data/${collection}/${id}`;
}

export const createBooking = onCall(async (request) => {
  const email = emailFromAuth(request.auth);
  const vertical = verticalFromInput(request.data?.vertical);
  const slotId = request.data?.slotId;

  if (typeof slotId !== 'string' || !slotId) {
    throw new HttpsError('invalid-argument', 'slotId is required.');
  }

  const registrationRef = db.doc(appDataPath('registrations', email));
  const slotRef = db.doc(appDataPath('slots', slotId));
  const bookingId = bookingIdFor(email, vertical);
  const bookingRef = db.doc(appDataPath('bookings', bookingId));
  const leaderboardRef = db.doc(appDataPath('leaderboard_entries', bookingId));

  let result;

  await db.runTransaction(async (tx) => {
    const [registrationSnap, slotSnap, bookingSnap] = await Promise.all([
      tx.get(registrationRef),
      tx.get(slotRef),
      tx.get(bookingRef),
    ]);

    if (!registrationSnap.exists) {
      throw new HttpsError('failed-precondition', 'Event registration not found.');
    }
    if (registrationSnap.data()?.eligible !== true) {
      throw new HttpsError('permission-denied', 'This registration is not eligible for booking.');
    }
    if (!slotSnap.exists) {
      throw new HttpsError('not-found', 'Slot no longer exists.');
    }
    if (bookingSnap.exists && bookingSnap.data()?.status === 'confirmed') {
      throw new HttpsError('already-exists', `You already have an ${vertical} booking.`);
    }

    const slot = slotSnap.data()!;
    if (slot.eventId !== EVENT_ID || slot.isActive !== true || slot.vertical !== vertical) {
      throw new HttpsError('failed-precondition', 'Selected slot is not available for this vertical.');
    }
    if ((slot.booked ?? 0) >= (slot.capacity ?? 0)) {
      throw new HttpsError('resource-exhausted', 'Selected slot is full.');
    }

    const ticketId = makeTicketId();
    const qrToken = makeQrToken();
    const now = Timestamp.now();
    const registration = registrationSnap.data()!;

    const booking = {
      id: bookingId,
      eventId: EVENT_ID,
      participantEmail: email,
      participantName: registration.name,
      vertical,
      slotId,
      slotDateKey: slot.dateKey,
      slotDateLabel: slot.dateLabel,
      slotTimeLabel: slot.timeLabel,
      ticketId,
      qrToken,
      bookingSource: 'self',
      status: 'confirmed',
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
      totalScore: null,
      scoreStatus: 'pending',
      isDQ: false,
      bookedAt: now,
      updatedAt: now,
    };

    const leaderboardEntry = {
      id: bookingId,
      bookingId,
      participantEmail: email,
      participantName: registration.name,
      vertical,
      score: null,
      scoreStatus: 'pending',
      isDQ: false,
      lastScoreUpdatedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(bookingRef, booking);
    tx.set(leaderboardRef, leaderboardEntry);
    tx.update(slotRef, {
      booked: (slot.booked ?? 0) + 1,
      updatedAt: now,
    });

    result = { bookingId, ticketId, vertical, slotId };
  });

  return result;
});

export const adminAllocateBooking = onCall(async (request) => {
  const actorEmail = requireAdmin(request.auth);
  const participantEmail = String(request.data?.participantEmail || '').trim().toLowerCase();
  const slotId = request.data?.slotId;
  const vertical = verticalFromInput(request.data?.vertical);
  const allowCapacityOverride = request.data?.allowCapacityOverride === true;

  if (!participantEmail || typeof slotId !== 'string' || !slotId) {
    throw new HttpsError('invalid-argument', 'participantEmail and slotId are required.');
  }

  const registrationRef = db.doc(appDataPath('registrations', participantEmail));
  const slotRef = db.doc(appDataPath('slots', slotId));
  const bookingId = bookingIdFor(participantEmail, vertical);
  const bookingRef = db.doc(appDataPath('bookings', bookingId));
  const leaderboardRef = db.doc(appDataPath('leaderboard_entries', bookingId));
  const auditRef = db.collection(appDataPath('audit_logs', 'placeholder').split('/placeholder')[0]).doc();

  await db.runTransaction(async (tx) => {
    const [registrationSnap, slotSnap, bookingSnap] = await Promise.all([
      tx.get(registrationRef),
      tx.get(slotRef),
      tx.get(bookingRef),
    ]);

    if (!registrationSnap.exists || registrationSnap.data()?.eligible !== true) {
      throw new HttpsError('failed-precondition', 'Registered eligible participant not found.');
    }
    if (!slotSnap.exists) throw new HttpsError('not-found', 'Slot not found.');
    if (bookingSnap.exists && bookingSnap.data()?.status === 'confirmed') {
      throw new HttpsError('already-exists', 'Participant already has a booking for this vertical.');
    }

    const slot = slotSnap.data()!;
    if (slot.vertical !== vertical || slot.isActive !== true) {
      throw new HttpsError('failed-precondition', 'Slot does not match the requested vertical or is disabled.');
    }
    if (!allowCapacityOverride && (slot.booked ?? 0) >= (slot.capacity ?? 0)) {
      throw new HttpsError('resource-exhausted', 'Slot is full.');
    }

    const now = Timestamp.now();
    const registration = registrationSnap.data()!;
    const booking = {
      id: bookingId,
      eventId: EVENT_ID,
      participantEmail,
      participantName: registration.name,
      vertical,
      slotId,
      slotDateKey: slot.dateKey,
      slotDateLabel: slot.dateLabel,
      slotTimeLabel: slot.timeLabel,
      ticketId: makeTicketId(),
      qrToken: makeQrToken(),
      bookingSource: 'admin',
      status: 'confirmed',
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
      totalScore: null,
      scoreStatus: 'pending',
      isDQ: false,
      bookedAt: now,
      updatedAt: now,
    };

    tx.set(bookingRef, booking);
    tx.set(leaderboardRef, {
      id: bookingId,
      bookingId,
      participantEmail,
      participantName: registration.name,
      vertical,
      score: null,
      scoreStatus: 'pending',
      isDQ: false,
      lastScoreUpdatedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    tx.update(slotRef, {
      booked: (slot.booked ?? 0) + 1,
      updatedAt: now,
    });
    tx.set(auditRef, {
      action: 'MANUAL_ALLOCATION',
      entityType: 'booking',
      entityId: bookingId,
      actorEmail,
      vertical,
      metadata: { slotId, participantEmail, allowCapacityOverride },
      createdAt: now,
    });
  });

  return { bookingId, vertical, slotId };
});

export const checkInBooking = onCall(async (request) => {
  const actorEmail = requireAdmin(request.auth);
  const bookingId = String(request.data?.bookingId || '');
  const qrToken = String(request.data?.qrToken || '');
  const ticketId = String(request.data?.ticketId || '');

  if (!bookingId || !qrToken || !ticketId) {
    throw new HttpsError('invalid-argument', 'bookingId, qrToken and ticketId are required.');
  }

  const bookingRef = db.doc(appDataPath('bookings', bookingId));
  const auditRef = db.collection(appDataPath('audit_logs', 'placeholder').split('/placeholder')[0]).doc();
  let response: Record<string, unknown> = {};

  await db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError('not-found', 'Booking not found.');

    const booking = bookingSnap.data()!;
    if (booking.qrToken !== qrToken || booking.ticketId !== ticketId) {
      throw new HttpsError('permission-denied', 'QR verification failed.');
    }
    if (booking.status !== 'confirmed') {
      throw new HttpsError('failed-precondition', 'Booking is not active.');
    }

    if (booking.checkedIn === true) {
      response = {
        status: 'already_attended',
        checkedInAt: booking.checkedInAt ?? null,
        checkedInBy: booking.checkedInBy ?? null,
        bookingId,
      };
      tx.set(auditRef, {
        action: 'CHECK_IN_DUPLICATE_ATTEMPT',
        entityType: 'booking',
        entityId: bookingId,
        actorEmail,
        vertical: booking.vertical,
        metadata: {},
        createdAt: Timestamp.now(),
      });
      return;
    }

    const now = Timestamp.now();
    tx.update(bookingRef, {
      checkedIn: true,
      checkedInAt: now,
      checkedInBy: actorEmail,
      updatedAt: now,
    });
    tx.set(auditRef, {
      action: 'CHECK_IN',
      entityType: 'booking',
      entityId: bookingId,
      actorEmail,
      vertical: booking.vertical,
      metadata: { ticketId },
      createdAt: now,
    });
    response = { status: 'verified', bookingId, checkedInAt: now };
  });

  return response;
});

export const adminSetScore = onCall(async (request) => {
  const actorEmail = requireAdmin(request.auth);
  const bookingId = String(request.data?.bookingId || '');
  const rawScore = request.data?.score;
  const isDQ = request.data?.isDQ === true;
  const score = rawScore == null || rawScore === '' ? null : Number(rawScore);

  if (!bookingId || (score !== null && (!Number.isFinite(score) || score < 0 || score > 109))) {
    throw new HttpsError('invalid-argument', 'bookingId is required and total score must be between 0 and 109.');
  }

  const bookingRef = db.doc(appDataPath('bookings', bookingId));
  const leaderboardRef = db.doc(appDataPath('leaderboard_entries', bookingId));
  const auditRef = db.collection(appDataPath('audit_logs', 'placeholder').split('/placeholder')[0]).doc();

  await db.runTransaction(async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError('not-found', 'Booking not found.');

    const booking = bookingSnap.data()!;
    const now = Timestamp.now();
    const scoreStatus = score === null ? 'pending' : 'published';

    tx.update(bookingRef, {
      totalScore: score,
      scoreStatus,
      isDQ,
      updatedAt: now,
    });
    tx.set(leaderboardRef, {
      id: bookingId,
      bookingId,
      participantEmail: booking.participantEmail,
      participantName: booking.participantName,
      vertical: booking.vertical,
      score,
      scoreStatus,
      isDQ,
      lastScoreUpdatedAt: score === null ? null : now,
      updatedAt: now,
    }, { merge: true });
    tx.set(auditRef, {
      action: 'SCORE_UPDATED',
      entityType: 'booking',
      entityId: bookingId,
      actorEmail,
      vertical: booking.vertical,
      metadata: { score, isDQ },
      createdAt: now,
    });
  });

  return { bookingId, score, isDQ };
});
