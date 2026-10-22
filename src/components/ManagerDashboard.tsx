import React, { useState, useEffect } from 'react';
import { 
  RestaurantTable, 
  Reservation, 
  ReservationStatus,
  TableStatus,
  WaitlistEntry,
  WaitlistStatus
} from '../types/restaurant';
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  BellRing, 
  CheckCheck, 
  XCircle, 
  Plus, 
  DollarSign, 
  Volume2,
  CalendarCheck,
  RefreshCw,
  Utensils,
  Move,
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Crown,
  Coins,
  PhoneCall,
  Armchair,
  ListOrdered,
  UserCheck,
  Lock,
  QrCode,
  MessageSquare,
  Settings,
  Download,
  UtensilsCrossed
} from 'lucide-react';
import { 
  updateReservationStatus, 
  updateTableStatus, 
  markTableReadyAndAlert,
  createReservation,
  simulateFullHouse,
  freeUpAllTables,
  reassignReservationTable
} from '../services/restaurantService';
import {
  subscribeToWaitlist,
  callWaitlistCustomer,
  seatWaitlistCustomer,
  cancelWaitlistCustomer
} from '../services/waitlistService';
import { subscribeToAllUnreadWaitlistCounts } from '../services/waitlistChatService';
import { playChime } from '../utils/audio';
import { ManagerAnalyticsCharts } from './ManagerAnalyticsCharts';
import { WaitlistExportDropdown } from './WaitlistExportDropdown';
import { WaitlistChatModal } from './WaitlistChatModal';
import { SettingsView } from './SettingsView';
import { ReservationExportModal } from './ReservationExportModal';
import { MenuManagementView } from './MenuManagementView';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types/settings';

