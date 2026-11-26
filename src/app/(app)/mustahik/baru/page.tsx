import type { Metadata } from "next";
import { Suspense } from "react";
import { AssessmentWizard } from "@/components/mustahik/assessment-wizard";
import { EmptyState, PageSkeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { getMyUnits } from "@/lib/queries";
import { UsersRound } from "lucide-react";

export const metadata: Metadata = { title: "Daftarkan mustahik" };

export default function NewMustahikPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewMustahik />
    </Suspense>
  );
}

async function NewMustahik() {
  const user = await requireUser("mustahik:create");
  const units = await getMyUnits(user.id);
  if (units.length === 0) {
    return (
      <EmptyState icon={<UsersRound />} title="Belum tergabung di unit">
        Anda perlu kunci unit untuk mendaftarkan mustahik.
      </EmptyState>
    );
  }
  return <AssessmentWizard units={units} />;
}
