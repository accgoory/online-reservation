import React from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  CreditCard, 
  Utensils, 
  Clock, 
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { RestaurantNotification } from '../types/restaurant';
import { markNotificationAsRead } from '../services/restaurantService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: RestaurantNotification[];
  onSelectReservation?: (reservationId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectReservation
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    for (const notif of notifications) {
      if (!notif.isRead) {
        await markNotificationAsRead(notif.id);
      }
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'payment_confirmed':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'table_ready':
        return <CheckCircle2 className="w-4 h-4 text-amber-400" />;
      case 'status_changed':
        return <Utensils className="w-4 h-4 text-cyan-400" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-stone-900 border-l border-stone-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 text-base">Notifikasi Real-Time</h3>
              <p className="text-xs text-stone-400">Sinkronisasi otomatis dengan server Firebase</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="p-1.5 text-stone-400 hover:text-amber-400 rounded-lg hover:bg-stone-800 transition-colors"
              title="Tandai semua sudah dibaca"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center mb-3 text-stone-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-stone-300">Belum ada notifikasi</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Aktivitas reservasi, konfirmasi pembayaran, dan status meja akan muncul secara real-time di sini.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) markNotificationAsRead(notif.id);
                  if (notif.reservationId && onSelectReservation) {
                    onSelectReservation(notif.reservationId);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  notif.isRead
                    ? 'bg-stone-900/60 border-stone-800/80 opacity-80 hover:opacity-100'
                    : 'bg-stone-800/90 border-amber-500/40 shadow-sm shadow-amber-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-stone-950 border border-stone-800 shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-stone-100 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.reservationId && (
                      <span className="inline-block mt-2 text-[10px] text-amber-400/90 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                        ID: {notif.reservationId.slice(0, 14)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 text-center">
          <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Firebase listener aktif untuk semua pembaruan meja
          </p>
        </div>

      </div>
    </div>
  );
};
