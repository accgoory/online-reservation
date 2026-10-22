import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Tag, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Flame, 
  Percent, 
  Coffee,
  Check,
  CheckCircle2,
  Utensils
} from 'lucide-react';
import { MenuItem } from '../types/menu';
import { subscribeToMenuItems } from '../services/menuService';
import { INITIAL_MENU_ITEMS } from '../data/defaultMenu';

interface HeroSeasonalPromotionsProps {
  onOpenMenu?: () => void;
  onSelectItem?: (item: MenuItem) => void;
}

export const HeroSeasonalPromotions: React.FC<HeroSeasonalPromotionsProps> = ({
  onOpenMenu,
  onSelectItem
}) => {
  const [promoItems, setPromoItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToMenuItems((items) => {
      // Filter for seasonal promotions or items with explicit discounts
      let filtered = items.filter(
        item => item.isSeasonalPromo || (item.discountPercent && item.discountPercent > 0)
      );

      // If Firestore or local cache hasn't loaded promotional flags yet, merge fallback default promos
      if (filtered.length === 0) {
        const defaultPromos = INITIAL_MENU_ITEMS.filter(
          item => item.isSeasonalPromo || (item.discountPercent && item.discountPercent > 0)
        );
        filtered = defaultPromos.length > 0 ? defaultPromos : items.slice(0, 4);
      }

      setPromoItems(filtered);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading && promoItems.length === 0) {
    return null;
  }

  if (promoItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4 sm:mt-5 pt-3 border-t border-amber-500/20">
      {/* Promotion Section Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-display font-bold text-[#fcfbf9] tracking-wide">
                Penawaran Spesial &amp; Menu Musiman
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/35 text-[10px] font-semibold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Stock Firestore
              </span>
            </div>
            <p className="text-[11px] text-[#b8c9bf]">
              Nikmati racikan kopi artisan &amp; hidangan pilihan dengan harga promo eksklusif
            </p>
          </div>
        </div>

        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="self-start sm:self-center text-xs text-amber-300 hover:text-amber-200 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer group"
          >
            <span>Semua Menu Promo</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Floating Card Deck (Horizontal scroll on mobile, responsive grid on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {promoItems.slice(0, 4).map((item) => {
          const discountPercent = item.discountPercent || (
            item.originalPrice && item.originalPrice > item.price
              ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
              : null
          );

          return (
            <div
              key={item.id}
              className="group relative bg-[#15231b]/95 hover:bg-[#192b21] backdrop-blur-md rounded-2xl border border-amber-500/25 hover:border-amber-400/50 p-3 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40"
            >
              <div>
                {/* Photo with Overlay Badges */}
                <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-black/40 mb-2.5">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {discountPercent && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-black text-[10px] tracking-wide shadow-md flex items-center gap-0.5">
                        <Percent className="w-2.5 h-2.5 stroke-[3]" />
                        Hemat {discountPercent}%
                      </span>
                    )}
                    {item.isChefSpecial && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-stone-950 font-bold text-[9px] shadow-sm">
                        Chef Pick
                      </span>
                    )}
                  </div>

                  {/* Availability Badge */}
                  <div className="absolute bottom-2 right-2">
                    {item.isAvailable ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 backdrop-blur-xs border border-emerald-500/40 text-[9px] text-emerald-300 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Tersedia
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/80 backdrop-blur-xs border border-rose-500/40 text-[9px] text-rose-300 font-semibold">
                        Habis
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Tag */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 font-medium">
                    <Coffee className="w-3 h-3" />
                    <span>{item.category}</span>
                    {item.promoBadge && (
                      <>
                        <span>•</span>
                        <span className="text-amber-200 font-semibold">{item.promoBadge}</span>
                      </>
                    )}
                  </div>

                  <h5 className="text-xs sm:text-sm font-bold text-[#fcfbf9] line-clamp-1 group-hover:text-amber-200 transition-colors">
                    {item.name}
                  </h5>

                  <p className="text-[11px] text-[#b8c9bf] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Pricing & CTA */}
              <div className="pt-3 mt-2 border-t border-[#354c3e]/70 flex items-center justify-between gap-2">
                <div>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span className="block text-[10px] text-[#8ea598] line-through font-mono">
                      Rp {item.originalPrice.toLocaleString('id-ID')}
                    </span>
                  )}
                  <span className="text-sm font-bold font-mono text-amber-300">
                    Rp {item.price.toLocaleString('id-ID')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onSelectItem) {
                      onSelectItem(item);
                    } else if (onOpenMenu) {
                      onOpenMenu();
                    } else {
                      setSelectedPreviewItem(item);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 text-xs font-semibold border border-amber-500/40 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                >
                  <span>Pesan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Quick Preview Modal (if clicked) */}
      {selectedPreviewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18261e] border border-amber-500/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="relative aspect-video">
              <img
                src={selectedPreviewItem.imageUrl}
                alt={selectedPreviewItem.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewItem(null)}
                  className="w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">{selectedPreviewItem.category}</span>
                <span className="text-lg font-bold font-mono text-amber-300">
                  Rp {selectedPreviewItem.price.toLocaleString('id-ID')}
                </span>
              </div>
              <h4 className="text-lg font-bold text-white">{selectedPreviewItem.name}</h4>
              <p className="text-xs text-[#b8c9bf]">{selectedPreviewItem.description}</p>
              
              <div className="pt-3 border-t border-[#354c3e] flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewItem(null);
                    if (onOpenMenu) onOpenMenu();
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  Buka Buku Menu Lengkap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
