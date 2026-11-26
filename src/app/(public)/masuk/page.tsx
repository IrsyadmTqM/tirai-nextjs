import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <AuthShell
      quote="Sesungguhnya Allah menyuruh kamu menyampaikan amanat kepada yang berhak menerimanya."
      source="QS. An-Nisa: 58"
    >
      <LoginForm />
    </AuthShell>
  );
}
