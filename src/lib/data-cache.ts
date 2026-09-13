/**
 * Lightweight instant client-side data cache
 * Eliminates the flash of "0 0 0" when transitioning between admin pages.
 */

let memoryCache: any = null;

const CACHE_STORAGE_KEY = 'sangam_data_cache_v1';

export function getCachedData(): any | null {
  if (memoryCache) return memoryCache;

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        memoryCache = JSON.parse(stored);
        return memoryCache;
      }
    } catch {}
  }
  return null;
}

export function setCachedData(data: any): void {
  if (!data) return;
  memoryCache = data;

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }
}

export function clearCachedData(): void {
  memoryCache = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {}
  }
}
