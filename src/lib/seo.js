/**
 * SEO ტეგები.
 *
 * canonical სტატიკურ HTML-ში არ იწერება განზრახ: Vite `<link href="…">`-ს
 * ასეტად აღიქვამს და მისამართს ჰეშიანით ცვლის. ამიტომ სრულ URL-ს
 * აქ ვაწყობთ VITE_SITE_URL-ის ბაზაზე.
 */


/** სრული აბსოლუტური URL მოცემული ბილიკისთვის */
import { SITE_URL as SITE } from './config.js';

export function absUrl(pathname = location.pathname + location.search) {
  const base = SITE || location.origin;
  return `${base}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
}

export function setCanonical(pathname) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.append(link);
  }
  link.href = absUrl(pathname ?? location.pathname);
  setMeta('og:url', link.href, 'property');
}

export function setTitle(title) {
  document.title = title;
  setMeta('og:title', title, 'property');
}

export function setDescription(text) {
  setMeta('description', text);
  setMeta('og:description', text, 'property');
}

export function setMeta(name, content, kind = 'name') {
  if (!content) return;
  let tag = document.querySelector(`meta[${kind}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(kind, name);
    document.head.append(tag);
  }
  tag.setAttribute('content', content);
}

export function setJsonLd(json, id = 'ld-main') {
  document.getElementById(id)?.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = typeof json === 'string' ? json : JSON.stringify(json);
  document.head.append(script);
}
