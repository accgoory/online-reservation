import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { WaitlistEntry, WaitlistStatus, LoyaltyTier, Reservation, TableSection } from '../types/restaurant';
import { broadcastNotification, updateTableStatus, createReservation } from './restaurantService';
import { playChime } from '../utils/audio';

const WAITLIST_COLLECTION = 'waitlist';
const STORAGE_TICKET_KEY = 'savour_active_waitlist_id';

// Default initial waitlist data to demonstrate active virtual queue instantly
const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: 'wl_demo_101',
    queueNumber: 1,
    queueCode: 'WL-001',
    customerName: 'Dimas Wicaksono',
    customerPhone: '+62 812-9876-5432',
    customerEmail: 'dimas.w@example.com',
    guestCount: 2,
    preferredSection: 'indoor',
    preferredTimeSlot: '19:00 - 21:00',
    date: new Date().toISOString().split('T')[0],
    specialRequests: 'Dekat jendela jika memungkinkan',
    status: 'called',
    estimatedWaitMinutes: 5,
    joinedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    calledAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    loyaltyTier: 'Gold'
  },
  {
    id: 'wl_demo_102',
    queueNumber: 2,
    queueCode: 'WL-002',
    customerName: 'Maya Angelica',
    customerPhone: '+62 813-1122-3344',
    customerEmail: 'maya.ang@example.com',
    guestCount: 4,
    preferredSection: 'outdoor',
    preferredTimeSlot: '19:30 - 21:30',
    date: new Date().toISOString().split('T')[0],
    specialRequests: 'Perayaan ulang tahun',
    status: 'waiting',
    estimatedWaitMinutes: 15,
    joinedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    loyaltyTier: 'Silver'
  },
  {
    id: 'wl_demo_103',
    queueNumber: 3,
    queueCode: 'WL-003',
    customerName: 'Reza Pratama',
    customerPhone: '+62 857-3344-5566',
    customerEmail: 'reza.p@example.com',
    guestCount: 2,
    preferredSection: 'any',
    preferredTimeSlot: '20:00 - 22:00',
    date: new Date().toISOString().split('T')[0],
    specialRequests: 'Non-smoking area',
    status: 'waiting',
    estimatedWaitMinutes: 30,
    joinedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    loyaltyTier: 'Bronze'
  }
];

let cachedWaitlist: WaitlistEntry[] = [...INITIAL_WAITLIST];

/**
 * Seed initial waitlist entries if Firestore collection is empty
 */
export async function initializeWaitlistIfEmpty(): Promise<WaitlistEntry[]> {
  try {
    const snap = await getDocs(collection(db, WAITLIST_COLLECTION));
    if (snap.empty) {
      for (const entry of INITIAL_WAITLIST) {
        await setDoc(doc(db, WAITLIST_COLLECTION, entry.id), entry);
      }
      return INITIAL_WAITLIST;
    } else {
      const list: WaitlistEntry[] = [];
      snap.forEach(d => list.push(d.data() as WaitlistEntry));
      cachedWaitlist = list;
      return list;
    }
  } catch (err) {
    console.warn('Using in-memory waitlist cache:', err);
    return cachedWaitlist;
  }
}

/**
 * Real-time listener for all waitlist entries
 */
export function subscribeToWaitlist(
  callback: (entries: WaitlistEntry[]) => void
): Unsubscribe {
  try {
    const colRef = collection(db, WAITLIST_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty, seed defaults
          initializeWaitlistIfEmpty().then(callback);
          return;
        }
        const entries: WaitlistEntry[] = [];
        snapshot.forEach((d) => {
          entries.push(d.data() as WaitlistEntry);
        });

        // Sort by queue number ascending
        entries.sort((a, b) => a.queueNumber - b.queueNumber);
        cachedWaitlist = entries;
        callback(entries);
      },
      (error) => {
        console.warn('Firestore waitlist listener fallback to cache:', error);
        callback(cachedWaitlist);
      }
    );
  } catch (err) {
    console.warn('Failed to attach waitlist listener, using cached:', err);
    callback(cachedWaitlist);
    return () => {};
  }
}

