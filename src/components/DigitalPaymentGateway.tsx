import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  Lock, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Landmark,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod, Reservation } from '../types/restaurant';
import { processPaymentSuccess, submitPaymentClaim } from '../services/restaurantService';
import { getLocalCachedSettings } from '../services/settingsService';

interface DigitalPaymentGatewayProps {
  reservation: Reservation;
  isStaff?: boolean;
  onPaymentSuccess: (reservationId: string, method: PaymentMethod, ref: string, paymentStatus: 'waiting_verification' | 'paid') => void;
  onCancel: () => void;
}

export const DigitalPaymentGateway: React.FC<DigitalPaymentGatewayProps> = ({
  reservation,
  isStaff = false,
  onPaymentSuccess,
  onCancel
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<boolean>(false);
  const [copiedVA, setCopiedVA] = useState<boolean>(false);
  const [copiedOwnerAcc, setCopiedOwnerAcc] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(899); // 14 mins 59s
  const [isQrisGuideOpen, setIsQrisGuideOpen] = useState<boolean>(true); // Expandable QRIS steps guide
  const appSettings = getLocalCachedSettings();

  // QRIS configuration & auto-refresh state
  const qrisConfig = appSettings.qris || {
    nmid: 'ID102039281923',
    merchantName: 'GOORY COFFEE & EATERY',
    qrisMode: 'dynamic_auto' as const,
    autoRefreshEnabled: true,
    refreshIntervalSeconds: 60
  };

  const [qrRefreshKey, setQrRefreshKey] = useState<number>(() => Date.now());
  const [qrCountdown, setQrCountdown] = useState<number>(qrisConfig.refreshIntervalSeconds || 60);
  const [isRefreshingQr, setIsRefreshingQr] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => 
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Auto-update QR whenever reservation deposit amount changes
  useEffect(() => {
    setQrRefreshKey(Date.now());
    setQrCountdown(qrisConfig.refreshIntervalSeconds || 60);
    setLastRefreshedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [reservation.depositAmount, qrisConfig.refreshIntervalSeconds]);

  // Periodic auto-refresh timer
  useEffect(() => {
    if (!qrisConfig.autoRefreshEnabled || selectedMethod !== 'qris') return;

    const interval = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) {
          setQrRefreshKey(Date.now());
          setLastRefreshedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          return qrisConfig.refreshIntervalSeconds || 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrisConfig.autoRefreshEnabled, qrisConfig.refreshIntervalSeconds, selectedMethod]);

  const handleManualRefreshQr = () => {
    setIsRefreshingQr(true);
    setQrRefreshKey(Date.now());
    setQrCountdown(qrisConfig.refreshIntervalSeconds || 60);
    setLastRefreshedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setTimeout(() => {
      setIsRefreshingQr(false);
    }, 500);
  };

  // Generate dynamic QR payload & URL
  const qrisPayload = React.useMemo(() => {
    if (qrisConfig.qrisMode === 'custom_payload' && qrisConfig.customPayload?.trim()) {
      return qrisConfig.customPayload.trim();
    }
    const nmid = qrisConfig.nmid || 'ID102039281923';
    const merchant = qrisConfig.merchantName || 'GOORY COFFEE & EATERY';
    const bookingRef = reservation.bookingCode || reservation.id.slice(-6).toUpperCase();
    const amount = reservation.depositAmount;
    return `00020101021226${nmid.length.toString().padStart(2, '0')}${nmid}520458125303360540${amount.toString().length.toString().padStart(2, '0')}${amount}5802ID59${merchant.length.toString().padStart(2, '0')}${merchant}6008DENPASAR62${(bookingRef.length + 4).toString().padStart(2, '0')}01${bookingRef.length.toString().padStart(2, '0')}${bookingRef}6304${(qrRefreshKey % 9000 + 1000)}`;
  }, [qrisConfig, reservation.depositAmount, reservation.bookingCode, reservation.id, qrRefreshKey]);

  const qrImageUrl = React.useMemo(() => {
    if (qrisConfig.qrisMode === 'custom_image' && qrisConfig.customImageUrl?.trim()) {
      return qrisConfig.customImageUrl.trim();
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=2&format=svg&data=${encodeURIComponent(qrisPayload)}`;
  }, [qrisConfig, qrisPayload]);

  // Card form state
  const [cardNumber, setCardNumber] = useState<string>('4000 1234 5678 9010');
  const [cardExpiry, setCardExpiry] = useState<string>('08/28');
  const [cardCvv, setCardCvv] = useState<string>('888');
  const [cardName, setCardName] = useState<string>(reservation.customerName);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('123456');

  // e-Wallet state
  const [ewalletPhone, setEwalletPhone] = useState<string>(reservation.customerPhone);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const virtualAccounts = {
    bca_va: '80777' + reservation.customerPhone.replace(/\D/g, '').slice(-7).padStart(7, '0'),
    mandiri_va: '89100' + reservation.customerPhone.replace(/\D/g, '').slice(-7).padStart(7, '0'),
    bni_va: '98801' + reservation.customerPhone.replace(/\D/g, '').slice(-7).padStart(7, '0'),
    bri_va: '12800' + reservation.customerPhone.replace(/\D/g, '').slice(-7).padStart(7, '0'),
  };

  const currentVaNumber = virtualAccounts[selectedMethod as keyof typeof virtualAccounts] || virtualAccounts.bca_va;

  const handleCopyVA = () => {
    navigator.clipboard.writeText(currentVaNumber);
    setCopiedVA(true);
    setTimeout(() => setCopiedVA(false), 2500);
  };

  const handleCopyOwnerAccount = () => {
    if (appSettings.restaurant.ownerAccountNumber) {
      navigator.clipboard.writeText(appSettings.restaurant.ownerAccountNumber);
      setCopiedOwnerAcc(true);
      setTimeout(() => setCopiedOwnerAcc(false), 2500);
    }
  };

  const triggerPaymentExecution = async (bypassAsPaid: boolean = false) => {
    setIsProcessing(true);
    const paymentRef = `TRX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // Smooth visual verification delay
      await new Promise(resolve => setTimeout(resolve, 600));

      if (bypassAsPaid && isStaff) {
        await processPaymentSuccess(reservation.id, selectedMethod, paymentRef, reservation);
        setIsProcessing(false);
        setIsSuccess(true);
        setShowSuccessOverlay(true);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          onPaymentSuccess(reservation.id, selectedMethod, paymentRef, 'paid');
        }, 1300);
      } else {
        // Customer default: 'waiting_verification'
        await submitPaymentClaim(reservation.id, selectedMethod, paymentRef, reservation);
        setIsProcessing(false);
        setIsSuccess(true);
        setShowSuccessOverlay(true);

        setTimeout(() => {
          onPaymentSuccess(reservation.id, selectedMethod, paymentRef, 'waiting_verification');
        }, 1400);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#18261e] border-t sm:border border-[#354c3e] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header with Security Badge & Countdown */}
        <div className="bg-gradient-to-r from-[#131e18] via-[#18261e] to-[#131e18] p-4 sm:p-5 border-b border-[#354c3e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#fcfbf9] flex items-center gap-2">
                Gerbang Pembayaran Digital Aman
              </h3>
              <p className="text-xs text-[#b8c9bf] flex items-center gap-1.5 mt-0.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Enkripsi 256-bit SSL • PCI-DSS Certified
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#8ea598] block uppercase font-mono">Batas Waktu Bayar</span>
            <div className="inline-flex items-center gap-1 text-sm font-mono font-bold text-amber-400 bg-[#131e18] px-2.5 py-1 rounded-lg border border-[#354c3e]">
              <Clock className="w-3.5 h-3.5" />
              {formatCountdown(timeLeft)}
            </div>
          </div>
        </div>

        {/* Invoice Summary Box with Goory Points Breakdown */}
        <div className="bg-[#131e18]/80 p-4 sm:p-5 border-b border-[#354c3e] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18261e] p-4 rounded-2xl border border-[#354c3e]">
            <div>
              <span className="text-xs text-amber-400/90 font-mono">
                Booking Ref: {reservation.bookingCode} • Meja {reservation.tableName}
              </span>
              <h4 className="text-sm font-semibold text-[#fcfbf9] mt-0.5">
                Deposit Komitmen Reservasi ({reservation.guestsCount} Tamu)
              </h4>
              <p className="text-xs text-emerald-400/90 mt-0.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                100% dipotongkan dari tagihan bersantap Anda di kasir restoran
              </p>

              {reservation.pointsDiscountAmount && reservation.pointsDiscountAmount > 0 ? (
                <div className="mt-2 text-xs flex items-center gap-2 font-mono">
                  <span className="text-[#8ea598] line-through">
                    Normal: Rp {((reservation.depositAmount || 0) + reservation.pointsDiscountAmount).toLocaleString('id-ID')}
                  </span>
                  <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Diskon {reservation.pointsRedeemed} Goory Pts (-Rp {reservation.pointsDiscountAmount.toLocaleString('id-ID')})
                  </span>
                </div>
              ) : null}
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-[#8ea598] block">Total Tagihan Bayar</span>
              <span className="text-2xl font-bold text-amber-300 font-mono">
                Rp {reservation.depositAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Points Earning Reward Banner */}
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Hadiah Goory Club untuk Reservasi Ini:
            </span>
            <span className="font-mono font-bold text-amber-200">
              +{reservation.pointsEarned || 150} Goory Points
            </span>
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* QRIS Tab */}
            <button
              type="button"
              onClick={() => setSelectedMethod('qris')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                selectedMethod === 'qris'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/30 font-bold'
                  : 'bg-[#131e18] text-[#c2d3ca] border-[#354c3e] hover:border-amber-400/40'
              }`}
            >
              <QrCode className="w-5 h-5" />
              QRIS Instan
            </button>

            {/* e-Wallet Tab */}
            <button
              type="button"
              onClick={() => setSelectedMethod('gopay')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                ['gopay', 'ovo', 'dana', 'shopeepay'].includes(selectedMethod)
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/30 font-bold'
                  : 'bg-[#131e18] text-[#c2d3ca] border-[#354c3e] hover:border-amber-400/40'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              e-Wallet
            </button>

            {/* Virtual Account Tab */}
            <button
              type="button"
              onClick={() => setSelectedMethod('bca_va')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                ['bca_va', 'mandiri_va', 'bni_va', 'bri_va'].includes(selectedMethod)
                  ? 'bg-amber-600 text-stone-950 border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Virtual Account
            </button>

            {/* Credit Card Tab */}
            <button
              type="button"
              onClick={() => setSelectedMethod('credit_card')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                selectedMethod === 'credit_card'
                  ? 'bg-amber-600 text-stone-950 border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Kartu Kredit
            </button>
          </div>

          {/* METHOD 1: QRIS INSTAN */}
          {selectedMethod === 'qris' && (
            <div className="bg-[#131e18] p-4 sm:p-5 rounded-2xl border border-[#354c3e] flex flex-col items-center text-center space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#b8c9bf]">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                  QRIS STANDAR NASIONAL
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#18261e] border border-[#354c3e] text-[#8ea598]">
                  NMID: {qrisConfig.nmid || 'ID102039281923'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold tracking-wide uppercase">
                  MERCHANT: {qrisConfig.merchantName || 'GOORY COFFEE & EATERY'}
                </span>
              </div>

              {/* Dynamic QR Display with Real-time Image & Auto-Refresh */}
              <div className="p-3 bg-white rounded-2xl shadow-xl ring-4 ring-amber-500/20 max-w-[240px] w-full">
                <div className="p-2 border border-dashed border-stone-300 rounded-lg flex flex-col items-center">
                  <div className="w-full flex items-center justify-between text-[10px] font-black tracking-wider text-stone-700 px-1 mb-1">
                    <span className="text-red-600 font-black">QRIS</span>
                    <span className="text-[9px] text-stone-500 font-mono font-medium">GPN</span>
                  </div>

                  {/* QR Image Container with dynamic refresh state */}
                  <div className="relative w-44 h-44 bg-white flex items-center justify-center overflow-hidden">
                    {isRefreshingQr ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-7 h-7 text-amber-600 animate-spin" />
                        <span className="text-[10px] font-mono font-semibold text-stone-600">
                          Memperbarui QR...
                        </span>
                      </div>
                    ) : (
                      <img
                        key={qrRefreshKey}
                        src={qrImageUrl}
                        alt="QRIS Pembayaran Dinamis"
                        className="w-full h-full object-contain select-none transition-opacity duration-200"
                        loading="eager"
                      />
                    )}
                  </div>

                  <span className="text-[9px] font-mono font-bold text-stone-900 mt-1 uppercase tracking-wider text-center line-clamp-1">
                    {qrisConfig.merchantName || 'GOORY COFFEE & EATERY'}
                  </span>
                  <span className="text-[8px] font-mono text-stone-500">
                    Ref: {reservation.bookingCode || reservation.id.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Dynamic Nominal & Auto-Refresh Status Card */}
              <div className="w-full max-w-md bg-[#18261e] border border-[#354c3e] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#b8c9bf]">
                    <span className="text-emerald-400 font-medium">Nominal Deposit QR:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      Rp {reservation.depositAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8ea598] font-mono">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>QR otomatis sinkron dengan reservasi</span>
                    {qrisConfig.autoRefreshEnabled && (
                      <span className="text-amber-400 font-semibold">({qrCountdown}s)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleManualRefreshQr}
                    disabled={isRefreshingQr}
                    title="Perbarui kode QR ke nominal dan sesi terbaru"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22352a] hover:bg-[#2c4436] active:scale-95 border border-[#415e4d] text-emerald-300 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                    <span>Refresh QR</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#b8c9bf] max-w-md">
                Buka m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet favorit Anda, lalu scan kode QR di atas untuk konfirmasi deposit instan.
              </div>

              {/* Supported icons badges */}
              <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-[#8ea598]">
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">BCA Mobile</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">GoPay</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">OVO</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">DANA</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">ShopeePay</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">Livin' Mandiri</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">BRImo</span>
                <span className="px-2 py-0.5 rounded bg-[#18261e] border border-[#354c3e]">BNI Mobile</span>
              </div>

              {/* Expandable Accordion Card: How to use QRIS */}
              <div className="w-full text-left mt-2 rounded-xl border border-[#354c3e] bg-[#18261e] overflow-hidden shadow-md">
                <button
                  type="button"
                  onClick={() => setIsQrisGuideOpen(prev => !prev)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#203227] transition-colors cursor-pointer"
                  aria-expanded={isQrisGuideOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-[#fcfbf9] flex items-center gap-2">
                        Cara Pembayaran QRIS
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                          4 Langkah Praktis
                        </span>
                      </h5>
                      <p className="text-[11px] text-[#8ea598] mt-0.5">
                        Panduan transaksi cepat &amp; bebas kendala untuk pelanggan
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-[#121c16] text-[#b8c9bf] border border-[#354c3e]">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isQrisGuideOpen ? 'rotate-180 text-amber-400' : ''}`} />
                  </div>
                </button>

                {isQrisGuideOpen && (
                  <div className="p-3.5 sm:p-4 pt-1 sm:pt-2 border-t border-[#354c3e]/60 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Step 1 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#121c16] border border-[#354c3e]/80">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          1
                        </span>
                        <div>
                          <strong className="text-xs text-[#fcfbf9] block font-semibold">Buka Aplikasi Perbankan</strong>
                          <p className="text-[11px] text-[#b8c9bf] mt-0.5 leading-snug">
                            Buka m-Banking (BCA Mobile, Livin', BRImo, BNI) atau e-Wallet (GoPay, OVO, DANA, ShopeePay).
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#121c16] border border-[#354c3e]/80">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          2
                        </span>
                        <div>
                          <strong className="text-xs text-[#fcfbf9] block font-semibold">Pilih Menu Scan QR</strong>
                          <p className="text-[11px] text-[#b8c9bf] mt-0.5 leading-snug">
                            Ketuk tombol <strong>Scan</strong> atau <strong>Bayar QR</strong> yang tersedia di layar utama aplikasi.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#121c16] border border-[#354c3e]/80">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          3
                        </span>
                        <div>
                          <strong className="text-xs text-[#fcfbf9] block font-semibold">Cek Nama Merchant &amp; Nominal</strong>
                          <p className="text-[11px] text-[#b8c9bf] mt-0.5 leading-snug">
                            Pastikan nama penerima tertulis <strong className="text-amber-300 font-bold">GOORY COFFEE &amp; EATERY</strong> dan nominal deposit sesuai tagihan (<strong>Rp {reservation.depositAmount.toLocaleString('id-ID')}</strong>).
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#121c16] border border-[#354c3e]/80">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          4
                        </span>
                        <div>
                          <strong className="text-xs text-[#fcfbf9] block font-semibold">Masukkan PIN &amp; Selesai</strong>
                          <p className="text-[11px] text-[#b8c9bf] mt-0.5 leading-snug">
                            Ketik PIN Anda untuk konfirmasi. Status deposit reservasi akan terverifikasi secara instan otomatis.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Screen Tip */}
                    <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-2.5 text-[11px] text-cyan-200">
                      <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-cyan-300 font-semibold">Tips Transaksi di HP yang Sama: </strong>
                        Bila Anda memesan langsung dari ponsel ini, cukup <em>screenshot</em> kode QRIS di atas, lalu pada m-Banking pilih ikon <strong>"Upload QR dari Galeri Foto"</strong> tanpa perlu scan fisik perangkat lain.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METHOD 2: E-WALLET */}
          {['gopay', 'ovo', 'dana', 'shopeepay'].includes(selectedMethod) && (
            <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {(['gopay', 'ovo', 'dana', 'shopeepay'] as PaymentMethod[]).map(ew => (
                  <button
                    key={ew}
                    type="button"
                    onClick={() => setSelectedMethod(ew)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all border ${
                      selectedMethod === ew
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    {ew}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1.5 font-medium">
                  Nomor HP Terdaftar di {selectedMethod.toUpperCase()}:
                </label>
                <input
                  type="tel"
                  value={ewalletPhone}
                  onChange={e => setEwalletPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Permintaan konfirmasi pembayaran akan dikirim langsung ke aplikasi {selectedMethod.toUpperCase()} Anda.
                </p>
              </div>
            </div>
          )}

          {/* METHOD 3: VIRTUAL ACCOUNT & TRANSFER BANK PEMILIK */}
          {['bca_va', 'mandiri_va', 'bni_va', 'bri_va'].includes(selectedMethod) && (
            <div className="bg-[#131e18] p-5 rounded-2xl border border-[#354c3e] space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'bca_va', label: 'BCA' },
                  { id: 'mandiri_va', label: 'Mandiri' },
                  { id: 'bni_va', label: 'BNI' },
                  { id: 'bri_va', label: 'BRI' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedMethod(b.id as PaymentMethod)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      selectedMethod === b.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-[#18261e] text-[#8ea598] border-[#354c3e] hover:border-amber-500/40'
                    }`}
                  >
                    {b.label} VA
                  </button>
                ))}
              </div>

              {/* Virtual Account Card */}
              <div className="bg-[#18261e] p-4 rounded-xl border border-[#354c3e] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8ea598] uppercase block font-mono">
                    Nomor Rekening Virtual Account ({selectedMethod.split('_')[0].toUpperCase()}):
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-300 tracking-wider">
                    {currentVaNumber}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyVA}
                  className="px-3 py-1.5 rounded-lg bg-[#25392d] hover:bg-[#2e4738] text-xs font-medium text-[#fcfbf9] flex items-center gap-1.5 transition-colors border border-[#354c3e]"
                >
                  {copiedVA ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin VA
                    </>
                  )}
                </button>
              </div>

              {/* Rekening Resmi Pemilik Restoran (Direct Transfer Alternative) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#18261e] to-amber-500/5 border border-amber-500/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400 uppercase font-mono tracking-wider block">
                        Rekening Bank Resmi Pemilik Restoran
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-[#fcfbf9]">
                          {appSettings.restaurant.ownerBankName || 'BCA'}
                        </span>
                        <span className="text-sm font-mono font-bold text-amber-300">
                          {appSettings.restaurant.ownerAccountNumber || '8720-9912-334'}
                        </span>
                      </div>
                      <span className="text-xs text-[#b8c9bf]">
                        a.n. {appSettings.restaurant.ownerAccountHolder || 'I Putu Agus Rony Sastradi (Goory Coffee & Eatery)'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyOwnerAccount}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-amber-500/40 shrink-0"
                  >
                    {copiedOwnerAcc ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Salin Rekening
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#8ea598] space-y-1">
                <p className="font-semibold text-[#fcfbf9]">Panduan Pembayaran m-Banking:</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-[#b8c9bf] text-[11px]">
                  <li>Pilih menu <strong>Transfer &gt; Virtual Account</strong> atau <strong>Transfer Antar Bank</strong> pada m-Banking Anda.</li>
                  <li>Masukkan nomor VA di atas atau transfer langsung ke rekening resmi pemilik restoran.</li>
                  <li>Periksa nominal tagihan Rp {reservation.depositAmount.toLocaleString('id-ID')} lalu selesaikan transaksi.</li>
                </ol>
              </div>
            </div>
          )}

          {/* METHOD 4: CREDIT CARD */}
          {selectedMethod === 'credit_card' && (
            <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-3.5">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nomor Kartu (Visa / Mastercard / JCB):</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="4000 1234 5678 9010"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Berlaku Hingga (MM/YY):</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">CVV (3 Digit):</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value)}
                    placeholder="•••"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Nama Pemilik Kartu:</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="py-3 px-5 rounded-xl border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800 text-sm font-medium transition-colors"
            >
              Batalkan
            </button>

            <button
              type="button"
              onClick={() => triggerPaymentExecution(false)}
              disabled={isProcessing}
              className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-stone-950 font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Memverifikasi Pembayaran Anda...</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-5 h-5 text-stone-950 font-black" />
                  <span>Konfirmasi Berhasil Dikirim!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-stone-950 stroke-[2.5]" />
                  <span>
                    Saya Sudah Bayar (Konfirmasi Deposit Rp {reservation.depositAmount.toLocaleString('id-ID')})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isStaff && (
              <button
                type="button"
                onClick={() => triggerPaymentExecution(true)}
                disabled={isProcessing}
                className="py-3.5 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-semibold cursor-pointer shrink-0"
                title="Bypass langsung lunas untuk uji coba staf"
              >
                ⚡ Bypass Lunas (Staf)
              </button>
            )}
          </div>

          {/* Discreet staff demo bypass indicator if in staff mode */}
          {isStaff && (
            <div className="pt-2 text-center">
              <span className="text-[11px] text-amber-400/80 font-mono">
                [Mode Staf: Tombol utama menyetel status 'Menunggu Verifikasi', tombol petir langsung menyetel 'Lunas']
              </span>
            </div>
          )}

        </div>

        {/* Soft Success Animation State Overlay */}
        {showSuccessOverlay && (
          <div className="absolute inset-0 z-50 bg-[#121c16]/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#18261e] border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl shadow-emerald-950/90 animate-in zoom-in-95 duration-300">
              
              {/* Soft pulsating ring with checkmark */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-stone-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/30">
                  <Check className="w-10 h-10 text-stone-950 stroke-[3.5] animate-in zoom-in-50 duration-200" />
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Status: Menunggu Verifikasi Kasir
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-bold text-[#fcfbf9]">
                  Konfirmasi Pembayaran Diterima!
                </h3>
                <p className="text-xs sm:text-sm text-[#b8c9bf] mt-2 leading-relaxed">
                  Terima kasih! Kami telah menerima konfirmasi pembayaran Anda. Kasir <strong className="text-amber-300">Goory Coffee &amp; Eatery</strong> sedang memverifikasi transaksi. Tiket reservasi digital Anda telah aktif!
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-400 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Membuka E-Tiket Anda...</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
