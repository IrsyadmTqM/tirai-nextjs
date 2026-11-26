// Label dan format tampilan dalam Bahasa Indonesia.

export const ASNAF_INFO: Record<string, { label: string; hint: string }> = {
  fakir: { label: "Fakir", hint: "Tanpa penghasilan" },
  miskin: { label: "Miskin", hint: "Penghasilan kurang" },
  amil: { label: "Amil", hint: "Pengelola zakat" },
  mualaf: { label: "Mualaf", hint: "Baru berislam" },
  riqab: { label: "Riqab", hint: "Lepas dari perbudakan" },
  gharim: { label: "Gharim", hint: "Terlilit utang" },
  fisabilillah: { label: "Fisabilillah", hint: "Di jalan Allah" },
  ibnu_sabil: { label: "Ibnu Sabil", hint: "Musafir kehabisan bekal" },
};

export const PROGRAM_INFO: Record<string, { label: string }> = {
  zakat_mal: { label: "Zakat Mal" },
  zakat_fitrah: { label: "Zakat Fitrah" },
  infak: { label: "Infak" },
  sedekah: { label: "Sedekah" },
  wakaf: { label: "Wakaf" },
};

export const STATUS_LABEL: Record<string, string> = {
  diajukan: "Diajukan",
  terverifikasi: "Terverifikasi",
  ditolak: "Ditolak",
};

export const ACTION_LABEL: Record<string, string> = {
  "user.register": "Mendaftar akun",
  "user.delete": "Menghapus akun",
  "auth.login": "Masuk",
  "auth.logout": "Keluar",
  "unit.grant": "Diberi kunci unit",
  "mustahik.create": "Mendaftarkan mustahik",
  "mustahik.open": "Membuka data mustahik",
  "donation.create": "Mencatat donasi",
};

const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const rupiah = (n: number) => rupiahFmt.format(n);

/** Nominal ringkas untuk kartu, mis. `1,5 jt` atau `250 rb`. */
export function compactRupiah(n: number): string {
  const f = (x: number) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (n >= 1_000_000_000) return `${f(n / 1_000_000_000)} M`;
  if (n >= 1_000_000) return `${f(n / 1_000_000)} jt`;
  if (n >= 1_000) return `${f(n / 1_000)} rb`;
  return String(n);
}

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
export const dateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
export const dateOnly = (d: Date | string) => dateFmt.format(new Date(d));

/** UUID dipendekkan untuk tampilan pseudonim, mis. `a1b2c3d4`. */
export const shortId = (id: string | null) => (id ? id.slice(0, 8) : "—");
