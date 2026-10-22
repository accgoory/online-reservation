import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  Filter, 
  Check, 
  DollarSign, 
  Users, 
  CreditCard, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Reservation, ReservationStatus } from '../types/restaurant';
import { 
  ReservationExportFilter, 
  ReservationDatePreset,
  filterReservationsForExport, 
  calculateFinancialSummary, 
  generateReservationCSV, 
  downloadFile,
  openReservationPDFPrintView 
} from '../utils/reservationExport';
import { playChime } from '../utils/audio';

interface ReservationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
}

export const ReservationExportModal: React.FC<ReservationExportModalProps> = ({
  isOpen,
  onClose,
  reservations
}) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [datePreset, setDatePreset] = useState<ReservationDatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentStatusScope, setPaymentStatusScope] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [reservationStatusScope, setReservationStatusScope] = useState<'all' | ReservationStatus>('all');
  
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string>('');

  // Active filter state
  const activeFilter: ReservationExportFilter = useMemo(() => ({
    datePreset,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    paymentStatusScope,
    reservationStatusScope
  }), [datePreset, startDate, endDate, paymentStatusScope, reservationStatusScope]);

  // Real-time matched records and financial calculations
  const matchedRecords = useMemo(() => {
    return filterReservationsForExport(reservations, activeFilter);
  }, [reservations, activeFilter]);

  const summary = useMemo(() => {
    return calculateFinancialSummary(matchedRecords);
  }, [matchedRecords]);

  if (!isOpen) return null;

  // Handle Export Execution
  const handleExecuteExport = () => {
    setIsExporting(true);
    setExportSuccessMessage('');

    try {
      const nowStr = new Date().toISOString().split('T')[0];

      if (exportFormat === 'csv') {
        const csvContent = generateReservationCSV(reservations, activeFilter);
        const filename = `GooryCoffeeEatery_Laporan_Reservasi_${activeFilter.datePreset}_${nowStr}.csv`;
        downloadFile(csvContent, filename);

        playChime('payment');
        setExportSuccessMessage(`File CSV "${filename}" berhasil diunduh! Siap dibuka di Microsoft Excel.`);
      } else {
        openReservationPDFPrintView(reservations, activeFilter);
        playChime('success');
        setExportSuccessMessage('Tampilan cetak dokumen PDF resmi berhasil dibuka!');
      }

      setTimeout(() => {
        setExportSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Failed to export reservation data:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-stone-100">
                Ekspor Laporan Reservasi &amp; Omzet
              </h3>
              <p className="text-xs text-stone-400">
                Unduh berkas spreadsheet atau cetak dokumen resmi untuk arsip offline manajemen.
              </p>
            </div>
          </div>
        </div>

        {/* FORMAT SELECTION (CSV VS PDF) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 block">
            Pilih Format Berkas Ekspor:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                exportFormat === 'csv'
                  ? 'bg-amber-950/40 border-amber-500 text-stone-100 ring-1 ring-amber-500/50 shadow-md'
                  : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${exportFormat === 'csv' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                  Spreadsheet CSV
                  {exportFormat === 'csv' && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md font-mono">Aktif</span>}
                </div>
                <p className="text-[11px] text-stone-400 leading-tight">
                  Format tabel data mentah Microsoft Excel dengan UTF-8 BOM.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'bg-amber-950/40 border-amber-500 text-stone-100 ring-1 ring-amber-500/50 shadow-md'
                  : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${exportFormat === 'pdf' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>
                <Printer className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                  Cetak / PDF Dokumen
                  {exportFormat === 'pdf' && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-md font-mono">Aktif</span>}
                </div>
                <p className="text-[11px] text-stone-400 leading-tight">
                  Kop surat resmi, ringkasan kartu metrik, &amp; buku besar cetak.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* DATE RANGE PRESET SELECTION */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Rentang Waktu Laporan:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'this_month', label: 'Bulan Ini (Okt 2026)' },
              { id: 'last_month', label: 'Bulan Lalu (Sep 2026)' },
              { id: '30days', label: '30 Hari Terakhir' },
              { id: 'custom', label: 'Kustom Tanggal' },
              { id: 'all', label: 'Semua Riwayat' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as ReservationDatePreset)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                  datePreset === p.id
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-sm'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in-50 duration-150">
              <div className="space-y-1">
                <label className="text-[11px] text-stone-400 block font-medium">Mulai Tanggal:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-stone-400 block font-medium">Sampai Tanggal:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* PAYMENT STATUS FILTER */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            Cakupan Status Pembayaran Deposit:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'paid', label: 'Hanya Lunas (Cair)' },
              { id: 'pending', label: 'Menunggu Bayar' }
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPaymentStatusScope(s.id as any)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                  paymentStatusScope === s.id
                    ? 'bg-stone-100 text-stone-950 border-white font-bold'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* LIVE PREVIEW & FINANCIAL METRIC SUMMARY */}
        <div className="p-4 rounded-2xl bg-stone-950/90 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-stone-800/80 pb-2">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pratinjau Data yang Akan Diekspor:
            </span>
            <span className="font-mono text-stone-400 text-[11px]">
              {matchedRecords.length} Baris Data Ditemukan
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-mono block">Total Deposit</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                Rp {summary.totalDepositPaid.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-mono block">Total Tamu</span>
              <span className="text-sm font-bold font-mono text-cyan-300">
                {summary.totalGuests} Orang
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-mono block">Rata-rata/Meja</span>
              <span className="text-sm font-bold font-mono text-amber-300">
                Rp {summary.avgDepositPaid.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* SUCCESS NOTIFICATION */}
        {exportSuccessMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in-50 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{exportSuccessMessage}</span>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || matchedRecords.length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {exportFormat === 'csv' ? (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh File CSV ({matchedRecords.length} Data)</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Buka Cetak / PDF ({matchedRecords.length} Data)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
