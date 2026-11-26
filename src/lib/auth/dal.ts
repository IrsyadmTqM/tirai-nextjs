// Data Access Layer: satu-satunya pintu untuk mengetahui siapa pengguna saat ini
// dan apakah ia boleh melakukan sesuatu.

import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { HttpError } from "@/lib/http";
import { type Permission, can } from "@/lib/rbac";
import { type SessionUser, getSessionUser } from "./session";

export const getCurrentUser = cache(getSessionUser);

/** Untuk halaman: arahkan ke /masuk jika belum login, ke /dasbor jika tidak berizin. */
export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  if (permission && !can(user.role, permission)) redirect("/dasbor");
  return user;
}

/** Untuk route API: lempar 401/403 alih-alih redirect. */
export async function requireApiUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Silakan masuk terlebih dahulu");
  if (permission && !can(user.role, permission)) throw new HttpError(403, "Anda tidak punya izin untuk tindakan ini");
  return user;
}
