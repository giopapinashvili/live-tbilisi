#!/usr/bin/env node
/**
 * ტაქსონომიის ჩაწერა Firestore-ში.
 *
 * წყარო რჩება src/data/taxonomy.js — ეს სკრიპტი მას მხოლოდ ასახავს
 * ბაზაში, რომ Cloud Function-მა და ადმინმა იგივე სია დაინახონ.
 *
 *   node scripts/seed-taxonomy.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { CATEGORIES, DISTRICTS, ATTRIBUTES } from '../src/data/taxonomy.js';

(async () => {
  const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credential = keyPath
    ? cert(JSON.parse(await fs.readFile(path.resolve(keyPath), 'utf8')))
    : applicationDefault();

  initializeApp({ credential, projectId: process.env.FB_PROJECT_ID });
  const db = getFirestore();

  const batch = db.batch();
  batch.set(db.collection('taxonomy').doc('categories'), {
    items: CATEGORIES, updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('taxonomy').doc('districts'), {
    items: DISTRICTS, updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('taxonomy').doc('attributes'), {
    items: ATTRIBUTES, updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  const subCount = CATEGORIES.reduce((n, c) => n + c.sub.length, 0);
  console.log(`✅ ტაქსონომია ჩაიწერა: ${CATEGORIES.length} კატეგორია, ${subCount} ქვეკატეგორია, `
    + `${DISTRICTS.length} რაიონი, ${ATTRIBUTES.length} ატრიბუტი`);
})().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
