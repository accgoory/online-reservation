import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  CreditCard, 
  Sparkles,
  Utensils,
  Star,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { Reservation } from '../types/restaurant';
import { GoogleReviewModal } from './GoogleReviewModal';

interface TicketPassModalProps {
  reservation: Reservation;
  onClose: () => void;
  autoOpenReview?: boolean;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  reservation,
  onClose,
  autoOpenReview = false
}) => {
  const [showGoogleReviewModal, setShowGoogleReviewModal] = useState<boolean>(autoOpenReview);
  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo! Ini bukti reservasi bersantap di Goory Coffee & Eatery:\n` +
      `Kode Booking: ${reservation.bookingCode}\n` +
      `Meja: ${reservation.tableName} (${reservation.tableSection})\n` +
      `Tanggal: ${reservation.date} jam ${reservation.timeSlot} WIB\n` +
      `Atas Nama: ${reservation.customerName} (${reservation.guestsCount} Tamu)\n` +
      `Status: Terkonfirmasi (Deposit Rp ${reservation.depositAmount.toLocaleString('id-ID')} Lunas)`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border-t sm:border border-amber-900/40 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Modal Top Actions */}
        <div className="no-print bg-stone-950 p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-emerald-300 uppercase tracking-wider">
              E-Tiket Reservasi Resmi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl bg-stone-800 hover:bg-emerald-950 text-stone-300 hover:text-emerald-400 border border-stone-700 transition-colors"
              title="Bagikan ke WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-stone-800 hover:bg-amber-950 text-stone-300 hover:text-amber-400 border border-stone-700 transition-colors"
              title="Cetak E-Tiket"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Pass Body (Luxury Boarding Pass Ticket Aesthetic) */}
        <div className="p-5 sm:p-7 space-y-6 bg-stone-900 text-stone-100 overflow-y-auto flex-1">
          
          {/* Header Ticket Section */}
          <div className="text-center pb-5 border-b border-dashed border-stone-700">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Goory Coffee &amp; Eatery Pass
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-amber-200">
              {reservation.tableName}
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              {reservation.tableSection} • Acara: {reservation.occasion}
            </p>
          </div>

          {/* Booking Code Barcode Banner */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-mono tracking-widest block">
                Kode Booking Unik
              </span>
              <span className="text-2xl font-black font-mono tracking-wider text-amber-400">
                {reservation.bookingCode}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  reservation.status === 'arrived'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : reservation.status === 'seated'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {reservation.status === 'arrived'
                    ? '✓ Tamu Telah Tiba'
                    : reservation.status === 'seated'
                    ? '✓ Sedang Bersantap'
                    : 'Terkonfirmasi'}
                </span>
                <span className="text-[10px] text-stone-500">Scan di Resepsionis</span>
              </div>
            </div>

            {/* Real scannable pass QR code for reception desk check-in */}
            <div className="bg-white p-1.5 rounded-xl shadow-lg border border-white/20 shrink-0 text-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(reservation.bookingCode)}&bgcolor=ffffff&color=0a0a0a&margin=2`}
                alt={`QR Pass ${reservation.bookingCode}`}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded"
                loading="eager"
              />
              <span className="text-[8px] font-mono text-stone-700 block mt-0.5 font-bold">
                E-PASS
              </span>
            </div>
          </div>

          {/* Payment Status & WhatsApp Confirmation Card */}
          <div className="bg-[#18261e] p-4 rounded-2xl border border-[#354c3e] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  reservation.paymentStatus === 'waiting_verification'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {reservation.paymentStatus === 'waiting_verification' ? (
                    <Clock className="w-5 h-5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#8ea598] uppercase font-mono tracking-wider">
                      Status Deposit:
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      reservation.paymentStatus === 'waiting_verification'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {reservation.paymentStatus === 'waiting_verification'
                        ? 'Menunggu Verifikasi Kasir'
                        : 'Lunas Terverifikasi'}
                    </span>
                  </div>
                  <p className="text-xs text-[#d6e3dc] font-mono mt-0.5">
                    Nominal: <strong className="text-amber-300 font-bold">Rp {reservation.depositAmount.toLocaleString('id-ID')}</strong> • Metode: <strong className="uppercase">{reservation.paymentMethod || 'QRIS'}</strong>
                  </p>
                </div>
              </div>

              {/* Direct WhatsApp Confirmation Button */}
              <a
                href={`https://wa.me/6289661315457?text=${encodeURIComponent(
                  `Halo Goory Coffee & Eatery, saya telah melakukan pembayaran deposit reservasi:\n• Kode Booking: ${reservation.bookingCode}\n• Nama: ${reservation.customerName}\n• Meja: ${reservation.tableName} (${reservation.date} jam ${reservation.timeSlot} WIB)\n• Nominal: Rp ${reservation.depositAmount.toLocaleString('id-ID')}\nMohon bantuannya untuk verifikasi. Terima kasih!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-semibold transition-all hover:scale-[1.02] shadow-xs cursor-pointer shrink-0"
                title="Kirim konfirmasi ke WhatsApp Kasir Goory Coffee"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Konfirmasi via WhatsApp</span>
              </a>
            </div>

            {reservation.paymentStatus === 'waiting_verification' && (
              <p className="text-[11px] text-amber-200/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                ℹ️ Konfirmasi pembayaran Anda telah tercatat di sistem. Kasir kami akan segera memverifikasi mutasi bank/QRIS Anda. Anda juga dapat mengirimkan konfirmasi instan via WhatsApp di atas.
              </p>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Tanggal Kunjungan
              </span>
              <span className="font-bold text-stone-200 text-sm block">
                {reservation.date}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Waktu Kedatangan
              </span>
              <span className="font-bold text-stone-200 text-sm block">
                {reservation.timeSlot} WIB
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Jumlah Tamu
              </span>
              <span className="font-bold text-stone-200 text-sm block">
                {reservation.guestsCount} Orang
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                Nama Pemesan
              </span>
              <span className="font-bold text-stone-200 text-sm block truncate">
                {reservation.customerName}
              </span>
            </div>
          </div>

          {/* Payment Status Receipt Pill */}
          <div className="bg-emerald-950/30 border border-emerald-800/40 p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-200 block">
                  Deposit Telah Dibayar (Rp {reservation.depositAmount.toLocaleString('id-ID')})
                </span>
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  Metode: {reservation.paymentMethod?.toUpperCase() || 'QRIS DIGITAL'} • {reservation.paymentReference || 'LUNAS'}
                </span>
              </div>
            </div>
          </div>

          {/* Goory Points Loyalty Badge */}
          <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                ⭐
              </div>
              <div>
                <span className="font-bold text-amber-300 block">
                  +{reservation.pointsEarned || 150} Goory Points Didapat!
                </span>
                <span className="text-[11px] text-stone-400">
                  {reservation.pointsDiscountAmount && reservation.pointsDiscountAmount > 0
                    ? `Hemat Rp ${reservation.pointsDiscountAmount.toLocaleString('id-ID')} dengan ${reservation.pointsRedeemed} Pts • Poin baru masuk ke saldo`
                    : 'Poin otomatis ditambahkan ke akun Goory Club Anda'}
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
              LOYALTY REWARD
            </span>
          </div>

          {/* Google Review Rating Access Card */}
          <div className="no-print bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 rounded-2xl border border-amber-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Official Google multi-color SVG icon */}
                <div className="w-6 h-6 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-200 block">
                    Beri Ulasan di Google Reviews
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Goory Coffee &amp; Eatery • Google Rating
                  </span>
                </div>
              </div>
              
              <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Bonus Hadiah
              </span>
            </div>

            <p className="text-[11px] text-stone-300 leading-relaxed">
              Bagikan pengalaman reservasi Anda dan dapatkan <strong className="text-amber-300">Complimentary Welcome Drink</strong> saat tiba di restoran.
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShowGoogleReviewModal(true)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    title={`Beri rating ${s} bintang`}
                  >
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleReviewModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-600/20"
              >
                Rating Google
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reception Check-In Note */}
          <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 text-[11px] text-stone-400 text-center leading-relaxed">
            💡 Tunjukkan kode booking atau tiket ini ke meja resepsionis saat tiba di restoran. Meja Anda akan dipersiapkan 15 menit sebelum waktu reservasi.
          </div>

        </div>

        {/* Modal Footer CTA */}
        <div className="no-print p-4 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm transition-colors cursor-pointer"
          >
            Selesai &amp; Simpan Tiket
          </button>
        </div>

      </div>

      {/* Embedded Google Review Modal */}
      <GoogleReviewModal
        isOpen={showGoogleReviewModal}
        onClose={() => setShowGoogleReviewModal(false)}
        reservation={reservation}
      />
    </div>
  );
};
