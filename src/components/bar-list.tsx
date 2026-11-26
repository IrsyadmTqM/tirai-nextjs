// Daftar batang horizontal berperingkat: satu warna, terbesar di atas,
// nama + batang + angka per baris. Angka tertulis di setiap baris sekaligus
// berfungsi sebagai tampilan tabel; tooltip bawaan browser memberi detail.

export function BarList({ rows, format }: { rows: { label: string; value: number; detail?: string }[]; format: (n: number) => string }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {sorted.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}${r.detail ? ` · ${r.detail}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-ink-700">{r.label}</span>
            <span className="font-bold text-ink-900 tabular-nums">{format(r.value)}</span>
          </div>
          <div className="h-3 rounded-r bg-paper-200">
            {r.value > 0 && <div className="h-3 rounded-r bg-clay-500" style={{ width: `${(r.value / max) * 100}%` }} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
