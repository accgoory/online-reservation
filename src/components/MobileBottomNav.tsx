import React from 'react';
import { 
  CalendarCheck, 
  Sparkles, 
  Search, 
  LayoutDashboard, 
  Move, 
  Bell, 
  LogOut,
  UtensilsCrossed
} from 'lucide-react';
import { RestaurantNotification } from '../types/restaurant';

export type AppViewType = 'booking' | 'floor' | 'menu' | 'my-bookings' | 'manager';

interface MobileBottomNavProps {
  activeView: AppViewType;
  setActiveView: (view: AppViewType) => void;
  isStaff: boolean;
  isAdmin?: boolean;
  onOpenStaffLogin?: () => void;
  onStaffLogout: () => void;
  notifications: RestaurantNotification[];
  setIsDrawerOpen: (open: boolean) => void;
  onOpenSavourClub?: () => void;
}

const GUEST_TABS = [
  { id: 'booking', label: 'Pesan Meja', icon: CalendarCheck },
  { id: 'floor', label: 'Denah Meja', icon: Sparkles },
  { id: 'menu', label: 'Buku Menu', icon: UtensilsCrossed },
  { id: 'my-bookings', label: 'Tiket Saya', icon: Search }
] as const;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  isStaff,
  isAdmin = false,
  onStaffLogout,
  notifications,
  setIsDrawerOpen
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Active index for guest tabs (0 to 3)
  const guestActiveIndex = Math.max(0, GUEST_TABS.findIndex(t => t.id === activeView));

  // Active index for staff/admin tabs
  const staffTabsCount = isAdmin ? 4 : 3;
  const staffActiveIndex = activeView === 'manager' ? 0 : (isAdmin && activeView === 'floor' ? 1 : -1);

  return (
    <nav 
      aria-label="Navigasi Bawah Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#16221b]/95 backdrop-blur-xl border-t border-[#3c5344] text-[#fcfbf9] shadow-[0_-8px_25px_rgba(0,0,0,0.6)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative h-16 max-w-lg mx-auto px-1.5 flex items-center">
        
        {isStaff ? (
          // ==========================================
          // STAFF & ADMIN INTERNAL NAVIGATION
          // ==========================================
          <div className={`relative grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} w-full h-full items-center`}>
            
            {/* Sliding Pill Indicator for Staff/Admin */}
            {staffActiveIndex >= 0 && (
              <div 
                className={`absolute top-1.5 bottom-1.5 px-1 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0 ${
                  isAdmin ? 'w-1/4' : 'w-1/3'
                }`}
                style={{ transform: `translateX(${staffActiveIndex * 100}%)` }}
              >
                <div className="w-full h-full rounded-2xl bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-amber-500/5 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)] relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                </div>
              </div>
            )}

            {/* Dashboard / Queue button */}
            <button
              type="button"
              onClick={() => setActiveView('manager')}
              className={`relative z-10 min-h-[48px] touch-manipulation select-none flex flex-col items-center justify-center gap-1 py-1 transition-all duration-300 cursor-pointer ${
                activeView === 'manager' ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                {activeView === 'manager' && (
                  <span className="absolute -inset-1.5 rounded-full bg-amber-400/25 blur-md pointer-events-none" />
                )}
                <LayoutDashboard 
                  className={`w-5 h-5 transition-all duration-300 ${
                    activeView === 'manager' 
                      ? 'scale-110 -translate-y-0.5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                      : 'scale-100 text-stone-400'
                  }`} 
                />
              </div>
              <span className={`text-[10px] tracking-tight transition-all duration-300 ${activeView === 'manager' ? 'text-amber-300 font-bold scale-105' : 'text-stone-400'}`}>
                {isAdmin ? 'Dashboard' : 'Antrean'}
              </span>
            </button>

            {/* Floor editor for Admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView('floor')}
                className={`relative z-10 min-h-[48px] touch-manipulation select-none flex flex-col items-center justify-center gap-1 py-1 transition-all duration-300 cursor-pointer ${
                  activeView === 'floor' ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="relative">
                  {activeView === 'floor' && (
                    <span className="absolute -inset-1.5 rounded-full bg-amber-400/25 blur-md pointer-events-none" />
                  )}
                  <Move 
                    className={`w-5 h-5 transition-all duration-300 ${
                      activeView === 'floor' 
                        ? 'scale-110 -translate-y-0.5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                        : 'scale-100 text-stone-400'
                    }`} 
                  />
                </div>
                <span className={`text-[10px] tracking-tight transition-all duration-300 ${activeView === 'floor' ? 'text-amber-300 font-bold scale-105' : 'text-stone-400'}`}>
                  Atur Denah
                </span>
              </button>
            )}

            {/* Notifications trigger */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative z-10 min-h-[48px] touch-manipulation select-none flex flex-col items-center justify-center gap-1 py-1 text-stone-400 hover:text-stone-200 transition-all duration-300 cursor-pointer"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-stone-950 text-[9px] font-black rounded-full flex items-center justify-center font-mono shadow-[0_0_6px_#f59e0b]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">Notifikasi</span>
            </button>

            {/* Staff logout */}
            <button
              type="button"
              onClick={onStaffLogout}
              className="relative z-10 min-h-[48px] touch-manipulation select-none flex flex-col items-center justify-center gap-1 py-1 text-rose-400 hover:text-rose-300 transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">Keluar Kru</span>
            </button>
          </div>
        ) : (
          // ==========================================
          // PURE GUEST NAVIGATION (4 MAIN TABS)
          // ==========================================
          <div className="relative grid grid-cols-4 w-full h-full items-center">
            
            {/* Sliding Pill Indicator for Guest Tabs with Spring Easing */}
            <div 
              className="absolute top-1.5 bottom-1.5 w-1/4 px-1 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-0"
              style={{ transform: `translateX(${guestActiveIndex * 100}%)` }}
            >
              <div className="w-full h-full rounded-2xl bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-amber-500/5 border border-amber-500/40 shadow-[0_0_18px_rgba(245,158,11,0.25)] relative overflow-hidden">
                {/* Subtle top golden light beam */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b]" />
              </div>
            </div>

            {/* Render 4 Guest Tabs */}
            {GUEST_TABS.map((tab) => {
              const isActive = activeView === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id as AppViewType)}
                  className={`relative z-10 min-h-[48px] touch-manipulation select-none flex flex-col items-center justify-center gap-1 py-1 transition-all duration-300 cursor-pointer ${
                    isActive ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Warm Golden Glow Halo Effect behind active icon */}
                    {isActive && (
                      <span className="absolute -inset-2 rounded-full bg-amber-400/25 blur-md animate-pulse pointer-events-none" />
                    )}
                    
                    <Icon 
                      className={`w-5 h-5 transition-all duration-300 ${
                        isActive 
                          ? 'scale-115 -translate-y-0.5 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.85)]' 
                          : 'scale-100 text-stone-400 hover:text-stone-300'
                      }`} 
                    />
                  </div>

                  <span 
                    className={`text-[10px] tracking-tight transition-all duration-300 ${
                      isActive 
                        ? 'text-amber-300 font-bold scale-105 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]' 
                        : 'text-stone-400 font-medium'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}

          </div>
        )}

      </div>
    </nav>
  );
};
