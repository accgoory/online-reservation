import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  RestaurantTable,
  Reservation,
  RestaurantNotification,
  TableStatus,
  ReservationStatus,
  PaymentStatus,
  PaymentMethod,
  CustomerReview
} from '../types/restaurant';
import { INITIAL_TABLES } from '../data/defaultTables';
import { playChime } from '../utils/audio';
import { 
  calculatePointsToEarn, 
  addPointsToAccount, 
  redeemPointsFromAccount 
} from './loyaltyService';

const TABLES_COLLECTION = 'tables';
const RESERVATIONS_COLLECTION = 'reservations';
const NOTIFICATIONS_COLLECTION = 'notifications';
const REVIEWS_COLLECTION = 'reviews';

// In-memory fallback caches
let cachedTables: RestaurantTable[] = [...INITIAL_TABLES];
let cachedReservations: Reservation[] = [];
let cachedNotifications: RestaurantNotification[] = [];

/**
 * Initialize dining tables in Firestore if collection is empty
 */
export async function initializeTablesIfEmpty(): Promise<RestaurantTable[]> {
  try {
    const snap = await getDocs(collection(db, TABLES_COLLECTION));
    if (snap.empty) {
      console.log('Seeding initial restaurant tables into Firestore...');
      for (const table of INITIAL_TABLES) {
        await setDoc(doc(db, TABLES_COLLECTION, table.id), table);
      }
      return INITIAL_TABLES;
    } else {
      const tables: RestaurantTable[] = [];
      snap.forEach(docSnap => {
        tables.push(docSnap.data() as RestaurantTable);
      });
      cachedTables = tables;
      return tables;
    }
  } catch (err) {
    console.warn('Using local tables fallback due to Firestore init check:', err);
    return cachedTables;
  }
}

/**
 * Subscribe to real-time table status updates
 */
export function subscribeToTables(
  onUpdate: (tables: RestaurantTable[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(db, TABLES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is still being seeded, deliver cached
          onUpdate(cachedTables);
          return;
        }
        const tables: RestaurantTable[] = [];
        snapshot.forEach(docSnap => {
          tables.push({ ...docSnap.data(), id: docSnap.id } as RestaurantTable);
        });
        cachedTables = tables;
        onUpdate(tables);
      },
      (error) => {
        console.error('Tables subscription error:', error);
        if (onError) onError(error);
        // Fallback to cached tables
        onUpdate(cachedTables);
        try {
          handleFirestoreError(error, OperationType.GET, TABLES_COLLECTION);
        } catch (err) {
          console.warn('Tables subscription error recorded:', err);
        }
      }
    );
  } catch (error) {
    console.warn('Realtime table setup caught error, falling back:', error);
    onUpdate(cachedTables);
    return () => {};
  }
}

/**
 * Subscribe to real-time reservations list
 */
export function subscribeToReservations(
  onUpdate: (reservations: Reservation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, RESERVATIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reservations: Reservation[] = [];
        snapshot.forEach(docSnap => {
          reservations.push({ ...docSnap.data(), id: docSnap.id } as Reservation);
        });
        cachedReservations = reservations;
        onUpdate(reservations);
      },
      (error) => {
        console.error('Reservations subscription error:', error);
        if (onError) onError(error);
        onUpdate(cachedReservations);
        try {
          handleFirestoreError(error, OperationType.GET, RESERVATIONS_COLLECTION);
        } catch (err) {
          console.warn('Reservations subscription error recorded:', err);
        }
      }
    );
  } catch (error) {
    console.warn('Realtime reservations error, falling back:', error);
    onUpdate(cachedReservations);
    return () => {};
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  onUpdate: (notifications: RestaurantNotification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const notifications: RestaurantNotification[] = [];
        snapshot.forEach(docSnap => {
          notifications.push({ ...docSnap.data(), id: docSnap.id } as RestaurantNotification);
        });
        cachedNotifications = notifications;
        onUpdate(notifications);
      },
      (error) => {
        console.error('Notifications subscription error:', error);
        if (onError) onError(error);
        onUpdate(cachedNotifications);
        try {
          handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COLLECTION);
        } catch (err) {
          console.warn('Notifications subscription error recorded:', err);
        }
      }
    );
  } catch (error) {
    console.warn('Realtime notifications caught error, falling back:', error);
    onUpdate(cachedNotifications);
    return () => {};
  }
}

