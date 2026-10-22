import { WaitlistEntry, WaitlistStatus } from '../types/restaurant';

export type DateRangePreset = 'today' | '7days' | '30days' | 'all' | 'custom';

export interface WaitlistExportFilter {
  datePreset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  statusScope: 'all' | WaitlistStatus;
}

/**
 * Sanitize cell to prevent formula injection in Microsoft Excel and spreadsheet tools
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
 * Format ISO date string to localized readable Indonesian format YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return isoString;
  }
}

/**
 * Translate internal WaitlistStatus to descriptive human label
 */
function formatStatusLabel(status: WaitlistStatus): string {
  switch (status) {
    case 'waiting':
      return 'Menunggu (Waiting)';
    case 'called':
      return 'Dipanggil / Meja Siap (Called)';
    case 'seated':
      return 'Sudah Duduk (Seated)';
    case 'cancelled':
      return 'Dibatalkan (Cancelled)';
    default:
      return status;
  }
}

/**
 * Calculate actual wait duration in minutes
 */
function calculateActualWaitMinutes(entry: WaitlistEntry): number {
  if (!entry.joinedAt) return 0;
  const startTime = new Date(entry.joinedAt).getTime();
  
  if (entry.seatedAt) {
    const endTime = new Date(entry.seatedAt).getTime();
    return Math.max(0, Math.round((endTime - startTime) / 60000));
  }
  
  if (entry.calledAt) {
    const calledTime = new Date(entry.calledAt).getTime();
    return Math.max(0, Math.round((calledTime - startTime) / 60000));
  }
  
  // Currently still waiting
  return Math.max(0, Math.round((Date.now() - startTime) / 60000));
}

/**
 * Filter entries according to selected date range and status options
 */
export function filterWaitlistEntriesForExport(
  entries: WaitlistEntry[],
  filter: WaitlistExportFilter
): WaitlistEntry[] {
  const now = new Date();
  
  return entries.filter(entry => {
    // 1. Status Filter
    if (filter.statusScope !== 'all' && entry.status !== filter.statusScope) {
      return false;
    }

    // 2. Date Range Filter
    const entryDate = entry.joinedAt ? new Date(entry.joinedAt) : (entry.date ? new Date(entry.date) : now);
    
    if (filter.datePreset === 'all') {
      return true;
    }

    if (filter.datePreset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      const entryDateStr = entryDate.toISOString().slice(0, 10);
      return entryDateStr === todayStr || entry.date === todayStr;
    }

    if (filter.datePreset === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entryDate >= sevenDaysAgo;
    }

    if (filter.datePreset === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return entryDate >= thirtyDaysAgo;
    }

    if (filter.datePreset === 'custom') {
      if (filter.startDate) {
        const start = new Date(filter.startDate);
        start.setHours(0, 0, 0, 0);
        if (entryDate < start) return false;
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        if (entryDate > end) return false;
      }
      return true;
    }

    return true;
  });
}

/**
 * Generate RFC 4180 compliant CSV string with UTF-8 BOM
 */
export function generateWaitlistCSV(
  entries: WaitlistEntry[],
  filter?: WaitlistExportFilter
): string {
  const recordsToExport = filter ? filterWaitlistEntriesForExport(entries, filter) : entries;

  const headers = [
    'No. Urut',
    'Kode Tiket',
    'Nama Tamu',
    'Nomor Telepon',
    'Email Tamu',
    'Jumlah Tamu (Pax)',
    'Area Meja Disukai',
    'Slot Waktu Disukai',
    'Status Antrean',
    'Tingkat Loyalty',
    'Waktu Mendaftar',
    'Waktu Dipanggil',
    'Waktu Didudukkan',
    'Durasi Tunggu (Menit)',
    'Estimasi Awal (Menit)',
    'Meja Ditugaskan',
    'Catatan & Permintaan Khusus'
  ];

  const rows = recordsToExport.map(entry => {
    const actualWaitMins = calculateActualWaitMinutes(entry);

    return [
      sanitizeCsvCell(entry.queueNumber),
      sanitizeCsvCell(entry.queueCode),
      sanitizeCsvCell(entry.customerName),
      sanitizeCsvCell(entry.customerPhone),
      sanitizeCsvCell(entry.customerEmail),
      sanitizeCsvCell(entry.guestCount),
      sanitizeCsvCell(entry.preferredSection.toUpperCase()),
      sanitizeCsvCell(entry.preferredTimeSlot || '-'),
      sanitizeCsvCell(formatStatusLabel(entry.status)),
      sanitizeCsvCell(entry.loyaltyTier || 'Standard'),
      sanitizeCsvCell(formatDateTime(entry.joinedAt)),
      sanitizeCsvCell(formatDateTime(entry.calledAt)),
      sanitizeCsvCell(formatDateTime(entry.seatedAt)),
      sanitizeCsvCell(actualWaitMins),
      sanitizeCsvCell(entry.estimatedWaitMinutes ?? '-'),
      sanitizeCsvCell(entry.assignedTableName || (entry.assignedTableId ? `Meja ${entry.assignedTableId}` : '-')),
      sanitizeCsvCell(entry.specialRequests || '-')
    ];
  });

  // Construct CSV content with Excel UTF-8 Byte Order Mark
  const csvBody = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  return '\uFEFF' + csvBody;
}

/**
 * Trigger file download in browser
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
