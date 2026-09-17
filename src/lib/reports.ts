import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Slot, Booking, Registration } from '../types/lakshya';

/**
 * Generates and downloads the Slot Roster PDF
 */
export function generateSlotRostersPdf(
  slots: Slot[],
  bookings: Booking[],
  selectedVertical?: string
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LAKSHYA 2.0 — Official Slot Rosters', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${now}`, 14, 27);
  doc.text('Organizer: NCC RVCE & Precihole Sports', 14, 32);

  let currentY = 40;

  const filteredSlots = selectedVertical && selectedVertical !== 'All'
    ? slots.filter((s) => s.vertical === selectedVertical)
    : slots;

  // Sort slots chronologically
  filteredSlots.sort((a, b) => a.sortOrder - b.sortOrder);

  for (const slot of filteredSlots) {
    const slotBookings = bookings.filter((b) => b.slotId === slot.id && b.status === 'confirmed');

    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `[${slot.vertical}] ${slot.dateLabel} | ${slot.timeLabel} — Occupancy: ${slotBookings.length}/${slot.capacity}`,
      14,
      currentY
    );
    currentY += 4;

    const tableData = slotBookings.map((b, idx) => [
      (idx + 1).toString(),
      b.participantName || 'N/A',
      b.participantEmail || 'N/A',
      b.ticketId || 'N/A',
      b.checkedIn ? 'Attended' : 'Pending',
      b.totalScore !== null ? b.totalScore.toFixed(1) : '-',
    ]);

    if (tableData.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No participants booked in this slot yet.', 14, currentY + 4);
      currentY += 12;
    } else {
      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Name', 'Email', 'Ticket ID', 'Attendance', 'Score']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 12;
    }
  }

  doc.save(`lakshya-slot-rosters-${Date.now()}.pdf`);
}

/**
 * Generates and downloads the Registered But Not Booked PDF
 */
export function generateUnbookedRegistrationsPdf(
  registrations: Registration[],
  bookings: Booking[],
  verticalFilter: 'all' | 'Air Rifle' | 'Air Pistol' = 'all'
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LAKSHYA 2.0 — Registered but Not Booked', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${now}`, 14, 27);
  doc.text(`Vertical Filter: ${verticalFilter}`, 14, 32);

  // Determine unbooked
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const rifleBookedEmails = new Set(
    activeBookings.filter((b) => b.vertical === 'Air Rifle').map((b) => b.participantEmail.toLowerCase())
  );
  const pistolBookedEmails = new Set(
    activeBookings.filter((b) => b.vertical === 'Air Pistol').map((b) => b.participantEmail.toLowerCase())
  );

  const unbookedRows: string[][] = [];

  for (const reg of registrations) {
    const email = reg.email.toLowerCase();
    const hasRifle = rifleBookedEmails.has(email);
    const hasPistol = pistolBookedEmails.has(email);

    let isUnbooked = false;
    let statusNote = '';

    if (verticalFilter === 'all') {
      if (!hasRifle && !hasPistol) {
        isUnbooked = true;
        statusNote = 'No bookings in either vertical';
      }
    } else if (verticalFilter === 'Air Rifle') {
      if (!hasRifle) {
        isUnbooked = true;
        statusNote = hasPistol ? 'Has Pistol, missing Rifle' : 'No Rifle';
      }
    } else if (verticalFilter === 'Air Pistol') {
      if (!hasPistol) {
        isUnbooked = true;
        statusNote = hasRifle ? 'Has Rifle, missing Pistol' : 'No Pistol';
      }
    }

    if (isUnbooked) {
      unbookedRows.push([
        (unbookedRows.length + 1).toString(),
        reg.name,
        reg.email,
        reg.gender || '-',
        reg.source || 'intake',
        statusNote,
      ]);
    }
  }

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Participant Name', 'Email', 'Gender', 'Source', 'Unbooked Status']],
    body: unbookedRows,
    theme: 'grid',
    headStyles: { fillColor: [180, 80, 40] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`lakshya-unbooked-participants-${Date.now()}.pdf`);
}

/**
 * Generates and downloads the Slot Occupancy PDF
 */
export function generateOccupancyPdf(slots: Slot[], bookings: Booking[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LAKSHYA 2.0 — Slot Occupancy & Capacity Report', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${now}`, 14, 27);
  doc.text('Organizer: NCC RVCE & Precihole Sports', 14, 32);

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');

  const rows = slots.map((s, idx) => {
    const bookedCount = activeBookings.filter((b) => b.slotId === s.id).length;
    const remaining = Math.max(0, s.capacity - bookedCount);
    const pct = s.capacity > 0 ? Math.round((bookedCount / s.capacity) * 100) : 0;
    return [
      (idx + 1).toString(),
      s.vertical,
      s.dateLabel,
      s.timeLabel,
      s.capacity.toString(),
      bookedCount.toString(),
      remaining.toString(),
      `${pct}%`,
      s.isActive ? 'Active' : 'Disabled',
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Vertical', 'Date', 'Time Slot', 'Capacity', 'Booked', 'Remaining', 'Occupancy', 'State']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [49, 93, 76] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`lakshya-slot-occupancy-${Date.now()}.pdf`);
}
