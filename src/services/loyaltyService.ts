import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  LoyaltyAccount, 
  LoyaltyTier, 
  OccasionType 
} from '../types/restaurant';
import { broadcastNotification } from './restaurantService';
import { playChime } from '../utils/audio';

const LOYALTY_COLLECTION = 'loyalty_accounts';
const LOCAL_STORAGE_KEY = 'savour_loyalty_accounts_v1';
const ACTIVE_MEMBER_KEY = 'savour_active_loyalty_phone';

// Initial pre-seeded loyal members for instant demo and testing
export const INITIAL_LOYALTY_MEMBERS: LoyaltyAccount[] = [
  {
    id: 'acc-081234567890',
    customerPhone: '081234567890',
    customerEmail: 'bagus.kurniawan@gmail.com',
    customerName: 'Bagus Kurniawan',
    pointsBalance: 1250,
    tier: 'Gold',
    totalEarned: 2450,
    totalRedeemed: 1200,
    history: [
      {
        id: 'hist-1',
        date: new Date(Date.now() - 14 * 86400000).toISOString(),
        description: 'Reservasi Meja VIP Suite (SAV-7210)',
        points: 450,
        type: 'earned',
        bookingCode: 'SAV-7210'
      },
      {
        id: 'hist-2',
        date: new Date(Date.now() - 7 * 86400000).toISOString(),
        description: 'Tukar Diskon Deposit (SAV-6120)',
        points: -500,
        type: 'redeemed',
        bookingCode: 'SAV-6120'
      },
      {
        id: 'hist-3',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        description: 'Bonus Ulang Tahun Restoran (Gold Perk)',
        points: 300,
        type: 'bonus'
      }
    ],
    joinedAt: '2025-11-10T08:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'acc-081987654321',
    customerPhone: '081987654321',
    customerEmail: 'sarah.wijaya@gmail.com',
    customerName: 'Sarah Wijaya',
    pointsBalance: 680,
    tier: 'Silver',
    totalEarned: 880,
    totalRedeemed: 200,
    history: [
      {
        id: 'hist-s1',
        date: new Date(Date.now() - 20 * 86400000).toISOString(),
        description: 'Selamat Datang Goory Club',
        points: 100,
        type: 'tier_welcome'
      },
      {
        id: 'hist-s2',
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        description: 'Reservasi Romantic Window Booth (SAV-3312)',
        points: 280,
        type: 'earned',
        bookingCode: 'SAV-3312'
      }
    ],
    joinedAt: '2026-01-15T10:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'acc-085712345678',
    customerPhone: '085712345678',
    customerEmail: 'reza.pratama@gmail.com',
    customerName: 'Reza Pratama',
    pointsBalance: 3400,
    tier: 'Platinum',
    totalEarned: 4800,
    totalRedeemed: 1400,
    history: [
      {
        id: 'hist-r1',
        date: new Date(Date.now() - 30 * 86400000).toISOString(),
        description: 'Reservasi Chef\'s Counter Multi-course (SAV-9901)',
        points: 800,
        type: 'earned',
        bookingCode: 'SAV-9901'
      },
      {
        id: 'hist-r2',
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        description: 'Platinum Tier Annual Loyalty Gift',
        points: 500,
        type: 'bonus'
      }
    ],
    joinedAt: '2025-08-20T12:00:00.000Z',
    updatedAt: new Date().toISOString()
  }
];

/**
 * Load local cached accounts from localStorage
 */
function getLocalAccounts(): Record<string, LoyaltyAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local loyalty accounts:', e);
  }
  // Initialize with defaults
  const map: Record<string, LoyaltyAccount> = {};
  for (const m of INITIAL_LOYALTY_MEMBERS) {
    map[cleanPhone(m.customerPhone)] = m;
  }
  saveLocalAccounts(map);
  return map;
}

function saveLocalAccounts(map: Record<string, LoyaltyAccount>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save loyalty accounts to local storage:', e);
  }
}

/**
 * Normalize phone string to digits only
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Compute Loyalty Tier based on points balance or cumulative earned
 */
export function computeTier(totalPoints: number): LoyaltyTier {
  if (totalPoints >= 3000) return 'Platinum';
  if (totalPoints >= 1500) return 'Gold';
  if (totalPoints >= 500) return 'Silver';
  return 'Bronze';
}

/**
 * Tier points multiplier
 */
