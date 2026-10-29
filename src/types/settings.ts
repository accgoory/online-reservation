export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  role: 'admin';
  avatarUrl: string;
  department: string;
  lastLogin?: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  tagline: string;
  address: string;
  phone: string;
  whatsappNumber: string; // Nomor WhatsApp resmi yang bisa dihubungi tamu
  email: string;
  ownerBankName: string; // Nama Bank Rekening Pemilik (contoh: BCA, Mandiri, BNI, BRI)
  ownerAccountNumber: string; // Nomor Rekening Pemilik Restoran
  ownerAccountHolder: string; // Nama Pemilik Rekening (Atas Nama / A.N)
  openTime: string; // e.g. "11:00"
  closeTime: string; // e.g. "23:00"
  maxCapacity: number; // total restaurant capacity in pax
  gracePeriodMinutes: number; // reservation hold buffer (e.g. 15 mins)
  turnoverMinutes: number; // standard dining session length (e.g. 90 mins)
  currencySymbol: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  googleMapsUrl?: string;
}

export interface NotificationSettings {
  soundChimeEnabled: boolean;
  smsAutoDispatch: boolean;
  smsTableReadyAlert: boolean;
  adminEmailAlerts: boolean;
  waitlistCallIntervalMinutes: number;
}

export interface DepositSettings {
  depositType: 'percentage' | 'fixed_per_person' | 'fixed_per_table';
  fixedDepositPerPerson: number; // in IDR, e.g. 100000
  percentageAmount: number; // e.g. 25%
  minDepositAmount: number; // minimum deposit in IDR, e.g. 150000
  minSpendVip: number; // in IDR, e.g. 1500000
  paymentExpiryMinutes: number; // e.g. 30
  activePaymentMethods: {
    qris: boolean;
    gopay: boolean;
    ovo: boolean;
    dana: boolean;
    shopeepay: boolean;
    bca_va: boolean;
    mandiri_va: boolean;
    bni_va: boolean;
    bri_va: boolean;
    credit_card: boolean;
  };
}

export interface CrewAccessSettings {
  crewPin: string; // default e.g. "1234"
  allowedPins: string[];
  allowCrewCallGuest: boolean;
  allowCrewSeatGuest: boolean;
  allowCrewWalkIn: boolean;
  allowCrewCancelReservation: boolean;
  requireAdminForRefund: boolean;
}

export interface QrisSettings {
  nmid: string; // e.g. "ID102039281923"
  merchantName: string; // e.g. "GOORY COFFEE & EATERY"
  qrisMode: 'dynamic_auto' | 'custom_image' | 'custom_payload';
  customImageUrl?: string;
  customPayload?: string;
  autoRefreshEnabled: boolean;
  refreshIntervalSeconds: number; // e.g. 60
}

export interface AppSettings {
  adminProfile: AdminProfile;
  restaurant: RestaurantSettings;
  notifications: NotificationSettings;
  deposit: DepositSettings;
  crewAccess: CrewAccessSettings;
  qris: QrisSettings;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  adminProfile: {
    name: 'I Putu Agus Rony Sastradi',
    email: 'accgoory@gmail.com',
    phone: '+62 896-6131-5457',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    department: 'General Management & Executive Operations',
    lastLogin: new Date().toISOString()
  },
  restaurant: {
    restaurantName: 'Goory Coffee & Eatery',
    tagline: 'Heritage Dining & Luxury Lounge',
    address: 'Jl. Barito Timur No. 5, Panjer , Denpasar Selatan 80225',
    phone: '+62 896-6131-5457',
    whatsappNumber: '+62 896-6131-5457',
    email: 'accgoory@gmail.com',
    ownerBankName: 'Bank Central Asia (BCA)',
    ownerAccountNumber: '8077-1299-8800',
    ownerAccountHolder: 'I Putu Agus Rony Sastradi (Goory Coffee & Eatery)',
    openTime: '11:00',
    closeTime: '23:00',
    maxCapacity: 100,
    gracePeriodMinutes: 15,
    turnoverMinutes: 90,
    currencySymbol: 'Rp',
    instagramHandle: '@goorycoffee',
    tiktokHandle: '@goorycoffee',
    googleMapsUrl: 'https://maps.google.com/?q=Jl.+Barito+Timur+No.+5+Panjer+Denpasar+Selatan+80225'
  },
  notifications: {
    soundChimeEnabled: true,
    smsAutoDispatch: true,
    smsTableReadyAlert: true,
    adminEmailAlerts: true,
    waitlistCallIntervalMinutes: 10
  },
  deposit: {
    depositType: 'fixed_per_person',
    fixedDepositPerPerson: 100000,
    percentageAmount: 25,
    minDepositAmount: 100000,
    minSpendVip: 1500000,
    paymentExpiryMinutes: 30,
    activePaymentMethods: {
      qris: true,
      gopay: false,
      ovo: false,
      dana: false,
      shopeepay: false,
      bca_va: true,
      mandiri_va: true,
      bni_va: true,
      bri_va: true,
      credit_card: true
    }
  },
  crewAccess: {
    crewPin: '2778',
    allowedPins: ['2778', '2709', '0978'],
    allowCrewCallGuest: true,
    allowCrewSeatGuest: true,
    allowCrewWalkIn: true,
    allowCrewCancelReservation: false,
    requireAdminForRefund: true
  },
  qris: {
    nmid: 'ID102039281923',
    merchantName: 'GOORY COFFEE & EATERY',
    qrisMode: 'dynamic_auto',
    customImageUrl: '',
    customPayload: '',
    autoRefreshEnabled: true,
    refreshIntervalSeconds: 60
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default'
};