/**
 * Real-time listener for a single waitlist entry by ID (customer ticket pass)
 */
export function subscribeToActiveWaitlistTicket(
  ticketId: string,
  callback: (entry: WaitlistEntry | null) => void
): Unsubscribe {
  try {
    const docRef = doc(db, WAITLIST_COLLECTION, ticketId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as WaitlistEntry);
        } else {
          const cached = cachedWaitlist.find((e) => e.id === ticketId) || null;
          callback(cached);
        }
      },
      (error) => {
        console.warn('Error listening to ticket doc, using cache:', error);
        const cached = cachedWaitlist.find((e) => e.id === ticketId) || null;
        callback(cached);
      }
    );
  } catch (err) {
    const cached = cachedWaitlist.find((e) => e.id === ticketId) || null;
    callback(cached);
    return () => {};
  }
}

/**
 * Add a new customer to the virtual waitlist
 */
export async function addToWaitlist(data: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  guestCount: number;
  preferredSection: 'indoor' | 'outdoor' | 'vip' | 'any';
  preferredTimeSlot: string;
  date: string;
  specialRequests?: string;
  loyaltyTier?: LoyaltyTier;
}): Promise<WaitlistEntry> {
  const activeWaiting = cachedWaitlist.filter(
    (e) => e.status === 'waiting' || e.status === 'called'
  );
  
  // Calculate highest queue number
  const maxQueueNumber = cachedWaitlist.reduce(
    (max, item) => Math.max(max, item.queueNumber || 0),
    0
  );
  const queueNumber = maxQueueNumber + 1;
  const queueCode = `WL-${String(queueNumber).padStart(3, '0')}`;

  // Estimate wait time based on position and VIP status
  const baseMinutes = Math.max(10, activeWaiting.length * 12 + 10);
  const vipReduction = data.loyaltyTier === 'Platinum' ? 10 : data.loyaltyTier === 'Gold' ? 5 : 0;
  const estimatedWaitMinutes = Math.max(5, baseMinutes - vipReduction);

  const id = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const newEntry: WaitlistEntry = {
    id,
    queueNumber,
    queueCode,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    guestCount: data.guestCount,
    preferredSection: data.preferredSection,
    preferredTimeSlot: data.preferredTimeSlot,
    date: data.date,
    specialRequests: data.specialRequests,
    status: 'waiting',
    estimatedWaitMinutes,
    joinedAt: nowIso,
    loyaltyTier: data.loyaltyTier
  };

  try {
    await setDoc(doc(db, WAITLIST_COLLECTION, id), newEntry);
  } catch (err) {
    console.warn('SetDoc waitlist fallback to local cache:', err);
  }

  // Update in-memory cache
  cachedWaitlist = [...cachedWaitlist, newEntry];

  // Store in customer localStorage so ticket pass is maintained
  try {
    localStorage.setItem(STORAGE_TICKET_KEY, id);
  } catch (e) {
    // Ignore storage errors
  }

  // Broadcast real-time notification to staff
  await broadcastNotification({
    title: `Antrean Virtual: ${newEntry.queueCode}`,
    message: `${newEntry.customerName} (${newEntry.guestCount} Tamu) bergabung dalam antrean tunggu virtual #${newEntry.queueNumber}.`,
    type: 'reservation_created'
  });

  playChime('ding');
  return newEntry;
}

/**
 * Staff calls a customer whose turn is up
 */
