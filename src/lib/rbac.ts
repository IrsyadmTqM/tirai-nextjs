// Kontrol akses berbasis peran (RBAC). Matriks ini satu-satunya sumber
// kebenaran soal izin; dipakai di route API, halaman, dan dokumentasi
// (docs/ARSITEKTUR.md bagian 2).

export const ROLES = ["donatur", "mustahik", "amil", "auditor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "donation:create",
  "donation:read:own",
  "donation:read:all",
  "mustahik:create",
  "mustahik:list",
  "mustahik:open",
  "report:read",
  "audit:read",
  "user:manage",
  "data:own",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  donatur: ["donation:create", "donation:read:own", "data:own"],
  mustahik: ["data:own"],
  // Amil memegang kunci unit, tapi tidak bisa membaca log audit (yang mengawasi dirinya).
  amil: ["donation:read:all", "mustahik:create", "mustahik:list", "mustahik:open", "report:read", "data:own"],
  // Auditor mengawasi tanpa bisa melihat identitas siapa pun.
  auditor: ["report:read", "audit:read", "data:own"],
  // Admin mengelola akun, tapi tidak punya akses ke data mustahik maupun log.
  admin: ["user:manage", "data:own"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsOf(role: Role): readonly Permission[] {
  return MATRIX[role];
}

export const ROLE_LABELS: Record<Role, string> = {
  donatur: "Donatur",
  mustahik: "Mustahik",
  amil: "Amil",
  auditor: "Auditor",
  admin: "Admin",
};
