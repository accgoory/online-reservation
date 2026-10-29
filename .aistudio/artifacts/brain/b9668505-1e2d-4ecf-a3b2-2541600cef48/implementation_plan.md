# Rencana & Ringkasan Implementasi: Logika Auto-Refresh QRIS & Pengaturan Kode QRIS

## 1. Pengosongan Data Diri Default Tamu
- **`src/components/ReservationWizard.tsx`**: Isian form pemesanan tamu (`customerName`, `customerPhone`, `customerEmail`, `loyaltyAccount`) telah dikosongkan secara default (`''` dan `null`).
- **`src/App.tsx`**: `activeLoyaltyAccount` diinisialisasi `null` sehingga tamu memulai dengan formulir bersih tanpa data diri bawaan.

---

## 2. Logika Auto-Refresh & Update Gambar QRIS Sesuai Nominal Deposit
- **`src/components/DigitalPaymentGateway.tsx`**:
  - **Sinkronisasi Nominal Otomatis**: QR code selalu disinkronkan secara real-time dengan `reservation.depositAmount` dan kode booking tamu. Setiap kali nominal deposit berubah, QR code langsung di-regenerasi secara otomatis.
  - **Auto-Refresh Countdown**: Timer periodik (sesuai interval di pengaturan, default 60 detik) dengan ticker hitung mundur `(xx s)` dan animasi pembaruan halus.
  - **Tombol Refresh Manual**: Tombol *"Refresh QR Sekarang"* dengan animasi putar (*spin*) untuk memperbarui QR secara instan kapan saja.
  - **Indikator Status Dinamis**: Menampilkan *"Nominal Deposit QR: Rp [Nominal]"* dengan lampu indikator hijau berdenyut (*pulse*) untuk kepastian transaksi.

---

## 3. Konfigurasi Kode QRIS di Menu Pengaturan Admin
- **`src/types/settings.ts` & `src/services/settingsService.ts`**:
  - Menambahkan struktur data `QrisSettings`:
    - `nmid`: National Merchant Identifier (e.g. `ID102039281923`)
    - `merchantName`: Nama merchant resmi (e.g. `GOORY COFFEE & EATERY`)
    - `qrisMode`: Pilihan mode (`dynamic_auto`, `custom_image`, `custom_payload`)
    - `customImageUrl`: URL tautan gambar atau hasil upload base64
    - `customPayload`: Raw string EMVCo QRIS Bank Indonesia
    - `autoRefreshEnabled`: Toggle sakelar aktif/nonaktif auto-refresh
    - `refreshIntervalSeconds`: Interval refresh (30s, 60s, 90s, 120s, 180s)
- **`src/components/SettingsView.tsx` (Tab 4: Tarif Deposit & Finansial)**:
  - Kartu khusus **"Konfigurasi Kode QRIS & Logika Refresh Otomatis"**:
    - Mode selector 3 pilihan interaktif
    - Form ubah NMID dan Nama Merchant
    - Form tautan URL atau upload file foto QRIS langsung dari perangkat pengguna
    - Form textarea untuk custom payload EMVCo
    - Sakelar toggle auto-refresh dan pilihan interval detik
    - Kotak **Live Preview QRIS Tamu** interaktif dengan tombol *"Test Refresh"*
    - Tersinkronisasi secara real-time ke penyimpanan dan backend
