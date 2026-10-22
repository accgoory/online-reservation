import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  X, 
  Search, 
  Flame, 
  Sparkles, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { MenuItem } from '../types/menu';
import { subscribeToMenuItems } from '../services/menuService';

interface DigitalMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDishForReservation?: (dish: MenuItem) => void;
}

export const DigitalMenuModal: React.FC<DigitalMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectDishForReservation
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToMenuItems((items) => {
      setMenuItems(items);
    });
    return () => unsubscribe();
  }, [isOpen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-800 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <ChefHat className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-stone-100 text-lg sm:text-xl">
                  Buku Menu Kuliner Goory Coffee &amp; Eatery
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Live Stock
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Koleksi santap malam fine dining kurasi Executive Chef. Ketersediaan porsi selalu terhubung secara real-time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer font-medium ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Semua Menu
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer font-medium ${
                  selectedCategory === c
                    ? 'bg-amber-600 text-stone-950 font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari menu, rasa, bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Menu Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredItems.length === 0 ? (
            <div className="py-20 text-center text-stone-500 text-xs">
              Tidak ada hidangan yang cocok dengan filter atau pencarian Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3 flex gap-3.5 transition-all ${
                    item.isAvailable
                      ? 'bg-stone-950/60 border-stone-800 hover:border-amber-500/40'
                      : 'bg-stone-950/30 border-stone-900 opacity-60'
                  }`}
                >
                  {/* Photo */}
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-stone-900">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover ${!item.isAvailable ? 'grayscale-[80%]' : ''}`}
                    />
                    {item.isChefSpecial && (
                      <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-amber-500/90 text-stone-950 shadow-xs" title="Chef's Special">
                        <Flame className="w-3 h-3 fill-stone-950" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-display font-bold text-stone-100 text-sm leading-tight">
                          {item.name}
                        </h4>
                        <span className="font-mono font-bold text-amber-400 text-xs whitespace-nowrap">
                          Rp {item.price.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 text-[10px]">
                      <span className="text-stone-400">{item.category}</span>

                      {/* Stock availability badge */}
                      {item.isAvailable ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Siap Dipesan</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>Habis Hari Ini</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>*Seluruh hidangan disiapkan dengan bahan premium berkualitas bintang 5.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold cursor-pointer"
          >
            Tutup Buku Menu
          </button>
        </div>

      </div>
    </div>
  );
};
