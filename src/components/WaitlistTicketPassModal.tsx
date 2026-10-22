import React, { useEffect, useState } from 'react';
import { 
  X, 
  Clock, 
  Users, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Sparkles, 
  Crown, 
  QrCode, 
  Volume2,
  Calendar,
  RefreshCw,
  BellRing,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WaitlistEntry } from '../types/restaurant';
import { 
  subscribeToActiveWaitlistTicket, 
  cancelWaitlistCustomer 
} from '../services/waitlistService';
import { subscribeToWaitlistChat } from '../services/waitlistChatService';
import { WaitlistChatModal } from './WaitlistChatModal';
import { playChime } from '../utils/audio';

interface WaitlistTicketPassModalProps {
  initialEntry: WaitlistEntry;
  onClose: () => void;
  onCancelled?: () => void;
}

export const WaitlistTicketPassModal: React.FC<WaitlistTicketPassModalProps> = ({
  initialEntry,
  onClose,
  onCancelled
}) => {
  const [entry, setEntry] = useState<WaitlistEntry>(initialEntry);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [hasCelebratedCalled, setHasCelebratedCalled] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [unreadStaffCount, setUnreadStaffCount] = useState<number>(0);

  useEffect(() => {
    // Subscribe to live status updates on this ticket
    const unsubscribe = subscribeToActiveWaitlistTicket(entry.id, (updated) => {
      if (updated) {
        setEntry(updated);

        // If newly called, trigger celebration & chime!
        if (updated.status === 'called' && !hasCelebratedCalled) {
          setHasCelebratedCalled(true);
          playChime('payment');
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [entry.id, hasCelebratedCalled]);

  // Subscribe to real-time chat messages to calculate unread staff messages
  useEffect(() => {
    const unsubChat = subscribeToWaitlistChat(entry.id, (messages) => {
      const unread = messages.filter(m => m.senderRole === 'staff' && !m.isRead).length;
      setUnreadStaffCount(unread);
    });

    return () => {
      unsubChat();
    };
  }, [entry.id]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo! Saya sedang dalam antrean virtual Goory Coffee & Eatery:\n` +
      `Nomor Antrean: #${entry.queueNumber} (${entry.queueCode})\n` +
      `Nama: ${entry.customerName} (${entry.guestCount} Orang)\n` +
      `Status: ${entry.status === 'called' ? 'Meja Sudah Siap!' : 'Menunggu Meja Kosong'}\n` +
      `Perkiraan Tunggu: ~${entry.estimatedWaitMinutes} menit`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCancelTicket = async () => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan antrean virtual ini?')) {
      return;
    }
    setIsCancelling(true);
    await cancelWaitlistCustomer(entry.id);
    setIsCancelling(false);
    if (onCancelled) onCancelled();
    onClose();
  };

  const isCalled = entry.status === 'called';
  const isSeated = entry.status === 'seated';
  const isCancelled = entry.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border-t sm:border border-amber-900/40 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        
        {/* Top Bar */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isCalled ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-xs font-mono font-semibold text-stone-200 uppercase tracking-wider">
              Tiket Antrean Virtual Real-Time
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Bagikan ke WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ticket Body with Luxury Visual Pass */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-center">
          
          {/* Status Header Badge */}
          {isCalled ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/80 text-emerald-200 space-y-2 animate-bounce">
              <div className="flex items-center justify-center gap-2">
                <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider">
                  Meja Anda Telah Siap!
                </span>
              </div>
              <p className="text-xs text-emerald-300">
                Silakan menuju meja resepsionis sekarang untuk diantar ke meja makan Anda.
              </p>
            </div>
          ) : isSeated ? (
            <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-bold">Telah Menempati Meja</span>
              </div>
              <p className="text-xs text-cyan-300">
                Meja {entry.assignedTableName || 'Pilihan'} • Selamat menikmati santap makan &amp; kopi di Goory Coffee &amp; Eatery
              </p>
            </div>
          ) : isCancelled ? (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">Antrean Telah Dibatalkan</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-900/40 text-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-semibold">Menunggu Giliran Meja Kosong</span>
              </div>
              <div className="font-mono text-amber-400 font-bold">
                ~{entry.estimatedWaitMinutes} Menit
              </div>
            </div>
          )}

          {/* Main Virtual Pass Card */}
          <div className="relative rounded-3xl bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border border-amber-500/30 p-6 shadow-2xl text-stone-100 overflow-hidden">
            {/* Top Crest */}
            <div className="flex items-center justify-between text-xs text-stone-400 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-1.5 font-display tracking-widest text-amber-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                SAVOUR &amp; CO.
              </div>
              <div className="font-mono text-stone-400">
                VIRTUAL QUEUE PASS
              </div>
            </div>

            {/* Giant Queue Number Display */}
            <div className="py-6 space-y-1">
              <div className="text-[11px] font-mono tracking-widest text-amber-400 uppercase">
                Nomor Antrean Anda
              </div>
              <div className="text-6xl sm:text-7xl font-display font-black text-amber-300 tracking-tight drop-shadow-md">
                #{String(entry.queueNumber).padStart(2, '0')}
              </div>
              <div className="font-mono text-xs text-stone-400 tracking-wider">
                KODE TIKET: <strong className="text-stone-200">{entry.queueCode}</strong>
              </div>
            </div>

            {/* Notch Cutouts */}
            <div className="relative my-2 flex items-center justify-center">
              <div className="w-full border-t border-dashed border-stone-800" />
              <div className="absolute -left-10 w-8 h-8 rounded-full bg-stone-900 border-r border-amber-500/30" />
              <div className="absolute -right-10 w-8 h-8 rounded-full bg-stone-900 border-l border-amber-500/30" />
            </div>

            {/* Details Grid */}
            <div className="pt-4 grid grid-cols-2 gap-3 text-left text-xs">
              <div>
                <span className="text-[11px] text-stone-500 block">Nama Tamu</span>
                <span className="font-semibold text-stone-200 block truncate">
                  {entry.customerName}
                </span>
                {entry.loyaltyTier && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold mt-0.5">
                    <Crown className="w-3 h-3" /> VIP {entry.loyaltyTier}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-stone-500 block">Jumlah Tamu</span>
                <span className="font-semibold text-stone-200 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  {entry.guestCount} Orang
                </span>
              </div>

              <div>
                <span className="text-[11px] text-stone-500 block">Preferensi Area</span>
                <span className="font-semibold text-stone-200 capitalize">
                  {entry.preferredSection === 'any' ? 'Mana Saja' : entry.preferredSection}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-stone-500 block">Sesi Jam</span>
                <span className="font-semibold text-stone-200 font-mono text-[11px]">
                  {entry.preferredTimeSlot} WIB
                </span>
              </div>
            </div>

            {/* QR Code Graphic for Staff Check-in */}
            <div className="mt-5 pt-4 border-t border-stone-800/80 flex items-center justify-between text-xs">
              <div className="text-left space-y-0.5">
                <span className="text-[10px] text-stone-400 font-mono block">
                  Scan saat dipanggil oleh staf
                </span>
                <span className="text-[11px] text-stone-300 font-medium block">
                  Tunjukkan tiket ini di resepsionis
                </span>
              </div>
              <div className="p-2 bg-stone-950 rounded-xl border border-stone-800 shrink-0">
                <QrCode className="w-9 h-9 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Floating / Direct Chat Button for Guest */}
          {!isCancelled && !isSeated && (
            <button
              type="button"
              onClick={() => setShowChatModal(true)}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 hover:from-stone-900 hover:to-stone-850 border border-amber-500/40 hover:border-amber-500/70 text-amber-300 font-bold text-xs flex items-center justify-between shadow-lg shadow-black/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative p-1.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                  {unreadStaffCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-ping" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-200 group-hover:text-amber-200">Chat dengan Tim Resto</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-stone-400 font-normal block">
                    Kirim permintaan kursi bayi, sofa, atau cek giliran
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadStaffCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                    {unreadStaffCount} Pesan Baru
                  </span>
                )}
                <span className="text-amber-400 text-xs group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </div>
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            {!isCancelled && !isSeated && (
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelTicket}
                className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Membatalkan...' : 'Batalkan Antrean Saya'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs cursor-pointer"
            >
              Tutup &amp; Pantau Nanti
            </button>
          </div>

        </div>

      </div>

      {/* Real-time Waitlist Chat Modal for Guest */}
      {showChatModal && (
        <WaitlistChatModal
          waitlistEntry={entry}
          currentUserRole="customer"
          currentUserName={entry.customerName}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
};
