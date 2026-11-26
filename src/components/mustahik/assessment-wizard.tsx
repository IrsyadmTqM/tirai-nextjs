"use client";

import { ArrowLeft, ArrowRight, Check, Eye, KeyRound, Loader2, Lock, LockKeyhole, Minus, Plus, Send, Stamp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Paper } from "@/components/brand";
import { Alert, Button, ButtonLink, Chip, Field, Heading, Input, Textarea, inputClass } from "@/components/ui";
import { type EncryptionStep, createMustahik } from "@/lib/client/mustahik";
import { ASNAF_INFO } from "@/lib/labels";

type Unit = { id: string; name: string; publicKey: string };

const STEPS = ["Identitas", "Tempat tinggal", "Golongan & ekonomi", "Catatan", "Tinjau"] as const;

const empty = {
  fullName: "",
  nik: "",
  phone: "",
  district: "",
  address: "",
  asnaf: "",
  income: "",
  dependents: 0,
  notes: "",
};
type Form = typeof empty;

function validate(step: number, f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (step === 0) {
    if (f.fullName.trim().length < 2) e.fullName = "Isi nama lengkap";
    if (!/^\d{16}$/.test(f.nik)) e.nik = "NIK harus 16 digit";
    if (!/^0\d{8,13}$/.test(f.phone)) e.phone = "Contoh: 081234567890";
  }
  if (step === 1) {
    if (f.district.trim().length < 2) e.district = "Isi kecamatan";
    if (f.address.trim().length < 5) e.address = "Isi alamat";
  }
  if (step === 2) {
    if (!f.asnaf) e.asnaf = "Pilih salah satu golongan";
    if (f.income === "") e.income = "Isi penghasilan (0 jika tidak ada)";
  }
  return e;
}

const encryptedIcon = <Lock className="text-pine-500" aria-label="dienkripsi" />;
const visibleIcon = <Eye className="text-clay-500" aria-label="terlihat untuk laporan" />;

export function AssessmentWizard({ units }: { units: Unit[] }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [unitId, setUnitId] = useState(units[0].id);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [phase, setPhase] = useState<"form" | "locking" | "done">("form");
  const [lockStep, setLockStep] = useState<EncryptionStep | null>(null);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function next() {
    const e = validate(step, form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  }

  async function submit() {
    const unit = units.find((u) => u.id === unitId)!;
    setPhase("locking");
    setSubmitError(null);
    try {
      // Jeda singkat per langkah hanya supaya proses enkripsi terlihat; operasinya sendiri berlangsung sungguhan.
      const pause = () => new Promise((r) => setTimeout(r, 350));
      const res = await createMustahik(
        {
          unitId: unit.id,
          unitPublicKey: unit.publicKey,
          asnaf: form.asnaf,
          district: form.district.trim(),
          data: {
            fullName: form.fullName.trim(),
            nik: form.nik,
            phone: form.phone,
            address: form.address.trim(),
            monthlyIncome: Number(form.income),
            dependents: form.dependents,
            notes: form.notes.trim(),
          },
        },
        async (s) => {
          setLockStep(s);
          await pause();
        },
      );
      setResult(res);
      setForm(empty); // jangan biarkan data polos tertinggal di memori komponen
      setPhase("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal menyimpan");
      setPhase("form");
    }
  }

  if (phase === "locking") return <LockingScreen current={lockStep} />;
  if (phase === "done" && result) {
    return (
      <SuccessScreen
        code={result.code}
        onAgain={() => {
          setResult(null);
          setStep(0);
          setPhase("form");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/mustahik" className="mb-4 inline-flex items-center gap-1 font-display text-ink-500 hover:text-pine-700">
        <ArrowLeft className="size-4" /> Mustahik
      </Link>

      <div className="mb-6 flex gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className={`h-2 flex-1 rounded-sm transition ${i < step ? "bg-pine-700" : i === step ? "bg-mustard-400" : "bg-paper-300"}`} />
        ))}
      </div>
      <p className="font-bold text-ink-500">
        Langkah {step + 1} dari {STEPS.length}
      </p>
      <Heading className="mb-2">{STEPS[step]}</Heading>
      <div className="mb-6 flex flex-wrap gap-2">
        <Chip tone="pine" icon={<Lock />}>
          Dienkripsi
        </Chip>
        <Chip tone="claySoft" icon={<Eye />}>
          Terlihat untuk laporan
        </Chip>
      </div>

      <Paper className="space-y-5 p-6 sm:p-8">
        {step === 0 && (
          <>
            <Field label="Nama lengkap" icon={encryptedIcon} error={errors.fullName}>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="off" autoFocus />
            </Field>
            <Field label="NIK" icon={encryptedIcon} error={errors.nik}>
              <Input
                value={form.nik}
                onChange={(e) => set("nik", e.target.value.replace(/\D/g, "").slice(0, 16))}
                inputMode="numeric"
                autoComplete="off"
                className="font-mono tracking-wider"
              />
            </Field>
            <Field label="Nomor HP" icon={encryptedIcon} error={errors.phone}>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 14))} inputMode="tel" autoComplete="off" />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Kecamatan" icon={visibleIcon} error={errors.district} hint="Hanya kecamatan, untuk laporan per wilayah.">
              <Input value={form.district} onChange={(e) => set("district", e.target.value)} autoFocus />
            </Field>
            <Field label="Alamat lengkap" icon={encryptedIcon} error={errors.address}>
              <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="min-h-24" />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-700 [&_svg]:size-4">Golongan (asnaf) {visibleIcon}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(ASNAF_INFO).map(([key, info]) => {
                  const on = form.asnaf === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("asnaf", key)}
                      className={`rounded-md p-3 text-left transition ${
                        on ? "bg-pine-700 text-paper-50 shadow-[3px_3px_0_var(--color-pine-950)]" : "bg-paper-100 hover:bg-paper-200"
                      }`}
                    >
                      <span className="block font-display text-lg">{info.label}</span>
                      <span className={`block text-xs ${on ? "text-paper-50/80" : "text-ink-500"}`}>{info.hint}</span>
                    </button>
                  );
                })}
              </div>
              {errors.asnaf && <p className="mt-2 text-sm font-semibold text-red-700">{errors.asnaf}</p>}
              <p className="mt-2 text-xs text-ink-400">QS. At-Taubah: 60</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Penghasilan per bulan" icon={encryptedIcon} error={errors.income}>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-ink-400">Rp</span>
                  <input
                    className={`${inputClass} pl-12`}
                    value={form.income === "" ? "" : Number(form.income).toLocaleString("id-ID")}
                    onChange={(e) => set("income", e.target.value.replace(/\D/g, "").slice(0, 12))}
                    inputMode="numeric"
                  />
                </div>
              </Field>
              <Field label="Jumlah tanggungan" icon={encryptedIcon}>
                <div className="flex items-center justify-between rounded-lg border-2 border-paper-400 bg-white p-1.5">
                  <Button type="button" variant="paper" className="px-3" onClick={() => set("dependents", Math.max(0, form.dependents - 1))} aria-label="Kurangi">
                    <Minus className="size-4" />
                  </Button>
                  <span className="font-display text-2xl">{form.dependents}</span>
                  <Button type="button" variant="paper" className="px-3" onClick={() => set("dependents", Math.min(20, form.dependents + 1))} aria-label="Tambah">
                    <Plus className="size-4" />
                  </Button>
                </div>
              </Field>
            </div>
          </>
        )}

        {step === 3 && (
          <Field label="Catatan kondisi" icon={encryptedIcon} hint="Tulis seperlunya untuk menilai kelayakan.">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} autoFocus />
          </Field>
        )}

        {step === 4 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 flex items-center gap-2 font-display text-lg text-pine-700">
                <LockKeyhole className="size-5" /> Dikunci
              </p>
              <dl className="space-y-2 text-sm">
                <Review label="Nama" value={form.fullName} />
                <Review label="NIK" value={form.nik} mono />
                <Review label="HP" value={form.phone} mono />
                <Review label="Alamat" value={form.address} />
                <Review label="Penghasilan" value={`Rp${Number(form.income).toLocaleString("id-ID")}`} />
                <Review label="Tanggungan" value={String(form.dependents)} />
                <Review label="Catatan" value={form.notes || "—"} />
              </dl>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 font-display text-lg text-clay-600">
                <Eye className="size-5" /> Terlihat
              </p>
              <dl className="space-y-2 text-sm">
                <Review label="Asnaf" value={ASNAF_INFO[form.asnaf]?.label ?? "—"} />
                <Review label="Kecamatan" value={form.district} />
              </dl>
              {units.length > 1 ? (
                <Field label="Unit">
                  <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={`${inputClass} mt-3`}>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <dl className="mt-2 text-sm">
                  <Review label="Unit" value={units[0].name} />
                </dl>
              )}
            </div>
          </div>
        )}

        {submitError && <Alert>{submitError}</Alert>}
      </Paper>

      <div className="mt-6 flex justify-between">
        <Button type="button" variant="paper" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          <ArrowLeft className="size-4" /> Kembali
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Lanjut <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" variant="clay" onClick={submit}>
            <LockKeyhole className="size-4" /> Kunci & simpan
          </Button>
        )}
      </div>
    </div>
  );
}

