import type { CSSProperties, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Logo: bintang delapan dari dua persegi, motif dasar kisi mashrabiya. */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round">
      <rect x="8" y="8" width="16" height="16" rx="2" />
      <rect x="8" y="8" width="16" height="16" rx="2" transform="rotate(45 16 16)" />
      <circle cx="16" cy="16" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Selotip kertas di atas kartu. */
export function Tape({ color = "mustard", className }: { color?: "mustard" | "clay" | "sage"; className?: string }) {
  const bg = { mustard: "bg-mustard-400/75", clay: "bg-clay-500/70", sage: "bg-sage-400/80" }[color];
  return <span aria-hidden className={cx("absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 -rotate-3", bg, className)} />;
}

/**
 * Potongan kertas: kartu dengan bayangan tegas, bisa sedikit miring dan diberi selotip.
 * Kemiringan hanya untuk kartu dekoratif; form tetap lurus supaya mudah dibaca.
 */
export function Paper({
  tilt = 0,
  tape,
  className,
  style,
  children,
}: {
  tilt?: number;
  tape?: "mustard" | "clay" | "sage";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cx("relative rounded-md bg-paper-50 shadow-[4px_5px_0_var(--color-paper-400)]", className)}
      style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined, ...style }}
    >
      {tape && <Tape color={tape} />}
      {children}
    </div>
  );
}

/** Sudut kertas terlipat, penanda kartu yang sedang terbuka. */
export function DogEar() {
  return (
    <span
      aria-hidden
      className="absolute top-0 right-0 size-0 border-solid border-t-0 border-r-[22px] border-b-[22px] border-l-0 border-r-paper-100 border-b-paper-300"
    />
  );
}

/** Tirai: lembar kertas hijau dengan deretan bintang berlubang, menutupi data yang terkunci. */
export function StarCurtain({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cx("relative overflow-hidden bg-pine-700 text-paper-50", className)}>
      <svg aria-hidden className="absolute inset-x-0 top-2 h-8 w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 240 32">
        <g fill="var(--color-paper-100)" opacity=".85">
          {[20, 60, 100, 140, 180, 220].map((x) => (
            <g key={x} transform={`translate(${x} 16)`}>
              <rect x="-7" y="-7" width="14" height="14" rx="1" />
              <rect x="-7" y="-7" width="14" height="14" rx="1" transform="rotate(45)" />
            </g>
          ))}
        </g>
      </svg>
      <div className="relative pt-10">{children}</div>
    </div>
  );
}

/** Ilustrasi lapisan kertas dengan jendela bintang delapan (tirai mashrabiya). */
export function PaperScene({ className }: { className?: string }) {
  const panel =
    "M150 20H300V200H150Z M225 62L237 82L260 75L253 98L273 110L253 122L260 145L237 138L225 158L213 138L190 145L197 122L177 110L197 98L190 75L213 82Z";
  const layers = [
    { d: "M0 150C60 120 120 170 190 140S300 110 340 130V260H0Z", fill: "var(--color-sage-400)", shade: "#8fa684" },
    { d: "M0 185C70 160 150 205 220 180S310 160 340 175V260H0Z", fill: "var(--color-pine-700)", shade: "var(--color-pine-950)" },
    { d: "M0 220C80 200 140 240 230 215S320 205 340 212V260H0Z", fill: "var(--color-clay-500)", shade: "var(--color-clay-600)" },
  ];
  return (
    <svg viewBox="0 0 340 260" className={className} role="img" aria-label="Lapisan kertas dengan jendela bintang delapan">
      <circle cx="78" cy="70" r="20" fill="var(--color-mustard-400)" />
      {layers.map((l) => (
        <g key={l.d}>
          <path d={l.d} fill={l.shade} transform="translate(4 5)" opacity=".55" />
          <path d={l.d} fill={l.fill} />
        </g>
      ))}
      <path d={panel} fill="#8a7550" fillRule="evenodd" transform="translate(6 7)" opacity=".3" />
      <path d={panel} fill="var(--color-paper-50)" fillRule="evenodd" />
      <path d="M160 30H290V190H160Z" fill="none" stroke="var(--color-paper-300)" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );
}

/** Struk kertas dengan tepi bawah bergerigi dan lembar bayangan di belakangnya. */
export function Receipt({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("relative", className)}>
      <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rotate-1 bg-paper-300" />
      <div className="edge-zigzag relative bg-paper-50 px-5 pt-4 pb-8">
        {title && (
          <p className="mb-3 border-b-2 border-dashed border-paper-400 pb-2 text-center font-mono text-xs tracking-wider text-ink-500 uppercase">
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
