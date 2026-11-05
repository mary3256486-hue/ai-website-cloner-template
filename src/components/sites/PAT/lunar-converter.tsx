"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Info, RotateCcw, Sun, Moon } from "lucide-react";
import {
  formatLunarDate,
  formatLunarDateLong,
  formatSolarDate,
  isValidSolarDate,
  LUNAR_MAX_YEAR,
  LUNAR_MIN_YEAR,
  lunarToSolar,
  lunarYearName,
  lunarYearsForName,
  parseStoredDate,
  solarToLunar,
  type LunarDate,
  type SolarDate,
} from "./lunar";
import { Sheet } from "./ui";
import type { CalendarKind } from "./types";

type Direction = "solar" | "lunar";

interface ApplyTarget {
  label: string;
  date?: string;
  calendar?: CalendarKind;
  leap?: boolean;
  onApply: (date: string, calendar: CalendarKind, leap: boolean) => void;
}

function today() {
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

export function LunarConverterSheet({
  open,
  onClose,
  apply,
}: {
  open: boolean;
  onClose: () => void;
  apply?: ApplyTarget;
}) {
  const [direction, setDirection] = useState<Direction>("solar");
  const [day, setDay] = useState(String(today().day));
  const [month, setMonth] = useState(String(today().month));
  const [year, setYear] = useState(String(today().year));
  const [leap, setLeap] = useState(false);
  const [pickedYear, setPickedYear] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = parseStoredDate(apply?.date);
    const base = initial ?? today();
    setDay(String(base.day));
    setMonth(String(base.month));
    setYear(String(base.year));
    setLeap(apply?.calendar === "am" && Boolean(apply?.leap));
    setPickedYear(null);
    setDirection(apply?.calendar === "am" ? "lunar" : "solar");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const yearText = year.trim();
  const numericYear = /^\d{1,4}$/.test(yearText) ? Number(yearText) : null;
  const yearCandidates = useMemo(
    () => (direction === "lunar" && numericYear === null ? lunarYearsForName(yearText) : []),
    [direction, numericYear, yearText],
  );
  const resolvedYear = useMemo(() => {
    if (numericYear !== null) return numericYear;
    if (!yearCandidates.length) return null;
    if (pickedYear !== null && yearCandidates.includes(pickedYear)) return pickedYear;
    const now = new Date().getFullYear();
    return yearCandidates.reduce((best, candidate) =>
      Math.abs(candidate - now) < Math.abs(best - now) ? candidate : best,
    );
  }, [numericYear, yearCandidates, pickedYear]);

  const parsed = useMemo(
    () => ({ day: Number(day), month: Number(month), year: resolvedYear ?? NaN }),
    [day, month, resolvedYear],
  );

  const result = useMemo(() => {
    if (!day || !month || !yearText) return { error: "Nhập đủ ngày, tháng, năm." as string | null };
    if (resolvedYear === null) {
      return {
        error: (direction === "lunar"
          ? "Không nhận ra năm Âm lịch — nhập năm dương (vd 2026) hoặc Can Chi (vd Bính Ngọ)."
          : "Nhập năm Dương lịch.") as string | null,
      };
    }
    if (resolvedYear < LUNAR_MIN_YEAR || resolvedYear > LUNAR_MAX_YEAR) {
      return { error: `Chỉ hỗ trợ năm ${LUNAR_MIN_YEAR}–${LUNAR_MAX_YEAR}.` as string | null };
    }
    if (direction === "solar") {
      if (!isValidSolarDate(parsed.day, parsed.month, parsed.year)) {
        return { error: "Ngày Dương lịch không hợp lệ." as string | null };
      }
      const lunar = solarToLunar(parsed.day, parsed.month, parsed.year);
      return { solar: { ...parsed }, lunar, error: null as string | null };
    }
    const solar = lunarToSolar(parsed.day, parsed.month, parsed.year, leap);
    if (!solar) {
      return {
        error: leap
          ? "Ngày Âm lịch không tồn tại — năm này có thể không có tháng nhuận đã chọn."
          : "Ngày Âm lịch không tồn tại — kiểm tra tháng nhuận hoặc số ngày của tháng.",
      };
    }
    return { solar, lunar: { ...parsed, leap }, error: null as string | null };
  }, [day, month, yearText, direction, leap, parsed, resolvedYear]);

  const chooseDirection = (next: Direction) => {
    if (next === "solar" && numericYear === null && resolvedYear !== null) {
      setYear(String(resolvedYear));
    }
    setDirection(next);
    setPickedYear(null);
  };

  const solar = "solar" in result ? (result.solar as SolarDate) : null;
  const lunar = "lunar" in result ? (result.lunar as LunarDate) : null;

  const setToday = () => {
    const base = today();
    setDay(String(base.day));
    setMonth(String(base.month));
    setYear(String(base.year));
    setLeap(false);
    setPickedYear(null);
    setDirection("solar");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Đổi ngày Âm – Dương"
      subtitle={`Lịch Việt Nam (múi giờ +7) · ${LUNAR_MIN_YEAR}–${LUNAR_MAX_YEAR}`}
      footer={
        apply ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="pat-btn h-11 text-sm"
              disabled={!solar}
              onClick={() => {
                if (!solar) return;
                apply.onApply(formatSolarDate(solar), "duong", false);
                onClose();
              }}
            >
              <CalendarDays size={14} /> Điền Dương lịch vào {apply.label}
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-11 text-sm"
              disabled={!lunar}
              onClick={() => {
                if (!lunar) return;
                apply.onApply(
                  formatSolarDate({ day: lunar.day, month: lunar.month, year: lunar.year }),
                  "am",
                  lunar.leap,
                );
                onClose();
              }}
            >
              <CalendarDays size={14} /> Điền Âm lịch vào {apply.label}
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-[var(--pat-muted)]">
            Công cụ chỉ tra cứu, không thay đổi dữ liệu gia phả.
          </p>
        )
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="pat-chip justify-center"
            data-active={direction === "solar"}
            onClick={() => chooseDirection("solar")}
          >
            <Sun size={13} /> Dương → Âm
          </button>
          <button
            type="button"
            className="pat-chip justify-center"
            data-active={direction === "lunar"}
            onClick={() => chooseDirection("lunar")}
          >
            <Moon size={13} /> Âm → Dương
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--pat-muted)]">
              Ngày
            </span>
            <input
              className="pat-input tabular-nums"
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--pat-muted)]">
              Tháng
            </span>
            <input
              className="pat-input tabular-nums"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--pat-muted)]">
              Năm{direction === "lunar" ? " âm" : ""}
            </span>
            <input
              className="pat-input tabular-nums"
              type={direction === "lunar" ? "text" : "number"}
              inputMode={direction === "lunar" ? "text" : "numeric"}
              min={direction === "lunar" ? undefined : LUNAR_MIN_YEAR}
              max={direction === "lunar" ? undefined : LUNAR_MAX_YEAR}
              placeholder={direction === "lunar" ? "2026 hoặc Bính Ngọ" : undefined}
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setPickedYear(null);
              }}
            />
          </label>
        </div>

        {direction === "lunar" && yearCandidates.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[0.66rem] text-[var(--pat-muted)]">
              Năm {lunarYearName(yearCandidates[0])} có thể là:
            </span>
            {yearCandidates.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className="pat-chip h-6 px-2 text-[0.64rem] tabular-nums"
                data-active={resolvedYear === candidate}
                onClick={() => setPickedYear(candidate)}
              >
                {candidate}
              </button>
            ))}
          </div>
        ) : null}

        {direction === "lunar" ? (
          <label className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2 text-xs text-[var(--pat-ink)]">
            <input
              type="checkbox"
              checked={leap}
              onChange={(event) => setLeap(event.target.checked)}
              className="h-4 w-4 accent-[var(--pat-red)]"
            />
            Tháng nhuận
          </label>
        ) : null}

        <button type="button" className="pat-btn h-8 px-2.5 text-[0.68rem]" onClick={setToday}>
          <RotateCcw size={12} /> Hôm nay
        </button>

        {result.error ? (
          <p className="rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/70 px-3 py-2 text-[0.72rem] leading-relaxed text-[#a3271d]">
            {result.error}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="rounded-xl border border-[var(--pat-line)] bg-white/70 px-3 py-2.5">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                Dương lịch
              </p>
              <p className="pat-serif mt-0.5 text-xl font-semibold text-[var(--pat-ink)]">
                {solar ? formatSolarDate(solar) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[#e3cd92] bg-[#f9edcf]/70 px-3 py-2.5">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-[#7a5a10]">Âm lịch</p>
              <p className="pat-serif mt-0.5 text-lg font-semibold leading-snug text-[var(--pat-red)]">
                {lunar ? formatLunarDateLong(lunar) : "—"}
              </p>
              {lunar ? (
                <p className="mt-0.5 text-[0.66rem] text-[#7a5a10]">{formatLunarDate(lunar)}</p>
              ) : null}
            </div>
          </div>
        )}

        <p className="flex items-start gap-1.5 text-[0.66rem] leading-relaxed text-[var(--pat-muted)]">
          <Info size={12} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          Một số năm có tháng nhuận nên Âm lịch dài hơn Dương lịch; chọn đúng ô “Tháng nhuận” khi nhập ngày Âm.
        </p>
      </div>
    </Sheet>
  );
}
