import React, { useState, useRef, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Bell, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  LayoutDashboard, 
  CalendarCheck,
  Search,
  Lock, 
  LogOut, 
  Move, 
  Crown, 
  QrCode,
  Settings,
  User,
  ChevronDown,
  Shield,
  UserCheck,
  KeyRound
} from 'lucide-react';
import { RestaurantNotification, LoyaltyAccount } from '../types/restaurant';
import { AdminProfile, RestaurantSettings } from '../types/settings';

interface HeaderProps {
  activeView: 'booking' | 'floor' | 'menu' | 'my-bookings' | 'manager';
  setActiveView: (view: 'booking' | 'floor' | 'menu' | 'my-bookings' | 'manager') => void;
  notifications: RestaurantNotification[];
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isFirebaseLive: boolean;
  isStaff: boolean;
  isAdmin?: boolean;
  onOpenStaffLogin: () => void;
  onStaffLogout: () => void;
  onOpenSavourClub?: () => void;
  loyaltyAccount?: LoyaltyAccount | null;
  onOpenScanner?: () => void;
  onOpenSettings?: () => void;
  onOpenDigitalMenu?: () => void;
  adminProfile?: AdminProfile;
  restaurantSettings?: RestaurantSettings;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  notifications,
  isDrawerOpen,
  setIsDrawerOpen,
  soundEnabled,
  setSoundEnabled,
  isFirebaseLive,
  isStaff,
  isAdmin = false,
  onOpenStaffLogin,
  onStaffLogout,
  onOpenSavourClub,
  loyaltyAccount,
  onOpenScanner,
  onOpenSettings,
  onOpenDigitalMenu,
  adminProfile,
  restaurantSettings
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Secret 5-tap gesture tracking on brand logo
  const logoTapCountRef = useRef<number>(0);
  const logoLastTapTimeRef = useRef<number>(0);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileSettingsClick = () => {
    setShowProfileMenu(false);
    if (isAdmin && onOpenSettings) {
      onOpenSettings();
    } else {
      onOpenStaffLogin();
    }
  };

  const handleBrandLogoClick = () => {
    if (isStaff) {
      setActiveView('manager');
      return;
    }

    // Default action for guest: go to booking view
    setActiveView('booking');

    // Secret 5-tap detector (must tap 5 times within 3 seconds)
    const now = Date.now();
    if (now - logoLastTapTimeRef.current < 3000) {
      logoTapCountRef.current += 1;
    } else {
      logoTapCountRef.current = 1;
    }
    logoLastTapTimeRef.current = now;

    if (logoTapCountRef.current >= 5) {
      logoTapCountRef.current = 0;
      onOpenStaffLogin();
    }
  };

  const currentDisplayName = isAdmin 
    ? (adminProfile?.name || 'I Putu Agus Rony Sastradi')
    : isStaff 
    ? 'Kru Kasir Bertugas' 
    : 'Tamu Goory';

  const currentEmail = isAdmin 
    ? (adminProfile?.email || 'accgoory@gmail.com')
    : isStaff 
    ? 'crew-pos@goorycoffee.id' 
    : 'Mode Pengunjung';

