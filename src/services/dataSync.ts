// Oyuncular, sahalar ve geçmiş maçlar için ortak (sunucu) senkronizasyonu.
// Tek doğru kaynak: /api/data (Firestore). Telefondaki kopya sadece önbellektir.

export type SyncCollection = 'players' | 'venues' | 'pastMatches';
export type CollectionItems = Record<string, any>;
export type AllCollections = Record<SyncCollection, CollectionItems>;

export const SYNC_COLLECTIONS: SyncCollection[] = ['players', 'venues', 'pastMatches'];

// Anahtar sırasından bağımsız karşılaştırma için (Firestore anahtarları sıralı döndürür).
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const obj = v as Record<string, unknown>;
  return (
    '{' +
    Object.keys(obj)
      .filter(k => obj[k] !== undefined)
      .sort()
      .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  );
}

function normalize(data: any): AllCollections | null {
  if (!data || !data.ok || !data.collections) return null;
  return {
    players: data.collections.players || {},
    venues: data.collections.venues || {},
    pastMatches: data.collections.pastMatches || {},
  };
}

export async function fetchAllCollections(): Promise<AllCollections | null> {
  try {
    const res = await fetch(`/api/data?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return normalize(await res.json());
  } catch {
    return null;
  }
}

export async function pushCollectionItems(
  collection: SyncCollection,
  items: unknown[],
  seed: boolean
): Promise<AllCollections | null> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, items, seed }),
    });
    if (!res.ok) return null;
    return normalize(await res.json());
  } catch {
    return null;
  }
}

// Silinen kayıtlar "mezar taşı" olarak gönderilir; diğer telefonlar da siler.
export function pushDeletion(collection: SyncCollection, id: string): Promise<AllCollections | null> {
  return pushCollectionItems(collection, [{ id, deleted: true }], false);
}
