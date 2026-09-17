import type { LakshyaQrPayload, LakshyaVertical } from '../types/lakshya';

export interface BookingPayloadSource {
  eventId: string;
  bookingId: string;
  ticketId: string;
  vertical: LakshyaVertical;
  qrToken: string;
  issuedAt: string;
}

export function buildQrPayload(source: BookingPayloadSource): LakshyaQrPayload {
  return {
    v: 1,
    eventId: source.eventId,
    bookingId: source.bookingId,
    ticketId: source.ticketId,
    vertical: source.vertical,
    qrToken: source.qrToken,
    issuedAt: source.issuedAt,
  };
}

export function encodeQrPayload(payload: LakshyaQrPayload): string {
  return JSON.stringify(payload);
}

export function parseQrPayload(raw: string): LakshyaQrPayload {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    throw new Error('INVALID_QR_PAYLOAD_JSON');
  }

  if (!value || typeof value !== 'object') {
    throw new Error('INVALID_QR_PAYLOAD');
  }

  const data = value as Partial<LakshyaQrPayload>;

  if (
    data.v !== 1 ||
    typeof data.eventId !== 'string' ||
    typeof data.bookingId !== 'string' ||
    typeof data.ticketId !== 'string' ||
    typeof data.qrToken !== 'string' ||
    typeof data.issuedAt !== 'string' ||
    (data.vertical !== 'Air Rifle' && data.vertical !== 'Air Pistol')
  ) {
    throw new Error('INVALID_QR_PAYLOAD_STRUCTURE');
  }

  return data as LakshyaQrPayload;
}
