import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  RotateCcw, 
  Flashlight, 
  FlashlightOff, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Phone, 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  Armchair, 
  Utensils, 
  ArrowRight,
  RefreshCw,
  QrCode,
  Keyboard,
  Upload,
  Crown
} from 'lucide-react';
import { Reservation, RestaurantTable } from '../types/restaurant';
import { updateReservationStatus } from '../services/restaurantService';
import { playChime } from '../utils/audio';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  tables: RestaurantTable[];
  onReservationUpdated?: (updated: Reservation) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  reservations,
  tables,
  onReservationUpdated
}) => {
  // Tabs: 'camera' | 'manual' | 'presets'
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'presets'>('camera');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Scanned reservation match
  const [matchedReservation, setMatchedReservation] = useState<Reservation | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Manual fallback input
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [manualSearchError, setManualSearchError] = useState<string | null>(null);

  // Helper to extract booking code or phone from raw scanned string
  const parseScannedData = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    // 1. Check if JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.bookingCode) return String(parsed.bookingCode).trim();
        if (parsed.code) return String(parsed.code).trim();
        if (parsed.phone) return String(parsed.phone).trim();
      } catch {
        // ignore JSON parse fail
      }
    }
    // 2. Check if URL with code parameter: ?code=SAV-8421 or /pass/SAV-8421
    if (trimmed.includes('http://') || trimmed.includes('https://')) {
      try {
        const url = new URL(trimmed);
        const codeParam = url.searchParams.get('code') || url.searchParams.get('bookingCode');
        if (codeParam) return codeParam.trim();
      } catch {
        // ignore URL parse fail
      }
    }
    // 3. Check regex for SAV-XXXX
    const savMatch = trimmed.match(/SAV-?[0-9A-Za-z]{3,6}/i);
    if (savMatch) {
      return savMatch[0].toUpperCase();
    }
    return trimmed;
  }, []);

  // Find reservation by booking code or phone
  const findReservation = useCallback((query: string): Reservation | null => {
    if (!query) return null;
    const cleanQuery = query.trim().toUpperCase();
    const cleanPhone = query.trim().replace(/[^0-9]/g, '');

    // Search by exact booking code
    let match = reservations.find(r => r.bookingCode.toUpperCase() === cleanQuery);
    if (match) return match;

    // Search by partial booking code (e.g., "8421" inside "SAV-8421")
    match = reservations.find(r => r.bookingCode.toUpperCase().includes(cleanQuery));
    if (match) return match;

    // Search by phone number
    if (cleanPhone.length >= 4) {
      match = reservations.find(r => {
        const rPhone = r.customerPhone.replace(/[^0-9]/g, '');
        return rPhone.includes(cleanPhone) || cleanPhone.includes(rPhone);
      });
      if (match) return match;
    }

    // Search by customer name
    match = reservations.find(r => r.customerName.toLowerCase().includes(query.toLowerCase().trim()));
    return match || null;
  }, [reservations]);

  // Handle successful scan match
  const handleScanSuccess = useCallback((decodedText: string) => {
    const extracted = parseScannedData(decodedText);
    const found = findReservation(extracted);

    if (found) {
      playChime('success');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 100]);
        } catch {
          // ignore
        }
      }
      setMatchedReservation(found);
      setActionSuccessMessage(null);
    } else {
      // Scanned code not found in current reservations list
      playChime('alert');
      setManualSearchError(`Kode "${extracted}" tidak cocok dengan reservasi aktif.`);
    }
  }, [findReservation, parseScannedData]);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Kamera tidak didukung pada browser ini. Silakan gunakan tab Input Manual.');
      setActiveTab('manual');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Check torch capabilities
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as unknown as { torch?: boolean }) : null;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      const error = err as { name?: string; message?: string };
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera ditolak. Berikan izin di browser atau gunakan tab Input Manual.');
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        setCameraError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setCameraError('Tidak dapat mengakses kamera. Silakan gunakan tab Input Manual.');
      }
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newTorch = !torchOn;
      // @ts-expect-error advanced torch constraint
      await track.applyConstraints({ advanced: [{ torch: newTorch }] });
      setTorchOn(newTorch);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  };

  // Flip Camera (environment <-> user)
  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Continuous frame scanner loop
  useEffect(() => {
    if (!cameraActive || !isOpen || matchedReservation) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    let isScanning = true;

    // Check if native BarcodeDetector is available
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let detector: any = null;
    if (hasBarcodeDetector) {
      try {
        // @ts-expect-error BarcodeDetector native API
        detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39'] });
      } catch {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 1. Try native BarcodeDetector first for hardware acceleration
          if (detector) {
            try {
              const barcodes = await detector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleScanSuccess(barcodes[0].rawValue);
                return; // Stop scan loop once detected
              }
            } catch {
              // Fall through to jsQR
            }
          }

          // 2. Fallback to jsQR pure JS decoder
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (qrCode && qrCode.data) {
              handleScanSuccess(qrCode.data);
              return; // Stop scan loop once detected
            }
          } catch {
            // Ignore scan frame decode errors
          }
        }
      }

      if (isScanning && !matchedReservation) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [cameraActive, isOpen, matchedReservation, handleScanSuccess]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMatchedReservation(null);
      setManualSearchError(null);
      setActionSuccessMessage(null);
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Re-start camera when changing to camera tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !matchedReservation) {
      startCamera();
    } else if (activeTab !== 'camera') {
      stopCamera();
    }
  }, [activeTab, isOpen, matchedReservation, startCamera]);

  // Handle Manual Code / Phone Search
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setManualSearchError(null);
    if (!manualCodeInput.trim()) return;

    const found = findReservation(manualCodeInput);
    if (found) {
      playChime('success');
      setMatchedReservation(found);
      setActionSuccessMessage(null);
    } else {
      playChime('alert');
      setManualSearchError(`Reservasi dengan kode/nomor "${manualCodeInput}" tidak ditemukan.`);
    }
  };

  // Handle File Upload QR scan
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleScanSuccess(code.data);
          } else {
            setManualSearchError('QR Code tidak dapat dibaca dari gambar yang diunggah.');
            playChime('alert');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Mark reservation as 'arrived' (Kedatangan Tamu)
  const handleMarkAsArrived = async () => {
    if (!matchedReservation) return;
    setIsProcessingAction(true);
    try {
      await updateReservationStatus(matchedReservation.id, 'arrived', matchedReservation.tableId);
      const updated: Reservation = {
        ...matchedReservation,
        status: 'arrived',
        updatedAt: new Date().toISOString()
      };
      setMatchedReservation(updated);
      setActionSuccessMessage(`Tamu "${updated.customerName}" berhasil ditandai HADIR di meja ${updated.tableName}!`);
      playChime('success');
      if (onReservationUpdated) onReservationUpdated(updated);
    } catch (err) {
      console.error('Failed to update arrival status:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Fast-track: Mark reservation directly as 'seated' (Duduk di Meja)
  const handleSeatGuest = async () => {
    if (!matchedReservation) return;
    setIsProcessingAction(true);
    try {
      await updateReservationStatus(matchedReservation.id, 'seated', matchedReservation.tableId);
      const updated: Reservation = {
        ...matchedReservation,
        status: 'seated',
        updatedAt: new Date().toISOString()
      };
      setMatchedReservation(updated);
      setActionSuccessMessage(`Tamu "${updated.customerName}" telah menempati meja ${updated.tableName}. Status meja: Occupied.`);
      playChime('ding');
      if (onReservationUpdated) onReservationUpdated(updated);
    } catch (err) {
      console.error('Failed to seat guest:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Reset and scan next guest pass
  const handleScanNext = () => {
    setMatchedReservation(null);
    setActionSuccessMessage(null);
    setManualSearchError(null);
    setManualCodeInput('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Hidden canvas used for video frame reading */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-lg bg-stone-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md">
              <QrCode className="w-5 h-5 text-stone-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-stone-100 flex items-center gap-2">
                Pemindai QR Pass Tamu
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Staf Check-in
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Pindai pass digital untuk menandai kedatangan tamu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup Pemindai"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Camera / Manual Fallback / Presets) */}
        {!matchedReservation && (
          <div className="grid grid-cols-3 border-b border-stone-800 bg-stone-950/50 p-1 text-xs">
            <button
              onClick={() => setActiveTab('camera')}
              className={`py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Input Manual</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Uji Tes</span>
            </button>
          </div>
        )}

        {/* Main Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">

          {/* STATE 1: MATCHED RESERVATION SUMMARY PREVIEW CARD (Requested by user!) */}
          {matchedReservation ? (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              
              {/* Notification Banner if action succeeded */}
              {actionSuccessMessage && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs font-medium animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {/* Reservation Summary Card */}
              <div className="bg-stone-950 rounded-2xl border border-stone-800 p-5 space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Top Badge & Booking Code */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                      Kode Reservasi Terverifikasi
                    </span>
                    <span className="text-2xl font-black font-mono tracking-wider text-amber-400">
                      {matchedReservation.bookingCode}
                    </span>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${
                    matchedReservation.status === 'arrived'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : matchedReservation.status === 'seated'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : matchedReservation.status === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {matchedReservation.status === 'arrived'
                      ? '✓ Telah Hadir'
                      : matchedReservation.status === 'seated'
                      ? '✓ Sedang Bersantap'
                      : matchedReservation.status === 'confirmed'
                      ? 'Terkonfirmasi'
                      : matchedReservation.status}
                  </span>
                </div>

                {/* Guest Profile & Table Info */}
                <div className="space-y-1.5 pt-2 border-t border-stone-800/80">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-display font-bold text-stone-100">
                      {matchedReservation.customerName}
                    </h3>
                    {matchedReservation.tableSection.includes('VIP') && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3 h-3 text-amber-400" />
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-amber-400" />
                    <span>{matchedReservation.customerPhone}</span>
                    <span>•</span>
                    <span className="text-stone-300">{matchedReservation.customerEmail}</span>
                  </p>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-900/80 rounded-xl border border-stone-800/60 text-xs">
                  <div>
                    <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                      <Armchair className="w-3 h-3 text-amber-400" />
                      Meja Restoran
                    </span>
                    <span className="font-bold text-stone-200 mt-0.5 block">
                      {matchedReservation.tableName}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {matchedReservation.tableSection}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                      <Users className="w-3 h-3 text-amber-400" />
                      Jumlah Tamu
                    </span>
                    <span className="font-bold text-stone-200 mt-0.5 block">
                      {matchedReservation.guestsCount} Orang
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {matchedReservation.occasion}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      Jadwal Tanggal
                    </span>
                    <span className="font-bold text-stone-200 mt-0.5 block">
                      {matchedReservation.date}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Waktu Reservasi
                    </span>
                    <span className="font-bold text-stone-200 mt-0.5 block">
                      {matchedReservation.timeSlot} WIB
                    </span>
                  </div>
                </div>

                {/* Dietary & Special Requests if any */}
                {(matchedReservation.specialNotes || matchedReservation.dietaryRequests) && (
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      Catatan Tamu &amp; Diet:
                    </span>
                    <p className="text-stone-300 italic">
                      "{matchedReservation.specialNotes || matchedReservation.dietaryRequests}"
                    </p>
                  </div>
                )}

                {/* Deposit status */}
                <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
                  <span>Status Deposit:</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    Rp {matchedReservation.depositAmount.toLocaleString('id-ID')} ({matchedReservation.paymentStatus.toUpperCase()})
                  </span>
                </div>
              </div>

              {/* Action Buttons: Confirm Arrival vs Seat Guest */}
              <div className="space-y-2 pt-2">
                {matchedReservation.status !== 'arrived' && matchedReservation.status !== 'seated' && (
                  <button
                    onClick={handleMarkAsArrived}
                    disabled={isProcessingAction}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-stone-950 stroke-[2.5]" />
                    <span>{isProcessingAction ? 'Menyimpan Kedatangan...' : 'Konfirmasi: Tandai Hadir (Check-in)'}</span>
                  </button>
                )}

                {matchedReservation.status === 'arrived' && (
                  <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-center text-xs text-teal-300 font-medium">
                    ✓ Tamu sudah ditandai hadir di resepsionis. Persilakan tamu ke Meja {matchedReservation.tableName}.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSeatGuest}
                    disabled={isProcessingAction || matchedReservation.status === 'seated'}
                    className={`py-3 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      matchedReservation.status === 'seated'
                        ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-700'
                    }`}
                  >
                    <Armchair className="w-4 h-4 text-cyan-400" />
                    <span>{matchedReservation.status === 'seated' ? 'Sudah Duduk' : 'Langsung Duduk (Seat)'}</span>
                  </button>

                  <button
                    onClick={handleScanNext}
                    className="py-3 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>Pindai Berikutnya</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            // STATE 2: SCANNING TABS (Camera / Manual / Presets)
            <>
              {/* TAB 1: LIVE CAMERA SCANNER */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  
                  {cameraError ? (
                    <div className="p-6 rounded-2xl bg-stone-950 border border-rose-500/40 text-center space-y-3">
                      <CameraOff className="w-10 h-10 mx-auto text-rose-400" />
                      <div className="text-xs text-rose-300 font-medium">
                        {cameraError}
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={startCamera}
                          className="py-2 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Coba Lagi
                        </button>
                        <button
                          onClick={() => setActiveTab('manual')}
                          className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                          Input Manual
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-[340px] border border-stone-800 flex items-center justify-center">
                      
                      {/* Live Video Element */}
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover"
                      />

                      {/* Optical Scanner Reticle Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-3/4 h-3/4 max-w-[240px] max-h-[240px] border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                          
                          {/* Corner markers */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                          {/* Animated laser scan line */}
                          <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce" />
                        </div>
                      </div>

                      {/* Top Camera Controls (Torch & Flip) */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {hasTorch && (
                          <button
                            onClick={toggleTorch}
                            className={`p-2 rounded-xl backdrop-blur-md transition-colors cursor-pointer ${
                              torchOn ? 'bg-amber-500 text-stone-950' : 'bg-black/60 text-white hover:bg-black/80'
                            }`}
                            title="Nyalakan Lampu Kilat (Flash)"
                          >
                            {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={flipCamera}
                          className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                          title="Putar Kamera (Depan/Belakang)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Helper hint */}
                      <div className="absolute bottom-3 inset-x-4 text-center">
                        <span className="text-[11px] bg-black/70 backdrop-blur-md text-stone-300 px-3 py-1 rounded-full border border-stone-700/50">
                          Arahkan kamera ke QR Code pada E-Tiket Tamu
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500 text-center">
                    Sistem otomatis mendeteksi QR pass dan menampilkan rincian meja tamu dalam hitungan detik.
                  </p>
                </div>
              )}

              {/* TAB 2: MANUAL FALLBACK INPUT (Requested by user!) */}
              {activeTab === 'manual' && (
                <div className="space-y-4">
                  <form onSubmit={handleManualSearch} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                        Kode Booking Unik atau Nomor WhatsApp Tamu:
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={manualCodeInput}
                          onChange={(e) => {
                            setManualCodeInput(e.target.value);
                            setManualSearchError(null);
                          }}
                          placeholder="Contoh: SAV-8421 atau 081288..."
                          className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-hidden focus:border-amber-500 font-mono"
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!manualCodeInput.trim()}
                      className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                    >
                      <Search className="w-4 h-4 text-stone-950" />
                      <span>Cari Reservasi &amp; Verifikasi</span>
                    </button>
                  </form>

                  {/* Manual Search Error Message */}
                  {manualSearchError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{manualSearchError}</span>
                    </div>
                  )}

                  {/* Upload QR Image File Fallback */}
                  <div className="pt-2 border-t border-stone-800">
                    <span className="text-[11px] text-stone-400 block mb-2 font-medium">
                      Atau unggah foto tangkapan layar (screenshot) QR Code:
                    </span>
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-stone-700 hover:border-amber-500/50 bg-stone-950 hover:bg-stone-900 text-stone-300 text-xs cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Pilih File Gambar QR Pass</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: DEMO TEST PRESETS (Quick 1-Click Verification for Testing) */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                    <span className="font-bold text-amber-300 block">
                      Pengujian Cepat (Demo Presets):
                    </span>
                    <p className="text-stone-400 text-[11px]">
                      Klik salah satu reservasi aktif di bawah untuk mensimulasikan hasil pemindaian pass tanpa perlu mencetak kode fisik.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {reservations.length === 0 ? (
                      <p className="text-xs text-stone-500 text-center py-4">
                        Belum ada reservasi aktif dalam sistem.
                      </p>
                    ) : (
                      reservations.slice(0, 6).map((res) => (
                        <button
                          key={res.id}
                          onClick={() => {
                            handleScanSuccess(res.bookingCode);
                          }}
                          className="w-full p-2.5 rounded-xl bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/40 text-left text-xs transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-400 group-hover:text-amber-300">
                                {res.bookingCode}
                              </span>
                              <span className="font-semibold text-stone-200">
                                {res.customerName}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400">
                              {res.tableName} • {res.timeSlot} WIB ({res.guestsCount} tamu)
                            </span>
                          </div>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            res.status === 'arrived'
                              ? 'bg-teal-500/20 text-teal-300'
                              : res.status === 'seated'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {res.status}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between text-[11px] text-stone-500">
          <span>Goory Reception Desk Hub</span>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
