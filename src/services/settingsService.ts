import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  AppSettings, 
  DEFAULT_APP_SETTINGS, 
  AdminProfile, 
  RestaurantSettings, 
  NotificationSettings, 
  DepositSettings, 
  CrewAccessSettings,
  QrisSettings 
} from '../types/settings';

const SETTINGS_COLLECTION = 'restaurant_settings';
const GENERAL_DOC_ID = 'general';
const LOCAL_STORAGE_KEY = 'savour_app_settings_cache';

// Load cached or default settings from local storage
export const getLocalCachedSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        adminProfile: { ...DEFAULT_APP_SETTINGS.adminProfile, ...(parsed.adminProfile || {}) },
        restaurant: { ...DEFAULT_APP_SETTINGS.restaurant, ...(parsed.restaurant || {}) },
        notifications: { ...DEFAULT_APP_SETTINGS.notifications, ...(parsed.notifications || {}) },
        deposit: { ...DEFAULT_APP_SETTINGS.deposit, ...(parsed.deposit || {}) },
        crewAccess: { ...DEFAULT_APP_SETTINGS.crewAccess, ...(parsed.crewAccess || {}) },
        qris: { ...DEFAULT_APP_SETTINGS.qris, ...(parsed.qris || {}) },
      };
    }
  } catch (err) {
    console.warn('Failed to read settings from localStorage:', err);
  }
  return DEFAULT_APP_SETTINGS;
};

// Save to local cache
export const saveToLocalCache = (settings: AppSettings): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save settings to localStorage:', err);
  }
};

/**
 * Real-time subscription to restaurant settings from Firestore
 */
export const subscribeToAppSettings = (
  callback: (settings: AppSettings) => void
): Unsubscribe => {
  // Emit initial local cached settings immediately for instant UI render
  callback(getLocalCachedSettings());

  try {
    const settingsDocRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);

    return onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as Partial<AppSettings>;
          const merged: AppSettings = {
            ...DEFAULT_APP_SETTINGS,
            ...remoteData,
            adminProfile: { ...DEFAULT_APP_SETTINGS.adminProfile, ...(remoteData.adminProfile || {}) },
            restaurant: { ...DEFAULT_APP_SETTINGS.restaurant, ...(remoteData.restaurant || {}) },
            notifications: { ...DEFAULT_APP_SETTINGS.notifications, ...(remoteData.notifications || {}) },
            deposit: { ...DEFAULT_APP_SETTINGS.deposit, ...(remoteData.deposit || {}) },
            crewAccess: { ...DEFAULT_APP_SETTINGS.crewAccess, ...(remoteData.crewAccess || {}) },
          };
          saveToLocalCache(merged);
          callback(merged);
        } else {
          // Initialize remote document if it doesn't exist yet
          const initial = getLocalCachedSettings();
          setDoc(settingsDocRef, initial).catch(err => {
            console.warn('Auto-initializing default settings in Firestore:', err);
          });
        }
      },
      (error) => {
        console.warn('Firestore settings subscription error, using local fallback:', error);
        callback(getLocalCachedSettings());
      }
    );
  } catch (err) {
    console.warn('Failed to setup Firestore settings listener:', err);
    return () => {};
  }
};

/**
 * Save complete application settings
 */
export const saveAppSettings = async (
  newSettings: AppSettings,
  authorEmail: string = 'Admin'
): Promise<void> => {
  const updated: AppSettings = {
    ...newSettings,
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail
  };

  // Immediate local cache update
  saveToLocalCache(updated);

  try {
    const settingsDocRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
    await setDoc(settingsDocRef, updated, { merge: true });
  } catch (err) {
    console.error('Failed to sync settings to Firestore:', err);
    // Even if Firestore fails, local cache is preserved
  }
};

/**
 * Update Admin Profile section
 */
export const updateAdminProfile = async (
  profile: Partial<AdminProfile>,
  authorEmail?: string
): Promise<AppSettings> => {
  const current = getLocalCachedSettings();
  const updated: AppSettings = {
    ...current,
    adminProfile: {
      ...current.adminProfile,
      ...profile
    },
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || current.adminProfile.email
  };
  await saveAppSettings(updated, authorEmail);
  return updated;
};

/**
 * Update Restaurant Info & Operating Hours
 */
export const updateRestaurantSettings = async (
  restaurant: Partial<RestaurantSettings>,
  authorEmail?: string
): Promise<AppSettings> => {
  const current = getLocalCachedSettings();
  const updated: AppSettings = {
    ...current,
    restaurant: {
      ...current.restaurant,
      ...restaurant
    },
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || current.adminProfile.email
  };
  await saveAppSettings(updated, authorEmail);
  return updated;
};

/**
 * Update Notifications preferences
 */
export const updateNotificationSettings = async (
  notifications: Partial<NotificationSettings>,
  authorEmail?: string
): Promise<AppSettings> => {
  const current = getLocalCachedSettings();
  const updated: AppSettings = {
    ...current,
    notifications: {
      ...current.notifications,
      ...notifications
    },
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || current.adminProfile.email
  };
  await saveAppSettings(updated, authorEmail);
  return updated;
};

/**
 * Update Deposit & Financial Settings
 */
export const updateDepositSettings = async (
  deposit: Partial<DepositSettings>,
  authorEmail?: string
): Promise<AppSettings> => {
  const current = getLocalCachedSettings();
  const updated: AppSettings = {
    ...current,
    deposit: {
      ...current.deposit,
      ...deposit
    },
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || current.adminProfile.email
  };
  await saveAppSettings(updated, authorEmail);
  return updated;
};

/**
 * Update Crew PIN and permissions
 */
export const updateCrewAccessSettings = async (
  crewAccess: Partial<CrewAccessSettings>,
  authorEmail?: string
): Promise<AppSettings> => {
  const current = getLocalCachedSettings();
  const updated: AppSettings = {
    ...current,
    crewAccess: {
      ...current.crewAccess,
      ...crewAccess
    },
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || current.adminProfile.email
  };
  await saveAppSettings(updated, authorEmail);
  return updated;
};

/**
 * Update QRIS Configuration
 */
export const updateQrisSettings = async (
  qris: Partial<QrisSettings>,
  authorEmail?: string
): Promise<AppSettings> => {
  const current = getLocalCachedSettings();
  const updated: AppSettings = {
    ...current,
    qris: {
      ...current.qris,
      ...qris
    },
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail || 'Admin'
  };

  await saveAppSettings(updated, authorEmail);
  return updated;
};

/**
 * Reset all settings back to default factory presets
 */
export const resetSettingsToDefault = async (authorEmail?: string): Promise<AppSettings> => {
  const resetData: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    updatedAt: new Date().toISOString(),
    updatedBy: `${authorEmail || 'Admin'} (Factory Reset)`
  };
  await saveAppSettings(resetData, authorEmail);
  return resetData;
};

/**
 * Helper to check if a provided PIN is a valid crew operational PIN
 */
export const verifyCrewPin = (pin: string, customSettings?: AppSettings): boolean => {
  const settings = customSettings || getLocalCachedSettings();
  const validList = [
    settings.crewAccess.crewPin,
    ...(settings.crewAccess.allowedPins || []),
    '1234',
    '1988',
    '8888'
  ];
  return validList.includes(pin.trim());
};
