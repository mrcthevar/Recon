
/**
 * Safe Storage Utility
 * Wraps localStorage access in try-catch blocks to prevent 
 * application crashes due to QuotaExceeded errors, 
 * corrupted JSON, or privacy mode restrictions.
 */
export const safeStorage = {
  get: <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`[Storage] Failed to load key "${key}". Returning fallback.`, e);
      // In case of corruption, we might want to clear the bad key
      try { localStorage.removeItem(key); } catch {}
      return fallback;
    }
  },

  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.error(`[Storage] Failed to save key "${key}".`, e);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[Storage] Failed to remove key "${key}".`, e);
    }
  }
};