interface ManagerDashboardProps {
  tables: RestaurantTable[];
  reservations: Reservation[];
  onOpenFloorPlan?: () => void;
  isAdmin?: boolean;
  onRequestAdminAccess?: () => void;
  onOpenScanner?: () => void;
  settings?: AppSettings;
  onSettingsUpdated?: (newSettings: AppSettings) => void;
  initialSectionTab?: 'reservations' | 'waitlist' | 'menu' | 'settings';
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  tables,
  reservations,
  onOpenFloorPlan,
  isAdmin = false,
  onRequestAdminAccess,
  onOpenScanner,
  settings,
  onSettingsUpdated,
  initialSectionTab = 'reservations'
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTableForAction, setSelectedTableForAction] = useState<RestaurantTable | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [showAnalytics, setShowAnalytics] = useState<boolean>(isAdmin);
  const [showReservationExportModal, setShowReservationExportModal] = useState<boolean>(false);

  // Tab switcher for manager view: Reservations vs Waitlist vs Menu vs Settings
  const [activeSectionTab, setActiveSectionTab] = useState<'reservations' | 'waitlist' | 'menu' | 'settings'>(initialSectionTab);

  useEffect(() => {
    if (initialSectionTab) {
      setActiveSectionTab(initialSectionTab);
    }
  }, [initialSectionTab]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistStatusFilter, setWaitlistStatusFilter] = useState<string>('all');
  const [seatingEntry, setSeatingEntry] = useState<WaitlistEntry | null>(null);
  const [seatingTableId, setSeatingTableId] = useState<string>('');
  const [isSeatingLoading, setIsSeatingLoading] = useState<boolean>(false);
  const [chatEntry, setChatEntry] = useState<WaitlistEntry | null>(null);
  const [unreadChatCounts, setUnreadChatCounts] = useState<Record<string, number>>({});

  // Subscribe to real-time waitlist updates from Firebase
  useEffect(() => {
    const unsub = subscribeToWaitlist((entries) => {
      setWaitlistEntries(entries);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time unread chat messages for waitlist customers
  useEffect(() => {
    const unsubUnread = subscribeToAllUnreadWaitlistCounts((counts) => {
      setUnreadChatCounts(counts);
    });
    return () => unsubUnread();
  }, []);

  // Walk-in form state
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInTableId, setWalkInTableId] = useState<string>(tables[0]?.id || '');
  const [walkInGuests, setWalkInGuests] = useState<number>(2);

  // Compute metrics
  const totalTables = tables.length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const reservedCount = tables.filter(t => t.status === 'reserved').length;
  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupancyRate = totalTables > 0 ? Math.round(((occupiedCount + reservedCount) / totalTables) * 100) : 0;
  
  const totalDeposit = reservations
    .filter(r => r.paymentStatus === 'paid')
    .reduce((sum, r) => sum + r.depositAmount, 0);

  const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;

  // Waitlist metrics
  const waitingWaitlistCount = waitlistEntries.filter(w => w.status === 'waiting').length;
  const calledWaitlistCount = waitlistEntries.filter(w => w.status === 'called').length;
  const seatedWaitlistCount = waitlistEntries.filter(w => w.status === 'seated').length;
  const activeQueueCount = waitingWaitlistCount + calledWaitlistCount;

  // Filter reservations
  const filteredReservations = reservations.filter((r) => {
    const matchesSearch = 
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerPhone.includes(searchQuery) ||
      r.tableName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter waitlist entries
  const filteredWaitlist = waitlistEntries.filter((w) => {
    const matchesSearch = 
      w.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.queueCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.customerPhone.includes(searchQuery);

    const matchesStatus = waitlistStatusFilter === 'all' || w.status === waitlistStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle Seating waitlist customer
  const handleConfirmSeatWaitlist = async () => {
    if (!seatingEntry || !seatingTableId) return;
    const targetTable = tables.find(t => t.id === seatingTableId);
    if (!targetTable) return;

    setIsSeatingLoading(true);
    try {
      await seatWaitlistCustomer(
        seatingEntry,
        targetTable.id,
        targetTable.name,
        targetTable.section
      );
      setSeatingEntry(null);
      setSeatingTableId('');
    } catch (err) {
      console.error('Failed to seat customer:', err);
    } finally {
      setIsSeatingLoading(false);
    }
  };

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const table = tables.find(t => t.id === walkInTableId);
    if (!table) return;

    const today = new Date().toISOString().split('T')[0];
    const nowHour = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    await createReservation({
      customerName: walkInName || 'Tamu Walk-in',
      customerEmail: 'walkin@restaurant.com',
      customerPhone: walkInPhone || '08000000000',
      guestsCount: walkInGuests,
      tableId: table.id,
      tableName: table.name,
      tableSection: table.section,
      date: today,
      timeSlot: nowHour,
      occasion: 'Casual Dining',
      depositAmount: 0,
      paymentStatus: 'paid',
      status: 'seated'
    });

    await updateTableStatus(table.id, 'occupied');
    setShowWalkInModal(false);
    setWalkInName('');
    setWalkInPhone('');
    playChime('ding');
  };

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'arrived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Telah Hadir (Check-in)
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            Terkonfirmasi
          </span>
        );
      case 'seated':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            Sedang Makan (Seated)
          </span>
        );
      case 'pending_payment':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Menunggu Bayar
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-500/20 text-stone-400 border border-stone-600">
            Selesai
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            Dibatalkan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-stone-900/90 border border-amber-900/40 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold flex items-center gap-1 shadow-xs">
                <Crown className="w-3 h-3 text-stone-950" />
                Administrator Portal (Akses Penuh)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-stone-800 text-stone-300 border border-stone-700 flex items-center gap-1 shadow-xs">
                <UserCheck className="w-3 h-3 text-amber-400" />
                Kru Staf Pelayanan (Antrean &amp; Tamu)
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-stone-400">Live Sync Aktif</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-100 mt-1">
            {isAdmin ? 'Dashboard Eksekutif & Kontrol Restoran' : 'Manajemen Antrean & Kedatangan Tamu'}
          </h1>
          <p className="text-xs text-stone-400">
            {isAdmin 
              ? 'Kelola denah meja, evaluasi metrik pendapatan & analitik, serta operasional restoran.'
              : 'Pantau antrean tamu (Waitlist), panggil giliran nomor antrean, dan check-in reservasi hari ini.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              showAnalytics
                ? 'bg-amber-600 text-stone-950 border-amber-500'
                : 'bg-stone-950 hover:bg-stone-800 text-amber-300 border-amber-500/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{showAnalytics ? 'Grafik Analitik Aktif' : 'Lihat Analitik (Chart)'}</span>
          </button>

          {isAdmin ? (
            onOpenFloorPlan && (
              <button
                onClick={onOpenFloorPlan}
                className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-300 border border-stone-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Move className="w-4 h-4 text-amber-400" />
                <span>Atur / Pindahkan Denah Meja</span>
              </button>
            )
          ) : (
            <button
              onClick={() => onRequestAdminAccess && onRequestAdminAccess()}
              title="Pengaturan denah meja hanya dapat diakses oleh Administrator"
              className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 border border-stone-800 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Denah Meja (Admin Saja)</span>
            </button>
          )}

          <button
            onClick={() => playChime('alert')}
            className="p-2.5 sm:p-3 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tes Suara Notifikasi Kru Resto"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Tes Bel</span>
          </button>

          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all hover:scale-105 cursor-pointer"
              title="Buka Pemindai Kamera QR Pass Tamu"
            >
              <QrCode className="w-4 h-4 text-stone-950 stroke-[2.5]" />
              <span>Scan QR Pass</span>
            </button>
          )}

          <button
            onClick={() => setShowWalkInModal(true)}
            className="py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tamu Walk-in</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900/80 p-5 rounded-2xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Tingkat Okupansi</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {occupancyRate}%
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {occupiedCount + reservedCount} dari {totalTables} Meja Terisi / Dipesan
          </div>
        </div>

        <div className="bg-stone-900/80 p-5 rounded-2xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Reservasi Terkonfirmasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {confirmedReservations} Tamu
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Menunggu kedatangan hari ini
          </div>
        </div>

        <div className="bg-stone-900/80 p-5 rounded-2xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Tamu Sedang Makan</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {occupiedCount} Meja
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Aktif di ruang makan
          </div>
        </div>

        <div className="bg-stone-900/80 p-5 rounded-2xl border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Deposit Masuk</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            Rp {totalDeposit.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Terkonfirmasi via gateway digital
          </div>
        </div>
      </div>

      {/* Visualisasi Tren Reservasi & Analisis Jam Sibuk (Recharts) */}
      {showAnalytics && (
        isAdmin ? (
          <ManagerAnalyticsCharts
            reservations={reservations}
            tables={tables}
          />
        ) : (
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-stone-100">
              Analitik Pendapatan &amp; Grafik Jam Sibuk Terkunci
            </h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
              Hak akses visualisasi pendapatan finansial, metrik omzet deposit, dan analisis jam sibuk secara eksklusif hanya dimiliki oleh Administrator.
            </p>
            {onRequestAdminAccess && (
              <button
                type="button"
                onClick={onRequestAdminAccess}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-600/20"
              >
                <Crown className="w-4 h-4" />
                Masuk sebagai Administrator
              </button>
            )}
          </div>
        )
      )}

      {/* Quick Floor Status Matrix (Live Table Controller) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-400" />
            Status Langsung Meja Restoran (Klik Meja untuk Ubah Cepat)
          </h2>
          <span className="text-xs text-stone-400 font-mono">
            {tables.filter(t => t.status === 'available').length} Meja Kosong
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {tables.map(table => {
            const isAvail = table.status === 'available';
            const isRes = table.status === 'reserved';
            const isOcc = table.status === 'occupied';

            return (
              <div
                key={table.id}
                onClick={() => setSelectedTableForAction(table)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all hover:scale-105 flex flex-col justify-between ${
                  isAvail
                    ? 'bg-emerald-950/30 border-emerald-800/40 hover:border-emerald-500'
                    : isRes
                    ? 'bg-amber-950/30 border-amber-800/40 hover:border-amber-500'
                    : isOcc
                    ? 'bg-rose-950/30 border-rose-800/40 hover:border-rose-500'
                    : 'bg-stone-950 border-stone-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-100 font-mono">{table.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAvail ? 'bg-emerald-400' : isRes ? 'bg-amber-400' : isOcc ? 'bg-rose-400' : 'bg-stone-500'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-stone-400 mt-2 truncate">
                  {table.section.split(' ')[0]} • {table.capacity}pax
                </div>
                <div className="mt-1">
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider ${
                      isAvail ? 'text-emerald-400' : isRes ? 'text-amber-400' : isOcc ? 'text-rose-400' : 'text-stone-400'
                    }`}
                  >
                    {isAvail ? 'Tersedia' : isRes ? 'Dipesan' : isOcc ? 'Terisi' : 'Off'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Section Switcher: Reservations vs Virtual Waitlist */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSectionTab('reservations')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSectionTab === 'reservations'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30'
                : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Reservasi Terjadwal ({reservations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('waitlist')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSectionTab === 'waitlist'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30'
                : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Antrean Virtual (Waitlist)</span>
            {activeQueueCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSectionTab === 'waitlist'
                  ? 'bg-stone-950 text-amber-300'
                  : 'bg-amber-500 text-stone-950 animate-pulse'
              }`}>
                {activeQueueCount} Menunggu
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('menu')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSectionTab === 'menu'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30'
                : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Manajemen Menu &amp; Stok</span>
            {!isAdmin && (
              <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Admin
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSectionTab === 'settings'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30'
                : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Sistem &amp; Profil</span>
            {!isAdmin && (
              <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Admin
              </span>
            )}
          </button>
        </div>

        {/* Quick simulation tester tools (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={async () => {
                await simulateFullHouse();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-amber-900/40 text-amber-300 text-[11px] font-medium transition-colors cursor-pointer"
              title="Simulasi semua meja terisi untuk menguji antrean virtual"
            >
              ⚡ Tes: Simulasi Meja Penuh
            </button>
            <button
              type="button"
              onClick={async () => {
                await freeUpAllTables();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-emerald-900/40 text-emerald-400 text-[11px] font-medium transition-colors cursor-pointer"
              title="Buka kembali semua meja menjadi tersedia"
            >
              ✓ Kosongkan Meja
            </button>
          </div>
        )}
      </div>

      {/* VIEW A: RESERVATIONS QUEUE TABLE */}
      {activeSectionTab === 'reservations' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-400" />
                Daftar Reservasi Tamu
              </h2>
              <p className="text-xs text-stone-400">
                Kelola status check-in, kirim pemberitahuan meja siap, dan pantau pembayaran deposit.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Ekspor Laporan CSV/PDF Button */}
              <button
                type="button"
                onClick={() => setShowReservationExportModal(true)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/70 hover:from-amber-900/80 hover:to-amber-900/80 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                title="Ekspor Laporan Reservasi & Omzet Deposit ke CSV atau PDF"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Ekspor Laporan (CSV / PDF)</span>
              </button>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cari nama, kode booking, atau meja..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'arrived', label: '✓ Tamu Hadir' },
              { id: 'confirmed', label: 'Terkonfirmasi' },
              { id: 'seated', label: 'Sedang Makan' },
              { id: 'pending_payment', label: 'Pending Bayar' },
              { id: 'completed', label: 'Selesai' },
              { id: 'cancelled', label: 'Dibatalkan' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-amber-600 text-stone-950 font-bold'
                    : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List of reservations */}
          <div className="overflow-x-auto">
            {filteredReservations.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Tidak ada data reservasi yang sesuai dengan pencarian atau filter.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/70 text-stone-400 uppercase tracking-wider text-[10px] font-mono border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Kode / Tamu</th>
                    <th className="py-3 px-4">Meja &amp; Area</th>
                    <th className="py-3 px-4">Jadwal &amp; Pax</th>
                    <th className="py-3 px-4">Deposit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Staf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredReservations.map(res => (
                    <tr key={res.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-amber-300">{res.bookingCode}</div>
                        <div className="text-stone-200 font-semibold mt-0.5">{res.customerName}</div>
                        <div className="text-[10px] text-stone-400">{res.customerPhone}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-mono">
                          <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                            +{res.pointsEarned || 150} Pts
                          </span>
                          {res.pointsDiscountAmount && res.pointsDiscountAmount > 0 ? (
                            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Tukar {res.pointsRedeemed} Pts (-Rp {res.pointsDiscountAmount.toLocaleString('id-ID')})
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-200">{res.tableName}</div>
                        <div className="text-[10px] text-stone-400">{res.tableSection}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-stone-200">{res.date} • {res.timeSlot} WIB</div>
                        <div className="text-[10px] text-stone-400">{res.guestsCount} Tamu ({res.occasion})</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-emerald-400">
                          Rp {res.depositAmount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {res.paymentStatus === 'paid' ? '✓ Lunas' : '⏳ Pending'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(res.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Action 1: Alert table ready */}
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => markTableReadyAndAlert(res)}
                              title="Kirim Notifikasi Meja Siap ke Tamu"
                              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              Meja Siap
                            </button>
                          )}

                          {/* Action 2: Mark Arrived or Direct Seat */}
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'arrived', res.tableId)}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Tandai tamu telah tiba di resepsionis"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Tandai Hadir
                            </button>
                          )}

                          {res.status === 'arrived' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'seated', res.tableId)}
                              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-stone-950 font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer animate-pulse"
                              title="Persilakan tamu duduk di meja yang sudah disiapkan"
                            >
                              <Armchair className="w-3.5 h-3.5" />
                              Persilakan Duduk
                            </button>
                          )}

                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'seated', res.tableId)}
                              className="px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Langsung dudukkan tanpa status hadir"
                            >
                              <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
                              Duduk
                            </button>
                          )}

                          {/* Action 3: Complete dining */}
                          {res.status === 'seated' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'completed', res.tableId)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Selesai Makan
                            </button>
                          )}

                          {/* Action 4: Cancel */}
                          {(res.status === 'confirmed' || res.status === 'pending_payment') && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'cancelled', res.tableId)}
                              title="Batalkan Reservasi"
                              className="p-1.5 rounded-lg hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* VIEW B: VIRTUAL WAITLIST QUEUE MANAGEMENT */}
      {activeSectionTab === 'waitlist' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Firebase Real-Time Queue
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2 mt-1">
                <ListOrdered className="w-5 h-5 text-amber-400" />
                Manajemen Antrean Virtual (Waitlist)
              </h2>
              <p className="text-xs text-stone-400">
                Panggil tamu saat meja siap, dudukkan langsung saat meja kosong, dan pantau urutan antrean real-time.
              </p>
            </div>

            {/* Header Actions: Search bar & Export Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cari kode tiket, nama, telepon..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <WaitlistExportDropdown
                waitlistEntries={waitlistEntries}
                isAdmin={isAdmin}
                onRequestAdminAccess={onRequestAdminAccess}
              />
            </div>
          </div>

          {/* Quick Metrics for Waitlist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-amber-400">
                <span className="font-semibold">Menunggu</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-display font-bold text-stone-100">
                {waitingWaitlistCount}
              </div>
              <p className="text-[10px] text-stone-400">Grup dalam antrean</p>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span className="font-semibold">Dipanggil (Meja Siap)</span>
                <BellRing className="w-4 h-4" />
              </div>
              <div className="text-2xl font-display font-bold text-stone-100">
                {calledWaitlistCount}
              </div>
              <p className="text-[10px] text-stone-400">Menunggu konfirmasi kedatangan</p>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-cyan-400">
                <span className="font-semibold">Telah Duduk</span>
                <Armchair className="w-4 h-4" />
              </div>
              <div className="text-2xl font-display font-bold text-stone-100">
                {seatedWaitlistCount}
              </div>
              <p className="text-[10px] text-stone-400">Tamu berhasil ditempatkan</p>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-semibold">Meja Kosong Saat Ini</span>
                <Utensils className="w-4 h-4" />
              </div>
              <div className="text-2xl font-display font-bold text-emerald-400">
                {availableCount} <span className="text-xs font-normal text-stone-400">/ {totalTables} Meja</span>
              </div>
              <p className="text-[10px] text-stone-400">Siap untuk didudukkan tamu</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: `Semua (${waitlistEntries.length})` },
                { id: 'waiting', label: `Menunggu (${waitingWaitlistCount})` },
                { id: 'called', label: `Dipanggil (${calledWaitlistCount})` },
                { id: 'seated', label: `Sudah Duduk (${seatedWaitlistCount})` },
                { id: 'cancelled', label: 'Dibatalkan' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setWaitlistStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    waitlistStatusFilter === f.id
                      ? 'bg-amber-600 text-stone-950 font-bold'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Quick action: Call next waiting customer */}
            {waitingWaitlistCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const nextWaiting = waitlistEntries.find(w => w.status === 'waiting');
                  if (nextWaiting) {
                    await callWaitlistCustomer(nextWaiting.id, nextWaiting.customerName, nextWaiting.queueCode);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Panggil Antrean Teratas
              </button>
            )}
          </div>

          {/* Waitlist Table */}
          <div className="overflow-x-auto">
            {filteredWaitlist.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs space-y-2">
                <ListOrdered className="w-8 h-8 text-stone-600 mx-auto" />
                <p>Tidak ada data antrean virtual yang sesuai dengan pencarian atau filter.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/70 text-stone-400 uppercase tracking-wider text-[10px] font-mono border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Urutan &amp; Tiket</th>
                    <th className="py-3 px-4">Tamu &amp; Loyalty</th>
                    <th className="py-3 px-4">Pax &amp; Preferensi</th>
                    <th className="py-3 px-4">Waktu Daftar</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Staf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredWaitlist.map(entry => {
                    const elapsedMinutes = Math.max(
                      0,
                      Math.round((Date.now() - new Date(entry.joinedAt).getTime()) / 60000)
                    );

                    return (
                      <tr key={entry.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold flex items-center justify-center text-xs">
                              #{entry.queueNumber}
                            </span>
                            <div>
                              <div className="font-mono font-bold text-stone-200">
                                {entry.queueCode}
                              </div>
                              <span className="text-[10px] text-stone-400">
                                Est: ~{entry.estimatedWaitMinutes} mnt
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-100 flex items-center gap-1.5">
                            {entry.customerName}
                            {entry.loyaltyTier && entry.loyaltyTier !== 'Bronze' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Crown className="w-2.5 h-2.5" />
                                {entry.loyaltyTier}
                              </span>
                            )}
                            {(unreadChatCounts[entry.id] || 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => setChatEntry(entry)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors animate-pulse cursor-pointer"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                Pesan Baru ({unreadChatCounts[entry.id]})
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {entry.customerPhone} • {entry.customerEmail}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-stone-200 font-medium">
                            {entry.guestCount} Tamu • Area: <span className="capitalize">{entry.preferredSection}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5 truncate max-w-xs">
                            {entry.preferredTimeSlot}
                            {entry.specialRequests ? ` • "${entry.specialRequests}"` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-stone-300 font-mono text-[11px]">
                            {elapsedMinutes} menit lalu
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {new Date(entry.joinedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {entry.status === 'waiting' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Menunggu
                            </span>
                          )}
                          {entry.status === 'called' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 animate-pulse">
                              <BellRing className="w-3 h-3 text-emerald-400" />
                              Meja Siap!
                            </span>
                          )}
                          {entry.status === 'seated' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-flex items-center gap-1">
                              <Armchair className="w-3 h-3" />
                              Duduk ({entry.assignedTableName || 'Meja'})
                            </span>
                          )}
                          {entry.status === 'cancelled' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-500/20 text-stone-400 border border-stone-600">
                              Dibatalkan
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Action Chat: Direct communication with waitlist customer */}
                            <button
                              type="button"
                              onClick={() => setChatEntry(entry)}
                              title={`Chat langsung dengan ${entry.customerName} (${entry.queueCode})`}
                              className="relative p-1.5 rounded-lg bg-stone-850 hover:bg-stone-750 text-amber-300 hover:text-amber-200 border border-stone-700/80 transition-colors cursor-pointer group"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                              {(unreadChatCounts[entry.id] || 0) > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 min-w-4 text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-xs animate-pulse font-mono text-center">
                                  {unreadChatCounts[entry.id]}
                                </span>
                              )}
                            </button>

                            {/* Action 1: Call guest */}
                            {entry.status === 'waiting' && (
                              <button
                                type="button"
                                onClick={() => callWaitlistCustomer(entry.id, entry.customerName, entry.queueCode)}
                                title="Panggil Tamu: Meja Sudah Siap"
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                                Panggil
                              </button>
                            )}

                            {/* Action 2: Seat guest */}
                            {(entry.status === 'called' || entry.status === 'waiting') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSeatingEntry(entry);
                                  const firstAvail = tables.find(t => t.status === 'available');
                                  setSeatingTableId(firstAvail?.id || tables[0]?.id || '');
                                }}
                                title="Dudukkan Tamu ke Meja Kosong"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <Armchair className="w-3.5 h-3.5" />
                                Dudukkan
                              </button>
                            )}

                            {/* Action 3: Cancel entry */}
                            {entry.status !== 'seated' && entry.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => cancelWaitlistCustomer(entry.id)}
                                title="Batalkan Antrean Tamu"
                                className="p-1.5 rounded-lg hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SEATING MODAL FOR WAITLIST CUSTOMER */}
      {seatingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-stone-100 text-lg">
                    Dudukkan Tamu Antrean
                  </h3>
                  <p className="text-xs text-stone-400">
                    Tiket: <strong className="text-amber-400">{seatingEntry.queueCode}</strong> • Urutan #{seatingEntry.queueNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSeatingEntry(null)}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Nama Tamu:</span>
                <span className="font-bold text-stone-100">{seatingEntry.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Jumlah Tamu:</span>
                <span className="font-bold text-amber-300">{seatingEntry.guestCount} Orang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Preferensi Area:</span>
                <span className="capitalize text-stone-200 font-medium">{seatingEntry.preferredSection}</span>
              </div>
              {seatingEntry.loyaltyTier && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Status Goory Club:</span>
                  <span className="font-bold text-amber-400">{seatingEntry.loyaltyTier} Tier</span>
                </div>
              )}
            </div>



            {/* Table Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-300 block">
                Pilih Meja untuk Ditempati:
              </label>

              {availableCount === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Semua Meja Sedang Terisi</strong>
                    Gunakan kartu meja di atas untuk mengubah status meja menjadi "Tersedia", atau pilih meja di bawah untuk mengganti statusnya langsung.
                  </div>
                </div>
              ) : null}

              <select
                value={seatingTableId}
                onChange={e => setSeatingTableId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              >
                {tables.map(t => {
                  const isMatchPax = t.capacity >= seatingEntry.guestCount;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.capacity} pax) - {t.section} • [{t.status.toUpperCase()}] {isMatchPax ? '✓ Sesuai Kapasitas' : '⚠️ Kapasitas Lebih Kecil'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeatingEntry(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSeatingLoading || !seatingTableId}
                onClick={handleConfirmSeatWaitlist}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSeatingLoading ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Konfirmasi Duduk</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: REAL-TIME MENU & STOCK MANAGEMENT */}
      {activeSectionTab === 'menu' && (
        <MenuManagementView
          isAdmin={isAdmin}
          onOpenAdminLogin={onRequestAdminAccess || (() => {})}
        />
      )}

      {/* VIEW D: SYSTEM & PROFILE SETTINGS */}
      {activeSectionTab === 'settings' && (
        <SettingsView
          settings={settings || DEFAULT_APP_SETTINGS}
          isAdmin={isAdmin}
          onOpenAdminLogin={onRequestAdminAccess || (() => {})}
          onSettingsUpdated={onSettingsUpdated}
        />
      )}

      {/* Table Action Modal for Quick Status Change */}
      {selectedTableForAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-stone-100 text-base">
              Ubah Status {selectedTableForAction.name}
            </h3>
            <p className="text-xs text-stone-400">
              Area: {selectedTableForAction.section} • Kapasitas: {selectedTableForAction.capacity} Tamu
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  updateTableStatus(selectedTableForAction.id, 'available');
                  setSelectedTableForAction(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs"
              >
                Tersedia (Kosong)
              </button>
              <button
                onClick={() => {
                  updateTableStatus(selectedTableForAction.id, 'occupied');
                  setSelectedTableForAction(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-950 font-bold text-xs"
              >
                Sedang Digunakan
              </button>
              <button
                onClick={() => {
                  updateTableStatus(selectedTableForAction.id, 'reserved');
                  setSelectedTableForAction(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Dipesan (Reserved)
              </button>
              <button
                onClick={() => {
                  updateTableStatus(selectedTableForAction.id, 'maintenance');
                  setSelectedTableForAction(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold text-xs"
              >
                Pemeliharaan
              </button>
            </div>

            <button
              onClick={() => setSelectedTableForAction(null)}
              className="w-full py-2 rounded-xl text-stone-400 hover:text-white text-xs border border-stone-800 mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Walk-in Booking Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleWalkInSubmit} className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-stone-100 text-lg">
              Input Tamu Walk-in (Datang Langsung)
            </h3>
            <p className="text-xs text-stone-400">
              Catat tamu yang hadir langsung tanpa reservasi online sebelumnya.
            </p>

            <div>
              <label className="text-xs text-stone-400 block mb-1">Nama Tamu:</label>
              <input
                type="text"
                required
                placeholder="Nama Tamu"
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1">No. Kontak (Opsional):</label>
              <input
                type="tel"
                placeholder="0812..."
                value={walkInPhone}
                onChange={e => setWalkInPhone(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Pilih Meja Tersedia:</label>
                <select
                  value={walkInTableId}
                  onChange={e => setWalkInTableId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.capacity}pax) - {t.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Jumlah Tamu:</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={walkInGuests}
                  onChange={e => setWalkInGuests(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Dudukkan Tamu Sekarang
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Real-time Waitlist Chat Modal for Staff */}
      {chatEntry && (
        <WaitlistChatModal
          waitlistEntry={chatEntry}
          currentUserRole="staff"
          currentUserName="Host Goory Coffee & Eatery"
          onClose={() => setChatEntry(null)}
        />
      )}

      {/* Reservation & Revenue Export Modal (CSV & PDF) */}
      <ReservationExportModal
        isOpen={showReservationExportModal}
        onClose={() => setShowReservationExportModal(false)}
        reservations={reservations}
      />

    </div>
  );
};
