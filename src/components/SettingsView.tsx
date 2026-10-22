import React, { useState, useEffect } from 'react';
import { 
  User, 
  Store, 
  Bell, 
  CreditCard, 
  Shield, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Lock, 
  Crown, 
  Mail, 
  Phone, 
  Clock, 
  MapPin, 
  Building, 
  Volume2, 
  MessageSquare, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Users,
  DollarSign,
  AlertTriangle,
  QrCode,
  Landmark,
  MessageCircle,
  Copy,
  ExternalLink,
  Instagram,
  Share2
} from 'lucide-react';
import { 
  AppSettings, 
  DEFAULT_APP_SETTINGS, 
  AdminProfile, 
  RestaurantSettings, 
  NotificationSettings, 
  DepositSettings, 
  CrewAccessSettings 
} from '../types/settings';
import { 
  saveAppSettings, 
  resetSettingsToDefault 
} from '../services/settingsService';
import { playChime } from '../utils/audio';

interface SettingsViewProps {
  settings: AppSettings;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onSettingsUpdated?: (newSettings: AppSettings) => void;
  initialTab?: 'profile' | 'restaurant' | 'notifications' | 'deposit' | 'security';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80'
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings: initialSettings,
  isAdmin,
  onOpenAdminLogin,
  onSettingsUpdated,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'restaurant' | 'notifications' | 'deposit' | 'security'>(initialTab);
  
  // Local editable state copies
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(initialSettings.adminProfile);
  const [restaurant, setRestaurant] = useState<RestaurantSettings>(initialSettings.restaurant);
  const [notifications, setNotifications] = useState<NotificationSettings>(initialSettings.notifications);
  const [deposit, setDeposit] = useState<DepositSettings>(initialSettings.deposit);
  const [crewAccess, setCrewAccess] = useState<CrewAccessSettings>(initialSettings.crewAccess);

  // Security & password form state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswordFields, setShowPasswordFields] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // UI status
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Keep local form in sync when parent settings update
  useEffect(() => {
    setAdminProfile(initialSettings.adminProfile);
    setRestaurant(initialSettings.restaurant);
    setNotifications(initialSettings.notifications);
    setDeposit(initialSettings.deposit);
    setCrewAccess(initialSettings.crewAccess);
  }, [initialSettings]);

  // Handle Save
  const handleSaveAll = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setSaveSuccessMessage('');

