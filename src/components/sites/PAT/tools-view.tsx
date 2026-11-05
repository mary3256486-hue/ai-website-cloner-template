"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Info, Landmark, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TreeShell } from "./app-shell";
import { LunarConverterSheet } from "./lunar-converter";
import {
  ERA_DYNASTY_GROUPS,
  ERA_MAX_YEAR,
  ERA_MIN_YEAR,
  ERA_RECORDS,
  eraOrdinalLabel,
  erasForYear,
  FEATURED_ERAS,
  FEATURED_YEARS,
  formatEraYears,
  searchEras,
  type EraRecord,
} from "./eras";
import type { FamilyTree } from "./types";

type LookupMode = "year" | "era";

export function ToolsView({ tree }: { tree: FamilyTree }) {
  const [converterOpen, setConverterOpen] = useState(false);
  const [mode, setMode] = useState<LookupMode>("year");
  const [yearText, setYearText] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordinalText, setOrdinalText] = useState("1");

  const yearText_ = yearText.trim();
  const year = /^\d{1,4}$/.test(yearText_) ? Number(yearText_) : null;
  const yearResults = useMemo(() => (year === null ? [] : erasForYear(year)), [year]);

  const matches = useMemo(() => searchEras(query), [query]);
  const selected = matches.find((record) => record.id === selectedId) ?? matches[0] ?? null;

  const ordinalText_ = ordinalText.trim();
  const ordinal = /^\d{1,4}$/.test(ordinalText_) ? Number(ordinalText_) : null;
  const solarYear = selected && ordinal !== null && ordinal >= 1 ? selected.start + ordinal - 1 : null;
  const ordinalOverflow = Boolean(selected && solarYear !== null && solarYear > selected.end);

  const chooseEra = (record: EraRecord) => {
    setQuery(record.era);
    setSelectedId(record.id);
    setOrdinalText("1");
  };

  return (
    <TreeShell
      tree={tree}
      section="cong-cu"
      title="Công cụ"
      subtitle={`${tree.name} · Đổi ngày Âm – Dương và tra cứu niên hiệu`}
    >
      <div className="space-y-4">
        <section className="pat-card flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3e6cd] text-[var(--pat-red)]">
              <CalendarDays size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Đổi ngày Âm – Dương</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--pat-muted)]">
                Chuyển đổi ngày dương sang âm và ngược lại, có tháng nhuận. Hỗ trợ 1700–2199.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pat-btn pat-btn-red h-10 shrink-0 px-4 text-sm"
            onClick={() => setConverterOpen(true)}
          >
            <CalendarDays size={15} /> Mở công cụ đổi ngày
          </button>
        </section>

        <section className="pat-card px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3e6cd] text-[var(--pat-red)]">
              <Landmark size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Tra cứu niên hiệu</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--pat-muted)]">
                Đối chiếu năm dương lịch với niên hiệu các đời vua Việt Nam ({ERA_MIN_YEAR}–{ERA_MAX_YEAR}).
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:max-w-sm">
            <button
              type="button"
              className="pat-chip justify-center"
              data-active={mode === "year"}
              onClick={() => setMode("year")}
            >
              Theo năm dương lịch
            </button>
            <button
              type="button"
              className="pat-chip justify-center"
              data-active={mode === "era"}
              onClick={() => setMode("era")}
            >
              Theo niên hiệu
            </button>
          </div>

          {mode === "year" ? (
            <div className="mt-3 space-y-3">
              <label className="block max-w-xs">
                <span className="pat-label">Năm dương lịch</span>
                <input
                  className="pat-input tabular-nums"
                  type="number"
                  inputMode="numeric"
                  min={ERA_MIN_YEAR}
                  max={ERA_MAX_YEAR}
                  placeholder="VD: 1470"
                  value={yearText}
                  onChange={(event) => setYearText(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.66rem] text-[var(--pat-muted)]">Năm tiêu biểu:</span>
                {FEATURED_YEARS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="pat-chip h-6 px-2 text-[0.64rem] tabular-nums"
                    data-active={year === value}
                    onClick={() => setYearText(String(value))}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {year === null ? (
                <p className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                  Nhập một năm dương lịch để xem niên hiệu, đời vua và năm thứ của niên hiệu đang dùng.
                </p>
              ) : year < ERA_MIN_YEAR || year > ERA_MAX_YEAR ? (
                <p className="rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-[#a3271d]">
                  Dữ liệu niên hiệu chỉ trong khoảng {ERA_MIN_YEAR}–{ERA_MAX_YEAR}. Năm {year} nằm ngoài thời kỳ
                  quân chủ Việt Nam.
                </p>
              ) : yearResults.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                  Không có niên hiệu Việt Nam trong năm {year} (thời kỳ Bắc thuộc hoặc chuyển giao triều đại).
                </p>
              ) : (
                <div className="space-y-2">
                  {yearResults.length > 1 ? (
                    <p className="text-[0.7rem] text-[var(--pat-muted)]">
                      Năm {year} có {yearResults.length} niên hiệu cùng tồn tại (chuyển giao hoặc song song).
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {yearResults.map((record) => (
                      <EraCard
                        key={record.id}
                        record={record}
                        footer={eraOrdinalLabel(record, year - record.start + 1)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="pat-label">Tên niên hiệu, vua hoặc triều đại</span>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pat-muted)]"
                  />
                  <input
                    className="pat-input pl-9"
                    type="text"
                    placeholder="VD: Hồng Đức, Quang Trung, Lê Thánh Tông"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedId(null);
                      setOrdinalText("1");
                    }}
                  />
                </div>
                <span className="mt-1 block text-[0.66rem] text-[var(--pat-muted)]">
                  Gõ không dấu vẫn tìm được — ví dụ “hong duc” hoặc “le thanh tong”.
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.66rem] text-[var(--pat-muted)]">Niên hiệu tiêu biểu:</span>
                {FEATURED_ERAS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="pat-chip h-6 px-2 text-[0.64rem]"
                    onClick={() => {
                      setQuery(name);
                      setSelectedId(null);
                      setOrdinalText("1");
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {!query.trim() ? (
                <p className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                  Nhập tên niên hiệu để xem đời vua, triều đại, khoảng năm và quy đổi “năm thứ n” ra năm dương lịch.
                </p>
              ) : matches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                  Không tìm thấy niên hiệu khớp “{query.trim()}”. Thử tên khác hoặc bỏ dấu.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[0.7rem] text-[var(--pat-muted)]">
                    {matches.length} niên hiệu khớp · chọn một dòng để quy đổi năm thứ.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {matches.map((record) => (
                      <EraCard
                        key={record.id}
                        record={record}
                        active={selected?.id === record.id}
                        onClick={() => {
                          setSelectedId(record.id);
                          setOrdinalText("1");
                        }}
                      />
                    ))}
                  </div>

                  {selected ? (
                    <div className="rounded-xl border border-[#e3cd92] bg-[#f9edcf]/70 px-3.5 py-3">
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[#7a5a10]">
                        Quy đổi năm niên hiệu
                      </p>
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <label className="w-28 shrink-0">
                          <span className="pat-label">Năm thứ</span>
                          <input
                            className="pat-input h-10 tabular-nums"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={ordinalText}
                            onChange={(event) => setOrdinalText(event.target.value)}
                          />
                        </label>
                        <div className="min-w-40 flex-1 rounded-xl border border-[var(--pat-line)] bg-white/80 px-3 py-1.5">
                          <p className="text-[0.64rem] text-[var(--pat-muted)]">
                            {eraOrdinalLabel(selected, ordinal !== null && ordinal >= 1 ? ordinal : 1)} ·{" "}
                            {formatEraYears(selected)}
                          </p>
                          <p className="pat-serif text-lg font-semibold text-[var(--pat-red)]">
                            {ordinalOverflow
                              ? "Ngoài niên hiệu"
                              : solarYear !== null
                                ? `Năm ${solarYear}`
                                : "—"}
                          </p>
                        </div>
                      </div>
                      {ordinalOverflow ? (
                        <p className="mt-2 text-[0.7rem] leading-relaxed text-[#a3271d]">
                          Niên hiệu này chỉ kéo dài {selected.end - selected.start + 1} năm (
                          {formatEraYears(selected)}).
                        </p>
                      ) : (
                        <p className="mt-2 text-[0.68rem] leading-relaxed text-[#7a5a10]">
                          {selected.king} · {selected.dynasty}
                          {selected.note ? ` · ${selected.note}` : ""}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[0.66rem] leading-relaxed text-[var(--pat-muted)]">
            <Info size={12} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            Niên hiệu thường đổi vào đầu năm âm lịch nên năm dương lịch chuyển giao có thể chênh 1 năm. Dữ liệu
            tham khảo các triều đại phong kiến Việt Nam từ nhà Tiền Lý đến nhà Nguyễn.
          </p>

          <details className="mt-3 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3.5 py-3">
            <summary className="cursor-pointer text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-red)]">
              Toàn bộ {ERA_RECORDS.length} niên hiệu theo triều đại
            </summary>
            <div className="mt-3 grid gap-2.5 md:grid-cols-2">
              {ERA_DYNASTY_GROUPS.map((group) => (
                <section
                  key={group.dynasty}
                  className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5"
                >
                  <p className="text-[0.72rem] font-bold text-[var(--pat-red)]">{group.dynasty}</p>
                  <ul className="mt-1 space-y-1">
                    {group.eras.map((record) => (
                      <li
                        key={record.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-2 text-[0.7rem] leading-snug"
                      >
                        <button
                          type="button"
                          className="font-semibold text-[var(--pat-ink)] underline-offset-2 hover:text-[var(--pat-red)] hover:underline"
                          onClick={() => {
                            setMode("era");
                            chooseEra(record);
                          }}
                        >
                          {record.era}
                        </button>
                        <span className="text-[var(--pat-muted)]">
                          {record.king} · {formatEraYears(record)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </details>
        </section>
      </div>

      <LunarConverterSheet open={converterOpen} onClose={() => setConverterOpen(false)} />
    </TreeShell>
  );
}

function EraCard({
  record,
  active,
  footer,
  onClick,
}: {
  record: EraRecord;
  active?: boolean;
  footer?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="pat-serif text-lg font-semibold leading-snug text-[var(--pat-red)]">{record.era}</p>
        <span className="text-[0.68rem] font-semibold tabular-nums text-[var(--pat-muted)]">
          {formatEraYears(record)}
        </span>
      </div>
      <p className="mt-0.5 text-sm leading-snug text-[var(--pat-ink)]">{record.king}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-[#e3cd92] bg-[#f6e9c8] px-2 py-0.5 text-[0.64rem] font-semibold text-[#7a5a10]">
          {record.dynasty}
        </span>
        {footer ? (
          <span className="rounded-full border border-[var(--pat-line)] bg-[#fffaf0] px-2 py-0.5 text-[0.64rem] text-[var(--pat-muted)]">
            {footer}
          </span>
        ) : null}
      </div>
      {record.note ? (
        <p className="mt-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">{record.note}</p>
      ) : null}
    </>
  );

  const className = cn(
    "w-full rounded-xl border px-3.5 py-3 text-left transition",
    active
      ? "border-[var(--pat-gold)] bg-[#f9edcf]/70 shadow-sm"
      : "border-[var(--pat-line)] bg-white/70",
    onClick && "hover:border-[var(--pat-gold)] hover:bg-white",
  );

  if (!onClick) {
    return <article className={className}>{content}</article>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
