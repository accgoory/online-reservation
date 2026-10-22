import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { WaitlistChatMessage, WaitlistQuickTemplate, ChatSenderRole } from '../types/restaurant';
import { playChime } from '../utils/audio';

const CHAT_COLLECTION = 'waitlist_messages';

// Quick response templates for Restaurant Staff / Hostess
export const STAFF_QUICK_TEMPLATES: WaitlistQuickTemplate[] = [
  {
    id: 'tmpl-clean',
    label: 'Meja Sedang Dibersihkan',
    message: 'Halo! Meja Anda sedang dalam proses sanitasi & penataan akhir oleh kru kami. Sebentar lagi siap!',
    category: 'status'
  },
  {
    id: 'tmpl-5min',
    label: 'Estimasi ~5 Menit',
    message: 'Perkiraan meja Anda akan siap dalam kurun waktu sekitar 5 menit. Mohon tetap berada di dekat area resto.',
    category: 'status'
  },
  {
    id: 'tmpl-highchair',
    label: 'Kursi Bayi Disiapkan',
    message: 'Permintaan kursi bayi (baby high-chair) telah kami siapkan di meja Anda.',
    category: 'request'
  },
  {
    id: 'tmpl-reception',
    label: 'Silakan ke Resepsionis',
    message: 'Meja Anda telah siap! Silakan langsung menuju meja resepsionis Goory Coffee & Eatery dengan menunjukkan kode tiket Anda.',
    category: 'arrival'
  },
  {
    id: 'tmpl-lobby-check',
    label: 'Cek Kehadiran Tamu',
    message: 'Apakah seluruh anggota rombongan bersantap Anda sudah berkumpul di area lobi restoran?',
    category: 'arrival'
  }
];

// Quick response templates for Guests waiting in queue
export const GUEST_QUICK_TEMPLATES: WaitlistQuickTemplate[] = [
  {
    id: 'guest-highchair',
    label: 'Minta Kursi Bayi',
    message: 'Halo, apakah bisa disiapkan 1 kursi bayi (baby high chair) untuk anak kami?',
    category: 'request'
  },
  {
    id: 'guest-window',
    label: 'Dekat Jendela',
    message: 'Jika memungkinkan, kami ingin meminta meja di dekat jendela.',
    category: 'request'
  },
  {
    id: 'guest-arrived',
    label: 'Sudah Tiba di Lobi',
    message: 'Seluruh anggota rombongan kami sudah berkumpul dan menunggu di area lobi.',
    category: 'arrival'
  },
  {
    id: 'guest-eta',
    label: 'Kira-kira Berapa Menit?',
    message: 'Kira-kira berapa menit lagi meja kami siap ya Kak? Terima kasih.',
    category: 'status'
  }
];

// Initial seeded demo conversation for the first demo waitlist ticket
const INITIAL_DEMO_CHATS: WaitlistChatMessage[] = [
  {
    id: 'msg-demo-1',
    waitlistEntryId: 'wl_demo_101',
    queueCode: 'WL-001',
    senderRole: 'customer',
    senderName: 'Dimas Wicaksono',
    text: 'Halo Kak, apakah bisa minta meja yang agak tenang dekat jendela?',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    isRead: true
  },
  {
    id: 'msg-demo-2',
    waitlistEntryId: 'wl_demo_101',
    queueCode: 'WL-001',
    senderRole: 'staff',
    senderName: 'Host Goory Coffee & Eatery',
    text: 'Halo Kak Dimas! Baik, catatan meja dekat jendela sudah kami simpan. Kru kami sedang menyiapkan Meja M1.',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isRead: true
  },
  {
    id: 'msg-demo-3',
    waitlistEntryId: 'wl_demo_102',
    queueCode: 'WL-002',
    senderRole: 'customer',
    senderName: 'Maya Angelica',
    text: 'Selamat malam, kami membawa kue ulang tahun kecil, apakah bisa dibantu disimpan di kulkas dulu?',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    isRead: false
  }
];

// In-memory fallback message storage
let inMemoryChatStore: WaitlistChatMessage[] = [...INITIAL_DEMO_CHATS];

/**
 * Send a new waitlist chat message
 */
export async function sendWaitlistMessage(params: {
  waitlistEntryId: string;
  queueCode: string;
  senderRole: ChatSenderRole;
  senderName: string;
  text: string;
  quickTemplateId?: string;
}): Promise<WaitlistChatMessage> {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const newMessage: WaitlistChatMessage = {
    id: messageId,
    waitlistEntryId: params.waitlistEntryId,
    queueCode: params.queueCode,
    senderRole: params.senderRole,
    senderName: params.senderName,
    text: params.text.trim(),
    createdAt: nowIso,
    isRead: false,
    quickTemplateId: params.quickTemplateId
  };

  // Update in-memory fallback
  inMemoryChatStore = [...inMemoryChatStore, newMessage];

  try {
    const docRef = doc(db, CHAT_COLLECTION, messageId);
    await setDoc(docRef, newMessage);
  } catch (err) {
    console.warn('Firestore setDoc chat fallback to memory:', err);
  }

  // Play subtle audio chime for local feedback
  playChime('ding');

  return newMessage;
}

