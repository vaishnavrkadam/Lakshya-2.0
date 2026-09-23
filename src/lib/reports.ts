import type { Slot, Booking, Registration } from '../types/lakshya';

/**
 * Generates and downloads the Slot Roster PDF
 */
export async function generateSlotRostersPdf(
  slots: Slot[],
  bookings: Booking[],
  selectedVertical?: string
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LAKSHYA 2.0 — Official Slot Rosters', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${now}`, 14, 27);
  doc.text('Organizer: NCC RVCE & GARE', 14, 32);

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
 * Contains strictly: Serial Number (S.No) and Shooter Name
 */
export async function generateUnbookedRegistrationsPdf(
  registrations: Registration[],
  bookings: Booking[],
  verticalFilter: 'all' | 'Air Rifle' | 'Air Pistol' = 'all'
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LAKSHYA 2.0 — Unbooked Shooters Roster', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated on: ${now} | Filter: ${verticalFilter === 'all' ? 'All Verticals' : verticalFilter}`, 14, 25);
  doc.text('Organizer: NCC RVCE × GARE', 14, 30);

  // Determine unbooked
  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const rifleBookedEmails = new Set(
    activeBookings.filter((b) => b.vertical === 'Air Rifle').map((b) => b.participantEmail.toLowerCase())
  );
  const pistolBookedEmails = new Set(
    activeBookings.filter((b) => b.vertical === 'Air Pistol').map((b) => b.participantEmail.toLowerCase())
  );

  const unbookedRows: string[][] = [];
  const seenKeys = new Set<string>();

  for (const reg of registrations) {
    const email = reg.email.toLowerCase();
    const rvceEmail = (reg.rvceEmail || '').toLowerCase();
    const hasRifle = rifleBookedEmails.has(email) || (rvceEmail && rifleBookedEmails.has(rvceEmail));
    const hasPistol = pistolBookedEmails.has(email) || (rvceEmail && pistolBookedEmails.has(rvceEmail));

    let isUnbooked = false;

    if (verticalFilter === 'all') {
      if (!hasRifle && !hasPistol) isUnbooked = true;
    } else if (verticalFilter === 'Air Rifle') {
      if (!hasRifle) isUnbooked = true;
    } else if (verticalFilter === 'Air Pistol') {
      if (!hasPistol) isUnbooked = true;
    }

    if (isUnbooked) {
      const cleanName = (reg.name || 'Shooter').trim();
      const dedupeKey = (reg.usn && reg.usn.length > 3) ? `usn_${reg.usn.toUpperCase()}` : `em_${email}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        unbookedRows.push([
          '',
          cleanName
        ]);
      }
    }
  }

  // Sort alphabetically by name
  unbookedRows.sort((a, b) => a[1].localeCompare(b[1]));
  // Re-index S.No after sorting
  unbookedRows.forEach((row, idx) => {
    row[0] = (idx + 1).toString();
  });

  autoTable(doc, {
    startY: 36,
    head: [['S.No', 'Shooter Name']],
    body: unbookedRows,
    theme: 'striped',
    headStyles: { 
      fillColor: [30, 30, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: { 
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`lakshya-unbooked-shooters-${Date.now()}.pdf`);
}

/**
 * Generates and downloads the Slot Occupancy PDF
 */
export async function generateOccupancyPdf(slots: Slot[], bookings: Booking[]) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LAKSHYA 2.0 — Slot Occupancy & Capacity Report', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${now}`, 14, 27);
  doc.text('Organizer: NCC RVCE & GARE', 14, 32);

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
