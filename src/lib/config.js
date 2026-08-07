/**
 * გარემოს კონფიგურაცია — ერთადერთი ადგილი, სადაც import.meta.env იკითხება.
 * ყველა სხვა მოდული აქედან იღებს მნიშვნელობებს.
 */

const env = import.meta.env ?? {};

const str = (key, fallback = '') => (env[key] ?? fallback).toString().trim();

/**
 * Supabase — შესვლა, ბაზა და ფოტოების საცავი.
 *
 * გასაღები საჯაროა და ასეც უნდა იყოს: ბრაუზერში ისედაც ჩანს.
 * დაცვას ბაზის RLS წესები აკეთებს, არა გასაღების დამალვა.
 */
export const SUPABASE = {
  url: str('VITE_SUPABASE_URL'),
  key: str('VITE_SUPABASE_KEY'),
};

/** ბექენდი მიბმულია თუ არა — UI-მ ამის მიხედვით უნდა მოიქცეს */
export const HAS_BACKEND = Boolean(SUPABASE.url && SUPABASE.key);

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
  if (!HAS_BACKEND) missing.push('Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)');
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
