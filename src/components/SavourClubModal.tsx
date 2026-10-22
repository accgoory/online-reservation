import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Award, 
  Crown, 
  Gift, 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  ChevronRight, 
  QrCode, 
  User, 
  Phone, 
  Search,
  Percent,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { LoyaltyAccount, LoyaltyTier } from '../types/restaurant';
import { 
  INITIAL_LOYALTY_MEMBERS, 
  getOrCreateLoyaltyAccount, 
  cleanPhone,
  POINTS_CONVERSION_RATE 
} from '../services/loyaltyService';

interface SavourClubModalProps {
  currentAccount: LoyaltyAccount | null;
  onSelectAccount: (account: LoyaltyAccount) => void;
  onClose: () => void;
  onGoToBooking?: () => void;
}

export const SavourClubModal: React.FC<SavourClubModalProps> = ({
  currentAccount,
  onSelectAccount,
  onClose,
  onGoToBooking
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'perks' | 'history'>('card');
  const [searchPhone, setSearchPhone] = useState<string>(currentAccount?.customerPhone || '081234567890');
  const [member, setMember] = useState<LoyaltyAccount>(
    currentAccount || INITIAL_LOYALTY_MEMBERS[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentAccount) {
      setMember(currentAccount);
      setSearchPhone(currentAccount.customerPhone);
    }
  }, [currentAccount]);

  const handleLookupPhone = async (phoneToLookup: string) => {
    setIsLoading(true);
    try {
      const acc = await getOrCreateLoyaltyAccount(phoneToLookup);
      setMember(acc);
      onSelectAccount(acc);
    } catch (e) {
      console.warn('Lookup error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierColor = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'Platinum':
        return {
          gradient: 'from-slate-900 via-stone-800 to-zinc-950',
          border: 'border-zinc-400/40',
          badge: 'bg-zinc-200 text-zinc-950',
          accent: 'text-zinc-200',
          ring: 'ring-zinc-400/30'
        };
      case 'Gold':
        return {
          gradient: 'from-amber-950 via-amber-900 to-stone-950',
          border: 'border-amber-400/50',
          badge: 'bg-amber-400 text-stone-950',
          accent: 'text-amber-300',
          ring: 'ring-amber-400/30'
        };
      case 'Silver':
        return {
          gradient: 'from-slate-900 via-slate-800 to-stone-950',
          border: 'border-slate-400/40',
          badge: 'bg-slate-300 text-stone-950',
          accent: 'text-slate-200',
          ring: 'ring-slate-400/30'
        };
      default: // Bronze
        return {
          gradient: 'from-amber-950/80 via-stone-900 to-stone-950',
          border: 'border-amber-700/40',
          badge: 'bg-amber-700 text-stone-100',
          accent: 'text-amber-400',
          ring: 'ring-amber-700/30'
        };
    }
  };

  const tierStyles = getTierColor(member.tier);

  // Compute next tier requirement
  const getNextTierInfo = (currentPoints: number, tier: LoyaltyTier) => {
    if (tier === 'Bronze') {
      const remaining = Math.max(0, 500 - currentPoints);
      const progress = Math.min(100, (currentPoints / 500) * 100);
      return { next: 'Silver', remaining, target: 500, progress };
    }
    if (tier === 'Silver') {
      const remaining = Math.max(0, 1500 - currentPoints);
      const progress = Math.min(100, ((currentPoints - 500) / 1000) * 100);
      return { next: 'Gold', remaining, target: 1500, progress };
    }
    if (tier === 'Gold') {
      const remaining = Math.max(0, 3000 - currentPoints);
      const progress = Math.min(100, ((currentPoints - 1500) / 1500) * 100);
      return { next: 'Platinum', remaining, target: 3000, progress };
    }
    return { next: 'Tier Maksimal', remaining: 0, target: 3000, progress: 100 };
  };

  const nextTier = getNextTierInfo(member.totalEarned, member.tier);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-stone-900 border-t sm:border border-amber-900/40 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 shadow-md shadow-amber-900/30">
              <Crown className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-bold text-stone-100">
                  Goory Club
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  LOYALTY REWARDS
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Kumpulkan Goory Points di setiap reservasi &amp; tukarkan dengan diskon eksklusif.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Selector Bar (Quick Demo Switcher & Lookup) */}
        <div className="bg-stone-950/70 p-3.5 sm:px-6 border-b border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-mono text-[11px] uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Pilih Profil Anggota Demo / Masukkan No. HP:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {INITIAL_LOYALTY_MEMBERS.map((demo) => {
              const isSelected = cleanPhone(demo.customerPhone) === cleanPhone(member.customerPhone);
              return (
                <button
                  key={demo.id}
                  onClick={() => {
                    setMember(demo);
                    setSearchPhone(demo.customerPhone);
                    onSelectAccount(demo);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-600 text-stone-950 border-amber-400 font-bold shadow-md shadow-amber-600/30'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <span>{demo.customerName.split(' ')[0]}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-amber-400'
                  }`}>
                    {demo.pointsBalance} Pts
                  </span>
                </button>
              );
            })}

            {/* Custom Phone Search */}
            <div className="flex-1 min-w-[170px] relative">
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookupPhone(searchPhone);
                }}
                placeholder="Cari No. HP lain..."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
              <button
                onClick={() => handleLookupPhone(searchPhone)}
                disabled={isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-400 text-[10px] font-bold"
              >
                Cek
              </button>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-6">
          <button
            onClick={() => setActiveTab('card')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'card'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Crown className="w-4 h-4" />
            Kartu VIP &amp; Saldo
          </button>
          <button
            onClick={() => setActiveTab('perks')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'perks'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            Manfaat Tier Keanggotaan
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Riwayat Poin ({member.history.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: VIP DIGITAL CARD & SUMMARY */}
          {activeTab === 'card' && (
            <div className="space-y-6">
              
              {/* Luxury Digital Membership Card */}
              <div className={`relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br ${tierStyles.gradient} border ${tierStyles.border} shadow-2xl overflow-hidden ring-1 ${tierStyles.ring}`}>
                {/* Decorative background watermark */}
                <div className="absolute right-[-20px] bottom-[-30px] opacity-10 pointer-events-none">
                  <Crown className="w-56 h-56 text-amber-400" />
                </div>

                <div className="relative z-10 space-y-6">
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 block">
                        SAVOUR &amp; CO. PRIVILEGE PASS
                      </span>
                      <h4 className="font-display text-lg sm:text-xl font-bold text-stone-100 tracking-wide mt-0.5">
                        {member.customerName}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${tierStyles.badge}`}>
                        {member.tier} MEMBER
                      </span>
                    </div>
                  </div>

                  {/* Card Center: Points Balance Display */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 pb-1 border-y border-stone-700/40">
                    <div>
                      <span className="text-xs text-stone-300 font-medium block">
                        Saldo Goory Points Aktif
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-mono text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                          {member.pointsBalance.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-widest font-mono">
                          Points
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right bg-stone-950/60 p-2.5 rounded-2xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                        Nilai Diskon Deposit
                      </span>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        Rp {(member.pointsBalance * POINTS_CONVERSION_RATE).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: Member ID & QR Code */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                        Member ID / WhatsApp
                      </span>
                      <span className="font-mono text-xs text-stone-200">
                        {member.customerPhone}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-white rounded-lg p-1 shadow-sm flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-black" />
                      </div>
                      <span className="text-[10px] text-stone-400 hidden sm:inline max-w-[120px] leading-tight">
                        Tunjukkan ke kasir saat bersantap
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress to next tier */}
              <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    Progres Menuju Tier {nextTier.next}
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {member.totalEarned} / {nextTier.target} Total Poin
                  </span>
                </div>

                <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${nextTier.progress}%` }}
                  />
                </div>

                <p className="text-xs text-stone-400">
                  {nextTier.remaining > 0 ? (
                    <>
                      Kumpulkan <strong className="text-amber-300 font-mono">{nextTier.remaining} poin</strong> lagi untuk naik level ke <strong className="text-white">{nextTier.next}</strong> dan nikmati pengganda poin lebih tinggi!
                    </>
                  ) : (
                    <>
                      Selamat! Anda berada di tingkat keanggotaan tertinggi <strong className="text-amber-300 font-mono">{member.tier}</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* How it Works Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Cara Mendapatkan Poin
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Dapatkan <strong>1 Goory Point untuk setiap Rp 1.000</strong> deposit reservasi. Dapatkan bonus +50 Poin pada perayaan Ulang Tahun atau Meja VIP!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    Cara Menukarkan Poin
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Tukarkan poin langsung saat mengisi formulir reservasi. Setiap <strong>1 Poin = Potongan Rp 100</strong> langsung pada tagihan deposit Anda.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MEMBERSHIP TIERS & PERKS */}
          {activeTab === 'perks' && (
            <div className="space-y-4">
              {[
                {
                  tier: 'Bronze',
                  pointsRange: '0 – 499 Pts',
                  multiplier: '1.0x Poin',
                  color: 'border-amber-800/40 bg-stone-950',
                  badgeColor: 'bg-amber-800 text-amber-100',
                  perks: [
                    'Welcome bonus 100 Goory Points saat pendaftaran pertama',
                    'Dapatkan 1 Poin per Rp 1.000 deposit reservasi',
                    'Dapat ditukarkan langsung untuk potongan deposit',
                    'Notifikasi instan pemesanan via WhatsApp & E-Ticket'
                  ]
                },
                {
                  tier: 'Silver',
                  pointsRange: '500 – 1.499 Pts',
                  multiplier: '1.2x Poin',
                  color: 'border-slate-400/40 bg-stone-950',
                  badgeColor: 'bg-slate-300 text-stone-950',
                  perks: [
                    'Multipliers 1.2x poin di setiap reservasi meja',
                    'Complimentary Birthday Dessert dari Executive Pastry Chef',
                    'Welcome Signature Mocktail saat tiba di restoran',
                    'Fleksibilitas perubahan jadwal santap tanpa penalti'
                  ]
                },
                {
                  tier: 'Gold',
                  pointsRange: '1.500 – 2.999 Pts',
                  multiplier: '1.5x Poin',
                  color: 'border-amber-400/50 bg-stone-950 ring-1 ring-amber-400/20',
                  badgeColor: 'bg-amber-400 text-stone-950 font-black',
                  perks: [
                    'Multipliers 1.5x poin di setiap reservasi meja',
                    'Prioritas pemesanan Meja Romantic Window Booth & Garden Terrace',
                    'Complimentary Chef\'s Amuse-Bouche eksklusif untuk seluruh tamu',
                    'Layanan Free Valet Parking di lobi depan restoran'
                  ]
                },
                {
                  tier: 'Platinum',
                  pointsRange: '3.000+ Pts',
                  multiplier: '2.0x Poin',
                  color: 'border-zinc-300/40 bg-stone-950 ring-1 ring-zinc-400/30',
                  badgeColor: 'bg-zinc-200 text-stone-950 font-black',
                  perks: [
                    'Multipliers 2.0x poin tertinggi di seluruh dining',
                    'Prioritas nomor satu tanpa masa tunggu di Meja VIP Private Suite & Chef\'s Counter',
                    'Complimentary Welcome Bottle Sparkling Cider / Wine Selection',
                    'Personal Butler Service & Konsultasi Menu langsung dengan Executive Chef'
                  ]
                }
              ].map((tierItem) => {
                const isCurrentTier = member.tier === tierItem.tier;

                return (
                  <div
                    key={tierItem.tier}
                    className={`p-5 rounded-2xl border transition-all ${tierItem.color} ${
                      isCurrentTier ? 'ring-2 ring-amber-500 shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${tierItem.badgeColor}`}>
                          {tierItem.tier}
                        </span>
                        <span className="text-xs font-mono text-stone-400">
                          {tierItem.pointsRange}
                        </span>
                        {isCurrentTier && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-stone-950">
                            TIER ANDA SAAT INI
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold font-mono text-amber-300 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800">
                        {tierItem.multiplier}
                      </span>
                    </div>

                    <ul className="space-y-1.5 pl-1">
                      {tierItem.perks.map((perk, idx) => (
                        <li key={idx} className="text-xs text-stone-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: POINTS TRANSACTION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {member.history.length === 0 ? (
                <div className="p-8 text-center bg-stone-950 rounded-2xl border border-stone-800 text-stone-500 space-y-2">
                  <Flame className="w-8 h-8 mx-auto text-amber-500/40" />
                  <p className="text-sm font-semibold text-stone-300">Belum ada riwayat poin</p>
                  <p className="text-xs text-stone-500">
                    Lakukan reservasi meja pertama Anda untuk mengumpulkan Goory Points.
                  </p>
                </div>
              ) : (
                member.history.map((hist) => {
                  const isEarned = hist.points > 0;
                  return (
                    <div
                      key={hist.id}
                      className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            isEarned
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          }`}>
                            {hist.type.replace('_', ' ')}
                          </span>
                          {hist.bookingCode && (
                            <span className="text-[11px] font-mono text-stone-400">
                              Ref: {hist.bookingCode}
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-medium text-stone-200">
                          {hist.description}
                        </h5>
                        <span className="text-[10px] text-stone-500 block">
                          {new Date(hist.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono text-sm sm:text-base font-bold ${
                          isEarned ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isEarned ? `+${hist.points}` : hist.points} Pts
                        </span>
                        <span className="text-[10px] text-stone-400 block font-mono">
                          {isEarned ? `+Rp ${(hist.points * POINTS_CONVERSION_RATE).toLocaleString('id-ID')}` : `-Rp ${(Math.abs(hist.points) * POINTS_CONVERSION_RATE).toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Poin berlaku selamanya &amp; dapat digabungkan antar reservasi</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border border-stone-800 hover:border-stone-700 text-stone-300 text-xs font-semibold"
            >
              Tutup
            </button>
            {onGoToBooking && (
              <button
                onClick={() => {
                  onClose();
                  onGoToBooking();
                }}
                className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer"
              >
                Pesan Meja &amp; Tukar Poin
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