function Review({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink-400">{label}</dt>
      <dd className={`min-w-0 font-semibold break-words ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

const LOCK_STEPS: { key: EncryptionStep; label: string; icon: typeof KeyRound }[] = [
  { key: "dek", label: "Membuat kunci acak", icon: KeyRound },
  { key: "encrypt", label: "Mengenkripsi di perangkat ini", icon: Lock },
  { key: "seal", label: "Menyegel untuk unit", icon: Stamp },
  { key: "send", label: "Mengirim sandi acak ke server", icon: Send },
];

function LockingScreen({ current }: { current: EncryptionStep | null }) {
  const idx = LOCK_STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mx-auto max-w-md py-10">
      <Paper tilt={-1} tape="mustard" className="p-8">
        <ul className="space-y-4">
          {LOCK_STEPS.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li key={s.key} className={`flex items-center gap-3 font-display text-lg ${i > idx ? "text-ink-400" : "text-pine-900"}`}>
                <span className={`flex size-9 items-center justify-center rounded-md ${done ? "bg-pine-700 text-paper-50" : active ? "bg-mustard-400 text-ink-900" : "bg-paper-200"}`}>
                  {done ? <Check className="size-5" /> : active ? <Loader2 className="size-5 animate-spin" /> : <s.icon className="size-5" />}
                </span>
                {s.label}
              </li>
            );
          })}
        </ul>
      </Paper>
    </div>
  );
}

function SuccessScreen({ code, onAgain }: { code: string; onAgain: () => void }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <Paper tilt={1} tape="clay" className="p-10 animate-drop">
        <LockKeyhole className="mx-auto size-12 text-clay-500" strokeWidth={1.8} />
        <p className="mt-4 font-mono text-3xl font-bold text-pine-900">{code}</p>
        <p className="mt-2 font-display text-xl text-ink-500">Terkunci dan tersimpan</p>
      </Paper>
      <div className="mt-8 flex justify-center gap-3">
        <Button variant="paper" onClick={onAgain}>
          Daftarkan lagi
        </Button>
        <ButtonLink href="/mustahik">Lihat daftar</ButtonLink>
      </div>
    </div>
  );
}
