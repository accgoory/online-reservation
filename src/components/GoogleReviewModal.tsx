import React, { useState } from 'react';
import { 
  Star, 
  X, 
  Check, 
  Sparkles, 
  ExternalLink, 
  MessageSquare, 
  Gift, 
  Heart,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitCustomerReview } from '../services/restaurantService';
import { Reservation } from '../types/restaurant';
import { playChime } from '../utils/audio';

interface GoogleReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation | null;
  onSubmitted?: () => void;
}

export const GoogleReviewModal: React.FC<GoogleReviewModalProps> = ({
  isOpen,
  onClose,
  reservation,
  onSubmitted
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Suasana & Musik Elegan 🍷',
    'Proses Reservasi Cepat ⚡'
  ]);
  const [hasOpenedGoogle, setHasOpenedGoogle] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const tagsList = [
    'Suasana & Musik Elegan 🍷',
    'Makanan Lezat & Fresh 🥩',
    'Pelayanan Ramah & Sigap 🛎️',
    'Proses Reservasi Cepat ⚡',
    'Spot Foto Estetik 📸',
    'Parkir & Akses Mudah 🚗'
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 5: return 'Luar Biasa Memuaskan! ⭐⭐⭐⭐⭐';
      case 4: return 'Sangat Baik & Nyaman ⭐⭐⭐⭐';
      case 3: return 'Cukup Baik ⭐⭐⭐';
      case 2: return 'Perlu Peningkatan ⭐⭐';
      case 1: return 'Kurang Memuaskan ⭐';
      default: return '';
    }
  };

  const handleOpenGoogleMaps = () => {
    setHasOpenedGoogle(true);
    // Open Google Review / Maps query
    const googleReviewUrl = 'https://www.google.com/search?q=Goory+Coffee+%26+Eatery+review';
    window.open(googleReviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitCustomerReview({
        reservationId: reservation?.id,
        customerName: reservation?.customerName || 'Tamu Terhormat',
        rating,
        reviewText: reviewText.trim(),
        tags: selectedTags,
        postedToGoogle: hasOpenedGoogle
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      playChime('payment');

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onSubmitted) {
        onSubmitted();
      }

      setTimeout(() => {
        onClose();
      }, 3500);

    } catch (err) {
      console.error('Review submit error:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-stone-900 border-t sm:border border-amber-900/40 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Reviews Badge Header */}
        <div className="text-center space-y-2">
          {/* Authentic Google Multi-Color SVG Logo */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-stone-900 text-xs font-bold shadow-md">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Google Reviews Rating</span>
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold text-stone-100">
            Beri Rating &amp; Review di Google
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Terima kasih telah melakukan reservasi &amp; pembayaran di <strong className="text-amber-300">Goory Coffee &amp; Eatery</strong>. Ulasan Anda sangat berharga bagi kami!
          </p>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="bg-emerald-950/40 border border-emerald-500/50 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-stone-950 font-black flex items-center justify-center mx-auto text-xl shadow-lg shadow-emerald-500/40">
              ✓
            </div>
            <h4 className="font-bold text-emerald-200 text-base">
              Terima Kasih atas Ulasan Anda!
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed max-w-xs mx-auto">
              Rating {rating} bintang Anda telah tersimpan. Dapatkan <strong className="text-amber-300">Complimentary Welcome Drink</strong> saat check-in di meja restoran!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            
            {/* Interactive 5-Star Selector */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-center space-y-2">
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeStar = hoverRating || rating;
                  const isFilled = star <= activeStar;

                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 sm:p-2 transition-transform hover:scale-125 cursor-pointer focus:outline-hidden"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-stone-700 hover:text-stone-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-semibold text-amber-300 font-mono block">
                {getRatingLabel(hoverRating || rating)}
              </span>
            </div>

            {/* Quick Feedback Highlight Chips */}
            <div>
              <label className="text-xs text-stone-400 block mb-2 font-medium">
                Apa yang paling Anda sukai? (Pilih satu atau lebih):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/80 font-semibold'
                          : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Review Comment Box */}
            <div>
              <label className="text-xs text-stone-400 block mb-1 font-medium">
                Pesan atau Komentar Ulasan (Opsional):
              </label>
              <textarea
                rows={2}
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Ceritakan kesan Anda tentang kemudahan booking, pilihan meja, atau hidangan yang ingin dinikmati..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Official Google Maps Review Button */}
            <div className="p-3 bg-stone-950/90 rounded-2xl border border-stone-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-stone-200 block">
                    Posting Langsung di Google Maps
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Bantu pengunjung lain menemukan Goory Coffee &amp; Eatery
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Buka Google
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Nanti Saja
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan Ulasan...' : 'Kirim Rating & Dapatkan Reward'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
