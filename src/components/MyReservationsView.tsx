import React, { useState } from 'react';
import { 
  Search, 
  Ticket, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  CreditCard, 
  Sparkles,
  QrCode,
  ArrowRight,
  Star
} from 'lucide-react';
import { Reservation, PaymentMethod } from '../types/restaurant';
import { TicketPassModal } from './TicketPassModal';
import { DigitalPaymentGateway } from './DigitalPaymentGateway';
import { GoogleReviewModal } from './GoogleReviewModal';

interface MyReservationsViewProps {
  reservations: Reservation[];
  onSelectBooking: (res: Reservation) => void;
}

export const MyReservationsView: React.FC<MyReservationsViewProps> = ({
  reservations,
  onSelectBooking
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTicket, setActiveTicket] = useState<Reservation | null>(null);
  const [paymentRes, setPaymentRes] = useState<Reservation | null>(null);
  const [reviewRes, setReviewRes] = useState<Reservation | null>(null);

  const matched = reservations.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.bookingCode.toLowerCase().includes(term) ||
      r.customerPhone.includes(term) ||
      r.customerEmail.toLowerCase().includes(term) ||
      r.customerName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
      
      {/* Header & Search */}
      <div className="bg-[#18261e]/95 border border-[#354c3e] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#fcfbf9] flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-amber-400" />
            Cek Tiket &amp; Status Reservasi Anda
          </h2>
          <p className="text-xs text-[#b8c9bf] mt-1">
            Masukkan kode booking unik (contoh: <code>SAV-8421</code>), nomor WhatsApp, atau email Anda untuk melihat status real-time meja.
          </p>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#8ea598]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Ketik Kode Booking (SAV-XXXX) atau No. WhatsApp..."
            className="w-full bg-[#131e18] border border-[#354c3e] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-[#fcfbf9] placeholder:text-[#8ea598] focus:outline-hidden focus:border-amber-400"
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {matched.length === 0 ? (
          <div className="bg-[#18261e]/80 border border-[#354c3e] rounded-2xl p-10 text-center text-[#9cb1a5] space-y-2">
            <Ticket className="w-10 h-10 mx-auto text-[#728b7e]" />
            <p className="text-sm font-semibold text-[#fcfbf9]">Tidak ada reservasi ditemukan</p>
            <p className="text-xs text-[#b8c9bf] max-w-sm mx-auto">
              Pastikan kode booking atau nomor handphone yang Anda masukkan sudah benar sesuai saat melakukan pemesanan.
            </p>
          </div>
        ) : (
          matched.map(res => {
            const isArrived = res.status === 'arrived';
            const isConfirmed = res.status === 'confirmed';
            const isSeated = res.status === 'seated';
            const isPending = res.status === 'pending_payment';

            return (
              <div
                key={res.id}
                className="bg-[#18261e]/95 border border-[#354c3e] hover:border-amber-400/50 rounded-2xl p-5 sm:p-6 transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-bold text-amber-300 bg-[#131e18] px-3 py-1 rounded-xl border border-[#354c3e]">
                      {res.bookingCode}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isArrived
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse'
                          : isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isSeated
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {isArrived
                        ? '✓ Telah Hadir (Siap Dipersilakan)'
                        : isConfirmed
                        ? 'Terkonfirmasi & Siap Datang'
                        : isSeated
                        ? 'Sedang Menikmati Santap'
                        : isPending
                        ? 'Menunggu Pembayaran Deposit'
                        : res.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-stone-100">
                      {res.tableName} ({res.tableSection})
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Atas Nama: <strong className="text-stone-200">{res.customerName}</strong> • {res.guestsCount} Tamu ({res.occasion})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
                    <span className="flex items-center gap-1.5 text-stone-400">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      {res.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-stone-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {res.timeSlot} WIB
                    </span>
                    <span className="font-mono text-emerald-400">
                      Deposit: Rp {res.depositAmount.toLocaleString('id-ID')} ({res.paymentStatus.toUpperCase()})
                    </span>
                    <span className="font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      +{res.pointsEarned || 150} Goory Pts
                    </span>
                    {res.pointsDiscountAmount && res.pointsDiscountAmount > 0 ? (
                      <span className="font-mono text-stone-400 text-[11px]">
                        (Hemat Rp {res.pointsDiscountAmount.toLocaleString('id-ID')} dgn {res.pointsRedeemed} Pts)
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTicket(res)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    Buka E-Tiket
                  </button>

                  <button
                    onClick={() => setReviewRes(res)}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Beri Rating di Google Reviews"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Rating Google
                  </button>

                  {isPending && (
                    <button
                      onClick={() => setPaymentRes(res)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      Bayar Sekarang
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ticket Modal */}
      {activeTicket && (
        <TicketPassModal
          reservation={activeTicket}
          onClose={() => setActiveTicket(null)}
        />
      )}

      {/* Google Review Rating Modal */}
      {reviewRes && (
        <GoogleReviewModal
          isOpen={Boolean(reviewRes)}
          onClose={() => setReviewRes(null)}
          reservation={reviewRes}
        />
      )}

      {/* Digital Payment Modal */}
      {paymentRes && (
        <DigitalPaymentGateway
          reservation={paymentRes}
          onPaymentSuccess={(id, method, ref) => {
            setPaymentRes(null);
            // Refresh
            const updated = matched.find(m => m.id === id);
            if (updated) {
              setActiveTicket({
                ...updated,
                paymentStatus: 'paid',
                paymentMethod: method,
                paymentReference: ref,
                status: 'confirmed'
              });
            }
          }}
          onCancel={() => setPaymentRes(null)}
        />
      )}

    </div>
  );
};
