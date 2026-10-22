import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuItem } from '../types/menu';
import { INITIAL_MENU_ITEMS } from '../data/defaultMenu';

const MENU_COLLECTION = 'menu_items';
const LOCAL_STORAGE_KEY = 'savour_menu_items_cache';

// Local memory cache
let cachedMenuItems: MenuItem[] = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached menu items:', e);
  }
  return [...INITIAL_MENU_ITEMS];
})();

function saveToLocalStorage(items: MenuItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage save failed for menu:', e);
  }
}

/**
 * Get the current memory/local cached menu items
 */
export function getLocalCachedMenu(): MenuItem[] {
  return [...cachedMenuItems];
}

/**
 * Subscribe to real-time menu item updates from Firestore
 */
export function subscribeToMenuItems(callback: (items: MenuItem[]) => void): Unsubscribe {
  // Fire initial cache immediately so the UI is responsive
  callback(cachedMenuItems);

  try {
    const colRef = collection(db, MENU_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: MenuItem[] = [];
          snapshot.forEach((d) => {
            items.push({ id: d.id, ...d.data() } as MenuItem);
          });
          // Sort items: available first, then chef special, then by name
          items.sort((a, b) => {
            if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
            if (a.isChefSpecial !== b.isChefSpecial) return a.isChefSpecial ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          cachedMenuItems = items;
          saveToLocalStorage(items);
          callback(items);
        } else {
          // Initialize Firestore with default items if collection is empty
          seedInitialMenu();
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot error on menu_items, using local cache:', error);
        callback(cachedMenuItems);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firebase error initializing menu listener, fallback to cache:', err);
    return () => {};
  }
}

/**
 * Seed initial menu to Firestore
 */
export async function seedInitialMenu(): Promise<void> {
  try {
    for (const item of INITIAL_MENU_ITEMS) {
      const docRef = doc(db, MENU_COLLECTION, item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch (e) {
    console.warn('Could not seed menu to Firestore:', e);
  }
}

/**
 * Toggle item stock availability in real-time (Tersedia <-> Habis)
 */
export async function toggleMenuItemStock(itemId: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  const now = new Date().toISOString();

  // Optimistic local update
  cachedMenuItems = cachedMenuItems.map((item) =>
    item.id === itemId ? { ...item, isAvailable: newStatus, updatedAt: now } : item
  );
  saveToLocalStorage(cachedMenuItems);

  try {
    const docRef = doc(db, MENU_COLLECTION, itemId);
    await updateDoc(docRef, {
      isAvailable: newStatus,
      updatedAt: now
    });
  } catch (e) {
    console.warn('Failed to sync stock toggle to Firestore, kept in local state:', e);
  }
  return newStatus;
}

/**
 * Create a new menu item
 */
export async function createMenuItem(
  itemData: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MenuItem> {
  const newId = `menu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  const newItem: MenuItem = {
    ...itemData,
    id: newId,
    createdAt: now,
    updatedAt: now
  };

  // Optimistic local update
  cachedMenuItems = [newItem, ...cachedMenuItems];
  saveToLocalStorage(cachedMenuItems);

  try {
    const docRef = doc(db, MENU_COLLECTION, newId);
    await setDoc(docRef, newItem);
  } catch (e) {
    console.warn('Failed to create menu item on Firestore, kept in local state:', e);
  }

  return newItem;
}

/**
 * Update an existing menu item
 */
export async function updateMenuItem(
  itemId: string,
  updates: Partial<Omit<MenuItem, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();

  // Optimistic local update
  cachedMenuItems = cachedMenuItems.map((item) =>
    item.id === itemId ? { ...item, ...updates, updatedAt: now } : item
  );
  saveToLocalStorage(cachedMenuItems);

  try {
    const docRef = doc(db, MENU_COLLECTION, itemId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now
    });
  } catch (e) {
    console.warn('Failed to update menu item on Firestore, kept in local state:', e);
  }
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(itemId: string): Promise<void> {
  // Optimistic local update
  cachedMenuItems = cachedMenuItems.filter((item) => item.id !== itemId);
  saveToLocalStorage(cachedMenuItems);

  try {
    const docRef = doc(db, MENU_COLLECTION, itemId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Failed to delete menu item from Firestore, kept in local state:', e);
  }
}

/**
 * Reset all menu items to default gourmet presets
 */
export async function resetMenuToDefaults(): Promise<void> {
  cachedMenuItems = [...INITIAL_MENU_ITEMS];
  saveToLocalStorage(cachedMenuItems);

  try {
    await seedInitialMenu();
  } catch (e) {
    console.warn('Reset to default menu error:', e);
  }
}
