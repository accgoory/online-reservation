import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Search, 
  Sparkles, 
  Flame, 
  Clock, 
  ChefHat, 
  CalendarCheck,
  CheckCircle2, 
  AlertCircle,
  Filter,
  X
} from 'lucide-react';
import { MenuItem } from '../types/menu';
import { subscribeToMenuItems } from '../services/menuService';

interface GuestMenuViewProps {
  onGoToBooking: () => void;
}

export const GuestMenuView: React.FC<GuestMenuViewProps> = ({ onGoToBooking }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToMenuItems((items) => {
      setMenuItems(items);
    });
    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const list = Array.from(new Set(menuItems.map(item => item.category)));
    return ['Semua', ...list];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAvail = !onlyAvailable || item.isAvailable;
      return matchCat && matchQuery && matchAvail;
    });
  }, [menuItems, selectedCategory, searchQuery, onlyAvailable]);

  const availableCount = menuItems.filter(i => i.isAvailable).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Mobile-Friendly Banner & Introduction */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-500/35 bg-gradient-to-br from-[#18261f] via-[#21342a] to-[#18261f] p-5 sm:p-8 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <ChefHat className="w-3.5 h-3.5 text-amber-400" />
            Kurasi Kuliner Goory Coffee &amp; Eatery
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#fdfbf7] tracking-tight">
                Buku Menu &amp; Cita Rasa Pilihan
              </h2>
              <p className="text-xs sm:text-sm text-[#dce7e1] mt-1 max-w-xl font-light leading-relaxed">
                Jelajahi sajian kuliner istimewa dengan ketersediaan stok porsi secara langsung dari dapur kami.
              </p>
            </div>
            <button
              onClick={onGoToBooking}
              className="min-h-[44px] self-start sm:self-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/30 cursor-pointer flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shrink-0"
            >
              <CalendarCheck className="w-4 h-4 text-stone-950" />
              <span>Reservasi Meja Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Quick Filters (Thumb Friendly) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#a7bdaf] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari hidangan, daging, pasta, kopi..."
              className="w-full min-h-[44px] bg-[#1a2720]/95 border border-[#384e40] focus:border-amber-400 text-[#fcfbf9] placeholder:text-[#9bb1a4] pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm outline-hidden transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a7bdaf] hover:text-white cursor-pointer p-1"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Availability Toggle */}
          <button
            type="button"
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 ${
              onlyAvailable
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-sm'
                : 'bg-[#192720]/95 border-[#384e40] text-[#d6e3dc] hover:border-amber-400/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tersedia Saja ({availableCount})</span>
          </button>
        </div>

        {/* Category Pills (Touch Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 border-amber-300 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                    : 'bg-[#192720]/95 border-[#384e40] text-[#d6e3dc] hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-[#18261e]/90 rounded-2xl border border-[#354c3e] p-6 space-y-3">
          <UtensilsCrossed className="w-10 h-10 text-[#7c9587] mx-auto" />
          <h3 className="text-base font-bold text-[#fcfbf9]">Tidak ada menu yang cocok</h3>
          <p className="text-xs text-[#b8c9bf] max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat pilihan hidangan lainnya.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
              setOnlyAvailable(false);
            }}
            className="px-4 py-2 rounded-xl bg-[#22352b] hover:bg-[#2c4337] text-[#fcfbf9] text-xs font-semibold cursor-pointer border border-[#415a4b]"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((item) => {
            return (
              <div 
                key={item.id}
                className="group relative rounded-2xl overflow-hidden bg-[#18261e]/95 border border-[#354c3e] hover:border-amber-400/50 transition-all duration-300 flex flex-col shadow-xl hover:shadow-2xl"
              >
                {/* Photo & Badges */}
                <div className="relative aspect-16/10 overflow-hidden bg-[#121c16]">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#18261e] via-[#18261e]/20 to-transparent" />
                  
                  {/* Category Pill Top-Left */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#142019]/85 backdrop-blur-md text-[#d6e3dc] border border-[#394f42] shadow-sm">
                      {item.category}
                    </span>
                    {item.isChefSpecial && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md shadow-amber-500/30">
                        <Flame className="w-3 h-3 fill-stone-950" />
                        Chef's Special
                      </span>
                    )}
                  </div>

                  {/* Stock Status Badge Top-Right */}
                  <div className="absolute top-3 right-3">
                    {item.isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 shadow-sm backdrop-blur-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Tersedia
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 border border-rose-500/60 text-rose-300 shadow-sm backdrop-blur-md animate-pulse">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        Stok Habis
                      </span>
                    )}
                  </div>

                  {/* Price overlay at bottom */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <span className="text-base sm:text-lg font-extrabold text-amber-300 font-mono tracking-tight drop-shadow-md">
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>
                    {item.prepTimeMinutes && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#e0ece5] bg-[#142019]/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#364c3e]">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {item.prepTimeMinutes} mnt
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#fcfbf9] group-hover:text-amber-200 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#c2d3ca] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Booking CTA Button */}
                  <div className="pt-2 border-t border-[#344b3e] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#a7bdaf]">
                      {item.isAvailable ? 'Siap dipesan untuk santap di tempat' : 'Porsi harian telah habis terjual'}
                    </span>
                    <button
                      type="button"
                      onClick={onGoToBooking}
                      disabled={!item.isAvailable}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        item.isAvailable
                          ? 'bg-amber-500/15 hover:bg-amber-400 text-amber-300 hover:text-stone-950 border border-amber-500/40'
                          : 'bg-[#142019]/60 text-[#698073] border border-[#27382e] cursor-not-allowed'
                      }`}
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Pesan Meja</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Quick Action for Mobile */}
      <div className="pt-4 text-center">
        <p className="text-xs text-[#b8c9bf]">
          Ketersediaan menu dan harga sewaktu-waktu dapat berubah mengikuti ketersediaan bahan segar terbaik harian.
        </p>
      </div>

    </div>
  );
};
