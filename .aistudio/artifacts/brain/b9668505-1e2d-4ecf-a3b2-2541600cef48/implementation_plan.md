# Goory Coffee & Eatery: QRIS Payment Guide & Hero Seasonal Offers

Integrate a step-by-step expandable accordion guide for QRIS payments inside the digital checkout process with merchant name strictly set to **GOORY COFFEE & EATERY**, and introduce a real-time Firestore-backed Floating Seasonal Offers & Coffee Promotions component in the Hero section.

> [!IMPORTANT]
> **User Revisions & Confirmed Decisions:**
> - **Merchant Name Revision**: Ubah nama merchant dari "Savour & Co. / Goory Coffee" menjadi **"GOORY COFFEE & EATERY"** secara konsisten di seluruh alur pembayaran: label di bawah QR code, langkah panduan QRIS ("Pastikan nama merchant: **GOORY COFFEE & EATERY**"), rincian bukti bayar/invoice, serta panduan transfer bank/e-Wallet.
> - **QRIS Guide Presentation**: Expandable accordion card embedded directly below the QR code inside `DigitalPaymentGateway` with clean step-by-step visual badges (Pilih Aplikasi $\to$ Scan QRIS $\to$ Cek Nama Merchant & Nominal $\to$ Konfirmasi Instan).
> - **Seasonal Offers Location**: Floating promotional cards positioned directly below the Hero headline and description, highlighting limited-time artisan coffees, signature blends, and culinary discounts with live availability from the Firestore `menu_items` collection.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Consistent Branding as GOORY COFFEE & EATERY**:
     - The merchant badge printed directly beneath the QR code reads: **GOORY COFFEE & EATERY** (NMID: ID102039281923).
     - Tied dynamically to `appSettings.restaurant.restaurantName` with fallback to `"GOORY COFFEE & EATERY"`, removing all legacy `"SAVOUR & CO."` mentions in the checkout flow.
  2. **Interactive QRIS Guide Accordion**:
     - Inside `DigitalPaymentGateway`, under the QRIS barcode, customers can expand the *"Panduan Pembayaran QRIS Praktis"* card.
     - 4 clear visual steps:
       - **Langkah 1**: Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, OVO, DANA, ShopeePay).
       - **Langkah 2**: Pilih menu **Scan / Bayar QR** dan arahkan kamera ke barcode QRIS.
       - **Langkah 3**: Periksa nama penerima merchant tertera **GOORY COFFEE & EATERY** dan nominal pembayaran sesuai deposit.
       - **Langkah 4**: Masukkan PIN transaksi Anda; verifikasi pembayaran akan terdeteksi otomatis dalam hitungan detik.
     - Includes a helpful mobile tip for saving the QR code to gallery if transacting on a single mobile device.
  3. **Hero Floating Seasonal Offers Component (`HeroSeasonalPromotions.tsx`)**:
     - Placed right under the Hero title & description on the main booking page.
     - Fetches active seasonal items and barista recommendations from Firestore `menu_items` in real time.
     - Features original price vs. promo discount price (e.g. *Goory Signature Iced Aren Latte -25%*, *V60 Single Origin Kintamani -20%*, *Croissant & Flat White Combo*).
     - Clicking a promo opens the digital menu or highlights the item directly.

- **Target Audience / Persona**:
  - Diners and coffee lovers reserving tables at Goory Coffee & Eatery seeking frictionless digital payment without confusion over merchant names or transfer steps.
  - Guests looking for current seasonal beverages, barista specials, and promotional combos.

- **Key Value**:
  - Eliminates merchant identification confusion and payment hesitancy.
  - Provides a frictionless, modern Indonesian fintech checkout experience matching national QRIS standards.
  - Highlights premium coffee craftsmanship directly upon landing.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Landing & Browsing Promos**:
     - Guest lands on the Goory Coffee & Eatery home page.
     - Beneath the hero headline, the floating seasonal promo card deck showcases current seasonal coffee offers with high-res photography, discount percentages, and quick descriptions.
  2. **Booking & QRIS Checkout**:
     - Guest selects a table and enters booking details.
     - On the payment screen, QRIS is selected by default.
     - The QR card clearly displays:
       - **QRIS Standar Nasional**
       - Merchant: **GOORY COFFEE & EATERY**
     - Guest can tap the accordion toggle *"Cara Bayar QRIS dalam 4 Langkah Mudah"* to expand step-by-step guidance.
     - Once guest taps *"Simulasikan Pembayaran Berhasil"*, confetti fires and reservation is confirmed with instant status update.

