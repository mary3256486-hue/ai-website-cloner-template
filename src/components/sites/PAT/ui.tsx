"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Person } from "./types";

export function Avatar({
  person,
  size = 44,
  className,
}: {
  person: Pick<Person, "name" | "gender" | "avatar" | "alive">;
  size?: number;
  className?: string;
}) {
  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const palette =
    person.gender === "male"
      ? ["#8a1c15", "#b7791f"]
      : ["#9a4a6b", "#c9a227"];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 font-semibold text-white shadow-sm",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundImage: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
        opacity: person.alive ? 1 : 0.78,
      }}
    >
      {person.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode;
  tone?: "gold" | "red" | "green" | "muted";
  className?: string;
}) {
  const tones = {
    gold: "bg-[#f6e9c8] text-[#7a5a10] border-[#e3cd92]",
    red: "bg-[#f9e3df] text-[#8a1c15] border-[#e6b7ad]",
    green: "bg-[#e2f1e8] text-[#1f6b4a] border-[#b9dcc9]",
    muted: "bg-[#f3ece0] text-[#8a6a52] border-[#e6d4b4]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="pat-sheet-backdrop no-print" onClick={onClose} />
      <div
        className={cn("pat-sheet pat-scroll no-print", wide && "md:w-[860px] md:max-w-[calc(100vw-3rem)]")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 rounded-t-[1.4rem] border-b border-[var(--pat-line)] bg-[var(--pat-cream)]/95 px-5 pb-3 pt-2 backdrop-blur">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--pat-line)] md:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="pat-serif text-xl font-semibold text-[var(--pat-red)]">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-[var(--pat-muted)]">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pat-line)] bg-white/70 text-[var(--pat-muted)] transition hover:text-[var(--pat-red)]"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-5 pb-6 pt-4">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 border-t border-[var(--pat-line)] bg-[var(--pat-cream)]/95 px-5 py-3 backdrop-blur">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="pat-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[0.68rem] text-[var(--pat-muted)]">{hint}</span> : null}
    </label>
  );
}

export function SectionTitle({
  icon,
  title,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h3 className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="pat-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {icon ? <div className="text-[var(--pat-gold)]">{icon}</div> : null}
      <p className="pat-serif text-lg font-semibold text-[var(--pat-red)]">{title}</p>
      {description ? <p className="max-w-sm text-sm text-[var(--pat-muted)]">{description}</p> : null}
      {action}
    </div>
  );
}

export function Stat({ value, label, tone = "normal" }: { value: ReactNode; label: string; tone?: "normal" | "red" }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn("text-lg font-bold", tone === "red" ? "text-[var(--pat-red)]" : "text-[var(--pat-ink)]")}>
        {value}
      </span>
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--pat-muted)]">{label}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="pat-chip"
          data-active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SheetRow({
  icon,
  title,
  subtitle,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-3 text-left transition hover:border-[var(--pat-line)] hover:bg-white/60",
        danger && "text-[#a3271d]",
      )}
    >
      {icon ? <span className="text-[var(--pat-gold)]">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {subtitle ? <span className="block text-xs text-[var(--pat-muted)]">{subtitle}</span> : null}
      </span>
    </button>
  );
}
