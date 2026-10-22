import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  HeartHandshake,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Crown,
  Coins,
  Percent,
  Gift
} from 'lucide-react';
import { 
  RestaurantTable, 
  Reservation, 
  OccasionType, 
  PaymentMethod,
  LoyaltyAccount,
  WaitlistEntry
} from '../types/restaurant';
import { TIME_SLOTS, OCCASIONS } from '../data/defaultTables';
import { FloorPlanView } from './FloorPlanView';
import { TableCardList } from './TableCardList';
import { DigitalPaymentGateway } from './DigitalPaymentGateway';
import { TicketPassModal } from './TicketPassModal';
import { WaitlistModal } from './WaitlistModal';
import { WaitlistTicketPassModal } from './WaitlistTicketPassModal';
import { 
  createReservation, 
  simulateFullHouse, 
  freeUpAllTables 
} from '../services/restaurantService';
import { 
  subscribeToWaitlist, 
  getStoredWaitlistTicketId 
} from '../services/waitlistService';
import { 
  getOrCreateLoyaltyAccount, 
  calculatePointsToEarn, 
  calculateMaxRedeemablePoints, 
  calculateDiscountFromPoints, 
  cleanPhone, 
  INITIAL_LOYALTY_MEMBERS,
  POINTS_CONVERSION_RATE 
} from '../services/loyaltyService';

interface ReservationWizardProps {
  tables: RestaurantTable[];
  onReservationCreated: (reservation: Reservation) => void;
  initialSelectedTable?: RestaurantTable | null;
  activeLoyaltyAccount?: LoyaltyAccount | null;
  onOpenSavourClub?: () => void;
}

