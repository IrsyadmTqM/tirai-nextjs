import { describe, expect, it } from "vitest";
import { DUMMY_AUTH_HASH, fakeSaltFor, hashAuthKey, verifyAuthKey } from "./password";

describe("hash authKey", () => {
  it("memverifikasi authKey yang benar dan menolak yang salah", async () => {
    const stored = await hashAuthKey("authkey-contoh");
    expect(await verifyAuthKey("authkey-contoh", stored)).toBe(true);
    expect(await verifyAuthKey("authkey-lain", stored)).toBe(false);
  });

  it("memakai salt acak: hash yang sama tidak pernah identik", async () => {
    expect(await hashAuthKey("x")).not.toBe(await hashAuthKey("x"));
  });

  it("hash tiruan selalu gagal", async () => {
    expect(await verifyAuthKey("apa-saja", DUMMY_AUTH_HASH)).toBe(false);
  });

  it("salt palsu konsisten per username dan bergantung pada rahasia server", () => {
    expect(fakeSaltFor("budi", "s1")).toBe(fakeSaltFor("budi", "s1"));
    expect(fakeSaltFor("budi", "s1")).not.toBe(fakeSaltFor("budi", "s2"));
    expect(fakeSaltFor("budi", "s1")).not.toBe(fakeSaltFor("ani", "s1"));
  });
});
