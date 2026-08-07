/**
 * საერთო ჩატვირთვა ყველა გვერდისთვის.
 * სტილები, ჰედერი, ძირი, თემა — ერთ ადგილას, რომ გვერდებში არ დუბლირდეს.
 */

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/pages.css';

import { mountHeader, mountFooter } from '../components/header.js';
import { followSystemTheme } from '../lib/theme.js';
import { warnMissingConfig } from '../lib/config.js';
import { setCanonical } from '../lib/seo.js';

/**
 * @param {{active?:string, compact?:boolean, footer?:boolean, canonical?:string|false}} opts
 */
export function boot({ active = '', compact = false, footer = true, canonical } = {}) {
  followSystemTheme();
  mountHeader({ active, compact });
  if (footer) mountFooter();
  if (canonical !== false) setCanonical(canonical);
  warnMissingConfig();
}

export { setCanonical, setTitle, setDescription, setJsonLd, absUrl } from '../lib/seo.js';

export { $ , $$, el, esc, attr, render, toast, params, delegate, debounce } from '../lib/dom.js';
