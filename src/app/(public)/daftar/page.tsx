import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <AuthShell
      quote="Jika kamu menyembunyikannya dan memberikannya kepada orang-orang fakir, maka itu lebih baik bagimu."
      source="QS. Al-Baqarah: 271"
    >
      <RegisterForm />
    </AuthShell>
  );
}
