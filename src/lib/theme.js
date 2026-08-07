/**
 * თემა — „დღე" / „ღამე".
 *
 * საწყისი მნიშვნელობა inline სკრიპტით ისმება <head>-ში (იხ. HTML ფაილები),
 * რომ გვერდის ჩატვირთვისას თეთრი ციმციმი არ მოხდეს.
 * აქ მხოლოდ გადართვა და გამოწერაა.
 */

const KEY = 'tl.theme';
const listeners = new Set();

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme, { persist = true } = {}) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'dark' ? '#14110E' : '#F6F1E9');
  if (persist) {
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  }
  listeners.forEach((fn) => fn(next));
  return next;
}

export function toggleTheme() {
  return setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

/** თემის ცვლილებაზე გამოწერა. აბრუნებს გამოწერის გაუქმების ფუნქციას. */
export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** სისტემის პრეფერენციის თვალყური — მხოლოდ თუ მომხმარებელს ხელით არ აურჩევია */
export function followSystemTheme() {
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* ignore */ }
  if (stored) return;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => setTheme(e.matches ? 'dark' : 'light', { persist: false }));
}