/**
 * Create a new dining reservation
 */
export async function createReservation(
  reservationData: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt' | 'bookingCode'>
): Promise<Reservation> {
  const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const bookingCode = `SAV-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  const newReservation: Reservation = {
    ...reservationData,
    id: reservationId,
    bookingCode,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await setDoc(doc(db, RESERVATIONS_COLLECTION, reservationId), newReservation);

    // Update table status if confirmed
    if (newReservation.status === 'confirmed') {
      await updateTableStatus(newReservation.tableId, 'reserved');
    }

    // Broadcast notification
    await broadcastNotification({
      title: 'Reservasi Baru Masuk',
      message: `${newReservation.customerName} membuat reservasi untuk Meja ${newReservation.tableName} (${newReservation.timeSlot}).`,
      type: 'reservation_created',
      reservationId: reservationId,
      recipientEmail: newReservation.customerEmail
    });

    playChime('ding');
    return newReservation;
  } catch (err) {
    console.error('Failed to create reservation in Firestore, using cache:', err);
    cachedReservations = [newReservation, ...cachedReservations];
    if (newReservation.status === 'confirmed') {
      cachedTables = cachedTables.map(t => t.id === newReservation.tableId ? { ...t, status: 'reserved' } : t);
    }
    return newReservation;
  }
}

/**
 * Process digital payment for a reservation
 */
export async function processPaymentSuccess(
  reservationId: string,
  paymentMethod: PaymentMethod,
  paymentReference: string,
  customReservation?: Reservation
): Promise<void> {
  const nowIso = new Date().toISOString();
  const res = customReservation || cachedReservations.find(r => r.id === reservationId);
  const pointsToEarn = res?.pointsEarned || (res ? calculatePointsToEarn(res.depositAmount, 'Bronze', res.occasion, res.tableSection?.includes('VIP')) : 150);

  try {
    const resRef = doc(db, RESERVATIONS_COLLECTION, reservationId);
    await updateDoc(resRef, {
      paymentStatus: 'paid',
      paymentMethod,
      paymentReference,
      status: 'confirmed',
      pointsEarned: pointsToEarn,
      updatedAt: nowIso
    });

    if (res) {
      await updateTableStatus(res.tableId, 'reserved');

      // Loyalty points processing
      if (res.customerPhone) {
        if (res.pointsRedeemed && res.pointsRedeemed > 0) {
          try {
            await redeemPointsFromAccount(
              res.customerPhone,
              res.pointsRedeemed,
              `Diskon Deposit Reservasi (${res.bookingCode})`,
              reservationId,
              res.bookingCode
            );
          } catch (e) {
            console.warn('Loyalty points redeem warning:', e);
          }
        }

        try {
          await addPointsToAccount(
            res.customerPhone,
            pointsToEarn,
            `Reservasi Meja ${res.tableName} (${res.bookingCode})`,
            reservationId,
            res.bookingCode,
            res.customerName,
            res.customerEmail
          );
        } catch (e) {
          console.warn('Loyalty points credit warning:', e);
        }
      }

      // Create notification
      await broadcastNotification({
        title: 'Pembayaran Deposit Berhasil',
        message: `Pembayaran Rp ${res.depositAmount.toLocaleString('id-ID')} via ${paymentMethod.toUpperCase()} (${res.bookingCode}) diverifikasi. +${pointsToEarn} Goory Points diperoleh!`,
        type: 'payment_confirmed',
        reservationId: reservationId,
        recipientEmail: res.customerEmail
      });
    }

    playChime('payment');
  } catch (err) {
    console.error('Error recording payment in Firestore:', err);
    // Update cache
    cachedReservations = cachedReservations.map(r => {
      if (r.id === reservationId) {
        return {
          ...r,
          paymentStatus: 'paid',
          paymentMethod,
          paymentReference,
          status: 'confirmed',
          pointsEarned: pointsToEarn,
          updatedAt: nowIso
        };
      }
      return r;
    });

    if (res && res.customerPhone) {
      if (res.pointsRedeemed && res.pointsRedeemed > 0) {
        redeemPointsFromAccount(res.customerPhone, res.pointsRedeemed, `Diskon Deposit (${res.bookingCode})`, reservationId, res.bookingCode).catch(() => {});
      }
      addPointsToAccount(res.customerPhone, pointsToEarn, `Reservasi Meja ${res.tableName}`, reservationId, res.bookingCode, res.customerName, res.customerEmail).catch(() => {});
    }

    playChime('payment');
  }
}

/**
 * Update restaurant table status
 */
export async function updateTableStatus(tableId: string, status: TableStatus): Promise<void> {
  try {
    const tableRef = doc(db, TABLES_COLLECTION, tableId);
    await updateDoc(tableRef, { status });
  } catch (err) {
    console.warn(`Firestore table update failed, updating cache:`, err);
    cachedTables = cachedTables.map(t => t.id === tableId ? { ...t, status } : t);
  }
}

/**
 * Update single table position (x, y coordinates in percentage 0-100)
 */
export async function updateTablePosition(tableId: string, x: number, y: number): Promise<void> {
  try {
    const tableRef = doc(db, TABLES_COLLECTION, tableId);
    await updateDoc(tableRef, { x, y });
    cachedTables = cachedTables.map(t => t.id === tableId ? { ...t, x, y } : t);
  } catch (err) {
    console.warn(`Firestore table position update failed, updating cache:`, err);
    cachedTables = cachedTables.map(t => t.id === tableId ? { ...t, x, y } : t);
  }
}

/**
 * Batch update all tables layout (x, y)
 */
export async function updateTablesBatch(tablesList: RestaurantTable[]): Promise<void> {
  try {
    for (const tbl of tablesList) {
      const tableRef = doc(db, TABLES_COLLECTION, tbl.id);
      await setDoc(tableRef, tbl, { merge: true });
    }
    cachedTables = [...tablesList];
    await broadcastNotification({
      title: 'Tata Letak Denah Diperbarui',
      message: 'Staf restoran telah memperbarui dan menyimpan posisi meja pada denah lantai.',
      type: 'general'
    });
    playChime('ding');
  } catch (err) {
    console.warn('Batch table update error:', err);
    cachedTables = [...tablesList];
  }
}

/**
 * Add a new table to restaurant
 */
export async function addNewTable(tableData: RestaurantTable): Promise<RestaurantTable> {
  try {
    const tableRef = doc(db, TABLES_COLLECTION, tableData.id);
    await setDoc(tableRef, tableData);
    cachedTables = [...cachedTables, tableData];
    await broadcastNotification({
      title: 'Meja Baru Ditambahkan',
      message: `Meja ${tableData.name} (${tableData.section}) telah ditambahkan ke denah restoran.`,
      type: 'general'
    });
    playChime('ding');
    return tableData;
  } catch (err) {
    console.warn('Add new table error, updating cache:', err);
    cachedTables = [...cachedTables, tableData];
    return tableData;
  }
}

/**
 * Reset tables to default initial layout
 */
export async function resetTablesToDefault(): Promise<RestaurantTable[]> {
  try {
    for (const tbl of INITIAL_TABLES) {
      await setDoc(doc(db, TABLES_COLLECTION, tbl.id), tbl);
    }
    cachedTables = [...INITIAL_TABLES];
    await broadcastNotification({
      title: 'Denah Meja Direset',
      message: 'Tata letak denah meja telah dikembalikan ke pengaturan standar.',
      type: 'general'
    });
    playChime('alert');
    return INITIAL_TABLES;
  } catch (err) {
    console.warn('Reset tables error:', err);
    cachedTables = [...INITIAL_TABLES];
    return INITIAL_TABLES;
  }
}

/**
 * Simulate all tables occupied/booked to test virtual waitlist
 */
export async function simulateFullHouse(): Promise<void> {
  const updated = cachedTables.map(t => ({
    ...t,
    status: 'occupied' as TableStatus
  }));
  cachedTables = updated;
  for (const t of updated) {
    try {
      await updateDoc(doc(db, TABLES_COLLECTION, t.id), { status: 'occupied' });
    } catch {
      // ignore
    }
  }
  await broadcastNotification({
    title: 'Simulasi Restoran Penuh (Full House)',
    message: 'Semua meja diset terisi untuk menguji sistem Antrean Virtual (Waitlist).',
    type: 'general'
  });
  playChime('alert');
}

/**
 * Reset all tables back to available
 */
export async function freeUpAllTables(): Promise<void> {
  const updated = cachedTables.map(t => ({
    ...t,
    status: 'available' as TableStatus
  }));
  cachedTables = updated;
  for (const t of updated) {
    try {
      await updateDoc(doc(db, TABLES_COLLECTION, t.id), { status: 'available' });
    } catch {
      // ignore
    }
  }
  await broadcastNotification({
    title: 'Meja Restoran Dibuka Kembali',
    message: 'Semua meja kembali tersedia untuk pemesanan langsung.',
    type: 'general'
  });
  playChime('ding');
}

/**
 * Update reservation status (Confirmed, Seated, Completed, Cancelled)
 */
export async function updateReservationStatus(
  reservationId: string,
  newStatus: ReservationStatus,
  tableId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const resRef = doc(db, RESERVATIONS_COLLECTION, reservationId);
    await updateDoc(resRef, {
      status: newStatus,
      updatedAt: nowIso
    });

    // Update table accordingly
    if (newStatus === 'arrived') {
      await broadcastNotification({
        title: 'Tamu Tiba di Restoran (Check-in QR)',
        message: `Tamu reservasi telah tiba di resepsionis. Pass digital berhasil diverifikasi dan siap menuju meja.`,
        type: 'status_changed',
        reservationId
      });
      playChime('success');
    } else if (newStatus === 'seated') {
      await updateTableStatus(tableId, 'occupied');
      await broadcastNotification({
        title: 'Tamu Telah Menempati Meja',
        message: `Tamu reservasi telah dipersilakan duduk di meja dan menikmati santap.`,
        type: 'status_changed',
        reservationId
      });
      playChime('ding');
    } else if (newStatus === 'completed' || newStatus === 'cancelled') {
      await updateTableStatus(tableId, 'available');
      await broadcastNotification({
        title: newStatus === 'completed' ? 'Santap Selesai' : 'Reservasi Dibatalkan',
        message: newStatus === 'completed'
          ? `Sesi santap selesai. Meja telah dibersihkan dan siap kembali.`
          : `Reservasi telah dibatalkan. Meja kembali tersedia.`,
        type: 'status_changed',
        reservationId
      });
    } else if (newStatus === 'confirmed') {
      await updateTableStatus(tableId, 'reserved');
    }
  } catch (err) {
    console.warn('Update reservation status fallback:', err);
    cachedReservations = cachedReservations.map(r => r.id === reservationId ? { ...r, status: newStatus, updatedAt: nowIso } : r);
    if (newStatus === 'seated') {
      cachedTables = cachedTables.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t);
    } else if (newStatus === 'completed' || newStatus === 'cancelled') {
      cachedTables = cachedTables.map(t => t.id === tableId ? { ...t, status: 'available' } : t);
    }
  }
}

/**
 * Mark table as ready and alert guest
 */
export async function markTableReadyAndAlert(reservation: Reservation): Promise<void> {
  await broadcastNotification({
    title: 'Meja Anda Sudah Siap!',
    message: `Halo Kak ${reservation.customerName}, Meja ${reservation.tableName} (${reservation.tableSection}) telah siap dan didekorasi untuk kehadiran Anda.`,
    type: 'table_ready',
    reservationId: reservation.id,
    recipientEmail: reservation.customerEmail
  });
  playChime('alert');
}

/**
 * Reassign a reservation to a new table (e.g. from AI Allocation Engine)
 */
export async function reassignReservationTable(
  reservationId: string,
  newTable: RestaurantTable,
  previousTableId?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const resRef = doc(db, RESERVATIONS_COLLECTION, reservationId);
    await updateDoc(resRef, {
      tableId: newTable.id,
      tableName: newTable.name,
      tableSection: newTable.section,
      updatedAt: nowIso
    });

    // If previous table exists and was reserved/occupied, release it
    if (previousTableId && previousTableId !== newTable.id) {
      await updateTableStatus(previousTableId, 'available');
    }

    // Mark new table as reserved
    await updateTableStatus(newTable.id, 'reserved');

    await broadcastNotification({
      title: 'Meja Reservasi Dialihkan (AI Rebalance)',
      message: `Reservasi telah dialokasikan ulang ke meja ${newTable.name} (${newTable.section}) untuk efisiensi floor plan.`,
      type: 'status_changed',
      reservationId
    });
    playChime('success');
  } catch (err) {
    console.warn('Reassign table fallback to cache:', err);
    cachedReservations = cachedReservations.map(r => 
      r.id === reservationId 
        ? { ...r, tableId: newTable.id, tableName: newTable.name, tableSection: newTable.section, updatedAt: nowIso }
        : r
    );
    if (previousTableId && previousTableId !== newTable.id) {
      cachedTables = cachedTables.map(t => t.id === previousTableId ? { ...t, status: 'available' } : t);
    }
    cachedTables = cachedTables.map(t => t.id === newTable.id ? { ...t, status: 'reserved' } : t);
  }
}

/**
 * Broadcast real-time notification
 */
export async function broadcastNotification(
  notif: Omit<RestaurantNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<RestaurantNotification> {
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newNotif: RestaurantNotification = {
    ...notif,
    id: notifId,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), newNotif);
    return newNotif;
  } catch (err) {
    console.warn('Failed to broadcast notif to Firestore, cached:', err);
    cachedNotifications = [newNotif, ...cachedNotifications];
    return newNotif;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notifRef, { isRead: true });
  } catch (err) {
    console.warn('Mark notif as read fallback:', err);
    cachedNotifications = cachedNotifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
  }
}

/**
 * Submit customer review & Google Review rating
 */
export async function submitCustomerReview(
  reviewData: Omit<CustomerReview, 'id' | 'createdAt'>
): Promise<CustomerReview> {
  const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newReview: CustomerReview = {
    ...reviewData,
    id: reviewId,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, REVIEWS_COLLECTION, reviewId), newReview);
    await broadcastNotification({
      title: `Ulasan Baru ⭐ ${newReview.rating}/5`,
      message: `${newReview.customerName} memberikan rating ${newReview.rating} bintang untuk Goory Coffee & Eatery!`,
      type: 'general',
      reservationId: newReview.reservationId
    });
    playChime('ding');
    return newReview;
  } catch (err) {
    console.warn('Submit review fallback:', err);
    return newReview;
  }
}

/**
 * Subscribe to reviews in real-time
 */
export function subscribeToReviews(
  onUpdate: (reviews: CustomerReview[]) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reviews: CustomerReview[] = [];
        snapshot.forEach(docSnap => {
          reviews.push({ ...docSnap.data(), id: docSnap.id } as CustomerReview);
        });
        onUpdate(reviews);
      },
      (error) => {
        console.warn('Reviews subscription error:', error);
      }
    );
  } catch (error) {
    console.warn('Reviews subscription catch error:', error);
    return () => {};
  }
}