export function getTierMultiplier(tier: LoyaltyTier): number {
  switch (tier) {
    case 'Platinum': return 2.0;
    case 'Gold': return 1.5;
    case 'Silver': return 1.2;
    default: return 1.0;
  }
}

/**
 * Calculate Goory Points earned from a reservation
 * Formula: (depositAmount / 1000) * TierMultiplier + OccasionBonus
 */
export function calculatePointsToEarn(
  depositAmount: number,
  tier: LoyaltyTier = 'Bronze',
  occasion?: OccasionType,
  isVipSection: boolean = false
): number {
  const basePoints = Math.max(50, Math.floor(depositAmount / 1000));
  const multiplier = getTierMultiplier(tier);
  let points = Math.round(basePoints * multiplier);

  // Bonus for milestone celebration occasions
  if (occasion === 'Birthday Celebration' || occasion === 'Wedding Anniversary') {
    points += 50;
  }
  if (isVipSection) {
    points += 50;
  }

  return points;
}

/**
 * 1 Goory Point = Rp 100 discount
 */
export const POINTS_CONVERSION_RATE = 100; // 1 pt = Rp 100

export function calculateDiscountFromPoints(points: number): number {
  return points * POINTS_CONVERSION_RATE;
}

/**
 * Calculate maximum points that can be redeemed for a given deposit
 * Allow up to 75% of deposit amount to be discounted
 */
export function calculateMaxRedeemablePoints(depositAmount: number, pointsBalance: number): number {
  const maxDiscountAllowed = Math.floor(depositAmount * 0.75);
  const maxPointsPossible = Math.floor(maxDiscountAllowed / POINTS_CONVERSION_RATE);
  return Math.max(0, Math.min(pointsBalance, maxPointsPossible));
}

/**
 * Get or create customer loyalty account by phone number
 */
export async function getOrCreateLoyaltyAccount(
  phone: string,
  email?: string,
  name?: string
): Promise<LoyaltyAccount> {
  const normalized = cleanPhone(phone);
  if (!normalized) {
    throw new Error('Nomor telepon harus diisi.');
  }

  const docId = `acc-${normalized}`;
  const localMap = getLocalAccounts();

  // Check Firestore first
  try {
    const docRef = doc(db, LOYALTY_COLLECTION, docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as LoyaltyAccount;
      localMap[normalized] = data;
      saveLocalAccounts(localMap);
      return data;
    }
  } catch (err) {
    console.warn('Firestore loyalty fetch error, checking local store:', err);
  }

  // Check local cache
  if (localMap[normalized]) {
    return localMap[normalized];
  }

  // Create new member with 100 Welcome Points
  const now = new Date().toISOString();
  const newAccount: LoyaltyAccount = {
    id: docId,
    customerPhone: phone,
    customerEmail: email || '',
    customerName: name || 'Tamu Setia Goory',
    pointsBalance: 100, // 100 Welcome Bonus points
    tier: 'Bronze',
    totalEarned: 100,
    totalRedeemed: 0,
    history: [
      {
        id: `hist-welcome-${Date.now()}`,
        date: now,
        description: 'Bonus Selamat Datang Goory Club (100 Pts)',
        points: 100,
        type: 'tier_welcome'
      }
    ],
    joinedAt: now,
    updatedAt: now
  };

  // Save to local
  localMap[normalized] = newAccount;
  saveLocalAccounts(localMap);

  // Sync to Firestore
  try {
    await setDoc(doc(db, LOYALTY_COLLECTION, docId), newAccount);
  } catch (e) {
    console.warn('Could not sync new loyalty member to Firestore:', e);
  }

  return newAccount;
}

/**
 * Add points to account (after successful reservation payment or review)
 */
