/**
 * საერთო ჩატვირთვა.
 *
 * აპის გვერდები (ფიდი, რუკა, ძებნა, პროფილი) ტაბებით ნავიგირდება.
 * ხელსაწყოები (dashboard, admin) ინარჩუნებენ კლასიკურ ჰედერს —
 * იქ ტაბები არაფერს შველის.
 */

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/pages.css';
import '../styles/app.css';

import { mountHeader, mountFooter } from '../components/header.js';
import { mountTabBar } from '../components/tabbar.js';
import { followSystemTheme } from '../lib/theme.js';
import { warnMissingConfig } from '../lib/config.js';
import { setCanonical } from '../lib/seo.js';
import { $ } from '../lib/dom.js';

/**
 * @param {{
 *   active?: string,          // რომელი ტაბი ანთია
 *   chrome?: 'tabs'|'header', // ნავიგაციის ტიპი
 *   footer?: boolean,
 *   canonical?: string|false,
 * }} opts
 */
export function boot({ active = '', chrome = 'tabs', footer = false, canonical } = {}) {
  followSystemTheme();

  if (chrome === 'header') {
    mountHeader({ active });
    if (footer) mountFooter();
  } else {
    $('#hdr')?.remove();
    mountTabBar({ active });
    if (footer) mountFooter();
  }

  if (canonical !== false) setCanonical(canonical);
  warnMissingConfig();
}

export { $, $$, el, esc, attr, render, toast, params, delegate, debounce } from '../lib/dom.js';
export { setCanonical, setTitle, setDescription, setJsonLd, absUrl } from '../lib/seo.js';
