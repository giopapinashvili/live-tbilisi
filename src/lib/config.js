/**
 * გარემოს კონფიგურაცია — ერთადერთი ადგილი, სადაც import.meta.env იკითხება.
 * ყველა სხვა მოდული აქედან იღებს მნიშვნელობებს.
 */

const env = import.meta.env ?? {};

const str = (key, fallback = '') => (env[key] ?? fallback).toString().trim();

export const FIREBASE_CONFIG = {
  apiKey: str('VITE_FB_API_KEY'),
  authDomain: str('VITE_FB_AUTH_DOMAIN'),
  projectId: str('VITE_FB_PROJECT_ID'),
  storageBucket: str('VITE_FB_STORAGE_BUCKET'),
  messagingSenderId: str('VITE_FB_MESSAGING_SENDER_ID'),
  appId: str('VITE_FB_APP_ID'),
};

/** Firebase კონფიგურირებულია თუ არა — UI-მ ამის მიხედვით უნდა მოიქცეს */
export const HAS_FIREBASE = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

export const TILES = {
  mode: str('VITE_TILES_MODE', 'osm'),        // pmtiles | maptiler | osm
  pmtilesUrl: str('VITE_PMTILES_URL'),
  maptilerKey: str('VITE_MAPTILER_KEY'),
};

export const BUNDLE_BASE = str('VITE_BUNDLE_BASE', '/bundles').replace(/\/$/, '');

export const MEILI = {
  host: str('VITE_MEILI_HOST'),
  key: str('VITE_MEILI_SEARCH_KEY'),
};
export const HAS_MEILI = Boolean(MEILI.host && MEILI.key);

export const IS_DEV = Boolean(env.DEV);

/** გაშვებისას აშკარა გაფრთხილება, თუ რამე კრიტიკული აკლია */
export function warnMissingConfig() {
  const missing = [];
  if (!HAS_FIREBASE) missing.push('Firebase (VITE_FB_*)');
  if (TILES.mode === 'pmtiles' && !TILES.pmtilesUrl) missing.push('VITE_PMTILES_URL');
  if (TILES.mode === 'maptiler' && !TILES.maptilerKey) missing.push('VITE_MAPTILER_KEY');
  if (missing.length && IS_DEV) {
    console.warn(
      `[თბილისი LIVE] კონფიგურაცია არასრულია: ${missing.join(', ')}\n` +
      'დააკოპირე .env.example → .env და შეავსე.',
    );
  }
  return missing;
}
