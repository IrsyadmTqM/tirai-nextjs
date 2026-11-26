import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES, can } from "./rbac";

describe("RBAC", () => {
  it("setiap peran bisa mengelola datanya sendiri", () => {
    for (const role of ROLES) expect(can(role, "data:own")).toBe(true);
  });

  it("hanya amil yang bisa membuka data mustahik", () => {
    expect(ROLES.filter((r) => can(r, "mustahik:open"))).toEqual(["amil"]);
  });

  it("admin tidak bisa membuka data mustahik maupun log audit (pemisahan tugas)", () => {
    expect(can("admin", "mustahik:open")).toBe(false);
    expect(can("admin", "mustahik:list")).toBe(false);
    expect(can("admin", "audit:read")).toBe(false);
  });

  it("amil tidak bisa membaca log audit yang mengawasi dirinya", () => {
    expect(can("amil", "audit:read")).toBe(false);
  });

  it("auditor tidak bisa melihat identitas: tidak boleh membuka mustahik atau daftar donasi", () => {
    expect(can("auditor", "mustahik:open")).toBe(false);
    expect(can("auditor", "donation:read:all")).toBe(false);
  });

  it("tidak ada peran yang memegang semua izin", () => {
    for (const role of ROLES) expect(PERMISSIONS.every((p) => can(role, p))).toBe(false);
  });
});
