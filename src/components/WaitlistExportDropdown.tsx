import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Download, 
  ChevronDown, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  Lock, 
  Crown, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';
import { WaitlistEntry, WaitlistStatus } from '../types/restaurant';
import { 
  WaitlistExportFilter, 
  DateRangePreset, 
  filterWaitlistEntriesForExport, 
  generateWaitlistCSV, 
  downloadCSV 
} from '../utils/csvExport';
import { playChime } from '../utils/audio';

interface WaitlistExportDropdownProps {
  waitlistEntries: WaitlistEntry[];
  isAdmin: boolean;
  onRequestAdminAccess?: () => void;
}

export const WaitlistExportDropdown: React.FC<WaitlistExportDropdownProps> = ({
  waitlistEntries,
  isAdmin,
  onRequestAdminAccess
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusScope, setStatusScope] = useState<'all' | WaitlistStatus>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filterOptions: WaitlistExportFilter = useMemo(() => ({
    datePreset,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    statusScope
  }), [datePreset, startDate, endDate, statusScope]);

  // Compute matched records count in real-time
  const matchedRecords = useMemo(() => {
    return filterWaitlistEntriesForExport(waitlistEntries, filterOptions);
  }, [waitlistEntries, filterOptions]);

  const handleExport = () => {
    if (!isAdmin) {
      if (onRequestAdminAccess) onRequestAdminAccess();
      return;
    }

    try {
      setIsExporting(true);
      const csvData = generateWaitlistCSV(waitlistEntries, filterOptions);
      
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileName = `savour-waitlist-${filterOptions.datePreset}-${dateTag}.csv`;
      
      downloadCSV(csvData, fileName);
      playChime('success');
      
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Export CSV failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-amber-500/50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        title="Download data antrean dalam format CSV"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
        <span>Download CSV</span>
        {!isAdmin && <Lock className="w-3 h-3 text-stone-500 ml-0.5" />}
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs text-stone-100">
                  Ekspor Laporan Waitlist (CSV)
                </h3>
                <p className="text-[10px] text-stone-400">
                  Data antrean terstruktur untuk Excel &amp; Sheets
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* Non-Admin Restriction Notice */}
            {!isAdmin ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-stone-200 text-xs">
                      Akses Khusus Administrator
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                      Pengunduhan rekaman data privasi tamu dan ekspor CSV hanya dapat diakses oleh akun Administrator restoran.
                    </p>
                  </div>
                </div>
                {onRequestAdminAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onRequestAdminAccess();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Buka Akses Administrator
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 1. Date Range Preset */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Rentang Waktu Laporan:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: 'Semua Riwayat' },
                      { id: 'today', label: 'Hari Ini' },
                      { id: '7days', label: '7 Hari Terakhir' },
                      { id: '30days', label: '30 Hari Terakhir' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDatePreset(p.id as DateRangePreset)}
                        className={`py-1.5 px-2.5 rounded-lg text-left text-[11px] font-medium transition-colors cursor-pointer border ${
                          datePreset === p.id
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Range Toggle */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setDatePreset(datePreset === 'custom' ? 'all' : 'custom')}
                      className={`text-[10px] underline underline-offset-2 transition-colors cursor-pointer ${
                        datePreset === 'custom' ? 'text-amber-400 font-bold' : 'text-stone-400 hover:text-stone-300'
                      }`}
                    >
                      {datePreset === 'custom' ? 'Gunakan Preset Waktu Otomatis' : '+ Tentukan Tanggal Kustom'}
                    </button>
                    {datePreset === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-stone-950 rounded-lg border border-stone-800">
                        <div>
                          <span className="text-[9px] text-stone-500 block mb-0.5">Mulai:</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-[10px] text-stone-200 focus:outline-hidden focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-stone-500 block mb-0.5">Sampai:</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800 rounded px-2 py-1 text-[10px] text-stone-200 focus:outline-hidden focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Status Scope Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    Cakupan Status Antrean:
                  </label>
                  <select
                    value={statusScope}
                    onChange={(e) => setStatusScope(e.target.value as 'all' | WaitlistStatus)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">Semua Status (Lengkap: Menunggu, Dipanggil, Duduk, Batal)</option>
                    <option value="waiting">Hanya Menunggu (Waiting)</option>
                    <option value="called">Hanya Dipanggil (Called)</option>
                    <option value="seated">Hanya Sudah Duduk (Seated)</option>
                    <option value="cancelled">Hanya Dibatalkan (Cancelled)</option>
                  </select>
                </div>

                {/* 3. Preview Records Summary */}
                <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Total Data Siap Ekspor</span>
                    <span className="text-sm font-bold font-mono text-amber-300">
                      {matchedRecords.length} Baris Data
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                    UTF-8 BOM (.CSV)
                  </span>
                </div>

                {matchedRecords.length === 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Tidak ada data antrean yang cocok dengan filter yang dipilih.</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting || matchedRecords.length === 0}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      exportSuccess
                        ? 'bg-emerald-600 text-stone-950'
                        : matchedRecords.length === 0
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md shadow-amber-600/20'
                    }`}
                  >
                    {exportSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>File CSV Berhasil Diunduh!</span>
                      </>
                    ) : isExporting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        <span>Menyiapkan File CSV...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Laporan CSV ({matchedRecords.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