export async function addPointsToAccount(
  phone: string,
  points: number,
  description: string,
  reservationId?: string,
  bookingCode?: string,
  customerName?: string,
  customerEmail?: string
): Promise<LoyaltyAccount> {
  const account = await getOrCreateLoyaltyAccount(phone, customerEmail, customerName);
  const normalized = cleanPhone(phone);
  const localMap = getLocalAccounts();

  const newBalance = account.pointsBalance + points;
  const newTotalEarned = account.totalEarned + points;
  const newTier = computeTier(newTotalEarned);

  const newHistoryItem = {
    id: `hist-earn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    date: new Date().toISOString(),
    description,
    points,
    type: 'earned' as const,
    reservationId,
    bookingCode
  };

  const updated: LoyaltyAccount = {
    ...account,
    customerName: customerName || account.customerName,
    customerEmail: customerEmail || account.customerEmail,
    pointsBalance: newBalance,
    totalEarned: newTotalEarned,
    tier: newTier,
    history: [newHistoryItem, ...account.history],
    updatedAt: new Date().toISOString()
  };

  localMap[normalized] = updated;
  saveLocalAccounts(localMap);

  try {
    await setDoc(doc(db, LOYALTY_COLLECTION, account.id), updated);
  } catch (err) {
    console.warn('Firestore points update error, saved in local cache:', err);
  }

  // Broadcast real-time loyalty notification
  await broadcastNotification({
    title: `🎉 +${points} Goory Points Didapat!`,
    message: `${updated.customerName} memperoleh ${points} Goory Points (${updated.tier} Member). Total saldo: ${newBalance} Pts.`,
    type: 'general',
    reservationId,
    recipientEmail: updated.customerEmail
  });

  return updated;
}

/**
 * Redeem points from customer account
 */
export async function redeemPointsFromAccount(
  phone: string,
  pointsToRedeem: number,
  description: string,
  reservationId?: string,
  bookingCode?: string
): Promise<LoyaltyAccount> {
  const account = await getOrCreateLoyaltyAccount(phone);
  const normalized = cleanPhone(phone);
  const localMap = getLocalAccounts();

  if (pointsToRedeem <= 0) return account;
  if (account.pointsBalance < pointsToRedeem) {
    throw new Error(`Saldo Goory Points tidak mencukupi (Saldo: ${account.pointsBalance} Pts).`);
  }

  const newBalance = account.pointsBalance - pointsToRedeem;
  const newTotalRedeemed = account.totalRedeemed + pointsToRedeem;

  const newHistoryItem = {
    id: `hist-redeem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    date: new Date().toISOString(),
    description,
    points: -pointsToRedeem,
    type: 'redeemed' as const,
    reservationId,
    bookingCode
  };

  const updated: LoyaltyAccount = {
    ...account,
    pointsBalance: newBalance,
    totalRedeemed: newTotalRedeemed,
    history: [newHistoryItem, ...account.history],
    updatedAt: new Date().toISOString()
  };

  localMap[normalized] = updated;
  saveLocalAccounts(localMap);

  try {
    await setDoc(doc(db, LOYALTY_COLLECTION, account.id), updated);
  } catch (err) {
    console.warn('Firestore points redeem error, saved in local cache:', err);
  }

  return updated;
}

/**
 * Subscribe to loyalty account updates
 */
export function subscribeToLoyaltyAccount(
  phone: string,
  onUpdate: (account: LoyaltyAccount | null) => void
): Unsubscribe {
  const normalized = cleanPhone(phone);
  if (!normalized) {
    onUpdate(null);
    return () => {};
  }

  const localMap = getLocalAccounts();
  if (localMap[normalized]) {
    onUpdate(localMap[normalized]);
  }

  try {
    const docRef = doc(db, LOYALTY_COLLECTION, `acc-${normalized}`);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const acc = snap.data() as LoyaltyAccount;
          localMap[normalized] = acc;
          saveLocalAccounts(localMap);
          onUpdate(acc);
        } else if (localMap[normalized]) {
          onUpdate(localMap[normalized]);
        }
      },
      (err) => {
        console.warn('Loyalty subscription warning:', err);
        if (localMap[normalized]) onUpdate(localMap[normalized]);
      }
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Get active member phone from session/local storage
 */
export function getActiveMemberPhone(): string {
  try {
    return localStorage.getItem(ACTIVE_MEMBER_KEY) || '081234567890';
  } catch {
    return '081234567890';
  }
}

export function setActiveMemberPhone(phone: string) {
  try {
    localStorage.setItem(ACTIVE_MEMBER_KEY, phone);
  } catch {}
}

/**
 * Get all loyalty members (for Manager Dashboard)
 */
export async function getAllLoyaltyAccounts(): Promise<LoyaltyAccount[]> {
  const localMap = getLocalAccounts();
  const list = Object.values(localMap);
  try {
    const snap = await getDocs(collection(db, LOYALTY_COLLECTION));
    if (!snap.empty) {
      const dbList: LoyaltyAccount[] = [];
      snap.forEach(d => dbList.push(d.data() as LoyaltyAccount));
      return dbList;
    }
  } catch (err) {
    console.warn('Get all loyalty accounts from Firestore fallback:', err);
  }
  return list;
}
