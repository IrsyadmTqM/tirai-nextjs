/** Kode pseudonim mustahik, mis. `MST-3FA9C1`. Dipakai di semua tampilan sebagai pengganti nama. */
export function newMustahikCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return "MST-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
