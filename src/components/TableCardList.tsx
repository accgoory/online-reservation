import React, { useState } from 'react';
import { 
  RestaurantTable, 
  TableSection,
  TableStatus 
} from '../types/restaurant';
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface TableCardListProps {
  tables: RestaurantTable[];
  selectedTable: RestaurantTable | null;
  onSelectTable: (table: RestaurantTable) => void;
  onProceedToBooking: (table: RestaurantTable) => void;
}

export const TableCardList: React.FC<TableCardListProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  onProceedToBooking
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [guestFilter, setGuestFilter] = useState<number>(0);

  const sections: { id: string; label: string }[] = [
    { id: 'all', label: 'Semua Meja' },
    { id: 'Main Dining Hall', label: 'Main Hall' },
    { id: 'Romantic Window Booth', label: 'Window Booth' },
    { id: 'VIP Private Suite', label: 'VIP Suites' },
    { id: 'Garden Terrace', label: 'Garden Veranda' },
    { id: 'Chef\'s Counter', label: 'Chef\'s Counter' }
  ];

  const filtered = tables.filter((t) => {
    const matchesSection = selectedSection === 'all' || t.section === selectedSection;
    const matchesGuests = guestFilter === 0 || t.capacity >= guestFilter;
    return matchesSection && matchesGuests;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Tersedia
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Dipesan
          </span>
        );
      case 'occupied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Terisi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-500/20 text-stone-400 border border-stone-600">
            Pemeliharaan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18261e]/90 p-4 rounded-2xl border border-[#354c3e]">
        
        {/* Section categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSection(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedSection === s.id
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                  : 'bg-[#131e18] text-[#c2d3ca] hover:text-white border border-[#354c3e]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filter by min guests capacity */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#b8c9bf]">Kapasitas:</span>
          <select
            value={guestFilter}
            onChange={(e) => setGuestFilter(Number(e.target.value))}
            className="bg-[#131e18] border border-[#354c3e] text-[#fcfbf9] text-xs rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-amber-400 cursor-pointer"
          >
            <option value={0}>Semua Kapasitas</option>
            <option value={2}>Min. 2 Orang</option>
            <option value={4}>Min. 4 Orang</option>
            <option value={6}>Min. 6 Orang</option>
            <option value={8}>Min. 8+ Orang (VIP)</option>
          </select>
        </div>

      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((table) => {
          const isSelected = selectedTable?.id === table.id;
          const isAvailable = table.status === 'available';

          return (
            <div
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`group bg-[#18261e]/95 rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between cursor-pointer shadow-xl ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-2xl shadow-amber-950/50'
                  : 'border-[#354c3e] hover:border-amber-400/50 hover:shadow-2xl'
              }`}
            >
              {/* Image & Top Badges */}
              <div className="relative aspect-video overflow-hidden bg-[#121c16]">
                <img
                  src={table.imageUrl}
                  alt={table.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#18261e] via-[#18261e]/20 to-transparent" />
                
                {/* Status Pill */}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(table.status)}
                </div>

                {/* Section Tag */}
                <div className="absolute top-3 left-3 bg-[#131e18]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#354c3e] text-[10px] font-mono uppercase tracking-wider text-amber-300">
                  {table.section}
                </div>

                {/* Pax capacity on image bottom */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-[#fcfbf9] font-semibold bg-[#131e18]/80 px-2.5 py-1 rounded-md backdrop-blur-xs border border-[#354c3e]">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kapasitas {table.capacity} Tamu</span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-display font-bold text-[#fcfbf9] group-hover:text-amber-200 transition-colors">
                    {table.name}
                  </h3>
                  <p className="text-xs text-[#b8c9bf] mt-1 line-clamp-2 leading-relaxed">
                    {table.description}
                  </p>
                </div>

                {/* Features tags */}
                <div className="flex flex-wrap gap-1.5">
                  {table.features.slice(0, 2).map((f, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#131e18] text-[#c2d3ca] border border-[#354c3e]"
                    >
                      ✓ {f}
                    </span>
                  ))}
                  {table.features.length > 2 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md text-[#8ea598]">
                      +{table.features.length - 2}
                    </span>
                  )}
                </div>

                {/* Deposit & Min Spend summary */}
                <div className="pt-3 border-t border-[#354c3e] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#8ea598] block">Biaya Deposit</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      Rp {table.depositFee.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {isAvailable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTable(table);
                        onProceedToBooking(table);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      Pilih Meja
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-[#728b7e] font-medium italic">
                      Tidak Tersedia
                    </span>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
