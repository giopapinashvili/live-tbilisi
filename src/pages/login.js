/** შესვლის გვერდი. */

import { boot, $, toast } from './_boot.js';
import { HAS_BACKEND } from '../lib/config.js';

boot({ active: 'profile' });

const btn = $('#google');
const note = $('#note');

if (!HAS_BACKEND) {
  btn.disabled = true;
  note.textContent = 'Firebase არ არის კონფიგურირებული (.env)';
} else {
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { signInWithGoogle } = await import('../lib/supabase.js');
      await signInWithGoogle();
      const next = new URLSearchParams(location.search).get('next') || '/dashboard.html';
      location.href = next;
    } catch (err) {
      console.error(err);
      toast('შესვლა ვერ მოხერხდა', 'error');
      btn.disabled = false;
    }
  });
}
