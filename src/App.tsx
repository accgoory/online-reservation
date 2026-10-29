import React, { useState, useEffect, useRef } from 'react';
import { 
  RestaurantTable, 
  Reservation, 
  RestaurantNotification,
  LoyaltyAccount,
  WaitlistEntry,
  UserRole
} from './types/restaurant';
import { 
  initializeTablesIfEmpty, 
  subscribeToTables, 
  subscribeToReservations, 
  subscribeToNotifications,
  updateTablesBatch,
  resetTablesToDefault,
  addNewTable
} from './services/restaurantService';
import { 
  subscribeToLoyaltyAccount, 
  getActiveMemberPhone, 
  setActiveMemberPhone, 
  INITIAL_LOYALTY_MEMBERS 
} from './services/loyaltyService';
import {
  subscribeToWaitlist,
  getStoredWaitlistTicketId
} from './services/waitlistService';
import { testConnection } from './firebase/config';
import { getSoundEnabled, setSoundEnabled, playChime } from './utils/audio';
import { Header } from './components/Header';
import { ReservationWizard } from './components/ReservationWizard';
import { FloorPlanView } from './components/FloorPlanView';
import { MyReservationsView } from './components/MyReservationsView';
import { NotificationDrawer } from './components/NotificationDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';

// Performance optimization: Lazy-load heavy internal modals and manager components
// so guest diner initial bundle loads instantly with minimal data footprint
const ManagerDashboard = React.lazy(() => import('./components/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const StaffAccessModal = React.lazy(() => import('./components/StaffAccessModal').then(m => ({ default: m.StaffAccessModal })));
const QRScannerModal = React.lazy(() => import('./components/QRScannerModal').then(m => ({ default: m.QRScannerModal })));
const SavourClubModal = React.lazy(() => import('./components/SavourClubModal').then(m => ({ default: m.SavourClubModal })));
const WaitlistTicketPassModal = React.lazy(() => import('./components/WaitlistTicketPassModal').then(m => ({ default: m.WaitlistTicketPassModal })));
import { 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  UtensilsCrossed, 
  CalendarCheck, 
  ChevronRight, 
  Bell, 
  Lock, 
  LogOut, 
  Move, 
  Star,
  Crown,
  UserCheck,
  Camera,
  Settings,
  Instagram,
  Coffee,
  ExternalLink,
  Share2,
  MapPin,
  MessageCircle
} from 'lucide-react';
import { 
  AppSettings, 
  DEFAULT_APP_SETTINGS 
} from './types/settings';
import { subscribeToAppSettings, getLocalCachedSettings } from './services/settingsService';
const DigitalMenuModal = React.lazy(() => import('./components/DigitalMenuModal').then(m => ({ default: m.DigitalMenuModal })));
import { GuestMenuView } from './components/GuestMenuView';
import { HeroSeasonalPromotions } from './components/HeroSeasonalPromotions';

export default function App() {
  const [activeView, setActiveView] = useState<'booking' | 'floor' | 'menu' | 'my-bookings' | 'manager'>('booking');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<RestaurantNotification[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(getLocalCachedSettings());
  const [managerSectionTab, setManagerSectionTab] = useState<'reservations' | 'waitlist' | 'menu' | 'settings'>('reservations');
  const [showDigitalMenuModal, setShowDigitalMenuModal] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [isFirebaseLive, setIsFirebaseLive] = useState<boolean>(false);
  const [selectedTableForBooking, setSelectedTableForBooking] = useState<RestaurantTable | null>(null);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);

  // Loyalty Program State (starts null so form inputs are completely blank by default)
  const [showSavourClubModal, setShowSavourClubModal] = useState<boolean>(false);
  const [activeLoyaltyAccount, setActiveLoyaltyAccount] = useState<LoyaltyAccount | null>(null);

  // Role Separation & Internal Portal State ('customer' | 'staff' | 'admin')
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [initialPortalTab, setInitialPortalTab] = useState<'staff' | 'admin'>('admin');

  const isAdmin = userRole === 'admin';
  const isStaffAuthenticated = userRole === 'staff' || userRole === 'admin';

  // Virtual Waitlist Active Ticket State
  const [activeWaitlistTicket, setActiveWaitlistTicket] = useState<WaitlistEntry | null>(null);
  const [showGlobalWaitlistModal, setShowGlobalWaitlistModal] = useState<boolean>(false);

  // Floating live toast for latest real-time alert
  const [activeToast, setActiveToast] = useState<RestaurantNotification | null>(null);
  const prevNotifCountRef = useRef<number>(0);

  useEffect(() => {
    setSoundActive(getSoundEnabled());

    // Check saved session storage on mount
    const savedRole = sessionStorage.getItem('savour_user_role') as UserRole | null;
    if (savedRole === 'admin' || savedRole === 'staff') {
      setUserRole(savedRole);
    } else if (sessionStorage.getItem('savour_staff_authenticated') === 'true') {
      setUserRole('staff');
    }

    // Discreet keyboard shortcut for staff/admin portal (Ctrl+Shift+A or Cmd+Shift+A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setInitialPortalTab('admin');
        setShowStaffModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Discreet URL trigger (#admin, #staff, ?portal=admin, ?portal=staff)
    if (window.location.hash === '#admin' || window.location.search.includes('portal=admin')) {
      setInitialPortalTab('admin');
      setShowStaffModal(true);
    } else if (window.location.hash === '#staff' || window.location.search.includes('portal=staff')) {
      setInitialPortalTab('staff');
      setShowStaffModal(true);
    }

    // Test Firestore connection on boot per skill guidelines
    testConnection().then(connected => {
      setIsFirebaseLive(connected);
    });

    // Seed tables if empty
    initializeTablesIfEmpty().then(initial => {
      if (initial.length > 0) {
        setTables(initial);
      }
    });

    // Real-time table listener
    const unsubTables = subscribeToTables((updatedTables) => {
      setTables(updatedTables);
      setIsFirebaseLive(true);
    });

    // Real-time reservations listener
    const unsubReservations = subscribeToReservations((updatedReservations) => {
      setReservations(updatedReservations);
    });

    // Real-time notifications listener
    const unsubNotifications = subscribeToNotifications((updatedNotifs) => {
      setNotifications(updatedNotifs);

      // Detect new incoming notification
      if (updatedNotifs.length > prevNotifCountRef.current && prevNotifCountRef.current > 0) {
        const latest = updatedNotifs[0];
        if (latest) {
          setActiveToast(latest);
          playChime(latest.type === 'payment_confirmed' ? 'payment' : 'alert');
          setTimeout(() => {
            setActiveToast(null);
          }, 6000);
        }
      }
      prevNotifCountRef.current = updatedNotifs.length;
    });

    // Real-time loyalty account listener for active member
    const phone = activeLoyaltyAccount?.customerPhone || getActiveMemberPhone();
    const unsubLoyalty = subscribeToLoyaltyAccount(phone, (acc) => {
      if (acc) {
        setActiveLoyaltyAccount(acc);
      }
    });

    // Real-time waitlist listener
    const unsubWaitlist = subscribeToWaitlist((entries) => {
      const storedId = getStoredWaitlistTicketId();
      if (storedId) {
        const found = entries.find((e) => e.id === storedId);
        if (found) {
          setActiveWaitlistTicket(found);
        }
      }
    });

    // Real-time app settings listener
    const unsubSettings = subscribeToAppSettings((updatedSettings) => {
      setAppSettings(updatedSettings);
    });

    return () => {
      unsubTables();
      unsubReservations();
      unsubNotifications();
      unsubLoyalty();
      unsubWaitlist();
      unsubSettings();
    };
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundActive(enabled);
    setSoundEnabled(enabled);
  };

  const handleInternalLoginSuccess = (role: 'staff' | 'admin') => {
    setUserRole(role);
    sessionStorage.setItem('savour_user_role', role);
    sessionStorage.setItem('savour_staff_authenticated', 'true');
    setShowStaffModal(false);
    setActiveView('manager');
  };

  const handleInternalLogout = () => {
    sessionStorage.removeItem('savour_user_role');
    sessionStorage.removeItem('savour_staff_authenticated');
    setUserRole('customer');
    setActiveView('booking');
    playChime('ding');
  };

  const handleSwitchView = (view: 'booking' | 'floor' | 'menu' | 'my-bookings' | 'manager') => {
    if (view === 'manager' && !isStaffAuthenticated) {
      setInitialPortalTab('admin');
      setShowStaffModal(true);
      return;
    }
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-[#638574] text-[#fcfbf9] flex flex-col selection:bg-amber-400 selection:text-stone-950 font-sans">
      
      {/* Global Header */}
      <Header
        activeView={activeView}
        setActiveView={handleSwitchView}
        notifications={notifications}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        soundEnabled={soundActive}
        setSoundEnabled={handleSoundToggle}
        isFirebaseLive={isFirebaseLive}
        isStaff={isStaffAuthenticated}
        isAdmin={isAdmin}
        onOpenStaffLogin={() => {
          setInitialPortalTab('admin');
          setShowStaffModal(true);
        }}
        onStaffLogout={handleInternalLogout}
        onOpenSavourClub={() => setShowSavourClubModal(true)}
        loyaltyAccount={activeLoyaltyAccount}
        onOpenScanner={() => setShowQRScanner(true)}
        onOpenSettings={() => {
          setActiveView('manager');
          setManagerSectionTab('settings');
        }}
        onOpenDigitalMenu={() => setShowDigitalMenuModal(true)}
        adminProfile={appSettings.adminProfile}
        restaurantSettings={appSettings.restaurant}
      />

      {/* Staff & Admin Mode Active Notification Bar */}
      {isStaffAuthenticated && (
        <div className={`border-b px-4 py-2 text-xs shadow-xs ${
          isAdmin
            ? 'bg-gradient-to-r from-[#213228] via-[#1a2720] to-[#213228] border-amber-500/50 text-amber-200'
            : 'bg-[#1a2720] border-[#384e41] text-[#d6e3dc]'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="font-bold flex items-center gap-1">
                {isAdmin ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Mode Administrator Aktif (accgoory@gmail.com):
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    Mode Kru Staf Aktif (Antrean &amp; Tamu):
                  </>
                )}
              </span>
              <span className="text-stone-400 hidden sm:inline">
                {isAdmin
                  ? 'Akses penuh: Mengubah letak denah meja, modul menu & stok real-time, dan kontrol operasional.'
                  : 'Akses terbatas untuk mengelola antrean virtual (Waitlist) dan kedatangan tamu.'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => {
                      setActiveView('manager');
                      setManagerSectionTab('menu');
                    }}
                    className="underline hover:text-white font-medium cursor-pointer flex items-center gap-1 text-amber-300"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                    Manajemen Menu
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('manager');
                      setManagerSectionTab('settings');
                    }}
                    className="underline hover:text-white font-medium cursor-pointer flex items-center gap-1 text-amber-300"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-400" />
                    Pengaturan
                  </button>
                  <button
                    onClick={() => setActiveView('floor')}
                    className="underline hover:text-white font-medium cursor-pointer"
                  >
                    Atur Denah Meja
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setInitialPortalTab('admin');
                    setShowStaffModal(true);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  Buka Hak Admin
                </button>
              )}
              <button
                onClick={handleInternalLogout}
                className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Kembali ke Tamu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Waitlist Ticket Banner (Global) */}
      {activeWaitlistTicket && (activeWaitlistTicket.status === 'waiting' || activeWaitlistTicket.status === 'called') && (
        <div className={`border-b px-4 py-2.5 text-xs shadow-md ${
          activeWaitlistTicket.status === 'called'
            ? 'bg-gradient-to-r from-emerald-950 via-[#192720] to-emerald-950 border-emerald-500/80 text-emerald-200'
            : 'bg-gradient-to-r from-[#213329] via-[#1a2720] to-[#213329] border-amber-500/60 text-amber-200'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${activeWaitlistTicket.status === 'called' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
              <span className="font-bold text-stone-100">
                {activeWaitlistTicket.status === 'called' ? '🎉 MEJA ANDA SUDAH SIAP!' : 'Antrean Virtual Aktif:'}
              </span>
              <span className="text-amber-300 font-mono font-bold">
                Tiket {activeWaitlistTicket.queueCode} (Urutan #{activeWaitlistTicket.queueNumber})
              </span>
              <span className="text-[#d8e4dd] hidden md:inline">
                • {activeWaitlistTicket.customerName} ({activeWaitlistTicket.guestCount} Tamu)
              </span>
              {activeWaitlistTicket.status === 'waiting' && (
                <span className="text-[#b1c4b9] text-[11px] hidden lg:inline font-mono">
                  • Est. tunggu: ~{activeWaitlistTicket.estimatedWaitMinutes} menit
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGlobalWaitlistModal(true)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-[11px] shadow-sm cursor-pointer transition-transform hover:scale-105 ${
                  activeWaitlistTicket.status === 'called'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 animate-bounce'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold'
                }`}
              >
                {activeWaitlistTicket.status === 'called' ? 'Lihat Panggilan Meja ➔' : 'Buka Tiket Antrean'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Real-Time Toast Notification */}
      {activeToast && (
        <div className="fixed top-24 right-4 z-50 max-w-sm w-full bg-[#1b2821] border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
              <Bell className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                  Notifikasi Real-Time
                </h4>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-stone-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm font-semibold text-stone-100 mt-0.5">
                {activeToast.title}
              </p>
              <p className="text-xs text-[#c3d3ca] mt-1 leading-relaxed">
                {activeToast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container (Extra padding on mobile to account for bottom navigation bar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-12">
        
        {/* VIEW 1: BOOKING WIZARD */}
        {activeView === 'booking' && (
          <div className="space-y-6 sm:space-y-8">
            
            {/* Hero Welcome Showcase */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-500/35 bg-[#121c16] p-5 sm:p-10 shadow-2xl">
              {/* Full-width photography background with layered botanical luxury overlay */}
              <img
                src="/src/assets/images/goory_coffee_interior_1792652660543.jpg"
                alt="Goory Coffee & Eatery Interior"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.42] saturate-[1.12] scale-100 sm:scale-105 transition-transform duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b130e]/95 via-[#111e16]/85 to-[#0b130e]/65 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b130e] via-transparent to-black/25 pointer-events-none" />

              <div className="relative z-10 max-w-5xl space-y-3 sm:space-y-4">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-semibold tracking-wide shadow-sm">
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span>{appSettings.restaurant.restaurantName} • {appSettings.restaurant.tagline}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#fdfbf7] tracking-tight leading-tight drop-shadow-md">
                  Pengalaman Bersantap &amp; Kopi Mewah di <span className="text-amber-200">{appSettings.restaurant.restaurantName}</span>
                </h1>

                <p className="text-xs sm:text-base text-[#dce7e1] font-light leading-relaxed drop-shadow-sm">
                  Pilih denah meja favorit Anda, lakukan pembayaran deposit instan via QRIS, e-Wallet, atau VA dengan verifikasi real-time, dan nikmati momen santai istimewa di <strong className="text-amber-300 font-normal">{appSettings.restaurant.address.split(',')[1]?.trim() || 'Denpasar, Bali'}</strong>.
                </p>

                {/* Feature highlight badges */}
                <div className="pt-1 flex flex-wrap gap-2 sm:gap-3 text-[11px] sm:text-xs">
                  <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#111c15]/90 backdrop-blur-sm border border-[#344b3e] text-[#dce7e1]">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    Denah Meja 2D Interaktif
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#111c15]/90 backdrop-blur-sm border border-[#344b3e] text-[#dce7e1]">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    Pembayaran QRIS &amp; Transfer Bank Aman
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#111c15]/90 backdrop-blur-sm border border-[#344b3e] text-[#dce7e1]">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                    Notifikasi Siap Meja Real-Time
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/40 text-amber-300 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    4.9 / 5.0 Google Reviews
                  </span>
                </div>

                {/* Direct action to open digital menu & Official Social Media Links */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveView('menu')}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/40 hover:scale-105 active:scale-95"
                  >
                    <UtensilsCrossed className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                    <span>Jelajahi Buku Menu Kuliner (Live Stock)</span>
                  </button>

                  {/* Social Media Links for Goory Coffee & Eatery */}
                  <a
                    href={`https://instagram.com/${(appSettings.restaurant.instagramHandle || '@goorycoffee').replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-sm hover:scale-105"
                    title="Kunjungi Instagram Goory Coffee & Eatery"
                  >
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <span>{appSettings.restaurant.instagramHandle || '@goorycoffee'}</span>
                    <ExternalLink className="w-3 h-3 text-pink-400/80" />
                  </a>

                  <a
                    href={`https://tiktok.com/@${(appSettings.restaurant.tiktokHandle || 'goorycoffee').replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-sm hover:scale-105"
                    title="Kunjungi TikTok Goory Coffee & Eatery"
                  >
                    <span className="text-xs">🎵</span>
                    <span>{appSettings.restaurant.tiktokHandle || '@goorycoffee'}</span>
                    <ExternalLink className="w-3 h-3 text-cyan-400/80" />
                  </a>

                  <a
                    href={`https://wa.me/${(appSettings.restaurant.whatsappNumber || '+6289661315457').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-sm hover:scale-105"
                    title="Hubungi WhatsApp Goory Coffee & Eatery"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3 text-emerald-400/80" />
                  </a>

                  {appSettings.restaurant.googleMapsUrl && (
                    <a
                      href={appSettings.restaurant.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-sm hover:scale-105"
                      title="Buka Lokasi di Google Maps"
                    >
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span>Maps</span>
                      <ExternalLink className="w-3 h-3 text-rose-400/80" />
                    </a>
                  )}
                </div>

                {/* Floating Promotional / Seasonal Offers Component directly below Hero headline */}
                <HeroSeasonalPromotions 
                  onOpenMenu={() => setActiveView('menu')} 
                />
              </div>

              {/* Decorative background glow */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-600/15 to-transparent pointer-events-none" />
            </div>

            {/* Wizard Component */}
            <ReservationWizard
              tables={tables}
              initialSelectedTable={selectedTableForBooking}
              activeLoyaltyAccount={activeLoyaltyAccount}
              onOpenSavourClub={() => setShowSavourClubModal(true)}
              isStaff={isStaffAuthenticated}
              onReservationCreated={(newBooking) => {
                setActiveView('my-bookings');
              }}
            />
          </div>
        )}

        {/* VIEW 2: FLOOR PLAN ONLY (With Staff & Admin Layout Management) */}
        {activeView === 'floor' && (
          <div className="space-y-6">
            <FloorPlanView
              tables={tables}
              selectedTable={selectedTableForBooking}
              onSelectTable={(table) => setSelectedTableForBooking(table)}
              onProceedToBooking={(table) => {
                setSelectedTableForBooking(table);
                setActiveView('booking');
              }}
              isStaff={isStaffAuthenticated}
              isAdmin={isAdmin}
              onRequestAdminAccess={() => {
                setInitialPortalTab('admin');
                setShowStaffModal(true);
              }}
              onSaveLayout={updateTablesBatch}
              onResetLayout={resetTablesToDefault}
              onAddNewTable={addNewTable}
            />
          </div>
        )}

        {/* VIEW 3: GUEST DIGITAL MENU BOOK */}
        {activeView === 'menu' && (
          <GuestMenuView onGoToBooking={() => setActiveView('booking')} />
        )}

        {/* VIEW 4: MY RESERVATIONS & DIGITAL PASS */}
        {activeView === 'my-bookings' && (
          <MyReservationsView
            reservations={reservations}
            onSelectBooking={(res) => {}}
          />
        )}

        {/* VIEW 4: MANAGER & STAFF CONTROLLER (Protected for internal team) */}
        {activeView === 'manager' && (
          isStaffAuthenticated ? (
            <React.Suspense fallback={
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#b8c9bf] font-mono">Memuat Panel Pengelola Restoran...</p>
              </div>
            }>
              <ManagerDashboard
                tables={tables}
                reservations={reservations}
                isAdmin={isAdmin}
                onRequestAdminAccess={() => {
                  setInitialPortalTab('admin');
                  setShowStaffModal(true);
                }}
                onOpenFloorPlan={() => setActiveView('floor')}
                onOpenScanner={() => setShowQRScanner(true)}
                settings={appSettings}
                onSettingsUpdated={(newSettings) => setAppSettings(newSettings)}
                initialSectionTab={managerSectionTab}
              />
            </React.Suspense>
          ) : (
            <div className="text-center py-16 bg-stone-900/60 rounded-3xl border border-stone-800 p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="font-display text-2xl font-bold text-stone-100">
                Portal Internal Restoran Terkunci
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                Halaman ini khusus untuk kru staf pelayanan (antrean &amp; kedatangan tamu) dan administrator restoran (akses penuh denah &amp; analitik omzet).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setInitialPortalTab('admin');
                    setShowStaffModal(true);
                  }}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-600/20 cursor-pointer flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Crown className="w-4 h-4 text-stone-950" />
                  Masuk sebagai Administrator (Email &amp; Sandi)
                </button>
                <button
                  onClick={() => {
                    setInitialPortalTab('staff');
                    setShowStaffModal(true);
                  }}
                  className="py-3 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-semibold text-xs cursor-pointer flex items-center gap-2 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Masuk Kru Staf (PIN 1234)
                </button>
              </div>
            </div>
          )
        )}

      </main>

      {/* Staff & Admin Authentication Gate Modal */}
      {showStaffModal && (
        <React.Suspense fallback={null}>
          <StaffAccessModal
            isOpen={showStaffModal}
            onClose={() => setShowStaffModal(false)}
            onSuccess={handleInternalLoginSuccess}
            initialRole={initialPortalTab}
          />
        </React.Suspense>
      )}

      {/* Savour Club Loyalty Points Modal */}
      {showSavourClubModal && (
        <React.Suspense fallback={null}>
          <SavourClubModal
            currentAccount={activeLoyaltyAccount}
            onSelectAccount={(acc) => {
              setActiveLoyaltyAccount(acc);
              setActiveMemberPhone(acc.customerPhone);
            }}
            onClose={() => setShowSavourClubModal(false)}
            onGoToBooking={() => {
              setShowSavourClubModal(false);
              setActiveView('booking');
            }}
          />
        </React.Suspense>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={handleSwitchView}
        isStaff={isStaffAuthenticated}
        isAdmin={isAdmin}
        onOpenStaffLogin={() => {
          setInitialPortalTab('admin');
          setShowStaffModal(true);
        }}
        onStaffLogout={handleInternalLogout}
        notifications={notifications}
        setIsDrawerOpen={setIsDrawerOpen}
        onOpenSavourClub={() => setShowSavourClubModal(true)}
      />

      {/* Real-time Notifications Slide-Over Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={notifications}
        onSelectReservation={(resId) => {
          setActiveView('my-bookings');
        }}
      />

      {/* Global Waitlist Ticket Pass Modal */}
      {showGlobalWaitlistModal && activeWaitlistTicket && (
        <React.Suspense fallback={null}>
          <WaitlistTicketPassModal
            initialEntry={activeWaitlistTicket}
            onClose={() => setShowGlobalWaitlistModal(false)}
            onCancelled={() => {
              setActiveWaitlistTicket(null);
              setShowGlobalWaitlistModal(false);
            }}
          />
        </React.Suspense>
      )}

      {/* Floating Camera Button for Staff (Mobile & Desktop Quick Access) */}
      {isStaffAuthenticated && (
        <div className="fixed bottom-20 right-4 z-40 md:bottom-8 md:right-8 animate-in fade-in zoom-in-90 duration-200">
          <button
            onClick={() => setShowQRScanner(true)}
            className="flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-extrabold text-xs sm:text-sm shadow-2xl shadow-amber-500/50 border border-amber-300/80 cursor-pointer transition-all hover:scale-105 active:scale-95 group ring-2 ring-amber-500/30"
            title="Pindai QR Pass Tamu (Kamera Check-in)"
            aria-label="Pindai QR Pass Tamu"
          >
            <div className="relative">
              <Camera className="w-5 h-5 text-stone-950 stroke-[2.5]" />
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping absolute -top-1 -right-1" />
            </div>
            <span className="tracking-wide uppercase text-[11px] sm:text-xs font-black">
              Scan QR Pass
            </span>
          </button>
        </div>
      )}

      {/* Camera QR Code Scanner Modal for Staff Arrival Check-in */}
      {showQRScanner && (
        <React.Suspense fallback={null}>
          <QRScannerModal
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            reservations={reservations}
            tables={tables}
            onReservationUpdated={(updated) => {
              setReservations(prev => prev.map(r => r.id === updated.id ? updated : r));
            }}
          />
        </React.Suspense>
      )}

      {/* Digital Menu Catalog Modal (Live Stock) */}
      {showDigitalMenuModal && (
        <React.Suspense fallback={null}>
          <DigitalMenuModal
            isOpen={showDigitalMenuModal}
            onClose={() => setShowDigitalMenuModal(false)}
          />
        </React.Suspense>
      )}

      {/* Footer with Discreet Internal Portal Link */}
      <footer className="no-print mt-12 sm:mt-16 border-t border-[#466052] bg-[#142018] py-8 text-xs text-[#b8c9bf] text-center pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-stone-950 font-bold text-xs shadow-xs">
                ☕
              </div>
              <span className="font-display font-bold text-[#f5f8f6] tracking-wider">
                {appSettings.restaurant.restaurantName.toUpperCase()}
              </span>
              <span className="text-[#3b5145]">|</span>
              <span className="text-[#c2d3cb]">{appSettings.restaurant.address}</span>
            </div>

            {/* Social media links in footer */}
            <div className="flex items-center gap-3">
              <a
                href={`https://instagram.com/${(appSettings.restaurant.instagramHandle || '@goorycoffee').replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors"
                title="Instagram Goory Coffee"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>{appSettings.restaurant.instagramHandle || '@goorycoffee'}</span>
              </a>

              <span className="text-[#3b5145]">•</span>

              <a
                href={`https://tiktok.com/@${(appSettings.restaurant.tiktokHandle || 'goorycoffee').replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                title="TikTok Goory Coffee"
              >
                <span className="text-xs">🎵</span>
                <span>{appSettings.restaurant.tiktokHandle || '@goorycoffee'}</span>
              </a>

              {appSettings.restaurant.googleMapsUrl && (
                <>
                  <span className="text-[#3b5145]">•</span>
                  <a
                    href={appSettings.restaurant.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors"
                    title="Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Petunjuk Arah</span>
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#2a3e32] flex flex-wrap items-center justify-center gap-4 text-[#a7bdaf] text-[11px]">
            <span>Operasional: {appSettings.restaurant.openTime} - {appSettings.restaurant.closeTime} WITA</span>
            <span>•</span>
            <a 
              href={`https://wa.me/${(appSettings.restaurant.whatsappNumber || '+6289661315457').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#dce7e1] hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5 underline decoration-emerald-500/40 underline-offset-2"
              title="Hubungi WhatsApp Concierge Restoran"
            >
              <span>WhatsApp Concierge: {appSettings.restaurant.whatsappNumber || '+62 896-6131-5457'}</span>
            </a>
            <span>•</span>
            <span className="text-amber-300/90 font-medium">{appSettings.restaurant.tagline || 'Specialty Coffee & Artisan Dining'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
