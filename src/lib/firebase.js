/**
 * Firebase — ერთი ინსტანცია მთელ აპლიკაციაზე, ზარმაცი ინიციალიზაციით.
 *
 * მოდულები დინამიურად იტვირთება: მთავარ გვერდს, რომელიც მხოლოდ
 * სტატიკურ ბანდლს კითხულობს, Firestore-ის SDK საერთოდ არ სჭირდება.
 */

import { FIREBASE_CONFIG, HAS_FIREBASE } from './config.js';

let appPromise;
let dbPromise;
let authPromise;

async function getApp() {
  if (!HAS_FIREBASE) throw new Error('Firebase არ არის კონფიგურირებული (.env)');
  appPromise ??= (async () => {
    const { initializeApp, getApps, getApp: existing } = await import('firebase/app');
    return getApps().length ? existing() : initializeApp(FIREBASE_CONFIG);
  })();
  return appPromise;
}

export async function getDb() {
  dbPromise ??= (async () => {
    const app = await getApp();
    const { getFirestore } = await import('firebase/firestore');
    return getFirestore(app);
  })();
  return dbPromise;
}

export async function getAuthInstance() {
  authPromise ??= (async () => {
    const app = await getApp();
    const { getAuth } = await import('firebase/auth');
    return getAuth(app);
  })();
  return authPromise;
}

/** Firestore-ის ხშირად საჭირო ფუნქციები ერთ ადგილას */
export async function fs() {
  const [db, mod] = await Promise.all([getDb(), import('firebase/firestore')]);
  return { db, ...mod };
}

/* ─── Auth ─────────────────────────────────────────────────── */

let cachedUser = null;
let authReady;
const userListeners = new Set();

/** ავტორიზაციის მდგომარეობის მოცდა (ერთხელ) */
export function whenAuthReady() {
  if (!HAS_FIREBASE) return Promise.resolve(null);
  authReady ??= new Promise((resolve) => {
    getAuthInstance().then(async (auth) => {
      const { onAuthStateChanged } = await import('firebase/auth');
      let first = true;
      onAuthStateChanged(auth, (user) => {
        cachedUser = user;
        userListeners.forEach((fn) => fn(user));
        if (first) { first = false; resolve(user); }
      });
    }).catch(() => resolve(null));
  });
  return authReady;
}

export function onUser(fn) {
  userListeners.add(fn);
  whenAuthReady().then(() => fn(cachedUser));
  return () => userListeners.delete(fn);
}

export const currentUser = () => cachedUser;

export async function signInWithGoogle() {
  const auth = await getAuthInstance();
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(auth, provider);
  return user;
}

export async function signOutUser() {
  const auth = await getAuthInstance();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}

/** ადმინის უფლება custom claim-ით — არასდროს Firestore-ის ველით */
export async function isAdmin() {
  const user = await whenAuthReady();
  if (!user) return false;
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}