/**
 * Subscribe to real-time chat messages for a specific waitlist entry
 */
export function subscribeToWaitlistChat(
  waitlistEntryId: string,
  onUpdate: (messages: WaitlistChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, CHAT_COLLECTION),
      where('waitlistEntryId', '==', waitlistEntryId)
    );

    let isFirstEmission = true;

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Deliver matching in-memory fallback messages
          const memoryMatches = inMemoryChatStore
            .filter((m) => m.waitlistEntryId === waitlistEntryId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          onUpdate(memoryMatches);
          isFirstEmission = false;
          return;
        }

        const messages: WaitlistChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          messages.push({ ...docSnap.data(), id: docSnap.id } as WaitlistChatMessage);
        });

        // Sort chronologically
        messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Chime on new incoming message if not initial load
        if (!isFirstEmission && messages.length > 0) {
          playChime('ding');
        }
        isFirstEmission = false;

        onUpdate(messages);
      },
      (error) => {
        console.warn('Waitlist chat Firestore subscription error, using memory fallback:', error);
        if (onError) onError(error);
        const memoryMatches = inMemoryChatStore
          .filter((m) => m.waitlistEntryId === waitlistEntryId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        onUpdate(memoryMatches);
      }
    );
  } catch (err) {
    console.warn('Failed to attach chat snapshot listener, using memory fallback:', err);
    const memoryMatches = inMemoryChatStore
      .filter((m) => m.waitlistEntryId === waitlistEntryId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    onUpdate(memoryMatches);
    return () => {};
  }
}

/**
 * Subscribe to all unread customer messages count per waitlist entry ID for Staff Dashboard
 */
export function subscribeToAllUnreadWaitlistCounts(
  onUpdate: (unreadCounts: Record<string, number>) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, CHAT_COLLECTION),
      where('senderRole', '==', 'customer'),
      where('isRead', '==', false)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const counts: Record<string, number> = {};
        if (snapshot.empty) {
          // Use in-memory store
          inMemoryChatStore
            .filter((m) => m.senderRole === 'customer' && !m.isRead)
            .forEach((m) => {
              counts[m.waitlistEntryId] = (counts[m.waitlistEntryId] || 0) + 1;
            });
          onUpdate(counts);
          return;
        }

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as WaitlistChatMessage;
          if (data.waitlistEntryId) {
            counts[data.waitlistEntryId] = (counts[data.waitlistEntryId] || 0) + 1;
          }
        });

        onUpdate(counts);
      },
      (err) => {
        console.warn('Unread count subscription error, falling back:', err);
        const counts: Record<string, number> = {};
        inMemoryChatStore
          .filter((m) => m.senderRole === 'customer' && !m.isRead)
          .forEach((m) => {
            counts[m.waitlistEntryId] = (counts[m.waitlistEntryId] || 0) + 1;
          });
        onUpdate(counts);
      }
    );
  } catch (e) {
    const counts: Record<string, number> = {};
    inMemoryChatStore
      .filter((m) => m.senderRole === 'customer' && !m.isRead)
      .forEach((m) => {
        counts[m.waitlistEntryId] = (counts[m.waitlistEntryId] || 0) + 1;
      });
    onUpdate(counts);
    return () => {};
  }
}

/**
 * Mark messages in a chat as read by viewer
 */
export async function markWaitlistMessagesAsRead(
  waitlistEntryId: string,
  viewerRole: ChatSenderRole
): Promise<void> {
  // Opposing role whose messages need marking as read
  const targetSenderRole: ChatSenderRole = viewerRole === 'staff' ? 'customer' : 'staff';

  // Update in-memory fallback
  inMemoryChatStore = inMemoryChatStore.map((m) => {
    if (m.waitlistEntryId === waitlistEntryId && m.senderRole === targetSenderRole && !m.isRead) {
      return { ...m, isRead: true };
    }
    return m;
  });

  try {
    const q = query(
      collection(db, CHAT_COLLECTION),
      where('waitlistEntryId', '==', waitlistEntryId),
      where('senderRole', '==', targetSenderRole),
      where('isRead', '==', false)
    );

    const snap = await getDocs(q);
    const updatePromises = snap.docs.map((docSnap) =>
      updateDoc(doc(db, CHAT_COLLECTION, docSnap.id), { isRead: true })
    );
    await Promise.all(updatePromises);
  } catch (err) {
    console.warn('markWaitlistMessagesAsRead error in Firestore:', err);
  }
}
