import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Reservation, RestaurantTable } from '../types/restaurant';
import { TIME_SLOTS } from '../data/defaultTables';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Flame, 
  Sparkles, 
  Calendar, 
  Utensils, 
  DollarSign, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  PieChart as PieIcon,
  ShieldCheck,
  CalendarDays,
  Percent
} from 'lucide-react';

interface ManagerAnalyticsChartsProps {
  reservations: Reservation[];
  tables: RestaurantTable[];
}

export const ManagerAnalyticsCharts: React.FC<ManagerAnalyticsChartsProps> = ({
  reservations,
  tables
}) => {
  // Time period filter: 7 Days, 14 Days, 30 Days
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);

  // Secondary sub-tab for complementary hourly vs area analytics
  const [hourlyViewMode, setHourlyViewMode] = useState<'hourly' | 'sections'>('hourly');

  // Format currency helper
  const formatIDR = (val: number): string => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const formatShortIDR = (val: number): string => {
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toFixed(0)}rb`;
    }
    return `Rp ${val}`;
  };

  // 1. Compute Daily Time Series Data based on selected rangeDays (7, 14, 30)
  const dailyTimeSeriesData = useMemo(() => {
    const dateMap: Record<
      string, 
      { 
        date: string; 
        displayDate: string; 
        fullDate: string;
        dayOfWeek: string;
        bookings: number; 
        guests: number; 
        deposit: number;
        pendingDeposit: number;
        qrisCount: number;
        vaCount: number;
      }
    > = {};

    const now = new Date();
    
    // Generate consecutive dates backwards from today for rangeDays
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const shortDisplay = d.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: rangeDays > 14 ? 'numeric' : 'short' 
      });
      const fullDisplay = d.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });

      dateMap[iso] = {
        date: iso,
        displayDate: `${dayName} ${shortDisplay}`,
        fullDate: fullDisplay,
        dayOfWeek: dayName,
        bookings: 0,
        guests: 0,
        deposit: 0,
        pendingDeposit: 0,
        qrisCount: 0,
        vaCount: 0
      };
    }

    // Accumulate reservation records
    reservations.forEach(r => {
      if (r.status !== 'cancelled') {
        const dateKey = r.date;
        const depositAmt = r.depositAmount || 100000;
        const guests = r.guestsCount || 2;
        const isPaid = r.paymentStatus === 'paid';

        if (dateMap[dateKey]) {
          dateMap[dateKey].bookings += 1;
          dateMap[dateKey].guests += guests;
          if (isPaid) {
            dateMap[dateKey].deposit += depositAmt;
            if (r.paymentMethod === 'qris') {
              dateMap[dateKey].qrisCount += 1;
            } else if (r.paymentMethod?.includes('va')) {
              dateMap[dateKey].vaCount += 1;
            }
          } else {
            dateMap[dateKey].pendingDeposit += depositAmt;
          }
        }
      }
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [reservations, rangeDays]);

  // 2. Compute Executive Financial Summary Metrics
  const financialMetrics = useMemo(() => {
    // Total deposit paid
    const totalDeposit = dailyTimeSeriesData.reduce((sum, item) => sum + item.deposit, 0);
    const totalBookings = dailyTimeSeriesData.reduce((sum, item) => sum + item.bookings, 0);
    const totalGuests = dailyTimeSeriesData.reduce((sum, item) => sum + item.guests, 0);
    const totalPending = dailyTimeSeriesData.reduce((sum, item) => sum + item.pendingDeposit, 0);

    // Average deposit per booking
    const avgDepositPerBooking = totalBookings > 0 ? Math.round(totalDeposit / totalBookings) : 0;

    // Projected gross revenue: estimated from deposit multiplier + minimum spend factor (~3.5x - 4x deposit)
    const projectedGross = Math.round(totalDeposit * 3.8);

    // Conversion rate
    const totalRequests = totalDeposit + totalPending;
    const conversionRate = totalRequests > 0 ? Math.round((totalDeposit / totalRequests) * 100) : 100;

    // Highest revenue day in the selected range
    let bestDay = { date: '', displayDate: '-', deposit: 0 };
    dailyTimeSeriesData.forEach(d => {
      if (d.deposit > bestDay.deposit) {
        bestDay = { date: d.date, displayDate: d.displayDate, deposit: d.deposit };
      }
    });

    return {
      totalDeposit,
      totalBookings,
      totalGuests,
      avgDepositPerBooking,
      projectedGross,
      conversionRate,
      bestDay
    };
  }, [dailyTimeSeriesData]);

  // 3. Compute Hourly Peak Distribution
  const hourlyData = useMemo(() => {
    const slotsMap: Record<string, { time: string; session: string; count: number; guests: number }> = {};
    
    TIME_SLOTS.forEach(slot => {
      slotsMap[slot.time] = {
        time: `${slot.time}`,
        session: slot.session,
        count: 0,
        guests: 0
      };
    });

    reservations.forEach(r => {
      if (r.status !== 'cancelled') {
        const key = r.timeSlot;
        if (slotsMap[key]) {
          slotsMap[key].count += 1;
          slotsMap[key].guests += (r.guestsCount || 2);
        } else if (key) {
          slotsMap[key] = {
            time: key,
            session: 'Dinner',
            count: 1,
            guests: r.guestsCount || 2
          };
        }
      }
    });

    return Object.values(slotsMap);
  }, [reservations]);

  // Peak hour calculation
  const peakHour = useMemo(() => {
    let max = { time: '19:30', count: 0, guests: 0, session: 'Dinner' };
    hourlyData.forEach(item => {
      if (item.count > max.count) {
        max = item;
      }
    });
    return max;
  }, [hourlyData]);

  // 4. Table Section Distribution
  const sectionData = useMemo(() => {
    const counts: Record<string, number> = {
      'Main Dining Hall': 0,
      'Romantic Window Booth': 0,
      'VIP Private Suite': 0,
      'Garden Terrace': 0,
      'Chef\'s Counter': 0,
    };

    reservations.forEach(r => {
      if (r.status !== 'cancelled' && r.tableSection) {
        counts[r.tableSection] = (counts[r.tableSection] || 0) + 1;
      }
    });

    const colors = ['#f59e0b', '#38bdf8', '#a855f7', '#10b981', '#f97316'];

    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value: Math.max(value, 0),
      color: colors[idx % colors.length]
    }));
  }, [reservations]);

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: HEADER & DYNAMIC RANGE FILTER */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <TrendingUp className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-bold text-stone-100">
                  Visualisasi Tren Reservasi &amp; Estimasi Pendapatan Deposit
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Recharts Analytics
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Pantau tren pemesanan meja harian dan arus kas masuk dari deposit reservasi tamu secara real-time.
              </p>
            </div>
          </div>

          {/* DYNAMIC TIME RANGE SWITCHER BUTTONS (7 Hari, 14 Hari, 30 Hari) */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-2xl border border-stone-800 text-xs self-start md:self-auto shadow-inner">
            <span className="text-[11px] font-semibold text-stone-400 px-2 hidden sm:inline flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              Periode:
            </span>
            <button
              type="button"
              onClick={() => setRangeDays(7)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                rangeDays === 7
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setRangeDays(14)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                rangeDays === 14
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              14 Hari
            </button>
            <button
              type="button"
              onClick={() => setRangeDays(30)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                rangeDays === 30
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              30 Hari (1 Bulan)
            </button>
          </div>
        </div>

        {/* SECTION 2: EXECUTIVE FINANCIAL METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Card 1: Total Deposit Masuk (Cair) */}
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-emerald-500/30 space-y-1 relative overflow-hidden group hover:border-emerald-500/60 transition-colors">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">
                Total Deposit Masuk (Cair)
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
              {formatIDR(financialMetrics.totalDeposit)}
            </div>
            <p className="text-[11px] text-stone-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Dari <strong className="text-stone-300 font-mono">{financialMetrics.totalBookings}</strong> reservasi terverifikasi
            </p>
          </div>

          {/* Card 2: Rata-rata Deposit per Reservasi */}
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-amber-500/30 space-y-1 relative overflow-hidden group hover:border-amber-500/60 transition-colors">
            <div className="flex items-center justify-between text-xs text-amber-400">
              <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">
                Rata-rata per Reservasi
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
              {formatIDR(financialMetrics.avgDepositPerBooking)}
            </div>
            <p className="text-[11px] text-stone-400">
              Komitmen rata-rata per grup pemesanan
            </p>
          </div>

          {/* Card 3: Proyeksi Estimasi Omzet */}
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-purple-500/30 space-y-1 relative overflow-hidden group hover:border-purple-500/60 transition-colors">
            <div className="flex items-center justify-between text-xs text-purple-400">
              <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">
                Proyeksi Omzet Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
              {formatIDR(financialMetrics.projectedGross)}
            </div>
            <p className="text-[11px] text-stone-400">
              Estimasi total belanja meja &amp; min. spend
            </p>
          </div>

          {/* Card 4: Tingkat Kelunasan Pembayaran */}
          <div className="bg-stone-950/80 p-4 rounded-2xl border border-cyan-500/30 space-y-1 relative overflow-hidden group hover:border-cyan-500/60 transition-colors">
            <div className="flex items-center justify-between text-xs text-cyan-400">
              <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">
                Tingkat Kelunasan Deposit
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Percent className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
              {financialMetrics.conversionRate}%
            </div>
            <p className="text-[11px] text-stone-400">
              Hari tertinggi: <strong className="text-stone-300">{financialMetrics.bestDay.displayDate}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: DUA GRAFIK UTAMA RECHARTS (SEPARATE DEDICATED CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* GRAFIK 1: TREN RESERVASI HARIAN (DAILY RESERVATION VOLUME & GUEST TRAFFIC) */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-4">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Tren Reservasi Harian &amp; Lalu Lintas Tamu
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                Jumlah pemesanan meja dan total estimasi tamu yang hadir ({rangeDays} hari).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                Reservasi
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-xs" />
                Tamu (Pax)
              </span>
            </div>
          </div>

          {/* AreaChart Canvas */}
          <div className="h-68 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTimeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReservationBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorReservationGuests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#78716c" 
                  fontSize={10} 
                  tickLine={false}
                  interval={rangeDays === 30 ? 3 : rangeDays === 14 ? 1 : 0}
                />
                <YAxis 
                  stroke="#78716c" 
                  fontSize={10} 
                  allowDecimals={false} 
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-950 border border-amber-500/40 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-44">
                          <p className="font-bold text-amber-300 font-display border-b border-stone-800 pb-1">
                            {data.fullDate}
                          </p>
                          <div className="flex items-center justify-between text-stone-200">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Reservasi Meja:
                            </span>
                            <strong className="text-white font-mono">{data.bookings} Meja</strong>
                          </div>
                          <div className="flex items-center justify-between text-stone-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                              Total Tamu:
                            </span>
                            <strong className="text-cyan-300 font-mono">{data.guests} Orang</strong>
                          </div>
                          {data.deposit > 0 && (
                            <div className="pt-1 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-emerald-400">
                              <span>Deposit Masuk:</span>
                              <strong className="font-mono">{formatIDR(data.deposit)}</strong>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#f59e0b" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorReservationBookings)" 
                  name="Reservasi"
                />
                <Area 
                  type="monotone" 
                  dataKey="guests" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorReservationGuests)" 
                  name="Tamu"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px] text-stone-400">
            <span>Total Reservasi Periode: <strong className="text-amber-300 font-mono">{financialMetrics.totalBookings}</strong> Meja</span>
            <span>Total Tamu: <strong className="text-cyan-300 font-mono">{financialMetrics.totalGuests}</strong> Pax</span>
          </div>
        </div>

        {/* GRAFIK 2: ESTIMASI PENDAPATAN DEPOSIT MASUK (DAILY DEPOSIT CASH INFLOW) */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-4">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Estimasi Pendapatan Deposit Masuk Harian
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                Nominal pembayaran deposit terverifikasi lunas per hari ({rangeDays} hari).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold font-mono text-[11px]">
                Arus Kas Masuk
              </span>
            </div>
          </div>

          {/* BarChart Canvas */}
          <div className="h-68 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTimeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDepositBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#78716c" 
                  fontSize={10} 
                  tickLine={false}
                  interval={rangeDays === 30 ? 3 : rangeDays === 14 ? 1 : 0}
                />
                <YAxis 
                  stroke="#78716c" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={formatShortIDR}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-950 border border-emerald-500/40 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-44">
                          <p className="font-bold text-emerald-300 font-display border-b border-stone-800 pb-1">
                            {data.fullDate}
                          </p>
                          <div className="flex items-center justify-between text-stone-200">
                            <span>Deposit Masuk:</span>
                            <strong className="text-emerald-400 font-mono font-bold text-sm">
                              {formatIDR(data.deposit)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-stone-400 text-[11px]">
                            <span>Jumlah Booking:</span>
                            <span className="font-mono text-stone-300">{data.bookings} Transaksi</span>
                          </div>
                          {data.pendingDeposit > 0 && (
                            <div className="flex items-center justify-between text-amber-400/90 text-[11px] pt-1 border-t border-stone-800">
                              <span>Menunggu Pembayaran:</span>
                              <span className="font-mono">{formatIDR(data.pendingDeposit)}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="deposit" 
                  name="Pendapatan Deposit"
                  radius={[6, 6, 0, 0]}
                  fill="url(#colorDepositBar)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px] text-stone-400">
            <span>Rata-rata Harian: <strong className="text-emerald-300 font-mono">{formatIDR(Math.round(financialMetrics.totalDeposit / rangeDays))}</strong></span>
            <span>Penerimaan Tertinggi: <strong className="text-emerald-300 font-mono">{formatIDR(financialMetrics.bestDay.deposit)}</strong></span>
          </div>
        </div>

      </div>

      {/* SECTION 4: COMPLEMENTARY INSIGHTS (PEAK HOURS & TABLE SECTIONS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PEAK HOURS BREAKDOWN */}
        <div className="lg:col-span-8 bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Beban Jam Sibuk Restoran (Peak Hours Distribution)
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                Kepadatan reservasi berdasarkan slot jam kedatangan tamu untuk koordinasi kesiapan dapur.
              </p>
            </div>
            {peakHour.count > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 font-mono">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Puncak: {peakHour.time} WIB ({peakHour.count} Meja)
              </span>
            )}
          </div>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis dataKey="time" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-950 border border-amber-500/40 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-amber-300 font-mono">{label} WIB ({data.session})</p>
                          <p className="text-stone-200">Jumlah Reservasi: <strong className="text-white font-mono">{data.count} Meja</strong></p>
                          <p className="text-stone-400">Estimasi Tamu: <strong className="text-stone-300 font-mono">{data.guests} Orang</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" name="Reservasi" radius={[6, 6, 0, 0]} fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE SECTION DISTRIBUTION DONUT */}
        <div className="lg:col-span-4 bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-400" />
              Preferensi Area Meja
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Distribusi pemilihan zona meja oleh para tamu.
            </p>
          </div>

          {/* Donut Chart */}
          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-950 border border-stone-800 p-2 rounded-lg text-xs font-mono shadow-md">
                          <span style={{ color: data.color }} className="font-bold">{data.name}</span>
                          <span className="block text-white font-bold">{data.value} Reservasi</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-stone-400 uppercase font-mono">Total</span>
              <span className="text-lg font-bold text-stone-100 font-mono">
                {reservations.filter(r => r.status !== 'cancelled').length}
              </span>
            </div>
          </div>

          {/* Section Chips */}
          <div className="space-y-1.5 pt-2 border-t border-stone-800/80">
            {sectionData.map(sec => (
              <div key={sec.name} className="flex items-center justify-between text-xs text-stone-300">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                  <span className="truncate">{sec.name}</span>
                </div>
                <span className="font-mono font-semibold text-stone-400 shrink-0">
                  {sec.value}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
