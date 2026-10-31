"use client";

import { RotateCcw } from "lucide-react";
import type { CardOrientation, DesignSettings } from "./types";
import { cardOrientationFor } from "./types";
import { Field, Segmented } from "./ui";

export function CardOrientationPicker({
  design,
  generations,
  onChange,
}: {
  design: DesignSettings;
  generations: { generation: number; count: number }[];
  onChange: (patch: Partial<DesignSettings>) => void;
}) {
  const fallback: CardOrientation = design.cardOrientation === "vertical" ? "vertical" : "horizontal";
  const overrides = design.cardOrientations ?? {};
  const hasOverrides = Object.keys(overrides).length > 0;

  const setGeneration = (generation: number, value: CardOrientation) => {
    const next = { ...overrides };
    if (value === fallback) delete next[String(generation)];
    else next[String(generation)] = value;
    onChange({ cardOrientations: next });
  };

  return (
    <div className="space-y-3">
      <Field label="Khung mặc định" hint="Áp dụng cho các đời chưa đặt riêng">
        <Segmented<CardOrientation>
          value={fallback}
          onChange={(cardOrientation) => onChange({ cardOrientation })}
          options={[
            { value: "horizontal", label: "Ngang" },
            { value: "vertical", label: "Dọc" },
          ]}
        />
      </Field>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--pat-red)]">
            Riêng từng đời
          </p>
          {hasOverrides ? (
            <button
              type="button"
              onClick={() => onChange({ cardOrientations: {} })}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--pat-muted)] transition hover:text-[var(--pat-red)]"
            >
              <RotateCcw size={11} /> Theo mặc định
            </button>
          ) : null}
        </div>
        <div className="divide-y divide-[var(--pat-line)] overflow-hidden rounded-xl border border-[var(--pat-line)] bg-white/50">
          {generations.map((row) => {
            const value = cardOrientationFor(design, row.generation);
            const isOverride = overrides[String(row.generation)] !== undefined;
            return (
              <div key={row.generation} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 text-xs font-semibold">
                  Đời {row.generation}
                  <span className="ml-1 font-normal text-[var(--pat-muted)]">· {row.count} người</span>
                </span>
                {isOverride ? (
                  <span className="rounded-full bg-[#f6e9c8] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-[#7a5a10]">
                    riêng
                  </span>
                ) : null}
                <div className="flex overflow-hidden rounded-full border border-[var(--pat-line)]">
                  {(["horizontal", "vertical"] as CardOrientation[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGeneration(row.generation, option)}
                      aria-pressed={value === option}
                      className={`px-2.5 py-1 text-[0.65rem] font-semibold transition ${
                        value === option
                          ? "bg-[var(--pat-red)] text-[#fff4df]"
                          : "bg-white/70 text-[var(--pat-muted)] hover:text-[var(--pat-red)]"
                      }`}
                    >
                      {option === "horizontal" ? "Ngang" : "Dọc"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
