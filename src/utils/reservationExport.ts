import { Reservation, ReservationStatus, PaymentStatus } from '../types/restaurant';

export type ReservationDatePreset = 'this_month' | 'last_month' | '30days' | 'all' | 'custom';

export interface ReservationExportFilter {
  datePreset: ReservationDatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  paymentStatusScope: 'all' | 'paid' | 'pending' | 'refunded';
  reservationStatusScope: 'all' | ReservationStatus;
}

export interface ReservationFinancialSummary {
  totalRecords: number;
  totalGuests: number;
  totalDepositPaid: number;
  totalDepositPending: number;
  avgDepositPaid: number;
  paymentMethodStats: Record<string, { count: number; sum: number }>;
  statusStats: Record<string, number>;
}

/**
 * Sanitize cell to prevent CSV formula injection in spreadsheet applications (Excel, LibreOffice, Google Sheets)
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value).trim();

  // Neutralize formula injection characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If contains double quotes, commas, or line breaks, escape and wrap in quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Filter reservations according to date preset and status scopes
 */
export function filterReservationsForExport(
  reservations: Reservation[],
  filter: ReservationExportFilter
): Reservation[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Range boundaries
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  if (filter.datePreset === 'this_month') {
    const startObj = new Date(currentYear, currentMonth, 1);
    const endObj = new Date(currentYear, currentMonth + 1, 0); // last day of this month
    rangeStart = startObj.toISOString().split('T')[0];
    rangeEnd = endObj.toISOString().split('T')[0];
  } else if (filter.datePreset === 'last_month') {
    const startObj = new Date(currentYear, currentMonth - 1, 1);
    const endObj = new Date(currentYear, currentMonth, 0); // last day of previous month
    rangeStart = startObj.toISOString().split('T')[0];
    rangeEnd = endObj.toISOString().split('T')[0];
  } else if (filter.datePreset === '30days') {
    const startObj = new Date(now);
    startObj.setDate(now.getDate() - 30);
    rangeStart = startObj.toISOString().split('T')[0];
    rangeEnd = now.toISOString().split('T')[0];
  } else if (filter.datePreset === 'custom') {
    rangeStart = filter.startDate || null;
    rangeEnd = filter.endDate || null;
  }

  return reservations.filter((r) => {
    // 1. Date filter
    if (rangeStart && r.date < rangeStart) return false;
    if (rangeEnd && r.date > rangeEnd) return false;

    // 2. Payment status filter
    if (filter.paymentStatusScope !== 'all') {
      if (r.paymentStatus !== filter.paymentStatusScope) return false;
    }

    // 3. Reservation status filter
    if (filter.reservationStatusScope !== 'all') {
      if (r.status !== filter.reservationStatusScope) return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort chronologically by date then timeSlot
    if (a.date !== b.date) return b.date.localeCompare(a.date); // newest first
    return (a.timeSlot || '').localeCompare(b.timeSlot || '');
  });
}

/**
 * Calculate comprehensive financial metrics summary
 */
export function calculateFinancialSummary(records: Reservation[]): ReservationFinancialSummary {
  let totalGuests = 0;
  let totalDepositPaid = 0;
  let totalDepositPending = 0;
  let paidCount = 0;

  const paymentMethodStats: Record<string, { count: number; sum: number }> = {};
  const statusStats: Record<string, number> = {};

  records.forEach((r) => {
    totalGuests += r.guestsCount || 2;
    const dep = r.depositAmount || 0;

    if (r.paymentStatus === 'paid') {
      totalDepositPaid += dep;
      paidCount += 1;
    } else if (r.paymentStatus === 'pending') {
      totalDepositPending += dep;
    }

    // Method breakdown
    const method = r.paymentMethod || 'Lainnya';
    if (!paymentMethodStats[method]) {
      paymentMethodStats[method] = { count: 0, sum: 0 };
    }
    paymentMethodStats[method].count += 1;
    if (r.paymentStatus === 'paid') {
      paymentMethodStats[method].sum += dep;
    }

    // Status breakdown
    const st = r.status || 'confirmed';
    statusStats[st] = (statusStats[st] || 0) + 1;
  });

  const avgDepositPaid = paidCount > 0 ? Math.round(totalDepositPaid / paidCount) : 0;

  return {
    totalRecords: records.length,
    totalGuests,
    totalDepositPaid,
    totalDepositPending,
    avgDepositPaid,
    paymentMethodStats,
    statusStats
  };
}

/**
 * Human friendly payment method translator
 */
export function formatPaymentMethodLabel(method?: string): string {
  if (!method) return 'Tidak Tercatat';
  const map: Record<string, string> = {
    qris: 'QRIS Real-Time',
    bca_va: 'BCA Virtual Account',
    mandiri_va: 'Mandiri Virtual Account',
    bni_va: 'BNI Virtual Account',
    bri_va: 'BRI Virtual Account',
    gopay: 'GoPay E-Wallet',
    ovo: 'OVO E-Wallet',
    dana: 'DANA E-Wallet',
    shopeepay: 'ShopeePay',
    credit_card: 'Kartu Kredit'
  };
  return map[method] || method.toUpperCase();
}

/**
 * Human friendly reservation status translator
 */
export function formatReservationStatusLabel(status: ReservationStatus): string {
  const map: Record<ReservationStatus, string> = {
    pending_payment: 'Menunggu Pembayaran',
    waiting_verification: 'Menunggu Verifikasi',
    confirmed: 'Terkonfirmasi',
    arrived: 'Tamu Tiba',
    seated: 'Telah Duduk',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };
  return map[status] || status;
}

/**
 * Generate CSV String with UTF-8 BOM for Excel
 */
export function generateReservationCSV(
  reservations: Reservation[],
  filter: ReservationExportFilter
): string {
  const filtered = filterReservationsForExport(reservations, filter);
  const summary = calculateFinancialSummary(filtered);

  const lines: string[] = [];

  // Metadata & Summary Section at the top
  lines.push(sanitizeCsvCell('SAVOUR & CO. FINE BISTRO - LAPORAN RESERVASI & ARUS KAS DEPOSIT'));
  lines.push(
    `${sanitizeCsvCell('Tanggal Unduh:')},${sanitizeCsvCell(new Date().toLocaleString('id-ID'))},${sanitizeCsvCell('Filter Periode:')},${sanitizeCsvCell(filter.datePreset)}`
  );
  lines.push(
    `${sanitizeCsvCell('Total Reservasi:')},${sanitizeCsvCell(summary.totalRecords)},${sanitizeCsvCell('Total Tamu (Pax):')},${sanitizeCsvCell(summary.totalGuests)}`
  );
  lines.push(
    `${sanitizeCsvCell('Total Deposit Cair:')},${sanitizeCsvCell(`Rp ${summary.totalDepositPaid.toLocaleString('id-ID')}`)},${sanitizeCsvCell('Rata-rata Deposit/Meja:')},${sanitizeCsvCell(`Rp ${summary.avgDepositPaid.toLocaleString('id-ID')}`)}`
  );
  if (summary.totalDepositPending > 0) {
    lines.push(
      `${sanitizeCsvCell('Deposit Pending:')},${sanitizeCsvCell(`Rp ${summary.totalDepositPending.toLocaleString('id-ID')}`)}`
    );
  }
  lines.push(''); // Blank spacer line

  // Column Headers
  const headers = [
    'No',
    'Kode Booking',
    'Tanggal',
    'Jam Sesi',
    'Nama Tamu',
    'No. WhatsApp / HP',
    'Meja',
    'Area Restoran',
    'Jumlah Tamu (Pax)',
    'Jenis Acara',
    'Nominal Deposit (IDR)',
    'Status Pembayaran',
    'Metode Pembayaran',
    'Status Reservasi',
    'Dibuat Pada',
    'Permintaan Khusus'
  ];
  lines.push(headers.map(sanitizeCsvCell).join(','));

  // Data rows
  filtered.forEach((r, idx) => {
    const row = [
      String(idx + 1),
      r.bookingCode,
      r.date,
      r.timeSlot,
      r.customerName,
      r.customerPhone,
      r.tableName,
      r.tableSection,
      String(r.guestsCount || 2),
      r.occasion || 'Casual Dining',
      String(r.depositAmount || 0),
      r.paymentStatus === 'paid' ? 'Lunas' : r.paymentStatus === 'pending' ? 'Menunggu' : 'Dikembalikan',
      formatPaymentMethodLabel(r.paymentMethod),
      formatReservationStatusLabel(r.status),
      r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID') : '-',
      r.specialNotes || r.dietaryRequests || '-'
    ];
    lines.push(row.map(sanitizeCsvCell).join(','));
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 Indonesian accents cleanly
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Trigger browser file download for CSV
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open Print / Save as PDF Window with elegant Goory Coffee & Eatery Executive Letterhead
 */
export function openReservationPDFPrintView(
  reservations: Reservation[],
  filter: ReservationExportFilter
): void {
  const filtered = filterReservationsForExport(reservations, filter);
  const summary = calculateFinancialSummary(filtered);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup terblokir oleh browser. Izinkan popup untuk mencetak laporan PDF.');
    return;
  }

  const dateRangeLabel = filter.datePreset === 'this_month'
    ? 'Bulan Ini'
    : filter.datePreset === 'last_month'
    ? 'Bulan Lalu'
    : filter.datePreset === '30days'
    ? '30 Hari Terakhir'
    : filter.datePreset === 'custom'
    ? `${filter.startDate || 'Awal'} s/d ${filter.endDate || 'Akhir'}`
    : 'Semua Riwayat';

  const rowsHtml = filtered.map((r, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
      <td style="padding: 8px 6px; text-align: center; color: #6b7280;">${i + 1}</td>
      <td style="padding: 8px 6px; font-weight: 700; font-family: monospace; color: #111827;">${r.bookingCode}</td>
      <td style="padding: 8px 6px;">${r.date}<br/><span style="color: #6b7280; font-size: 10px;">${r.timeSlot}</span></td>
      <td style="padding: 8px 6px; font-weight: 600; color: #111827;">${r.customerName}<br/><span style="color: #6b7280; font-size: 10px; font-family: monospace;">${r.customerPhone}</span></td>
      <td style="padding: 8px 6px;">${r.tableName}<br/><span style="color: #9ca3af; font-size: 10px;">${r.tableSection}</span></td>
      <td style="padding: 8px 6px; text-align: center; font-weight: 600;">${r.guestsCount || 2} pax</td>
      <td style="padding: 8px 6px; text-align: right; font-weight: 700; font-family: monospace; color: #047857;">Rp ${(r.depositAmount || 0).toLocaleString('id-ID')}</td>
      <td style="padding: 8px 6px; text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 700; text-transform: uppercase; ${
          r.paymentStatus === 'paid' 
            ? 'background: #d1fae5; color: #065f46;' 
            : 'background: #fef3c7; color: #92400e;'
        }">
          ${r.paymentStatus === 'paid' ? 'Lunas' : 'Pending'}
        </span>
      </td>
      <td style="padding: 8px 6px; font-size: 10px; color: #4b5563;">${formatPaymentMethodLabel(r.paymentMethod)}</td>
      <td style="padding: 8px 6px; font-size: 10px;">${formatReservationStatusLabel(r.status)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Laporan Reservasi & Pendapatan - Goory Coffee & Eatery</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 24px; padding: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b45309; padding-bottom: 16px; margin-bottom: 20px; }
        .logo-title { font-size: 22px; font-weight: 800; color: #78350f; letter-spacing: 1px; }
        .subtitle { font-size: 12px; color: #4b5563; margin-top: 2px; }
        .badge { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .metric-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
        .metric-value { font-size: 16px; font-weight: 800; color: #111827; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f3f4f6; color: #374151; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 8px 6px; border-bottom: 1px solid #d1d5db; text-align: left; }
        .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background: #b45309; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
          🖨️ Cetak / Simpan sebagai PDF
        </button>
      </div>

      <div class="header">
        <div>
          <div class="logo-title">GOORY COFFEE &amp; EATERY</div>
          <div class="subtitle">Laporan Rekapitulasi Reservasi Meja &amp; Arus Kas Deposit Masuk</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Denpasar, Bali • Hotline &amp; WhatsApp: +62 821-4455-6789</div>
        </div>
        <div style="text-align: right;">
          <span class="badge">DOKUMEN RESMI MANAJEMEN</span>
          <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">Periode: <strong>${dateRangeLabel}</strong></div>
          <div style="font-size: 10px; color: #9ca3af;">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Deposit Cair</div>
          <div class="metric-value" style="color: #047857;">Rp ${summary.totalDepositPaid.toLocaleString('id-ID')}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Reservasi</div>
          <div class="metric-value">${summary.totalRecords} Meja</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Tamu (Pax)</div>
          <div class="metric-value">${summary.totalGuests} Orang</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Rata-rata Deposit / Meja</div>
          <div class="metric-value">Rp ${summary.avgDepositPaid.toLocaleString('id-ID')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 30px;">No</th>
            <th>Kode</th>
            <th>Tanggal</th>
            <th>Pemesan</th>
            <th>Meja</th>
            <th style="text-align: center;">Pax</th>
            <th style="text-align: right;">Deposit</th>
            <th style="text-align: center;">Bayar</th>
            <th>Metode</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding: 20px; color: #9ca3af;">Tidak ada data reservasi pada periode ini.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>Generated by Goory Coffee &amp; Eatery Executive Management System</div>
        <div>Halaman 1 dari 1</div>
      </div>

      <script>
        // Auto trigger print dialog
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