export const ReservationWizard: React.FC<ReservationWizardProps> = ({
  tables,
  onReservationCreated,
  initialSelectedTable = null,
  activeLoyaltyAccount,
  onOpenSavourClub
}) => {
  // Step state (1: Schedule & Guests, 2: Choose Table, 3: Guest Details, 4: Payment, 5: Ticket)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'floor' | 'cards'>('floor');

  // Form states
  const getTodayFormatted = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(getTodayFormatted());
  const [timeSlot, setTimeSlot] = useState<string>('19:30');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [occasion, setOccasion] = useState<OccasionType>('Romantic Dinner');
  
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(initialSelectedTable);

  const [customerName, setCustomerName] = useState<string>('Bagus Kurniawan');
  const [customerPhone, setCustomerPhone] = useState<string>('081234567890');
  const [customerEmail, setCustomerEmail] = useState<string>('bagus.kurniawan@gmail.com');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [dietaryRequests, setDietaryRequests] = useState<string>('');

  // Loyalty Program State
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(
    activeLoyaltyAccount || INITIAL_LOYALTY_MEMBERS[0]
  );
  const [usePointsDiscount, setUsePointsDiscount] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isCheckingMember, setIsCheckingMember] = useState<boolean>(false);

  // Sync when activeLoyaltyAccount changes from parent
  React.useEffect(() => {
    if (activeLoyaltyAccount) {
      setLoyaltyAccount(activeLoyaltyAccount);
      setCustomerName(activeLoyaltyAccount.customerName);
      setCustomerPhone(activeLoyaltyAccount.customerPhone);
      setCustomerEmail(activeLoyaltyAccount.customerEmail);
    }
  }, [activeLoyaltyAccount]);

  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showTicketModal, setShowTicketModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Auto-fetch or pick demo member
  const handleSelectDemoMember = (demo: LoyaltyAccount) => {
    setLoyaltyAccount(demo);
    setCustomerName(demo.customerName);
    setCustomerPhone(demo.customerPhone);
    setCustomerEmail(demo.customerEmail);
    setPointsToRedeem(0);
    setUsePointsDiscount(false);
  };

  const handlePhoneInputChange = async (val: string) => {
    setCustomerPhone(val);
    const cleaned = cleanPhone(val);
    if (cleaned.length >= 10) {
      setIsCheckingMember(true);
      try {
        const acc = await getOrCreateLoyaltyAccount(val, customerEmail, customerName);
        setLoyaltyAccount(acc);
      } catch (err) {
        console.warn('Member fetch error:', err);
      } finally {
        setIsCheckingMember(false);
      }
    }
  };

  // Calculations for loyalty deposit discount and points to earn
  const originalDeposit = selectedTable?.depositFee || 0;
  const maxPointsPossible = selectedTable && loyaltyAccount
    ? calculateMaxRedeemablePoints(originalDeposit, loyaltyAccount.pointsBalance)
    : 0;

  const currentDiscountAmount = usePointsDiscount ? calculateDiscountFromPoints(pointsToRedeem) : 0;
  const finalPayableDeposit = Math.max(0, originalDeposit - currentDiscountAmount);

  const estimatedPointsToEarn = selectedTable
    ? calculatePointsToEarn(
        finalPayableDeposit,
        loyaltyAccount?.tier || 'Bronze',
        occasion,
        selectedTable.section?.includes('VIP')
      )
    : 150;

  // Waitlist Virtual Queue State
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [showWaitlistTicketModal, setShowWaitlistTicketModal] = useState<boolean>(false);
  const [activeWaitlistTicket, setActiveWaitlistTicket] = useState<WaitlistEntry | null>(null);
  const [waitlistQueue, setWaitlistQueue] = useState<WaitlistEntry[]>([]);
  const [isSimulatingFull, setIsSimulatingFull] = useState<boolean>(false);

  // Subscribe to real-time waitlist queue
  React.useEffect(() => {
    const unsub = subscribeToWaitlist((entries) => {
      setWaitlistQueue(entries);
      const storedId = getStoredWaitlistTicketId();
      if (storedId) {
        const found = entries.find((e) => e.id === storedId);
        if (found) {
          setActiveWaitlistTicket(found);
        }
      }
    });
    return () => unsub();
  }, []);

  const availableTables = tables.filter((t) => t.status === 'available');
  const isAllTablesBooked = tables.length > 0 && availableTables.length === 0;
  const activeWaitingCount = waitlistQueue.filter(
    (e) => e.status === 'waiting' || e.status === 'called'
  ).length;

  // Handle table selection and auto progression if needed
  const handleSelectTable = (table: RestaurantTable) => {
    setSelectedTable(table);
  };

  // Step 3 -> Step 4 (Create Reservation in Firestore, open payment)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError('Silakan masukkan nama lengkap pemesan.');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('Silakan masukkan nomor telepon / WhatsApp untuk konfirmasi.');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setFormError('Silakan masukkan alamat email yang valid.');
      return;
    }
    if (!selectedTable) {
      setFormError('Silakan pilih meja terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reservation = await createReservation({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        guestsCount,
        tableId: selectedTable.id,
        tableName: selectedTable.name,
        tableSection: selectedTable.section,
        date,
        timeSlot,
        occasion,
        specialNotes: specialNotes.trim(),
        dietaryRequests: dietaryRequests.trim(),
        depositAmount: finalPayableDeposit,
        pointsEarned: estimatedPointsToEarn,
        pointsRedeemed: usePointsDiscount ? pointsToRedeem : 0,
        pointsDiscountAmount: currentDiscountAmount,
        paymentStatus: 'pending',
        status: 'pending_payment',
      });

      setCreatedReservation(reservation);
      setIsSubmitting(false);
      setShowPaymentModal(true);
    } catch (err) {
      console.error('Error creating booking:', err);
      setFormError('Gagal memproses reservasi. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (resId: string, method: PaymentMethod, ref: string) => {
    setShowPaymentModal(false);
    if (createdReservation) {
      const updated: Reservation = {
        ...createdReservation,
        paymentStatus: 'paid',
        paymentMethod: method,
        paymentReference: ref,
        status: 'confirmed'
      };
      setCreatedReservation(updated);
      onReservationCreated(updated);
      setShowTicketModal(true);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Wizard Progress Stepper */}
      <div className="bg-[#18261e]/95 p-4 sm:p-5 rounded-2xl border border-[#354c3e] shadow-xl">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { step: 1, label: 'Waktu & Tamu', icon: Calendar },
            { step: 2, label: 'Pilih Meja', icon: Sparkles },
            { step: 3, label: 'Data Pemesan', icon: Users },
            { step: 4, label: 'Bayar Deposit', icon: CreditCard }
          ].map((item, idx) => {
            const Icon = item.icon;
            const isCompleted = currentStep > item.step;
            const isActive = currentStep === item.step;

            return (
              <React.Fragment key={item.step}>
                <div 
                  onClick={() => {
                    if (item.step < currentStep) setCurrentStep(item.step);
                  }}
                  className={`flex flex-col sm:flex-row items-center gap-2 cursor-pointer ${
                    isActive ? 'text-amber-400' : isCompleted ? 'text-emerald-400' : 'text-stone-500'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-500/20'
                        : isCompleted
                        ? 'bg-emerald-500 text-stone-950'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[11px] sm:text-xs font-medium hidden sm:inline">
                    {item.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      currentStep > idx + 1 ? 'bg-emerald-500/60' : 'bg-stone-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Waitlist Ticket Banner (if guest has active virtual queue pass) */}
      {activeWaitlistTicket && (activeWaitlistTicket.status === 'waiting' || activeWaitlistTicket.status === 'called') && (
        <div className="bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/70 border-2 border-amber-500/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${activeWaitlistTicket.status === 'called' ? 'bg-emerald-500 text-stone-950 animate-bounce' : 'bg-amber-500 text-stone-950'} font-bold shrink-0`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                  Antrean Virtual Anda Aktif
                </span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${activeWaitlistTicket.status === 'called' ? 'bg-emerald-500 text-stone-950' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {activeWaitlistTicket.status === 'called' ? 'MEJA SUDAH SIAP!' : `Urutan #${activeWaitlistTicket.queueNumber}`}
                </span>
              </div>
              <p className="text-xs text-stone-200 font-semibold mt-0.5">
                Tiket: {activeWaitlistTicket.queueCode} • {activeWaitlistTicket.customerName} ({activeWaitlistTicket.guestCount} Orang)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWaitlistTicketModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Lihat Tiket Antrean
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: SCHEDULE, GUESTS & OCCASION */}
      {currentStep === 1 && (
        <div className="bg-[#18261e]/95 border border-[#354c3e] rounded-3xl p-6 sm:p-8 space-y-8 animate-in fade-in-50 duration-300 shadow-xl">
          <div>
            <h2 className="text-2xl font-display font-bold text-stone-100 flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-amber-400" />
              Tentukan Jadwal &amp; Jumlah Tamu
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Pilih tanggal kedatangan, slot jam bersantap, serta suasana acara yang Anda inginkan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#d6e3dc] block uppercase tracking-wider font-mono">
                1. Tanggal Kunjungan
              </label>
              <input
                type="date"
                min={getTodayFormatted()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#131e18] border border-[#354c3e] rounded-2xl px-4 py-3.5 text-[#fcfbf9] font-mono text-sm focus:outline-hidden focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Guest Count */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#d6e3dc] block uppercase tracking-wider font-mono">
                2. Jumlah Tamu ({guestsCount} Orang)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 4, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuestsCount(num)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      guestsCount === num
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/30'
                        : 'bg-[#131e18] text-[#c2d3ca] border-[#354c3e] hover:border-amber-400/40 hover:text-white'
                    }`}
                  >
                    {num} {num >= 10 ? '+' : ''}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Time Slot Picker */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#d6e3dc] block uppercase tracking-wider font-mono">
              3. Jam Bersantap (Pilih Slot Waktu)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {TIME_SLOTS.map((slot) => {
                const isSelected = timeSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setTimeSlot(slot.time)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/30 font-bold'
                        : 'bg-[#131e18] text-[#d6e3dc] border-[#354c3e] hover:border-amber-400/40'
                    }`}
                  >
                    <span className="text-xs font-bold block">{slot.time} WIB</span>
                    <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-stone-950 font-semibold' : 'text-[#8ea598]'}`}>
                      {slot.session}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Occasion Picker */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#d6e3dc] block uppercase tracking-wider font-mono">
              4. Momen Spesial / Acara
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {OCCASIONS.map((occ) => {
                const isSelected = occasion === occ.label;
                return (
                  <button
                    key={occ.label}
                    type="button"
                    onClick={() => setOccasion(occ.label as OccasionType)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-sm'
                        : 'bg-[#131e18] text-[#c2d3ca] border-[#354c3e] hover:border-amber-400/40 hover:text-white'
                    }`}
                  >
                    <span className="text-xl block mb-1">{occ.icon}</span>
                    <span className="text-[11px] font-medium block leading-tight">{occ.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-3.5 px-7 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              Lanjut: Pilih Meja Idaman
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE TABLE INTERACTIVELY */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          
          {/* Header & Toggle Between Floor Plan & Cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18261e]/95 p-4 sm:p-5 rounded-2xl border border-[#354c3e] shadow-xl">
            <div>
              <h2 className="text-xl font-display font-bold text-[#fcfbf9] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Pilih Meja Bersantap
              </h2>
              <p className="text-xs text-[#b8c9bf] mt-0.5">
                Tanggal: <strong className="text-amber-300">{date}</strong> • Jam: <strong className="text-amber-300">{timeSlot} WIB</strong> • Untuk: <strong className="text-amber-300">{guestsCount} Tamu</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowWaitlistModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Daftar ke Antrean Virtual jika Meja Penuh"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Antrean Virtual {activeWaitingCount > 0 ? `(${activeWaitingCount})` : ''}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-[#131e18] p-1.5 rounded-xl border border-[#354c3e] text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('floor')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'floor' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold' : 'text-[#c2d3ca] hover:text-white'
                  }`}
                >
                  Denah 2D
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    viewMode === 'cards' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold' : 'text-[#c2d3ca] hover:text-white'
                  }`}
                >
                  Galeri Meja
                </button>
              </div>
            </div>
          </div>

          {/* Full House Automatic Alert Banner (When all tables are booked) */}
          {isAllTablesBooked && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-950/90 border-2 border-amber-500/80 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    SEMUA MEJA TERISI PENUH (FULL HOUSE)
                  </div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-stone-100">
                    Tidak Ada Meja Tersedia Saat Ini
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
                    Seluruh meja restoran kami sedang ditempati tamu lain atau telah terkonfirmasi. Bergabunglah dengan <strong>Daftar Tunggu Virtual (Waitlist)</strong> untuk mendapatkan antrean resmi dan panggilan otomatis saat meja kosong!
                  </p>
                  <p className="text-xs text-amber-400 font-mono font-medium">
                    ⏱️ {activeWaitingCount} grup dalam antrean virtual • Estimasi waktu tunggu: ~{Math.max(10, activeWaitingCount * 12 + 10)} menit
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowWaitlistModal(true)}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Ambil Nomor Antrean (Waitlist)</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await freeUpAllTables();
                    }}
                    className="text-[11px] text-stone-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    [Tester: Kosongkan Meja Kembali]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Simulation Test Bar for Waitlist Verification */}
          <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-2xl flex flex-wrap items-center justify-between text-xs text-stone-400 gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAllTablesBooked ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>
                Status Meja:{' '}
                <strong className={isAllTablesBooked ? 'text-rose-400' : 'text-emerald-400'}>
                  {availableTables.length} dari {tables.length} meja kosong
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isAllTablesBooked ? (
                <button
                  type="button"
                  onClick={async () => {
                    await simulateFullHouse();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-amber-900/40 text-amber-300 text-[11px] font-medium cursor-pointer"
                  title="Uji coba sistem ketika restoran penuh"
                >
                  ⚡ Tes: Simulasi Semua Meja Penuh (Full House)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await freeUpAllTables();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-emerald-900/40 text-emerald-400 text-[11px] font-medium cursor-pointer"
                >
                  ✓ Buka Kembali Semua Meja
                </button>
              )}
            </div>
          </div>

          {/* View rendering */}
          {viewMode === 'floor' ? (
            <FloorPlanView
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={handleSelectTable}
              onProceedToBooking={() => setCurrentStep(3)}
            />
          ) : (
            <TableCardList
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={handleSelectTable}
              onProceedToBooking={() => setCurrentStep(3)}
            />
          )}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between bg-[#18261e]/90 p-4 rounded-2xl border border-[#354c3e]">
            <button
              onClick={() => setCurrentStep(1)}
              className="py-2.5 px-5 rounded-xl border border-[#354c3e] text-[#b8c9bf] hover:text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Jadwal
            </button>

            {selectedTable ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] text-[#8ea598] block">Meja Terpilih:</span>
                  <span className="text-sm font-bold text-amber-300">
                    {selectedTable.name} ({selectedTable.section})
                  </span>
                </div>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedTable.status !== 'available'}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  Lanjut ke Data Diri
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-[#8ea598] italic">
                Klik salah satu meja di atas untuk melanjutkan
              </span>
            )}
          </div>

        </div>
      )}

      {/* STEP 3: CUSTOMER DETAILS & SPECIAL REQUESTS */}
      {currentStep === 3 && selectedTable && (
        <form onSubmit={handleSubmitBooking} className="bg-[#18261e]/95 border border-[#354c3e] rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in-50 duration-300 shadow-xl">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#fcfbf9] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-400" />
              Informasi Pemesan &amp; Permintaan Khusus
            </h2>
            <p className="text-xs text-[#b8c9bf] mt-1">
              Data ini digunakan untuk tiket masuk reservasi, konfirmasi WhatsApp, dan notifikasi real-time kesiapan meja Anda.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* Table summary badge */}
          <div className="bg-[#131e18] p-4 rounded-2xl border border-[#354c3e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-[#8ea598] uppercase font-mono tracking-wider block">
                Ringkasan Pilihan
              </span>
              <span className="text-base font-bold text-[#fcfbf9]">
                {selectedTable.name} • {date} ({timeSlot} WIB)
              </span>
              <span className="text-xs text-[#b8c9bf] block mt-0.5">
                {guestsCount} Tamu • Acara: {occasion}
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-[#8ea598] uppercase font-mono tracking-wider block">
                Deposit Komitmen
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                Rp {selectedTable.depositFee.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-[#728b7e] block">Dipotong 100% di kasir</span>
            </div>
          </div>

          {/* Quick Demo Member Switcher */}
          <div className="p-3.5 bg-[#131e18]/90 rounded-2xl border border-[#354c3e] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#b8c9bf]">
              <span className="flex items-center gap-1.5 font-medium text-[#d6e3dc]">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Isi Cepat Profil Member Goory Club:
              </span>
              {onOpenSavourClub && (
                <button
                  type="button"
                  onClick={onOpenSavourClub}
                  className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] underline cursor-pointer"
                >
                  Detail Goory Club
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {INITIAL_LOYALTY_MEMBERS.map(demo => {
                const isSelected = cleanPhone(demo.customerPhone) === cleanPhone(customerPhone);
                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleSelectDemoMember(demo)}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-400 font-bold shadow-md shadow-amber-500/25'
                        : 'bg-[#18261e] text-[#c2d3ca] border-[#354c3e] hover:border-amber-400/40'
                    }`}
                  >
                    <span>{demo.customerName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-stone-950 text-amber-300' : 'bg-[#131e18] text-amber-400'
                    }`}>
                      {demo.tier} • {demo.pointsBalance} Pts
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-[#d6e3dc] block mb-1.5">
                Nama Lengkap Pemesan <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Contoh: Bagus Kurniawan"
                className="w-full bg-[#131e18] border border-[#354c3e] rounded-xl px-4 py-3 text-sm text-[#fcfbf9] placeholder:text-[#728b7e] focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#d6e3dc] block mb-1.5">
                Nomor WhatsApp / HP (Member ID) <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={e => handlePhoneInputChange(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-[#131e18] border border-[#354c3e] rounded-xl px-4 py-3 text-sm text-[#fcfbf9] placeholder:text-[#728b7e] focus:outline-hidden focus:border-amber-400 font-mono"
                />
                {isCheckingMember && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 animate-pulse">
                    Mengecek Poin...
                  </span>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-[#d6e3dc] block mb-1.5">
                Alamat Email (Untuk E-Tiket &amp; Notifikasi) <span className="text-amber-400">*</span>
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="Contoh: pemesan@gmail.com"
                className="w-full bg-[#131e18] border border-[#354c3e] rounded-xl px-4 py-3 text-sm text-[#fcfbf9] placeholder:text-[#728b7e] focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-[#d6e3dc] block mb-1.5">
                Catatan Khusus &amp; Preferensi Diet (Opsional)
              </label>
              <textarea
                rows={2}
                value={specialNotes}
                onChange={e => setSpecialNotes(e.target.value)}
                placeholder="Contoh: Mohon sediakan lilin ulang tahun mini, bebas olahan kacang, atau kursi bayi (baby chair)."
                className="w-full bg-[#131e18] border border-[#354c3e] rounded-xl px-4 py-2.5 text-sm text-[#fcfbf9] placeholder:text-[#728b7e] focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          {/* SAVOUR CLUB LOYALTY CARD & REDEMPTION SECTION */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#131e18] to-[#131e18] border border-amber-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#fcfbf9] flex items-center gap-1.5">
                      Goory Points Loyalty Privilege
                    </h4>
                    {loyaltyAccount && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950 shadow-xs">
                        {loyaltyAccount.tier}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#b8c9bf] mt-0.5">
                    Saldo Aktif: <strong className="text-amber-300 font-mono">{loyaltyAccount?.pointsBalance || 0} Pts</strong> (Nilai Tukar: Rp {((loyaltyAccount?.pointsBalance || 0) * POINTS_CONVERSION_RATE).toLocaleString('id-ID')})
                  </p>
                </div>
              </div>

              {/* Reward for current booking preview */}
              <div className="px-3 py-1.5 rounded-xl bg-[#18261e] border border-[#354c3e] text-left sm:text-right">
                <span className="text-[10px] text-[#8ea598] uppercase font-mono block">
                  Reward Reservasi Ini
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  +{estimatedPointsToEarn} Goory Points
                </span>
              </div>
            </div>

            {/* Toggle to Redeem Points */}
            {(loyaltyAccount?.pointsBalance || 0) > 0 && maxPointsPossible > 0 ? (
              <div className="pt-3 border-t border-[#354c3e] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#fcfbf9] block">
                      Tukarkan Goory Points untuk Diskon Deposit
                    </span>
                    <span className="text-[11px] text-[#b8c9bf]">
                      1 Goory Point = Rp 100 diskon langsung (Maks. {maxPointsPossible} Pts untuk meja ini)
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePointsDiscount}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUsePointsDiscount(checked);
                        if (checked && pointsToRedeem === 0) {
                          setPointsToRedeem(Math.min(500, maxPointsPossible));
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#18261e] border border-[#354c3e] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {usePointsDiscount && (
                  <div className="p-4 rounded-xl bg-[#131e18] border border-amber-500/30 space-y-3 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#d6e3dc]">Poin yang Ditukarkan:</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {pointsToRedeem} Pts (-Rp {(pointsToRedeem * POINTS_CONVERSION_RATE).toLocaleString('id-ID')})
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { pts: 200, label: '200 Pts (-Rp 20.000)' },
                        { pts: 500, label: '500 Pts (-Rp 50.000)' },
                        { pts: 1000, label: '1.000 Pts (-Rp 100.000)' },
                        { pts: maxPointsPossible, label: `Maksimal (${maxPointsPossible} Pts)` }
                      ]
                        .filter(item => item.pts <= maxPointsPossible && item.pts <= (loyaltyAccount?.pointsBalance || 0))
                        .map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPointsToRedeem(opt.pts)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                              pointsToRedeem === opt.pts
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-400 font-bold'
                                : 'bg-[#18261e] text-[#d6e3dc] border-[#354c3e] hover:border-amber-400/40'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                    </div>

                    {/* Range Slider for custom redemption */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={maxPointsPossible}
                        step={10}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-[#18261e] rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-[#8ea598]">
                        <span>0 Pts</span>
                        <span>Maks: {maxPointsPossible} Pts</span>
                      </div>
                    </div>

                    {/* Discount Summary Card */}
                    <div className="pt-2 border-t border-[#354c3e] flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Diskon Berhasil Diterapkan:
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        - Rp {currentDiscountAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t border-[#354c3e] text-[11px] text-[#b8c9bf] flex items-center justify-between">
                <span>Belum punya poin cukup untuk ditukarkan pada meja ini?</span>
                <span className="text-amber-400">Poin akan otomatis terkumpul setelah pembayaran deposit!</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="py-3 px-5 rounded-xl border border-[#354c3e] text-[#b8c9bf] hover:text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ganti Meja
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-xl shadow-amber-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-stone-950" />
              {currentDiscountAmount > 0 ? (
                <>
                  Lanjut ke Pembayaran Digital (
                  <span className="line-through text-stone-700 text-xs">
                    Rp {originalDeposit.toLocaleString('id-ID')}
                  </span>
                  {' '}Rp {finalPayableDeposit.toLocaleString('id-ID')})
                </>
              ) : (
                <>Lanjut ke Pembayaran Digital (Rp {selectedTable.depositFee.toLocaleString('id-ID')})</>
              )}
              <ArrowRight className="w-4 h-4 text-stone-950" />
            </button>
          </div>
        </form>
      )}

      {/* PAYMENT GATEWAY MODAL */}
      {showPaymentModal && createdReservation && (
        <DigitalPaymentGateway
          reservation={createdReservation}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* DIGITAL TICKET MODAL */}
      {showTicketModal && createdReservation && (
        <TicketPassModal
          reservation={createdReservation}
          autoOpenReview={true}
          onClose={() => {
            setShowTicketModal(false);
            // Reset form for next booking
            setCurrentStep(1);
            setSelectedTable(null);
          }}
        />
      )}

      {/* VIRTUAL WAITLIST MODAL */}
      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        activeLoyaltyAccount={loyaltyAccount}
        activeQueueCount={activeWaitingCount}
        initialTimeSlot={timeSlot}
        initialDate={date}
        onSuccess={(entry) => {
          setShowWaitlistModal(false);
          setActiveWaitlistTicket(entry);
          setShowWaitlistTicketModal(true);
        }}
      />

      {/* VIRTUAL WAITLIST TICKET PASS MODAL */}
      {showWaitlistTicketModal && activeWaitlistTicket && (
        <WaitlistTicketPassModal
          initialEntry={activeWaitlistTicket}
          onClose={() => setShowWaitlistTicketModal(false)}
          onCancelled={() => {
            setActiveWaitlistTicket(null);
            setShowWaitlistTicketModal(false);
          }}
        />
      )}

    </div>
  );
};