export async function callWaitlistCustomer(
  entryId: string,
  entryName: string,
  queueCode: string
): Promise<void> {
  const nowIso = new Date().toISOString();

  try {
    const entryRef = doc(db, WAITLIST_COLLECTION, entryId);
    await updateDoc(entryRef, {
      status: 'called',
      calledAt: nowIso
    });
  } catch (err) {
    console.warn('callWaitlistCustomer fallback:', err);
  }

  cachedWaitlist = cachedWaitlist.map((e) =>
    e.id === entryId ? { ...e, status: 'called', calledAt: nowIso } : e
  );

  // Broadcast notification
  await broadcastNotification({
    title: `Panggilan Meja: ${queueCode}`,
    message: `Halo Kak ${entryName}! Meja Anda telah dipersiapkan. Silakan menuju meja resepsionis Goory Coffee & Eatery.`,
    type: 'table_ready'
  });

  playChime('alert');
}

/**
 * Seat customer at a table and optionally create formal reservation record
 */
export async function seatWaitlistCustomer(
  entry: WaitlistEntry,
  tableId: string,
  tableName: string,
  tableSection: TableSection
): Promise<Reservation> {
  const nowIso = new Date().toISOString();

  // 1. Update waitlist entry status to seated
  try {
    const entryRef = doc(db, WAITLIST_COLLECTION, entry.id);
    await updateDoc(entryRef, {
      status: 'seated',
      seatedAt: nowIso,
      assignedTableId: tableId,
      assignedTableName: tableName
    });
  } catch (err) {
    console.warn('seatWaitlistCustomer fallback:', err);
  }

  cachedWaitlist = cachedWaitlist.map((e) =>
    e.id === entry.id
      ? {
          ...e,
          status: 'seated',
          seatedAt: nowIso,
          assignedTableId: tableId,
          assignedTableName: tableName
        }
      : e
  );

  // 2. Mark table occupied
  await updateTableStatus(tableId, 'occupied');

  // 3. Create reservation in confirmed/seated status
  const reservation = await createReservation({
    userId: 'guest_waitlist',
    customerName: entry.customerName,
    customerEmail: entry.customerEmail,
    customerPhone: entry.customerPhone,
    guestsCount: entry.guestCount,
    tableId: tableId,
    tableName: tableName,
    tableSection: tableSection,
    date: entry.date,
    timeSlot: entry.preferredTimeSlot,
    occasion: 'Casual Dining',
    specialNotes: entry.specialRequests
      ? `[Waitlist Ticket ${entry.queueCode}] ${entry.specialRequests}`
      : `[Waitlist Ticket ${entry.queueCode}] Masuk dari Antrean Virtual`,
    status: 'seated',
    paymentStatus: 'paid',
    paymentMethod: 'qris',
    depositAmount: 0
  });

  // 4. Broadcast notification
  await broadcastNotification({
    title: `Tamu Waitlist Duduk: Meja ${tableName}`,
    message: `Tamu antrean ${entry.queueCode} (${entry.customerName}) telah menempati Meja ${tableName}.`,
    type: 'status_changed'
  });

  playChime('payment');
  return reservation;
}

/**
 * Cancel waitlist entry
 */
export async function cancelWaitlistCustomer(entryId: string): Promise<void> {
  try {
    const entryRef = doc(db, WAITLIST_COLLECTION, entryId);
    await updateDoc(entryRef, {
      status: 'cancelled'
    });
  } catch (err) {
    console.warn('cancelWaitlistCustomer fallback:', err);
  }

  cachedWaitlist = cachedWaitlist.map((e) =>
    e.id === entryId ? { ...e, status: 'cancelled' } : e
  );

  // If active user ticket, remove from local storage
  try {
    if (localStorage.getItem(STORAGE_TICKET_KEY) === entryId) {
      localStorage.removeItem(STORAGE_TICKET_KEY);
    }
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Check if active customer has a saved waitlist ticket
 */
export function getStoredWaitlistTicketId(): string | null {
  try {
    return localStorage.getItem(STORAGE_TICKET_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear stored waitlist ticket
 */
export function clearStoredWaitlistTicket(): void {
  try {
    localStorage.removeItem(STORAGE_TICKET_KEY);
  } catch {
    // Ignore
  }
}
