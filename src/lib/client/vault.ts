// Brankas kunci di browser. Kunci privat disimpan di IndexedDB sebagai
// CryptoKey non-extractable: JavaScript bisa memakainya untuk dekripsi, tapi
// tidak bisa membaca atau mengirim isi kuncinya ke mana pun.

const DB_NAME = "tirai-vault";
const STORE = "keys";
const ENTRY = "user";

type VaultEntry = { userId: string; privateKey: CryptoKey };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveUserKey(userId: string, privateKey: CryptoKey): Promise<void> {
  if (privateKey.extractable) throw new Error("Kunci di brankas harus non-extractable");
  await run("readwrite", (s) => s.put({ userId, privateKey } satisfies VaultEntry, ENTRY));
}

/** Mengembalikan kunci hanya jika milik pengguna yang sedang login. */
export async function loadUserKey(userId: string): Promise<CryptoKey | null> {
  const entry = await run<VaultEntry | undefined>("readonly", (s) => s.get(ENTRY));
  return entry?.userId === userId ? entry.privateKey : null;
}

export async function clearVault(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}
