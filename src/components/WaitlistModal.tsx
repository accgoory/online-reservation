import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Clock, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Calendar, 
  Compass, 
  MessageSquare,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { TIME_SLOTS } from '../data/defaultTables';
import { WaitlistEntry, LoyaltyAccount } from '../types/restaurant';
import { addToWaitlist } from '../services/waitlistService';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: WaitlistEntry) => void;
  activeLoyaltyAccount?: LoyaltyAccount | null;
  activeQueueCount?: number;
  initialTimeSlot?: string;
  initialDate?: string;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeLoyaltyAccount,
  activeQueueCount = 2,
  initialTimeSlot = '19:00 - 21:00',
  initialDate = new Date().toISOString().split('T')[0]
}) => {
  const [customerName, setCustomerName] = useState<string>(activeLoyaltyAccount?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(activeLoyaltyAccount?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(activeLoyaltyAccount?.customerEmail || '');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [preferredSection, setPreferredSection] = useState<'indoor' | 'outdoor' | 'vip' | 'any'>('any');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<string>(initialTimeSlot);
  const [date, setDate] = useState<string>(initialDate);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Mohon isi nama lengkap pemesan.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 8) {
      setErrorMsg('Mohon isi nomor telepon atau WhatsApp yang aktif.');
      return;
    }

    setIsSubmitting(true);
    try {
      const entry = await addToWaitlist({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || `${customerName.toLowerCase().replace(/\s+/g, '')}@guest.savour.co`,
        guestCount,
        preferredSection,
        preferredTimeSlot,
        date,
        specialRequests: specialRequests.trim(),
        loyaltyTier: activeLoyaltyAccount?.tier
      });

      setIsSubmitting(false);
      onSuccess(entry);
    } catch (err: any) {
      console.error('Failed to join waitlist:', err);
      setIsSubmitting(false);
      setErrorMsg('Terjadi kendala saat mendaftar antrean. Silakan coba kembali.');
    }
  };

  const estimatedWait = Math.max(10, activeQueueCount * 12 + 10);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border-t sm:border border-amber-900/40 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/60 border-b border-stone-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Goory Virtual Queue
            </div>
            <h2 className="text-xl font-display font-bold text-stone-100 flex items-center gap-2">
              Daftar Antrean Virtual (Waitlist)
            </h2>
            <p className="text-xs text-stone-400">
              Semua meja terisi penuh. Daftarkan diri Anda untuk otomatis dipanggil saat meja tersedia.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Waitlist Insights Banner */}
        <div className="bg-amber-950/30 border-b border-amber-900/30 px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Antrean saat ini: <strong>{activeQueueCount} kelompok</strong>
            </span>
          </div>
          <div className="text-stone-300">
            Perkiraan tunggu: <strong className="text-amber-400">~{estimatedWait} menit</strong>
          </div>
        </div>

        {/* VIP Loyalty Callout if active */}
        {activeLoyaltyAccount && (
          <div className="bg-stone-950/80 px-5 py-2.5 border-b border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>
                Member: <strong className="text-amber-300">{activeLoyaltyAccount.customerName}</strong> ({activeLoyaltyAccount.tier})
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
              VIP Priority Queue
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-stone-300 font-medium block mb-1">
                Nama Lengkap <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-stone-300 font-medium block mb-1">
                No. WhatsApp / Telepon <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+62 812-xxxx-xxxx"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-stone-300 font-medium block mb-1">
              Alamat Email (Untuk notifikasi meja siap)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Guests Count & Preferred Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-stone-300 font-medium block mb-1">
                Jumlah Tamu
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuestCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                      guestCount === num
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {num} Ppl
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-stone-300 font-medium block mb-1">
                Preferensi Area Meja
              </label>
              <select
                value={preferredSection}
                onChange={(e) => setPreferredSection(e.target.value as any)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="any">Mana Saja yang Kosong Duluan (Tercepat)</option>
                <option value="indoor">Indoor Main Dining (AC &amp; Mewah)</option>
                <option value="outdoor">Outdoor Terrace (Semi-Al Fresco)</option>
                <option value="vip">VIP Heritage Room</option>
              </select>
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-stone-300 font-medium block mb-1">
                Tanggal Bersantap
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-stone-300 font-medium block mb-1">
                Perkiraan Jam Datang
              </label>
              <select
                value={preferredTimeSlot}
                onChange={(e) => setPreferredTimeSlot(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="text-stone-300 font-medium block mb-1">
              Catatan / Permintaan Khusus (Opsional)
            </label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Contoh: Butuh baby chair, dekat colokan, merayakan anniversary..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Queue Policy Info */}
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/80 text-[11px] text-stone-400 space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-amber-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Notifikasi Otomatis Real-Time:
            </p>
            <p>
              Saat meja Anda siap, sistem akan langsung mengirimkan peringatan dan bunyi bel di browser Anda serta konfirmasi ke WhatsApp Anda. Batas waktu kedatangan setelah dipanggil adalah <strong>15 menit</strong>.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-white font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses Antrean...</span>
              ) : (
                <>
                  <span>Ambil Nomor Antrean</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