- **Visual Identity & Theme**:
  - **Color Palette**: Dark botanical luxury (`#0b130e` deep forest backdrop, `#121c16` and `#18261e` card surfaces, `#d97706`/`#f59e0b` warm amber highlights, and emerald accent `#10b981` for verified states).
  - **Typography**: Playfair Display for headers, Plus Jakarta Sans for UI text, and monospace tabular numerals for prices and countdowns.
  - **Anti-Slop Discipline**: No arbitrary pill shapes or bloated decorations; crisp 1px borders (`border-[#354c3e]`), micro-animations on accordion expand/collapse, and accessible contrast ratios.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Merchant Name Uniformity**
  - *Standard*: Strictly standardize on **"GOORY COFFEE & EATERY"** across all payment UI elements, receipts, QR captions, and instructions.
  - *Why*: Directly addresses the user request and prevents customer confusion during banking QR scanning where merchant identity must be immediately recognizable.

- **Decision 2: Expandable Accordion vs Always-Expanded Text**
  - *Chosen Approach*: Accordion default-collapsed or cleanly expandable with a single tap.
  - *Why*: Keeps the QR code immediately accessible and prominent on mobile screens while making full instructions 1 tap away.

- **Decision 3: Real-Time Firestore Synchronization for Promos**
  - *Chosen Approach*: Live subscription to `menu_items` collection filtered for seasonal offers, with graceful fallback to seeded Goory coffee specials.
  - *Why*: Allows staff to toggle availability and discounts in real time from the manager view without requiring code changes.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│                                                                        │
│  ┌───────────────────────── Hero Section ───────────────────────────┐  │
│  │  • Restaurant Title: Goory Coffee & Eatery                       │  │
│  │  • Social Media Quicklinks (IG @goorycoffee, TikTok, WA)         │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │        HeroSeasonalPromotions Component (NEW)              │  │  │
│  │  │  - Real-time Firestore sync with menu_items                │  │  │
│  │  │  - Shows Seasonal Coffee & Eatery Specials                 │  │  │
│  │  │  - Discount tags (-20%, -25%) & live stock availability    │  │  │
│  │  │  - Direct link to open digital menu                        │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────── Checkout Flow ───────────────────────────┐  │
│  │                    DigitalPaymentGateway.tsx                     │  │
│  │                                                                  │  │
│  │  ┌──────────────────── QRIS Tab View ─────────────────────────┐  │  │
│  │  │  - Dynamic QR Code Graphic                                │  │  │
│  │  │  - Merchant Name: "GOORY COFFEE & EATERY"                  │  │  │
│  │  │  - NMID: ID102039281923                                    │  │  │
│  │  │                                                            │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐  │  │  │
│  │  │  │      QRISGuideAccordion Component                    │  │  │  │
│  │  │  │  - Step 1: Buka m-Banking / e-Wallet                 │  │  │  │
│  │  │  │  - Step 2: Pilih Scan QR                             │  │  │  │
│  │  │  │  - Step 3: Pastikan merchant "GOORY COFFEE & EATERY" │  │  │  │
│  │  │  │  - Step 4: Masukkan PIN & bayar                      │  │  │  │
│  │  │  │  - Mobile screenshot & gallery scan tips             │  │  │  │
│  │  │  └──────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Modified & Created Files:
1. `src/types/menu.ts`: Add promo fields (`originalPrice`, `discountPercent`, `isSeasonalPromo`, `promoBadge`).
2. `src/data/defaultMenu.ts`: Seed signature Goory coffee promo items (e.g., *Goory Signature Iced Aren Latte*, *V60 Single Origin Kintamani*, *Croissant & Flat White Combo*).
3. `src/components/HeroSeasonalPromotions.tsx`: Floating horizontal cards component placed in Hero.
4. `src/components/DigitalPaymentGateway.tsx`:
   - Replace merchant label under QR code to **GOORY COFFEE & EATERY**.
   - Embed the `QRISGuideAccordion` component with step-by-step visual badges and the verified merchant instruction.
   - Sync all payment instructions and references to use `appSettings.restaurant.restaurantName || 'Goory Coffee & Eatery'`.
5. `src/App.tsx`: Mount `HeroSeasonalPromotions` directly beneath the Hero title/description.
6. `firebase-blueprint.json`: Update schema documentations to reflect the expanded `MenuItem` promo fields.
