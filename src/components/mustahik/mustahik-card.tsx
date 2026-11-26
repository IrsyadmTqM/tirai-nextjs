"use client";

import { Banknote, History, LockKeyhole, MapPin, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DogEar, Paper, StarCurtain } from "@/components/brand";
import { Chip } from "@/components/ui";
import type { MustahikPrivateData } from "@/lib/crypto";
import { ASNAF_INFO, STATUS_LABEL, compactRupiah } from "@/lib/labels";
import { OpenDialog } from "./open-dialog";

const AUTO_LOCK_SECONDS = 60;

type Item = { id: string; code: string; asnaf: string; district: string; status: string };

export function MustahikCard({ userId, item, index }: { userId: string; item: Item; index: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [data, setData] = useState<MustahikPrivateData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tilt = [-1.2, 0.8, -0.6][index % 3];

  // Data yang sudah didekripsi dibuang lagi dari memori setelah 60 detik.
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) setData(null);
      else setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [data, secondsLeft]);

  const asnaf = ASNAF_INFO[item.asnaf]?.label ?? item.asnaf;

  return (
    <>
      <Paper tilt={tilt} tape={data ? "clay" : "mustard"} className="overflow-hidden animate-rise">
        {data ? (
          <div className="p-5">
            <DogEar />
            <p className="truncate pr-6 font-display text-2xl font-medium">{data.fullName}</p>
            <p className="font-mono text-xs text-ink-500">{item.code}</p>
            <div className="my-4 flex gap-5">
              <Stat icon={<Banknote />} value={compactRupiah(data.monthlyIncome)} label="per bulan" />
              <Stat icon={<UsersRound />} value={String(data.dependents)} label="tanggungan" />
            </div>
            <dl className="space-y-1 text-sm">
              <Row label="NIK" value={data.nik} mono />
              <Row label="HP" value={data.phone} mono />
              <Row label="Alamat" value={data.address} />
            </dl>
            {data.notes && <p className="mt-3 rounded bg-paper-200 px-3 py-2 text-sm text-ink-700">{data.notes}</p>}
            <div className="mt-4 flex items-center justify-between">
              <span className="tag-notch inline-flex items-center gap-1 bg-clay-500 py-1 pr-3 pl-4 text-sm font-bold text-paper-50">
                <History className="size-3.5" /> Tercatat · 0:{String(secondsLeft).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => setData(null)}
                className="flex items-center gap-1 font-display text-ink-500 hover:text-pine-700"
              >
                <X className="size-4" /> Tutup
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 pb-4">
              <p className="font-mono text-base font-bold">{item.code}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip>{asnaf}</Chip>
                <Chip icon={<MapPin />}>{item.district}</Chip>
                {item.status !== "terverifikasi" && <Chip tone="mustard">{STATUS_LABEL[item.status]}</Chip>}
              </div>
            </div>
            <StarCurtain>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="flex w-full items-center justify-between px-5 pt-1 pb-5 text-left transition hover:text-mustard-400"
              >
                <LockKeyhole className="size-6" />
                <span className="font-display text-xl">Singkap →</span>
              </button>
            </StarCurtain>
          </>
        )}
      </Paper>

      {dialogOpen && (
        <OpenDialog
          userId={userId}
          mustahikId={item.id}
          code={item.code}
          onClose={() => setDialogOpen(false)}
          onOpened={(d) => {
            setData(d);
            setSecondsLeft(AUTO_LOCK_SECONDS);
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-display text-2xl font-semibold text-pine-900 [&_svg]:size-5 [&_svg]:text-pine-500">
        {icon}
        {value}
      </p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-14 shrink-0 text-ink-400">{label}</dt>
      <dd className={`min-w-0 break-words ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