    try {
      const merged: AppSettings = {
        adminProfile,
        restaurant,
        notifications,
        deposit,
        crewAccess,
        updatedAt: new Date().toISOString(),
        updatedBy: adminProfile.email || 'Admin'
      };

      await saveAppSettings(merged, adminProfile.email);
      if (onSettingsUpdated) {
        onSettingsUpdated(merged);
      }

      playChime();
      setSaveSuccessMessage('Semua pengaturan berhasil disimpan dan disinkronkan secara real-time!');
      setTimeout(() => setSaveSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Update Simulation
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    playChime();
    setPasswordSuccess('Kata sandi Administrator berhasil diperbarui dengan aman!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 4000);
  };

  // Handle Factory Reset
  const handleExecuteReset = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const reset = await resetSettingsToDefault(adminProfile.email);
      setAdminProfile(reset.adminProfile);
      setRestaurant(reset.restaurant);
      setNotifications(reset.notifications);
      setDeposit(reset.deposit);
      setCrewAccess(reset.crewAccess);
      if (onSettingsUpdated) {
        onSettingsUpdated(reset);
      }
      playChime();
      setSaveSuccessMessage('Pengaturan dikembalikan ke konfigurasi standar pabrik!');
      setTimeout(() => setSaveSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Failed to reset settings:', err);
    } finally {
      setIsSaving(false);
      setShowResetConfirmModal(false);
    }
  };

  // IF NOT ADMIN: Render Access Gate
  if (!isAdmin) {
    return (
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Portal Khusus Administrator
            </span>
            <h2 className="text-2xl font-display font-bold text-stone-100">
              Akses Pengaturan Terkunci
            </h2>
            <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
              Pengaturan Profil, Konfigurasi Operasional Restoran, Preferensi Notifikasi, dan Tarif Deposit hanya dapat diakses serta diubah oleh Administrator Resmi melalui verifikasi Email &amp; Password.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 text-left text-xs text-stone-400 space-y-1.5 max-w-md mx-auto">
            <div className="font-semibold text-stone-300 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              Status Peran Anda Saat Ini:
            </div>
            <p>
              Anda sedang masuk dalam <strong className="text-amber-300">Mode Kru / Kasir Operasional</strong>. Kru berhak melayani tamu, meja antrean, dan walk-in, namun tidak memiliki wewenang mengubah kebijakan sistem dan profil.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenAdminLogin}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 mx-auto cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Crown className="w-4 h-4" />
              <span>Login Sebagai Administrator</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      
      {/* Header bar with Status, Save Button, and Factory Reset */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-stone-100">
                Pusat Pengaturan Sistem &amp; Profil
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-stone-950 shadow-xs">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Konfigurasi profil eksekutif, jam operasional restoran, preferensi notifikasi, dan skema deposit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kembalikan semua pengaturan ke nilai default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in-50 duration-200 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Settings Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-stone-800/80 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/60 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800/80'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profil Administrator</span>
        </button>

        <button
          onClick={() => setActiveTab('restaurant')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'restaurant'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/60 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800/80'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Restoran &amp; Jam Buka</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/60 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800/80'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Pengaturan Notifikasi</span>
        </button>

        <button
          onClick={() => setActiveTab('deposit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'deposit'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/60 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800/80'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Tarif Deposit &amp; Finansial</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/60 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800/80'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Akses Kru &amp; Keamanan</span>
        </button>
      </div>

      {/* TAB 1: PROFIL ADMINISTRATOR */}
      {activeTab === 'profile' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl">
          <div className="border-b border-stone-800/80 pb-5">
            <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-400" />
              Informasi Akun &amp; Identitas Administrator
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Data ini digunakan untuk identifikasi tanda tangan laporan, hak istimewa sistem, dan komunikasi resmi restoran.
            </p>
          </div>

          {/* Profile Card & Avatar Selection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <div className="relative group">
              <img
                src={adminProfile.avatarUrl || PRESET_AVATARS[0]}
                alt={adminProfile.name}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
                <Crown className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-stone-100">{adminProfile.name}</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Super Administrator
                </span>
              </div>
              <p className="text-xs text-stone-400">{adminProfile.department}</p>
              
              {/* Preset avatar choices */}
              <div className="pt-1">
                <span className="text-[11px] text-stone-400 block mb-1.5">Pilih Foto Avatar Cepat:</span>
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAdminProfile({ ...adminProfile, avatarUrl: url })}
                      className={`w-8 h-8 rounded-xl overflow-hidden ring-1 transition-all cursor-pointer ${
                        adminProfile.avatarUrl === url
                          ? 'ring-amber-400 scale-110 shadow-md shadow-amber-500/30'
                          : 'ring-stone-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar option ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Nama Lengkap Administrator
              </label>
              <input
                type="text"
                value={adminProfile.name}
                onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500 transition-colors"
                placeholder="Nama Administrator"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                Email Administrator Resmi
              </label>
              <input
                type="email"
                value={adminProfile.email}
                onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500 transition-colors font-mono"
                placeholder="admin@savourandco.id"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="tel"
                value={adminProfile.phone}
                onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500 transition-colors font-mono"
                placeholder="+62 812-xxxx-xxxx"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                Departemen / Jabatan
              </label>
              <input
                type="text"
                value={adminProfile.department}
                onChange={(e) => setAdminProfile({ ...adminProfile, department: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500 transition-colors"
                placeholder="General Management"
              />
            </div>
          </div>

          {/* Change Password Sub-Section */}
          <div className="pt-4 border-t border-stone-800/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Keamanan &amp; Kata Sandi Akun
                </h4>
                <p className="text-xs text-stone-400">
                  Ganti kata sandi master untuk akses Portal Administrator Goory Coffee &amp; Eatery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                {showPasswordFields ? 'Tutup Formulir Sandi' : 'Ubah Kata Sandi'}
              </button>
            </div>

            {showPasswordFields && (
              <form onSubmit={handleUpdatePassword} className="p-4 sm:p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4 animate-in fade-in-50 duration-150">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-400">Kata Sandi Saat Ini</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-400">Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                      placeholder="Min. 6 Karakter"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-400">Konfirmasi Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
                      placeholder="Ketik Ulang Sandi"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Perbarui Kata Sandi
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESTORAN & JAM OPERASIONAL */}
      {activeTab === 'restaurant' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-stone-800/80 pb-5">
            <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400" />
              Profil Restoran &amp; Jam Operasional
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Aturan jam buka, toleransi keterlambatan, dan estimasi waktu santap yang berlaku di alur reservasi publik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Nama Restoran / Brand</label>
              <input
                type="text"
                value={restaurant.restaurantName}
                onChange={(e) => setRestaurant({ ...restaurant, restaurantName: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Slogan / Tagline</label>
              <input
                type="text"
                value={restaurant.tagline}
                onChange={(e) => setRestaurant({ ...restaurant, tagline: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Alamat Lengkap Bistro
              </label>
              <input
                type="text"
                value={restaurant.address}
                onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Nomor Telepon Hotline Restoran
              </label>
              <input
                type="text"
                value={restaurant.phone}
                onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                Email Layanan Konsumen (Concierge)
              </label>
              <input
                type="email"
                value={restaurant.email}
                onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Sub-Section: WhatsApp Kontak Tamu & Rekening Bank Pemilik Restoran */}
          <div className="pt-5 border-t border-stone-800/80 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <MessageCircle className="w-4.5 h-4.5 text-emerald-400" />
                <span>Nomor Kontak WhatsApp Tamu &amp; Rekening Bank Pemilik Restoran</span>
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                Atur nomor WhatsApp resmi yang dapat langsung dihubungi oleh pengunjung/tamu, serta rekening bank pemilik resto untuk tujuan pembayaran deposit reservasi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WhatsApp Kontak Tamu */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-stone-950 to-stone-950 border border-emerald-500/35 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    Nomor WhatsApp Resmi (Tamu &amp; Concierge)
                  </label>
                  {restaurant.whatsappNumber && (
                    <a
                      href={`https://wa.me/${restaurant.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
                      title="Uji coba chat ke nomor ini"
                    >
                      <span>Uji Buka Chat</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    value={restaurant.whatsappNumber}
                    onChange={(e) => setRestaurant({ ...restaurant, whatsappNumber: e.target.value })}
                    placeholder="+62 812-8899-7766"
                    className="w-full bg-stone-900 border border-stone-700 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono transition-colors focus:outline-hidden"
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-[#c2d3ca] space-y-1">
                  <span className="font-semibold text-emerald-300 block">✓ Integrasi Tamu Aktif:</span>
                  <p>
                    Nomor WhatsApp ini otomatis terpasang pada footer tamu, tombol bantuan reservasi, dan tiket digital agar tamu dapat menghubungi pihak resto secara instan.
                  </p>
                </div>
              </div>

              {/* Rekening Bank Pemilik Restoran */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-stone-950 to-stone-950 border border-amber-500/35 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-amber-400" />
                    Rekening Bank Pemilik Restoran
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    Penerima Resmi
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-stone-400 font-medium block mb-1">
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      value={restaurant.ownerBankName}
                      onChange={(e) => setRestaurant({ ...restaurant, ownerBankName: e.target.value })}
                      placeholder="Contoh: Bank Central Asia (BCA)"
                      className="w-full bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-stone-100 transition-colors focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 font-medium block mb-1">
                      Nomor Rekening Pemilik Restoran
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={restaurant.ownerAccountNumber}
                        onChange={(e) => setRestaurant({ ...restaurant, ownerAccountNumber: e.target.value })}
                        placeholder="Contoh: 8077-1299-8800"
                        className="w-full bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono tracking-wider transition-colors focus:outline-hidden pr-18"
                      />
                      {restaurant.ownerAccountNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(restaurant.ownerAccountNumber);
                            setCopiedAccount(true);
                            setTimeout(() => setCopiedAccount(false), 2000);
                          }}
                          className="absolute right-1.5 text-[10px] px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAccount ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 font-medium block mb-1">
                      Nama Pemilik Rekening (Atas Nama / A.N)
                    </label>
                    <input
                      type="text"
                      value={restaurant.ownerAccountHolder}
                      onChange={(e) => setRestaurant({ ...restaurant, ownerAccountHolder: e.target.value })}
                      placeholder="Contoh: Goory Coffee & Eatery"
                      className="w-full bg-stone-900 border border-stone-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-stone-100 transition-colors focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Banking Preview Card */}
                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">Pratinjau Rekening:</span>
                  <span className="font-mono text-amber-200 font-bold truncate max-w-[220px]">
                    {restaurant.ownerBankName || 'Bank'} • {restaurant.ownerAccountNumber || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Media Sosial & Google Maps (Goory Coffee & Eatery) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#18261e] via-[#1a2b21] to-[#142018] border border-[#374e40] space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#304538] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-amber-500/20 text-pink-300 border border-pink-500/30">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#fcfbf9] flex items-center gap-2">
                    Media Sosial Resmi &amp; Titik Lokasi Google Maps
                  </h4>
                  <p className="text-xs text-[#a3b7aa]">
                    Tautan ini tampil di bagian Hero berlatar foto estetik dan footer untuk mempermudah tamu berkunjung.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  Instagram Handle
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={restaurant.instagramHandle || ''}
                    onChange={(e) => setRestaurant({ ...restaurant, instagramHandle: e.target.value })}
                    placeholder="@goorycoffee"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-pink-500"
                  />
                  {restaurant.instagramHandle && (
                    <a
                      href={`https://instagram.com/${restaurant.instagramHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-0.5"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <span className="text-xs font-bold text-cyan-400">🎵</span>
                  TikTok Handle
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={restaurant.tiktokHandle || ''}
                    onChange={(e) => setRestaurant({ ...restaurant, tiktokHandle: e.target.value })}
                    placeholder="@goorycoffee"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-cyan-500"
                  />
                  {restaurant.tiktokHandle && (
                    <a
                      href={`https://tiktok.com/@${restaurant.tiktokHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Tautan Titik Google Maps
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={restaurant.googleMapsUrl || ''}
                    onChange={(e) => setRestaurant({ ...restaurant, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-rose-500"
                  />
                  {restaurant.googleMapsUrl && (
                    <a
                      href={restaurant.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
                    >
                      <span>Peta</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Operating hours & Capacity */}
          <div className="pt-4 border-t border-stone-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Jam Operasional &amp; Kapasitas Pelayanan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
                <label className="text-[11px] font-semibold text-stone-400 block">Jam Buka Restoran</label>
                <input
                  type="time"
                  value={restaurant.openTime}
                  onChange={(e) => setRestaurant({ ...restaurant, openTime: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-[10px] text-stone-400">Slot reservasi dibuka mulai jam ini</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
                <label className="text-[11px] font-semibold text-stone-400 block">Jam Tutup Restoran</label>
                <input
                  type="time"
                  value={restaurant.closeTime}
                  onChange={(e) => setRestaurant({ ...restaurant, closeTime: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-[10px] text-stone-400">Pesanan terakhir &amp; penutupan gerbang</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
                <label className="text-[11px] font-semibold text-stone-400 block">Kapasitas Maksimal (Pax)</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={restaurant.maxCapacity}
                  onChange={(e) => setRestaurant({ ...restaurant, maxCapacity: parseInt(e.target.value) || 120 })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-[10px] text-stone-400">Pemicu otomatis Antrean Virtual jika penuh</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
                <label className="text-[11px] font-semibold text-stone-400 block">Toleransi Terlambat (Menit)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={restaurant.gracePeriodMinutes}
                  onChange={(e) => setRestaurant({ ...restaurant, gracePeriodMinutes: parseInt(e.target.value) || 15 })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-[10px] text-stone-400">Hold meja sebelum dialihkan ke waitlist</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENGATURAN NOTIFIKASI */}
      {activeTab === 'notifications' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-stone-800/80 pb-5">
            <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Preferensi Notifikasi &amp; Alert Real-Time
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Atur pemberitahuan audio chime di dashboard kasir, otomatisasi SMS untuk pelanggan, dan interval panggilan antrean.
            </p>
          </div>

          <div className="space-y-4">
            {/* Audio chime toggle */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100">Efek Suara Notifikasi (Audio Chime)</h4>
                  <p className="text-xs text-stone-400">
                    Memutar denting audio lembut setiap kali ada reservasi baru, tamu tiba di lokasi, atau pesan obrolan waitlist masuk.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => playChime()}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  Tes Suara
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.soundChimeEnabled}
                    onChange={(e) => setNotifications({ ...notifications, soundChimeEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-stone-950 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            {/* SMS Booking Confirmation */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100">Otomatisasi SMS Konfirmasi Reservasi</h4>
                  <p className="text-xs text-stone-400">
                    Mengirimkan SMS bukti booking beserta nomor tiket dan QR check-in langsung ke nomor telepon WhatsApp/SMS tamu.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={notifications.smsAutoDispatch}
                  onChange={(e) => setNotifications({ ...notifications, smsAutoDispatch: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-stone-950 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* SMS Table Ready Alert */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100">SMS Otomatis Panggilan Antrean Meja Siap</h4>
                  <p className="text-xs text-stone-400">
                    Kirim pesan instan saat staf menekan tombol "Panggil Tamu" di dashboard antrean virtual agar tamu segera menuju resepsionis.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer self-end sm:self-auto">
                <input
                  type="checkbox"
                  checked={notifications.smsTableReadyAlert}
                  onChange={(e) => setNotifications({ ...notifications, smsTableReadyAlert: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-stone-950 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Waitlist call interval */}
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-100">Batas Waktu Tunggu Respon Panggilan Tamu</h4>
                <p className="text-xs text-stone-400">
                  Batas waktu toleransi kedatangan setelah SMS "Meja Anda Siap" terkirim sebelum nomor dialihkan ke antrean berikutnya.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={notifications.waitlistCallIntervalMinutes}
                  onChange={(e) => setNotifications({ ...notifications, waitlistCallIntervalMinutes: parseInt(e.target.value) || 10 })}
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-sm text-stone-100 font-mono text-center focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-xs text-stone-400">Menit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TARIF DEPOSIT & FINANSIAL */}
      {activeTab === 'deposit' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-stone-800/80 pb-5">
            <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              Tarif Deposit Reservasi &amp; Ketentuan Finansial
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Sesuaikan besaran deposit penguncian meja, batas waktu pembayaran, dan metode pembayaran aktif di sistem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Scheme Type */}
            <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
              <label className="text-xs font-semibold text-stone-300 block">Skema Perhitungan Deposit</label>
              <select
                value={deposit.depositType}
                onChange={(e) => setDeposit({ ...deposit, depositType: e.target.value as any })}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-hidden focus:border-amber-500"
              >
                <option value="fixed_per_person">Nominal Tetap Per Tamu (Pax)</option>
                <option value="percentage">Persentase Minimum Spend (25%)</option>
                <option value="fixed_per_table">Nominal Tetap Per Meja</option>
              </select>
              <p className="text-[10px] text-stone-400">Dihitung otomatis saat tamu memilih jumlah kursi</p>
            </div>

            {/* Fixed fee per person */}
            <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
              <label className="text-xs font-semibold text-stone-300 block">Biaya Deposit Standar / Orang</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-amber-400">Rp</span>
                <input
                  type="number"
                  step="25000"
                  value={deposit.fixedDepositPerPerson}
                  onChange={(e) => setDeposit({ ...deposit, fixedDepositPerPerson: parseInt(e.target.value) || 0 })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-stone-400">Standar: Rp 100.000 / Tamu</p>
            </div>

            {/* VIP Suite Minimum Spend */}
            <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
              <label className="text-xs font-semibold text-stone-300 block">Min. Spend VIP Private Suite</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-amber-400">Rp</span>
                <input
                  type="number"
                  step="100000"
                  value={deposit.minSpendVip}
                  onChange={(e) => setDeposit({ ...deposit, minSpendVip: parseInt(e.target.value) || 0 })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-stone-400">Batas minimum konsumsi meja VIP</p>
            </div>

            {/* Payment Expiry */}
            <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
              <label className="text-xs font-semibold text-stone-300 block">Batas Waktu Bayar Deposit</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={deposit.paymentExpiryMinutes}
                  onChange={(e) => setDeposit({ ...deposit, paymentExpiryMinutes: parseInt(e.target.value) || 30 })}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-hidden focus:border-amber-500 text-center"
                />
                <span className="text-xs text-stone-400">Menit</span>
              </div>
              <p className="text-[10px] text-stone-400">Setelah batas ini habis, slot meja otomatis dirilis kembali</p>
            </div>
          </div>

          {/* Active Payment Gateways */}
          <div className="pt-4 border-t border-stone-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Metode Pembayaran Deposit Aktif
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { key: 'qris', label: 'QRIS Real-Time' },
                { key: 'bca_va', label: 'BCA Virtual Account' },
                { key: 'mandiri_va', label: 'Mandiri Virtual Account' },
                { key: 'bni_va', label: 'BNI Virtual Account' },
                { key: 'bri_va', label: 'BRI Virtual Account' },
                { key: 'gopay', label: 'GoPay E-Wallet' },
                { key: 'ovo', label: 'OVO E-Wallet' },
                { key: 'credit_card', label: 'Kartu Kredit (Visa/MC)' }
              ].map((item) => {
                const isChecked = deposit.activePaymentMethods[item.key as keyof typeof deposit.activePaymentMethods] ?? true;
                return (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-amber-950/20 border-amber-500/40 text-stone-200'
                        : 'bg-stone-950/60 border-stone-800 text-stone-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        setDeposit({
                          ...deposit,
                          activePaymentMethods: {
                            ...deposit.activePaymentMethods,
                            [item.key]: e.target.checked
                          }
                        });
                      }}
                      className="rounded border-stone-700 text-amber-500 focus:ring-0"
                    />
                    <span className="font-medium">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Rekening Tujuan Deposit Pemilik Restoran */}
          <div className="pt-4 border-t border-stone-800/80">
            <div className="p-4 rounded-2xl bg-[#131e18] border border-[#354c3e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#fcfbf9] flex items-center gap-1.5">
                    <span>Rekening Penampung Deposit Resmi (Pemilik Restoran)</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
                      Terhubung
                    </span>
                  </h5>
                  <p className="text-[11px] text-[#b8c9bf] font-mono mt-0.5">
                    {restaurant.ownerBankName || 'Bank'} — {restaurant.ownerAccountNumber || 'Belum diatur'} (a.n. {restaurant.ownerAccountHolder || 'Pemilik Resto'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('restaurant')}
                className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer self-start sm:self-auto font-medium"
              >
                Ubah di Profil Restoran ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AKSES KRU & KEAMANAN */}
      {activeTab === 'security' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-stone-800/80 pb-5">
            <h3 className="text-lg font-display font-bold text-stone-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Kontrol Akses Kru &amp; Keamanan Internal
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Kelola PIN operasional kasir untuk kru lantai dan tentukan batasan wewenang antara Admin dan Staf.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crew PIN Setup */}
            <div className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-stone-100">PIN Masuk Kru Operasional (4 Digit)</h4>
              </div>
              <p className="text-xs text-stone-400">
                PIN ini digunakan kru untuk membuka mode kasir, mencatat walk-in, dan mengatur pemanggilan antrean meja tanpa akses ke pengaturan.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-300">PIN Utama Staf</label>
                <input
                  type="text"
                  maxLength={4}
                  value={crewAccess.crewPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCrewAccess({ ...crewAccess, crewPin: val });
                  }}
                  className="w-36 bg-stone-900 border border-stone-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-amber-300 focus:outline-hidden focus:border-amber-500"
                  placeholder="1234"
                />
              </div>

              <div className="text-[11px] text-stone-400 space-y-1 border-t border-stone-800/80 pt-3">
                <span className="font-semibold text-stone-300 block">Daftar PIN Cadangan / Supervisor:</span>
                <div className="flex items-center gap-2 font-mono text-stone-400">
                  <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800">1234 (Default)</span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800">1988 (Manager)</span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800">8888 (Floor Lead)</span>
                </div>
              </div>
            </div>

            {/* Role Privilege Matrix */}
            <div className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-stone-100">Matriks Hak Akses Staf vs Admin</h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800/60">
                  <span className="text-stone-300">Akses Pengaturan Profil &amp; Sistem</span>
                  <span className="text-amber-400 font-bold font-mono">HANYA ADMIN</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800/60">
                  <span className="text-stone-300">Ubah Jam Buka &amp; Tarif Deposit</span>
                  <span className="text-amber-400 font-bold font-mono">HANYA ADMIN</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800/60">
                  <span className="text-stone-300">Ekspor Laporan Reservasi CSV</span>
                  <span className="text-emerald-400 font-medium font-mono">Admin &amp; Kru Kasir</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800/60">
                  <span className="text-stone-300">Panggil &amp; Dudukkan Tamu Waitlist</span>
                  <span className="text-emerald-400 font-medium font-mono">Admin &amp; Kru Kasir</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800/60">
                  <span className="text-stone-300">Input Tamu Walk-in Meja Kosong</span>
                  <span className="text-emerald-400 font-medium font-mono">Admin &amp; Kru Kasir</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FACTORY RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-stone-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-display font-bold">Kembalikan ke Nilai Pabrik?</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Tindakan ini akan mengembalikan seluruh jam operasional, profil default, notifikasi, dan biaya deposit ke konfigurasi awal sistem Goory Coffee &amp; Eatery.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-colors cursor-pointer"
              >
                Ya, Reset Default
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