  const currentAvatar = isAdmin 
    ? (adminProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80')
    : isStaff
    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
    : '';

  return (
    <header className="sticky top-0 z-40 bg-[#18261f]/95 backdrop-blur-md border-b border-[#3b5145]/80 text-[#fcfbf9] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity (With Secret 5-Tap for Staff/Admin) */}
          <div 
            onClick={handleBrandLogoClick}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-h-[44px]"
            title={isStaff ? "Dashboard Internal" : "Goory Coffee & Eatery"}
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 ring-1 ring-amber-300/50 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base sm:text-2xl font-bold tracking-wider text-amber-200 group-hover:text-amber-300 transition-colors">
                  {restaurantSettings?.restaurantName?.toUpperCase() || 'GOORY COFFEE & EATERY'}
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 rounded-full shadow-xs">
                    <Crown className="w-3 h-3 text-stone-950" />
                    PORTAL ADMIN
                  </span>
                ) : isStaff ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#283d31] text-amber-300 border border-[#3e5b4a] rounded-full shadow-xs">
                    PORTAL KRU
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-amber-500/15 text-amber-300 border border-amber-500/35 rounded-full">
                    COFFEE &amp; EATERY
                  </span>
                )}
              </div>
              <p className="text-xs text-[#b8c9bf] tracking-wide font-light hidden sm:block">
                {isAdmin 
                  ? 'Panel Eksekutif Administrator • Kontrol Penuh Pengaturan & Antrean' 
                  : isStaff 
                  ? 'Panel Kru Pelayanan • Operasional Kasir & Antrean Meja' 
                  : (restaurantSettings?.tagline || 'Specialty Coffee & Artisan Dining • Denpasar, Bali')}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#142019]/90 p-1.5 rounded-xl border border-[#344b3e]">
            {isStaff ? (
              // STAFF / ADMIN TABS
              <>
                {onOpenScanner && (
                  <button
                    onClick={onOpenScanner}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 hover:scale-105"
                    title="Buka Pemindai Kamera QR Pass Tamu"
                  >
                    <QrCode className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                    <span>Scan QR Pass</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveView('manager')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    activeView === 'manager'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                      : 'text-[#d3e2da] hover:text-white hover:bg-[#1f3026]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {isAdmin ? 'Dashboard & Antrean' : 'Antrean & Kasir'}
                </button>

                {isAdmin ? (
                  <button
                    onClick={() => setActiveView('floor')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                      activeView === 'floor'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                        : 'text-[#d3e2da] hover:text-white hover:bg-[#1f3026]'
                    }`}
                  >
                    <Move className="w-4 h-4" />
                    Denah &amp; Atur Meja
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenStaffLogin()}
                    title="Pengaturan denah meja hanya dapat diakses oleh Administrator"
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-stone-400 hover:text-amber-300 hover:bg-[#1f3026] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    Denah (Admin Saja)
                  </button>
                )}

                {/* Direct Settings Tab for Admin */}
                {isAdmin && onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:text-white hover:bg-[#1f3026] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Buka Pengaturan Profil, Restoran & Sistem"
                  >
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>Pengaturan</span>
                  </button>
                )}

                <button
                  onClick={onStaffLogout}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-900/30 flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Mode Tamu
                </button>
              </>
            ) : (
              // CUSTOMER TABS - Clean dining guest experience
              <>
                <button
                  onClick={() => setActiveView('booking')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    activeView === 'booking'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                      : 'text-[#d5e3dc] hover:text-white hover:bg-[#1e2f25]'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  Reservasi Meja
                </button>

                <button
                  onClick={() => setActiveView('floor')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    activeView === 'floor'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                      : 'text-[#d5e3dc] hover:text-white hover:bg-[#1e2f25]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Denah Meja
                </button>

                <button
                  onClick={() => setActiveView('menu')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    activeView === 'menu'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                      : 'text-[#d5e3dc] hover:text-white hover:bg-[#1e2f25]'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Buku Menu
                </button>

                <button
                  onClick={() => setActiveView('my-bookings')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    activeView === 'my-bookings'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                      : 'text-[#d5e3dc] hover:text-white hover:bg-[#1e2f25]'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Cek Tiket Saya
                </button>
              </>
            )}
          </nav>

          {/* Action Tools: Savour Club, Sound, Notifications, and Staff Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Firestore indicator */}
            <div 
              title={isFirebaseLive ? "Terhubung ke Firebase Real-Time Firestore" : "Menghubungkan ke Firebase..."}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#17241d] border border-[#364d3f] text-[#c2d3ca]"
            >
              <span className={`w-2 h-2 rounded-full ${isFirebaseLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono text-[11px] text-[#a7bdaf]">
                {isFirebaseLive ? 'Firebase Live' : 'Connecting...'}
              </span>
            </div>

            {/* Goory Club Points Button */}
            {!isStaff && onOpenSavourClub && (
              <button
                onClick={onOpenSavourClub}
                title="Goory Club - Saldo Poin & Hak Istimewa Tamu"
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-[#213227] via-[#1a281f] to-[#213227] hover:from-[#283e30] hover:to-[#283e30] border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-black/20 transition-all cursor-pointer group"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Goory Club</span>
                <span className="bg-amber-400 text-stone-950 font-bold px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {loyaltyAccount ? `${loyaltyAccount.pointsBalance} Pts` : 'Poin'}
                </span>
              </button>
            )}

            {/* Sound toggle button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Matikan Suara Notifikasi' : 'Nyalakan Suara Notifikasi Bell'}
              className="p-2.5 rounded-xl bg-[#17241d] hover:bg-[#203126] border border-[#364c3e] text-[#d6e3dc] hover:text-amber-300 transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-500" />
              )}
            </button>

            {/* Real-time Notifications Bell */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="relative p-2.5 rounded-xl bg-[#17241d] hover:bg-[#203126] border border-[#364c3e] text-[#d6e3dc] hover:text-amber-300 transition-colors cursor-pointer"
              title="Notifikasi Real-Time"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-stone-950 text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-md shadow-amber-500/50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* AVATAR PROFIL & PENGATURAN DROPDOWN - ONLY SHOWN WHEN STAFF OR ADMIN IS LOGGED IN */}
            {isStaff && (
              <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isAdmin 
                    ? 'bg-gradient-to-r from-[#213228] via-[#1a2720] to-[#1a2720] border-amber-500/50 hover:border-amber-400 shadow-md shadow-black/30'
                    : 'bg-[#18261e] border-[#384e40] hover:border-stone-400'
                }`}
                title={isAdmin ? "Profil Administrator & Pengaturan" : "Profil Kru Kasir"}
              >
                {/* Avatar circle */}
                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-stone-400" />
                  )}
                  {/* Badge corner */}
                  {isAdmin && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center shadow-xs">
                      <Crown className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  )}
                  {!isAdmin && isStaff && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-xs">
                      <Shield className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>

                {/* Display text (Desktop) */}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-stone-100 flex items-center gap-1 leading-tight">
                    <span>{isAdmin ? (adminProfile?.name?.split(' ')[0] || 'Admin') : isStaff ? 'Kru Kasir' : 'Tamu'}</span>
                    <ChevronDown className="w-3 h-3 text-stone-400" />
                  </div>
                  <span className="text-[10px] text-amber-400/90 block leading-tight font-mono">
                    {isAdmin ? 'Super Admin' : isStaff ? 'Shift Kasir' : 'Pengunjung'}
                  </span>
                </div>
              </button>

              {/* DROPDOWN MENU */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Card */}
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/80 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-800 border border-amber-500/30 flex items-center justify-center shrink-0">
                        {currentAvatar ? (
                          <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-stone-100 truncate">{currentDisplayName}</div>
                        <div className="text-[11px] text-stone-400 font-mono truncate">{currentEmail}</div>
                        <span className={`inline-block mt-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isAdmin 
                            ? 'bg-amber-500 text-stone-950' 
                            : isStaff 
                            ? 'bg-stone-800 text-cyan-300 border border-stone-700' 
                            : 'bg-stone-800 text-stone-400'
                        }`}>
                          {isAdmin ? 'Administrator Penuh' : isStaff ? 'Kru Kasir Operasional' : 'Tamu Publik'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="space-y-1 text-xs">
                    {/* Settings Trigger */}
                    <button
                      type="button"
                      onClick={handleProfileSettingsClick}
                      className="w-full px-3 py-2.5 rounded-xl hover:bg-stone-800/90 text-stone-200 hover:text-amber-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-amber-400" />
                        <span className="font-medium">Pengaturan Profil &amp; Sistem</span>
                      </div>
                      {!isAdmin && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-sm font-semibold">
                          Admin
                        </span>
                      )}
                    </button>

                    {/* Operational Dashboard for Staff & Admin */}
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setActiveView('manager');
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-stone-800/90 text-stone-200 hover:text-amber-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-400" />
                        <span className="font-medium">Panel Antrean &amp; Kasir</span>
                      </button>
                    )}

                    {/* Floor Plan for Admin */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setActiveView('floor');
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-stone-800/90 text-stone-200 hover:text-amber-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Move className="w-4 h-4 text-amber-400" />
                        <span className="font-medium">Denah Meja Restoran</span>
                      </button>
                    )}

                    {/* Logout to Guest Mode */}
                    <div className="pt-1 border-t border-stone-800/80 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          onStaffLogout();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Keluar ke Mode Tamu</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
