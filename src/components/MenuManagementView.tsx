import React, { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle, 
  ToggleLeft, 
  ToggleRight, 
  Crown, 
  Lock, 
  RotateCcw, 
  Clock, 
  Tag, 
  DollarSign, 
  Flame, 
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { MenuItem, MenuCategory } from '../types/menu';
import { 
  subscribeToMenuItems, 
  toggleMenuItemStock, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  resetMenuToDefaults 
} from '../services/menuService';
import { PRESET_GOURMET_PHOTOS } from '../data/defaultMenu';
import { playChime } from '../utils/audio';

interface MenuManagementViewProps {
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
}

export const MenuManagementView: React.FC<MenuManagementViewProps> = ({
  isAdmin,
  onOpenAdminLogin
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStockToggling, setIsStockToggling] = useState<Record<string, boolean>>({});

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Form states for Add/Edit
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Signature Steaks & Mains');
  const [formCustomCategory, setFormCustomCategory] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(150000);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>(PRESET_GOURMET_PHOTOS[0].url);
  const [formIsAvailable, setFormIsAvailable] = useState<boolean>(true);
  const [formIsChefSpecial, setFormIsChefSpecial] = useState<boolean>(false);
  const [formPrepTime, setFormPrepTime] = useState<number>(15);
  const [formDietaryTags, setFormDietaryTags] = useState<string[]>(['Halal']);

  // Subscribe to real-time menu items
  useEffect(() => {
    const unsubscribe = subscribeToMenuItems((items) => {
      setMenuItems(items);
    });
    return () => unsubscribe();
  }, []);

  // Compute available unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [menuItems]);

  // Filtered menu items
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

  // Statistics
  const totalItems = menuItems.length;
  const availableItemsCount = menuItems.filter((i) => i.isAvailable).length;
  const soldOutItemsCount = totalItems - availableItemsCount;
  const chefSpecialsCount = menuItems.filter((i) => i.isChefSpecial).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Toggle stock handler
  const handleToggleStock = async (item: MenuItem) => {
    if (!isAdmin) {
      onOpenAdminLogin();
      return;
    }

    setIsStockToggling((prev) => ({ ...prev, [item.id]: true }));
    try {
      const newStatus = await toggleMenuItemStock(item.id, item.isAvailable);
      playChime(newStatus ? 'success' : 'ding');
      showToast(`${item.name} kini ditandai: ${newStatus ? 'Tersedia' : 'Habis (Sold Out)'}`);
    } catch (err) {
      console.error('Failed to toggle stock:', err);
    } finally {
      setIsStockToggling((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Open modal for new item
  const handleOpenAdd = () => {
    setFormName('');
    setFormCategory(categories[0] || 'Signature Steaks & Mains');
    setFormCustomCategory('');
    setFormPrice(150000);
    setFormDescription('');
    setFormImageUrl(PRESET_GOURMET_PHOTOS[0].url);
    setFormIsAvailable(true);
    setFormIsChefSpecial(false);
    setFormPrepTime(15);
    setFormDietaryTags(['Halal']);
    setShowAddModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormCustomCategory('');
    setFormPrice(item.price);
    setFormDescription(item.description);
    setFormImageUrl(item.imageUrl);
    setFormIsAvailable(item.isAvailable);
    setFormIsChefSpecial(item.isChefSpecial);
    setFormPrepTime(item.prepTimeMinutes || 15);
    setFormDietaryTags(item.dietaryTags || []);
  };

  // Save Add
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formCategory === '__custom__' && formCustomCategory.trim() 
      ? formCustomCategory.trim() 
      : formCategory;

    await createMenuItem({
      name: formName,
      category: finalCategory,
      price: formPrice,
      description: formDescription,
      imageUrl: formImageUrl,
      isAvailable: formIsAvailable,
      isChefSpecial: formIsChefSpecial,
      prepTimeMinutes: formPrepTime,
      dietaryTags: formDietaryTags
    });

    setShowAddModal(false);
    playChime('success');
    showToast(`Hidangan "${formName}" berhasil ditambahkan ke menu!`);
  };

  // Save Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const finalCategory = formCategory === '__custom__' && formCustomCategory.trim() 
      ? formCustomCategory.trim() 
      : formCategory;

    await updateMenuItem(editingItem.id, {
      name: formName,
      category: finalCategory,
      price: formPrice,
      description: formDescription,
      imageUrl: formImageUrl,
      isAvailable: formIsAvailable,
      isChefSpecial: formIsChefSpecial,
      prepTimeMinutes: formPrepTime,
      dietaryTags: formDietaryTags
    });

    setEditingItem(null);
    playChime('success');
    showToast(`Perubahan menu "${formName}" berhasil disimpan!`);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    await deleteMenuItem(deletingItem.id);
    setDeletingItem(null);
    playChime('ding');
    showToast(`Menu berhasil dihapus.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 border border-amber-500/50 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-900/90 to-amber-950/40 border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-stone-100 text-xl">
                  Manajemen Menu &amp; Stok Real-Time
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Live Synchronized
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Atur nama hidangan, harga, kategori kuliner, dan ubah status stok secara seketika untuk POS dan katalog tamu.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Tambah Menu Baru</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (confirm('Kembalikan daftar menu ke preset gourmet awal Goory Coffee & Eatery?')) {
                    await resetMenuToDefaults();
                    showToast('Menu berhasil direset ke standar kuliner Goory Coffee & Eatery.');
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset daftar menu ke contoh standar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Contoh</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="py-2 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Login Admin untuk Edit Menu</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-mono">Total Menu</div>
            <div className="text-xl font-display font-bold text-stone-100 font-mono mt-0.5">{totalItems}</div>
          </div>
          <div className="p-2 rounded-xl bg-stone-800 text-stone-300">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-mono">Stok Tersedia</div>
            <div className="text-xl font-display font-bold text-emerald-400 font-mono mt-0.5">{availableItemsCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-mono">Stok Habis (Sold Out)</div>
            <div className="text-xl font-display font-bold text-rose-400 font-mono mt-0.5">{soldOutItemsCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-stone-400 uppercase tracking-wider font-mono">Chef's Special</div>
            <div className="text-xl font-display font-bold text-amber-400 font-mono mt-0.5">{chefSpecialsCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer font-medium ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-md shadow-amber-600/20'
                  : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Semua Kategori ({totalItems})
            </button>
            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer font-medium ${
                    selectedCategory === cat
                      ? 'bg-amber-600 text-stone-950 font-bold shadow-md shadow-amber-600/20'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari nama hidangan, bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            Tidak ada item hidangan yang sesuai dengan filter atau kata kunci pencarian.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
            {filteredItems.map((item) => {
              const isToggling = isStockToggling[item.id];

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    item.isAvailable
                      ? 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                      : 'bg-stone-950/40 border-stone-900 opacity-75'
                  }`}
                >
                  <div>
                    {/* Image with status badge */}
                    <div className="relative h-44 w-full overflow-hidden bg-stone-900">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
                          !item.isAvailable ? 'grayscale-[60%]' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />

                      {/* Chef's special badge */}
                      {item.isChefSpecial && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-amber-500/90 backdrop-blur-xs text-stone-950 font-bold text-[10px] flex items-center gap-1 shadow-md">
                          <Flame className="w-3 h-3 fill-stone-950" />
                          <span>Chef's Choice</span>
                        </div>
                      )}

                      {/* Stock availability indicator pill */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono border backdrop-blur-xs flex items-center gap-1.5 ${
                          item.isAvailable
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span>{item.isAvailable ? 'Tersedia' : 'Habis (Sold Out)'}</span>
                        </span>
                      </div>

                      {/* Category label */}
                      <div className="absolute bottom-3 left-3 text-[11px] text-stone-300 font-medium">
                        {item.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display font-bold text-stone-100 text-sm leading-snug">
                          {item.name}
                        </h4>
                        <div className="font-mono font-bold text-amber-400 text-sm whitespace-nowrap">
                          Rp {item.price.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Dietary tags */}
                      {item.dietaryTags && item.dietaryTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {item.dietaryTags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-800"
                            >
                              {t}
                            </span>
                          ))}
                          {item.prepTimeMinutes && (
                            <span className="text-[10px] text-stone-400 flex items-center gap-1 ml-auto">
                              <Clock className="w-3 h-3" />
                              <span>{item.prepTimeMinutes}m</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Controls: Sakelar Toggle Cepat & Edit */}
                  <div className="p-3 bg-stone-900/60 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    
                    {/* Live Stock Toggle Button */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleStock(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        item.isAvailable
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                      title="Klik untuk mengubah ketersediaan stok seketika"
                    >
                      {item.isAvailable ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                          <span>Stok: Tersedia</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-rose-400" />
                          <span>Stok: Habis</span>
                        </>
                      )}
                    </button>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Edit rincian hidangan & harga"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="p-2 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus hidangan dari menu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Tambah / Edit Hidangan */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <form
            onSubmit={editingItem ? handleSubmitEdit : handleSubmitAdd}
            className="bg-stone-900 border border-stone-800 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-stone-100 text-base">
                  {editingItem ? 'Edit Rincian Menu' : 'Tambah Hidangan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Nama Item */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Nama Hidangan / Minuman:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Truffle Wagyu Tagliatelle"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Kategori Dinamis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Kategori Menu:
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__custom__">+ Tambah Kategori Baru...</option>
                  </select>
                </div>

                {formCategory === '__custom__' && (
                  <div>
                    <label className="block text-amber-400 font-semibold mb-1">
                      Nama Kategori Baru:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: Seafood Special"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="w-full bg-stone-950 border border-amber-500/50 rounded-xl px-3.5 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Harga Jual (IDR):
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Deskripsi Cita Rasa &amp; Bahan Baku:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jelaskan aroma, tekstur, dan bahan baku utama hidangan..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-hidden focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Foto Menu & Preset Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-300 font-semibold">
                    URL Foto Hidangan:
                  </label>
                  <span className="text-[11px] text-stone-400">Atau pilih preset gourmet di bawah</span>
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 text-xs focus:outline-hidden focus:border-amber-500"
                />

                {/* Preset Gourmet Thumbnails */}
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {PRESET_GOURMET_PHOTOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormImageUrl(preset.url)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border transition-all cursor-pointer ${
                        formImageUrl === preset.url
                          ? 'border-amber-400 ring-2 ring-amber-400/30'
                          : 'border-stone-800 opacity-60 hover:opacity-100'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Stok Awal & Badge Koki */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-stone-700 bg-stone-900"
                  />
                  <div>
                    <span className="block font-semibold text-stone-200">Ketersediaan Stok</span>
                    <span className="text-[10px] text-stone-400">
                      {formIsAvailable ? 'Tersedia untuk dipesan' : 'Stok sedang kosong'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsChefSpecial}
                    onChange={(e) => setFormIsChefSpecial(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-stone-700 bg-stone-900"
                  />
                  <div>
                    <span className="block font-semibold text-stone-200">Chef's Special Badge</span>
                    <span className="text-[10px] text-stone-400">Tampilkan pin rekomendasi koki</span>
                  </div>
                </label>
              </div>

              {/* Prep time & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Estimasi Masak (Menit):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Label Diet / Ciri Khas:
                  </label>
                  <input
                    type="text"
                    placeholder="Pisahkan koma (e.g. Halal, Gluten Free)"
                    value={formDietaryTags.join(', ')}
                    onChange={(e) => setFormDietaryTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="py-2.5 px-4 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md shadow-amber-600/30 cursor-pointer"
              >
                {editingItem ? 'Simpan Perubahan' : 'Simpan Hidangan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION MODAL: Hapus Menu */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-100 text-base">Hapus Hidangan Ini?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Menu <strong className="text-stone-200">{deletingItem.name}</strong> akan dihapus dari daftar katalog aplikasi.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-950 font-bold text-xs shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
