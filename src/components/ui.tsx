import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "paper" | "clay" | "danger" | "ghost";

// Tombol kertas: bayangan tegas, terasa "ditekan" saat diklik.
const variants: Record<Variant, string> = {
  primary: "bg-pine-700 text-paper-50 shadow-[3px_3px_0_var(--color-pine-950)] hover:bg-pine-800",
  paper: "bg-paper-50 text-pine-700 shadow-[3px_3px_0_var(--color-paper-400)] hover:bg-white",
  clay: "bg-clay-500 text-paper-50 shadow-[3px_3px_0_var(--color-clay-800)] hover:bg-clay-600",
  danger: "bg-paper-50 text-red-700 shadow-[3px_3px_0_#e8c4b8] hover:bg-red-50",
  ghost: "text-ink-700 hover:bg-paper-200",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-display text-[15px] font-medium transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard-400 disabled:pointer-events-none disabled:opacity-50";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...props} />;
}

const chipTones = {
  paper: "bg-paper-200 text-ink-700",
  pine: "bg-pine-50 text-pine-800",
  clay: "bg-clay-500 text-paper-50",
  claySoft: "bg-clay-100 text-clay-800",
  sage: "bg-sage-100 text-sage-800",
  mustard: "bg-mustard-100 text-mustard-700",
  red: "bg-red-50 text-red-800",
};

export function Chip({
  tone = "paper",
  icon,
  className,
  children,
}: {
  tone?: keyof typeof chipTones;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold [&_svg]:size-3.5", chipTones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cx("font-display text-4xl font-semibold tracking-tight text-pine-900 sm:text-5xl", className)}>{children}</h1>;
}

export function PageHeader({ title, chips, action }: { title: string; chips?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 animate-rise">
      <div className="flex flex-wrap items-center gap-3">
        <Heading>{title}</Heading>
        {chips}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  icon,
  hint,
  error,
  children,
}: {
  label: string;
  icon?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink-700 [&_svg]:size-4">
        {label}
        {icon}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm font-semibold text-red-700">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-sm text-ink-500">{hint}</span>
      )}
    </label>
  );
}

// Form tetap lurus dan berkontras tinggi supaya mudah dibaca di lapangan.
export const inputClass =
  "w-full rounded-lg border-2 border-paper-400 bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition focus:border-pine-700 focus:ring-4 focus:ring-pine-100 focus:outline-none";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "min-h-32 resize-y", props.className)} />;
}

export function Alert({ tone = "red", children }: { tone?: "red" | "pine" | "mustard"; children: ReactNode }) {
  const t = {
    red: "bg-red-50 text-red-800 shadow-[3px_3px_0_#efc9c0]",
    pine: "bg-pine-50 text-pine-900 shadow-[3px_3px_0_var(--color-pine-100)]",
    mustard: "bg-mustard-100 text-mustard-700 shadow-[3px_3px_0_#ecd7a3]",
  }[tone];
  return <div className={cx("rounded-lg px-4 py-3 text-sm font-semibold", t)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-paper-300/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-12 w-56" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border-2 border-dashed border-paper-500 px-6 py-14 text-center">
      <div className="mb-3 text-clay-500 [&_svg]:size-9">{icon}</div>
      <p className="font-display text-xl font-medium text-pine-900">{title}</p>
      {children && <div className="mt-1 max-w-sm text-ink-500">{children}</div>}
    </div>
  );
}
