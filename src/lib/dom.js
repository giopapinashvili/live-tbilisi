/** მინიმალური DOM დამხმარეები — ჩარჩოს გარეშე, მაგრამ უსაფრთხოდ. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** HTML-ის ესკეიპი — ყველა მომხმარებლის ტექსტი ამით უნდა გაიაროს */
export function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** ატრიბუტში ჩასასმელი უსაფრთხო მნიშვნელობა */
export const attr = (v) => esc(v).replace(/\n/g, ' ');

/**
 * ელემენტის შექმნა.
 * el('div', { class: 'card', dataset: { id: 3 } }, [child, 'ტექსტი'])
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of [children].flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** კონტეინერის სრული ჩანაცვლება */
export function render(container, ...nodes) {
  if (!container) return container;
  container.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  return container;
}

/** დელეგირებული მოვლენა — ერთი listener მთელ სიაზე */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (e) => {
    const match = e.target.closest?.(selector);
    if (match && root.contains(match)) handler(e, match);
  });
}

export function debounce(fn, ms = 200) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

/** ─── Toast ─── */
let toastHost;
export function toast(message, kind = '') {
  toastHost ??= document.body.appendChild(el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
  const node = el('div', { class: `toast ${kind ? `toast-${kind}` : ''}`, text: message });
  toastHost.append(node);
  setTimeout(() => {
    node.style.transition = 'opacity .3s, transform .3s';
    node.style.opacity = '0';
    node.style.transform = 'translateY(8px)';
    setTimeout(() => node.remove(), 320);
  }, kind === 'error' ? 5200 : 3200);
}

/** URL query params-ის კითხვა/ჩაწერა history-ის დაბინძურების გარეშე */
export const params = {
  get: (key, fallback = null) => new URLSearchParams(location.search).get(key) ?? fallback,
  all: () => Object.fromEntries(new URLSearchParams(location.search)),
  set(patch, { replace = true } = {}) {
    const sp = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) sp.delete(k);
      else sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    const qs = sp.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
    history[replace ? 'replaceState' : 'pushState'](null, '', url);
  },
};
