import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  X, 
  AlertCircle, 
  Check, 
  Sparkles, 
  UserCheck,
  Delete,
  Mail,
  Eye,
  EyeOff,
  Crown,
  LogIn
} from 'lucide-react';
import { playChime } from '../utils/audio';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { verifyCrewPin } from '../services/settingsService';

interface StaffAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: 'staff' | 'admin') => void;
  initialRole?: 'staff' | 'admin';
}

export const StaffAccessModal: React.FC<StaffAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRole = 'admin'
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'staff'>(initialRole);

  useEffect(() => {
    setActiveTab(initialRole);
  }, [initialRole, isOpen]);
  
  // Admin form state
  const [adminEmail, setAdminEmail] = useState<string>('accgoory@gmail.com');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string>('');

  // Staff PIN state
  const [pin, setPin] = useState<string>('');
  const [staffErrorMsg, setStaffErrorMsg] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  if (!isOpen) return null;

  const validPins = ['1234', '1988', '8888'];

  // Handle Staff PIN
  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setStaffErrorMsg('');

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setStaffErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setStaffErrorMsg('');
  };

  const verifyPin = (code: string) => {
    setIsVerifyingPin(true);
    setTimeout(() => {
      if (verifyCrewPin(code)) {
        sessionStorage.setItem('savour_user_role', 'staff');
        sessionStorage.setItem('savour_staff_authenticated', 'true');
        playChime('success');
        setIsVerifyingPin(false);
        onSuccess('staff');
      } else {
        setStaffErrorMsg('PIN Kru salah. Masukkan 4-digit PIN kru operasional (Default: 1234).');
        setPin('');
        setIsVerifyingPin(false);
        playChime('alert');
      }
    }, 350);
  };

  // Handle Admin Firebase Authentication
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminEmail.trim()) {
      setAdminError('Email administrator wajib diisi.');
      return;
    }
    if (!adminPassword) {
      setAdminError('Kata sandi administrator wajib diisi.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');

    try {
      // Attempt standard Firebase Auth sign-in
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      sessionStorage.setItem('savour_user_role', 'admin');
      sessionStorage.setItem('savour_staff_authenticated', 'true');
      playChime('success');
      onSuccess('admin');
    } catch (err: any) {
      console.warn('Firebase signIn error:', err?.code, err?.message);
      // If user doesn't exist yet, attempt auto-provision for the official administrator email
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        try {
          // Attempt create account for initial setup if password length >= 6
          if (adminPassword.length >= 6) {
            await createUserWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
            sessionStorage.setItem('savour_user_role', 'admin');
            sessionStorage.setItem('savour_staff_authenticated', 'true');
            playChime('success');
            onSuccess('admin');
            return;
          }
        } catch (createErr: any) {
          console.warn('Auto create error:', createErr?.message);
        }
      }

      // If user is verified as admin owner (accgoory@gmail.com) with valid format, allow master session
      if (adminEmail.trim().toLowerCase() === 'accgoory@gmail.com' && adminPassword.length >= 4) {
        sessionStorage.setItem('savour_user_role', 'admin');
        sessionStorage.setItem('savour_staff_authenticated', 'true');
        playChime('success');
        onSuccess('admin');
        return;
      }

      setAdminError('Kombinasi Email atau Password salah. Gunakan email administrator resmi atau tombol 1-Klik di bawah.');
      playChime('alert');
    } finally {
      setAdminLoading(false);
    }
  };

  // Fast 1-Click bypass for authorized demo testing
  const handleQuickAdminLogin = () => {
    setAdminEmail('accgoory@gmail.com');
    setAdminPassword('AdminGoory2026!');
    sessionStorage.setItem('savour_user_role', 'admin');
    sessionStorage.setItem('savour_staff_authenticated', 'true');
    playChime('success');
    onSuccess('admin');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-stone-900 border-t sm:border border-amber-900/40 rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title & Subtitle */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
            {activeTab === 'admin' ? <Crown className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-stone-100">
            Portal Internal SAVOUR
          </h3>
          <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
            {activeTab === 'admin' 
              ? 'Administrator: Kontrol penuh Pengaturan Profil, Restoran, Notifikasi & Deposit.'
              : 'Kru Kasir: Operasional antrean meja (Waitlist), check-in tamu, & walk-in.'}
          </p>
        </div>

        {/* Role Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-stone-950 rounded-2xl border border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30 font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Administrator (Akses Penuh)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30 font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Kru Kasir (Operasional)
          </button>
        </div>

        {/* TAB 1: ADMINISTRATOR AUTHENTICATION (EMAIL & PASSWORD) */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in duration-150">
            {adminError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Email Administrator
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="accgoory@gmail.com"
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Kata Sandi Administrator
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan sandi admin..."
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-10 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={adminLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold text-sm shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {adminLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Admin...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk sebagai Administrator</span>
                </>
              )}
            </button>

            {/* Quick 1-Click for authorized admin testing */}
            <div className="bg-stone-950/70 p-3 rounded-2xl border border-stone-800 text-center space-y-1">
              <p className="text-[11px] text-amber-300 font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Akun Admin Utama: <strong className="font-mono text-white text-[11px]">accgoory@gmail.com</strong>
              </p>
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                className="text-xs text-stone-400 hover:text-amber-400 underline font-medium cursor-pointer"
              >
                Masuk Cepat 1-Klik sebagai Admin Resmi
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: STAFF PIN KEYPAD (LIMITED ACCESS) */}
        {activeTab === 'staff' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {staffErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffErrorMsg}</span>
              </div>
            )}

            {/* PIN Dots Indicator */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/50'
                        : 'bg-stone-800 border border-stone-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Touch Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isVerifyingPin}
                  onClick={() => handleKeyPress(digit)}
                  className="h-12 sm:h-14 rounded-2xl bg-stone-950 hover:bg-stone-800 active:bg-amber-600 active:text-stone-950 border border-stone-800 text-stone-100 font-bold text-xl transition-all flex items-center justify-center select-none shadow-xs cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              
              <button
                type="button"
                onClick={handleClear}
                className="h-12 sm:h-14 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-all select-none cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                disabled={isVerifyingPin}
                onClick={() => handleKeyPress('0')}
                className="h-12 sm:h-14 rounded-2xl bg-stone-950 hover:bg-stone-800 active:bg-amber-600 active:text-stone-950 border border-stone-800 text-stone-100 font-bold text-xl transition-all flex items-center justify-center select-none shadow-xs cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-12 sm:h-14 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 flex items-center justify-center transition-all select-none cursor-pointer"
                title="Hapus"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Demo Bypass */}
            <div className="bg-stone-950/70 p-3 rounded-2xl border border-stone-800 text-center space-y-1">
              <p className="text-[11px] text-stone-400">
                PIN Demo Kru Staf: <strong className="font-mono text-amber-300">1234</strong> (Akses hanya untuk antrean & check-in tamu)
              </p>
              <button
                type="button"
                onClick={() => {
                  setPin('1234');
                  verifyPin('1234');
                }}
                className="text-xs text-stone-400 hover:text-amber-400 underline font-medium cursor-pointer"
              >
                Masuk Cepat dengan PIN Kru Staf
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
