import React, { useState, useRef, useEffect } from 'react';
import { 
  RestaurantTable, 
  TableStatus,
  TableSection
} from '../types/restaurant';
import { 
  Users, 
  Sparkles, 
  Check, 
  Clock, 
  MapPin, 
  Info,
  CalendarCheck,
  Move,
  Save,
  RotateCcw,
  Plus,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Lock,
  Crown
} from 'lucide-react';
import { playChime } from '../utils/audio';

interface FloorPlanViewProps {
  tables: RestaurantTable[];
  selectedTable: RestaurantTable | null;
  onSelectTable: (table: RestaurantTable) => void;
  onProceedToBooking?: (table: RestaurantTable) => void;
  isStaff?: boolean;
  isAdmin?: boolean;
  onRequestAdminAccess?: () => void;
  onSaveLayout?: (updatedTables: RestaurantTable[]) => Promise<any>;
  onResetLayout?: () => Promise<any>;
  onAddNewTable?: (newTable: RestaurantTable) => Promise<any>;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  onProceedToBooking,
  isStaff = false,
  isAdmin = false,
  onRequestAdminAccess,
  onSaveLayout,
  onResetLayout,
  onAddNewTable
}) => {
  const [hoveredTable, setHoveredTable] = useState<RestaurantTable | null>(null);
  const [filterSection, setFilterSection] = useState<string>('all');

  // Staff Table Layout Editor States
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [stagedTables, setStagedTables] = useState<RestaurantTable[]>(tables);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Add Table Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableSection, setNewTableSection] = useState<TableSection>('Main Dining Hall');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [newTableDeposit, setNewTableDeposit] = useState<number>(150000);
  const [newTableShape, setNewTableShape] = useState<'round' | 'rect' | 'booth'>('round');

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync staged tables with incoming tables when not actively editing with unsaved changes
  useEffect(() => {
    if (!isDirty) {
      setStagedTables(tables);
    }
  }, [tables, isDirty]);

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return {
          bg: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/60 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Tersedia'
        };
      case 'reserved':
        return {
          bg: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/60 text-amber-300',
          dot: 'bg-amber-400',
          label: 'Dipesan'
        };
      case 'occupied':
        return {
          bg: 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/60 text-rose-300',
          dot: 'bg-rose-400',
          label: 'Sedang Digunakan'
        };
      case 'maintenance':
      default:
        return {
          bg: 'bg-stone-500/20 border-stone-600 text-stone-400',
          dot: 'bg-stone-500',
          label: 'Pemeliharaan'
        };
    }
  };

  const currentDisplayTables = isEditMode ? stagedTables : tables;

  const filteredTables = filterSection === 'all' 
    ? currentDisplayTables 
    : currentDisplayTables.filter(t => t.section === filterSection);

  const sections = [
    { id: 'all', label: 'Semua Area' },
    { id: 'Main Dining Hall', label: 'Main Hall' },
    { id: 'Romantic Window Booth', label: 'Window Booth' },
    { id: 'VIP Private Suite', label: 'VIP Suites' },
    { id: 'Garden Terrace', label: 'Garden Veranda' },
    { id: 'Chef\'s Counter', label: 'Chef\'s Counter' }
  ];

  // Drag calculation helper
  const handleDragPosition = (clientX: number, clientY: number) => {
    if (!activeDragId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Convert to percentage with safe padding bounds (5% to 95% on X, 8% to 92% on Y)
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, Math.round(rawX)));
    const clampedY = Math.max(8, Math.min(92, Math.round(rawY)));

    setStagedTables(prev => 
      prev.map(t => (t.id === activeDragId ? { ...t, x: clampedX, y: clampedY } : t))
    );
    setIsDirty(true);
  };

  // Mouse drag handlers
  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setActiveDragId(tableId);
  };

  // Touch drag handlers for mobile devices
  const handleTouchStart = (tableId: string, e: React.TouchEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setActiveDragId(tableId);
  };

  // Window listeners for smooth movement
  useEffect(() => {
    if (!activeDragId) return;

    const onMouseMove = (e: MouseEvent) => {
      handleDragPosition(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleDragPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setActiveDragId(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [activeDragId]);

  // Save layout changes to Firebase
  const handleSaveLayout = async () => {
    if (!onSaveLayout) return;
    setIsSaving(true);
    try {
      await onSaveLayout(stagedTables);
      setIsDirty(false);
      setIsSaving(false);
      setSaveSuccessMsg('Tata letak meja berhasil disimpan ke database real-time!');
      playChime('success');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Save layout failed:', err);
      setIsSaving(false);
    }
  };

  // Cancel edit mode and revert
  const handleCancelEdit = () => {
    setStagedTables(tables);
    setIsDirty(false);
    setIsEditMode(false);
    setActiveDragId(null);
  };

  // Add new table handler
  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim() || !onAddNewTable) return;

    const newId = `tbl-${Date.now().toString().slice(-6)}`;
    const newTable: RestaurantTable = {
      id: newId,
      name: newTableName.trim(),
      section: newTableSection,
      capacity: newTableCapacity,
      minSpend: newTableCapacity * 125000,
      depositFee: newTableDeposit,
      status: 'available',
      description: `Meja ${newTableName} di area ${newTableSection}.`,
      features: ['Meja Baru', 'Area Bersih', 'Pelayanan Prima'],
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
      x: 50,
      y: 50,
      shape: newTableShape
    };

    await onAddNewTable(newTable);
    setStagedTables(prev => [...prev, newTable]);
    setShowAddModal(false);
    setNewTableName('');
    playChime('ding');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Header & Filter Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#18261e]/95 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#374d40] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-display font-bold text-amber-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Denah Meja Restoran (Interactive 2D Floor Plan)
            </h2>
            {isStaff && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-semibold">
                Staff Control
              </span>
            )}
          </div>
          <p className="text-xs text-[#b8c9bf] mt-0.5">
            {isStaff 
              ? 'Kelola ketersediaan meja atau aktifkan mode pindah meja untuk menyesuaikan tata letak denah.'
              : 'Klik salah satu meja untuk melihat spesifikasi, kapasitas, dan melakukan reservasi langsung.'}
          </p>
        </div>

        {/* Staff / Admin Actions / Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Admin Edit Mode Button vs Staff Locked Indicator */}
          {isAdmin ? (
            <button
              onClick={() => {
                if (isEditMode && isDirty) {
                  if (confirm('Anda memiliki perubahan tata letak yang belum disimpan. Batalkan?')) {
                    handleCancelEdit();
                  }
                } else {
                  setIsEditMode(!isEditMode);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isEditMode
                  ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300 shadow-amber-500/30'
                  : 'bg-[#22352b] text-stone-200 hover:bg-[#2c4337] border border-[#3b5145]'
              }`}
            >
              <Move className="w-4 h-4" />
              {isEditMode ? 'Keluar Mode Geser' : 'Pindahkan Meja (Edit Denah)'}
            </button>
          ) : isStaff ? (
            <button
              onClick={() => onRequestAdminAccess && onRequestAdminAccess()}
              title="Pengaturan tata letak dan denah meja hanya dapat diubah oleh Administrator"
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[#142019] text-[#b8c9bf] hover:text-amber-300 border border-[#344b3e] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-400" />
              <span>Atur Denah (Admin Saja)</span>
            </button>
          ) : null}

          {/* Legend */}
          <div className="flex items-center gap-2.5 text-[11px] sm:text-xs bg-[#131e18]/90 px-3 py-1.5 rounded-xl border border-[#344b3e]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-[#d8e5df]">Tersedia</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-stone-300">Dipesan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-stone-300">Terisi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Floating Edit Toolbar when isEditMode is active */}
      {isAdmin && isEditMode && (
        <div className="p-3 sm:p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-500/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
              <Move className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                Mode Geser Meja Aktif
              </h4>
              <p className="text-[11px] text-amber-300/80">
                Sentuh dan seret meja ke posisi baru. Pelanggan akan melihat posisi baru secara real-time setelah disimpan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Tambah Meja
            </button>

            {onResetLayout && (
              <button
                onClick={() => {
                  if (confirm('Kembalikan denah meja ke posisi tata letak standar?')) {
                    onResetLayout();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset ke Posisi Default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>
            )}

            <button
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs font-medium cursor-pointer"
            >
              Batal
            </button>

            <button
              disabled={!isDirty || isSaving}
              onClick={handleSaveLayout}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan ke Firebase...' : 'Simpan Tata Letak Baru'}
            </button>
          </div>
        </div>
      )}

      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setFilterSection(sec.id)}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              filterSection === sec.id
                ? 'bg-amber-600 text-stone-950 font-bold shadow-md shadow-amber-600/30'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Main Floor Blueprint Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Architectural 2D Plan Canvas */}
        <div 
          ref={canvasRef}
          className={`lg:col-span-8 bg-[#131e18] border rounded-2xl sm:rounded-3xl p-3 sm:p-6 relative overflow-hidden shadow-2xl min-h-[460px] sm:min-h-[520px] select-none ${
            isEditMode ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-[#354c3e]'
          }`}
          style={{ touchAction: isEditMode ? 'none' : 'auto' }}
        >
          
          {/* Subtle architectural floor grid texture */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Area boundary markings */}
          {/* Left: Parking Area (User customized!) */}
          <div className="absolute left-2 top-4 bottom-4 w-28 sm:w-32 border-r border-dashed border-sky-500/30 pointer-events-none flex flex-col justify-between p-2">
            <span className="text-[10px] tracking-widest uppercase font-mono text-sky-400/80 origin-bottom-left">
              🌆 Parking Area {/*Jendela City Skyline View*/}
            </span>
          </div>

          {/* Top Right: VIP Private Chambers */}
          <div className="absolute right-3 top-3 w-40 sm:w-52 h-48 sm:h-64 border border-dashed border-amber-500/30 rounded-2xl pointer-events-none p-2 sm:p-3">
            <span className="text-[9px] sm:text-[10px] tracking-widest uppercase font-mono text-amber-400/80">
              👑 VIP Private Rooms
            </span>
          </div>

          {/* Bottom Center: Outdoor Garden Terrace */}
          <div className="absolute left-28 sm:left-36 right-44 sm:right-60 bottom-3 h-28 sm:h-32 border-t border-dashed border-emerald-500/30 pointer-events-none p-2">
            <span className="text-[9px] sm:text-[10px] tracking-widest uppercase font-mono text-emerald-400/80">
              🌿 Garden Veranda
            </span>
          </div>

          {/* Bottom Right: Chef Open Kitchen */}
          <div className="absolute right-3 bottom-3 w-40 sm:w-52 h-24 sm:h-28 border border-dashed border-orange-500/30 rounded-xl pointer-events-none p-2 bg-stone-900/40 flex items-center justify-center">
            <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-orange-400 font-semibold text-center">
              🍳 Open Kitchen &amp; Chef Bar
            </span>
          </div>

          {/* Central Dining Chandelier Marker */}
          <div className="absolute left-[50%] top-[10%] -translate-x-1/2 flex items-center gap-1.5 text-stone-500 text-[9px] sm:text-[10px] uppercase tracking-wider font-mono pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Grand Chandelier Main Hall
          </div>

          {/* Render Table Nodes */}
          <div className="relative w-full h-[420px] sm:h-[480px]">
            {filteredTables.map((table) => {
              const statusCfg = getStatusColor(table.status);
              const isSelected = selectedTable?.id === table.id;
              const isDragging = activeDragId === table.id;

              return (
                <div
                  key={table.id}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: isEditMode ? 'none' : 'auto',
                  }}
                  onMouseEnter={() => !isEditMode && setHoveredTable(table)}
                  onMouseLeave={() => !isEditMode && setHoveredTable(null)}
                  onClick={() => {
                    if (!isEditMode) onSelectTable(table);
                  }}
                  onMouseDown={(e) => handleMouseDown(table.id, e)}
                  onTouchStart={(e) => handleTouchStart(table.id, e)}
                  className={`absolute z-10 transition-shadow ${
                    isEditMode 
                      ? 'cursor-grab active:cursor-grabbing hover:scale-105' 
                      : 'cursor-pointer hover:scale-110 duration-200'
                  } ${
                    isDragging ? 'z-30 scale-110 opacity-95 ring-4 ring-amber-400' : ''
                  } ${
                    isSelected && !isEditMode ? 'scale-115 ring-4 ring-amber-400 z-20 shadow-xl shadow-amber-500/30' : ''
                  }`}
                >
                  <div
                    className={`flex flex-col items-center justify-center p-2 border-2 shadow-lg backdrop-blur-md relative transition-colors ${statusCfg.bg} ${
                      isEditMode ? 'border-dashed border-amber-400/90 shadow-amber-500/20' : ''
                    } ${
                      table.shape === 'round'
                        ? 'rounded-full w-16 h-16 sm:w-20 sm:h-20'
                        : table.shape === 'booth'
                        ? 'rounded-2xl w-18 h-14 sm:w-22 sm:h-18'
                        : 'rounded-xl w-18 h-14 sm:w-22 sm:h-18'
                    }`}
                  >
                    {/* Drag indicator in edit mode */}
                    {isEditMode && (
                      <span className="absolute -top-2 -right-2 p-1 bg-amber-500 text-stone-950 rounded-full shadow-md">
                        <Move className="w-2.5 h-2.5" />
                      </span>
                    )}

                    <span className="text-[10px] sm:text-[11px] font-bold tracking-tight text-white flex items-center gap-0.5 truncate max-w-full px-1">
                      {table.name}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-stone-300 mt-0.5">
                      <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>{table.capacity}pax</span>
                    </div>
                    <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-0.5 ${statusCfg.dot}`} />
                  </div>

                  {/* Coordinate tag while dragging */}
                  {isDragging && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/90 text-[9px] font-mono text-amber-300 border border-amber-500/40 pointer-events-none">
                      X: {table.x}% | Y: {table.y}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Selected / Hovered Table Details Card */}
        <div className="lg:col-span-4 bg-[#18261e]/95 border border-[#374d40] rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xl">
          {(() => {
            const activeTable = selectedTable || hoveredTable || currentDisplayTables[0];
            if (!activeTable) {
              return (
                <div className="h-full flex items-center justify-center text-center text-[#9bb1a4] text-xs sm:text-sm p-4">
                  Pilih salah satu meja pada denah untuk melihat informasi lengkap.
                </div>
              );
            }

            const statusCfg = getStatusColor(activeTable.status);

            return (
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                      {activeTable.section}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-display font-bold text-[#fcfbf9] mt-1.5 sm:mt-2">
                    {activeTable.name}
                  </h3>
                  <p className="text-xs text-[#c2d3ca] mt-1 leading-relaxed">
                    {activeTable.description}
                  </p>
                </div>

                {/* Table Image preview */}
                <div className="relative rounded-2xl overflow-hidden aspect-video border border-[#354c3e]">
                  <img
                    src={activeTable.imageUrl}
                    alt={activeTable.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131e18] via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-xs text-stone-200">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold">{activeTable.capacity} Orang</span>
                  </div>
                </div>

                {/* Table Pricing & Deposit Info */}
                <div className="grid grid-cols-2 gap-3 bg-[#131e18]/80 p-3 sm:p-3.5 rounded-xl border border-[#304437]">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                      Deposit Reservasi
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      Rp {activeTable.depositFee.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[9px] text-stone-500 block">Dipotong ke tagihan</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                      Min. Pembelian
                    </span>
                    <span className="text-sm font-bold text-stone-200 font-mono">
                      Rp {activeTable.minSpend.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[9px] text-stone-500 block">Per meja</span>
                  </div>
                </div>

                {/* Highlights */}
                <div>
                  <h4 className="text-xs font-medium text-stone-300 mb-2">Fasilitas &amp; Keunggulan:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTable.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] bg-stone-800 text-stone-300 border border-stone-700/60"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Booking CTA Button (Hidden in Staff Edit Mode) */}
                {!isEditMode && (
                  <div className="pt-2">
                    {activeTable.status === 'available' ? (
                      <button
                        onClick={() => onProceedToBooking && onProceedToBooking(activeTable)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        Reservasi Meja {activeTable.name} Sekarang
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-xl bg-stone-800 text-stone-500 font-medium text-xs sm:text-sm cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Meja Sedang {statusCfg.label}
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })()}
        </div>

      </div>

      {/* Add New Table Modal for Staff */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateNewTable} className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <h3 className="font-display font-bold text-stone-100 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Tambah Meja Baru ke Denah
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1">Nama / Nomor Meja:</label>
              <input
                type="text"
                required
                placeholder="Contoh: T-05 Main, VIP-03"
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Area Restoran:</label>
                <select
                  value={newTableSection}
                  onChange={e => setNewTableSection(e.target.value as TableSection)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Main Dining Hall">Main Dining Hall</option>
                  <option value="Romantic Window Booth">Romantic Window Booth</option>
                  <option value="VIP Private Suite">VIP Private Suite</option>
                  <option value="Garden Terrace">Garden Terrace</option>
                  <option value="Chef's Counter">Chef's Counter</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Kapasitas Tamu:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newTableCapacity}
                  onChange={e => setNewTableCapacity(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Deposit Reservasi (Rp):</label>
                <input
                  type="number"
                  step={50000}
                  value={newTableDeposit}
                  onChange={e => setNewTableDeposit(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Bentuk Meja:</label>
                <select
                  value={newTableShape}
                  onChange={e => setNewTableShape(e.target.value as 'round' | 'rect' | 'booth')}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="round">Bundar (Round)</option>
                  <option value="rect">Persegi (Rect)</option>
                  <option value="booth">Booth (Sofa)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-white text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer"
              >
                Tambahkan Meja
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
