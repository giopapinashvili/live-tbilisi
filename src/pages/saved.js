/** შენახული და გამოწერილი ადგილები. */

import { boot, $, delegate } from './_boot.js';
import { businessList, emptyState } from '../components/cards.js';
import { loadCity, getState } from '../lib/store.js';
import { getProfile } from '../lib/taste.js';

boot({ active: 'saved', canonical: false });

let mode = 'saves';
const host = $('#list');

loadCity().then(paint);

delegate(document, 'click', '[data-list]', (e, btn) => {
  mode = btn.dataset.list;
  for (const t of document.querySelectorAll('[data-list]')) {
    t.setAttribute('aria-selected', String(t.dataset.list === mode));
  }
  paint();
});

function paint() {
  const p = getProfile();
  const ids = mode === 'saves' ? p.saves : p.follows;
  const { byId } = getState();
  const list = ids.map((id) => byId.get(id)).filter(Boolean);

  if (!list.length) {
    host.innerHTML = emptyState({
      icon: mode === 'saves' ? 'heart' : 'plus',
      title: mode === 'saves' ? 'ჯერ არაფერი შეგინახავს' : 'ჯერ არავინ გამოგიწერია',
      text: mode === 'saves'
        ? 'ფიდზე ან ბიზნესის გვერდზე გულის ღილაკი შეინახავს ადგილს.'
        : 'გამოწერილი ბიზნესების სიახლეები ფიდში ყოველთვის წინ იქნება.',
      action: { href: '/', label: 'ფიდზე დაბრუნება' },
    });
    return;
  }
  host.innerHTML = businessList(list);
}
