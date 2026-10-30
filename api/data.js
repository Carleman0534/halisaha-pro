// Ortak veri endpoint'i: oyuncular (puanlar, bakiyeler), sahalar ve geçmiş maçlar.
// Hepsi tek bir Firestore belgesinde (sync/data) tutulur, böylece herkes aynı veriyi görür.
// Belge boyutu limiti 1 MB; ~900 KB'ı aşarsa yazma reddedilir.

import { getDb } from './_lib/admin.js';

const COLLECTIONS = ['players', 'venues', 'pastMatches'];
const MAX_DOC_BYTES = 900 * 1024;
const READ_CACHE_MS = 3000;

let readCache = { at: 0, doc: null };

function emptyDoc() {
  return { players: {}, venues: {}, pastMatches: {}, ts: 0 };
}

function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return (
    '{' +
    Object.keys(v)
      .filter(k => v[k] !== undefined)
      .sort()
      .map(k => JSON.stringify(k) + ':' + stable(v[k]))
      .join(',') +
    '}'
  );
}

// Puanlar değerlendiriciye göre birleştirilir: farklı kişilerin aynı anda verdiği puanlar birbirini ezmez.
function mergePlayer(existing, incoming) {
  const ratings = { ...(existing.ratings || {}) };
  for (const [evaluatorId, crit] of Object.entries(incoming.ratings || {})) {
    ratings[evaluatorId] = { ...(ratings[evaluatorId] || {}), ...(crit || {}) };
  }
  return { ...incoming, ratings };
}

async function loadDoc(db) {
  const snap = await db.collection('sync').doc('data').get();
  return snap.exists ? { ...emptyDoc(), ...snap.data() } : emptyDoc();
}

function publicView(doc) {
  const collections = {};
  for (const c of COLLECTIONS) collections[c] = doc[c] || {};
  return { ok: true, ts: doc.ts || 0, collections, serverTime: Date.now() };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let db;
  try {
    db = getDb();
  } catch (err) {
    return res.status(503).json({ ok: false, error: 'storage_unavailable', message: err.message });
  }

  try {
    if (req.method !== 'POST') {
      const now = Date.now();
      if (!readCache.doc || now - readCache.at > READ_CACHE_MS) {
        readCache = { at: now, doc: await loadDoc(db) };
      }
      return res.status(200).json(publicView(readCache.doc));
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const collection = body.collection;
    const items = Array.isArray(body.items) ? body.items : [];
    const seed = body.seed === true;

    if (!COLLECTIONS.includes(collection)) {
      return res.status(400).json({ ok: false, error: 'bad_collection' });
    }

    const ref = db.collection('sync').doc('data');

    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const doc = snap.exists ? { ...emptyDoc(), ...snap.data() } : emptyDoc();
      const map = { ...(doc[collection] || {}) };
      let changed = false;

      for (const item of items) {
        if (!item || typeof item.id !== 'string' || !item.id) continue;
        const ex = map[item.id];

        if (!ex) {
          map[item.id] = item;
          changed = true;
          continue;
        }
        // "seed": sunucuda zaten varsa dokunma (ilk yükleme eski verilerin üstüne yazmasın).
        if (seed) continue;

        let next = item;
        if (collection === 'players' && !item.deleted && !ex.deleted) next = mergePlayer(ex, item);
        if (stable(next) !== stable(ex)) {
          map[item.id] = next;
          changed = true;
        }
      }

      if (changed) {
        doc[collection] = map;
        doc.ts = Date.now();
        if (Buffer.byteLength(JSON.stringify(doc), 'utf8') > MAX_DOC_BYTES) {
          const e = new Error('doc_too_large');
          e.code = 'doc_too_large';
          throw e;
        }
        tx.set(ref, doc);
      }
      return doc;
    });

    readCache = { at: Date.now(), doc: result };
    return res.status(200).json(publicView(result));
  } catch (err) {
    if (err && err.code === 'doc_too_large') {
      return res.status(413).json({ ok: false, error: 'doc_too_large' });
    }
    console.error('data error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
