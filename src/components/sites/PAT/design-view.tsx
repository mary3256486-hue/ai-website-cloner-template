"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  Columns2,
  Download,
  FileText,
  ImageIcon,
  Info,
  LayoutTemplate,
  Loader2,
  Palette,
  Printer,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useGenealogy } from "./store";
import type {
  BackgroundPattern,
  DiagramTheme,
  FamilyTree,
  PaletteName,
  PaperSize,
  DesignSettings,
} from "./types";
import {
  DEFAULT_DESIGN,
  PAPER_MM,
  normalizeCustomPaper,
  normalizeTuning,
} from "./types";
import { computeGenerations, lifeSpan } from "./utils";
import { computeLayout } from "./layout";
import { DiagramCanvas, diagramDimensions } from "./diagram-canvas";
import {
  AUTO_ROTATE_MIN_MEMBERS,
  dateStamp,
  exportDiagramPng,
  isLargeTree,
  paperDimensions,
  printSvgDiagram,
  resolveOrientation,
  safeName,
} from "./export";
import { TreeShell } from "./app-shell";
import { CardOrientationPicker } from "./card-orientation-picker";
import { Field, SectionTitle, Segmented, Sheet, ZoomBar } from "./ui";

const PAPER_OPTIONS: PaperSize[] = ["A4", "A3", "A2", "A1", "A0"];

const THEMES: { value: DiagramTheme; label: string; caption: string }[] = [
  { value: "borderless", label: "Không viền", caption: "Tối giản, nhiều khoảng thở" },
  { value: "tree", label: "Cây gia phả", caption: "Thẻ vàng, viền son truyền thống" },
  { value: "generations", label: "Theo đời", caption: "Nền phân tầng theo thế hệ" },
  { value: "ink", label: "Tiết kiệm mực", caption: "Nền trắng, nét mảnh, in laser rõ" },
];

const BACKGROUNDS: { value: BackgroundPattern; label: string }[] = [
  { value: "none", label: "Trơn" },
  { value: "clouds", label: "Mây lành" },
  { value: "dragon", label: "Rồng chầu" },
  { value: "lotus", label: "Hoa sen" },
  { value: "scroll", label: "Thủy ba" },
  { value: "ornament", label: "Hoa văn" },
];

const PALETTES: {
  value: PaletteName;
  label: string;
  accent: string;
  gold: string;
  soft: string;
}[] = [
  { value: "classic", label: "Son mặc", accent: "#8a1c15", gold: "#c9a227", soft: "#f6e9c8" },
  { value: "gold", label: "Kim sa", accent: "#8a5a0f", gold: "#d4af37", soft: "#f7e9bf" },
  { value: "ink", label: "Mực nho", accent: "#2f2a26", gold: "#8a6a52", soft: "#efe8dc" },
  { value: "jade", label: "Ngọc bích", accent: "#1f5e4a", gold: "#b08d3c", soft: "#e3efe8" },
];

const PRESET_KEY = "phatue.designPresets";

interface DesignPreset {
  id: string;
  name: string;
  design: DesignSettings;
  savedAt: string;
}

function readPresets(): DesignPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DesignPreset[];
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.id && entry?.design) : [];
  } catch {
    return [];
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function DesignView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { setDesign } = useGenealogy();
  const design = tree.design;
  const tuning = useMemo(() => normalizeTuning(design.tuning), [design.tuning]);
  const patternOpacity = tuning.patternOpacity ?? 1;
  const patternScale = tuning.patternScale ?? 1;
  const cardScale = tuning.cardScale ?? 1;
  const layout = useMemo(() => computeLayout(tree), [tree]);
  const dims = useMemo(() => diagramDimensions(layout, design), [layout, design]);
  const generations = useMemo(
    () => computeGenerations(tree.members, tree.founderId),
    [tree.members, tree.founderId],
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.4);
  const [zoom, setZoom] = useState(1);
  const [toast, setToast] = useState("");
  const [showGuides, setShowGuides] = useState(true);
  const [pngScale, setPngScale] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [presets, setPresets] = useState<DesignPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [printFit, setPrintFit] = useState(true);
  const [printGrayscale, setPrintGrayscale] = useState(false);
  const [printCropMarks, setPrintCropMarks] = useState(false);
  const [printSystemSerif, setPrintSystemSerif] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePalette, setComparePalette] = useState<PaletteName>("jade");
  const scale = Math.min(3, Math.max(0.12, fitScale * zoom));

  useEffect(() => {
    setPresets(readPresets());
    if (typeof window === "undefined") return;
    setShowGuides(window.localStorage.getItem(`phatue.designGuides.${tree.id}`) !== "0");
  }, [tree.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`phatue.designGuides.${tree.id}`, showGuides ? "1" : "0");
  }, [showGuides, tree.id]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 24;
      setFitScale(Math.min(0.85, Math.max(0.18, Math.min(available / dims.width, 540 / dims.height))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [dims.width, dims.height]);

  const orientation = resolveOrientation(tree, layout);
  const autoRotate = design.autoRotate !== false;
  const paper = paperDimensions(tree, layout);
  const paperCm = `${(paper.widthMm / 10).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} × ${(
    paper.heightMm / 10
  ).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} cm`;
  const custom = normalizeCustomPaper(design.customPaper);
  const safeMm = clamp(design.printSafeMarginMm ?? 10, 0, 40);
  const safeX = (safeMm / paper.widthMm) * 100;
  const safeY = (safeMm / paper.heightMm) * 100;
  const busyBackground = design.background === "dragon" || design.background === "ornament";
  const effectiveOpacity = patternOpacity * (busyBackground ? 0.6 : 1);
  const inkLevel =
    design.theme === "ink" ? "Thấp" : busyBackground && effectiveOpacity > 0.6 ? "Cao" : design.background === "none" ? "Thấp" : "Vừa";
  const sample =
    tree.members.find((member) => member.id === tree.founderId) ??
    tree.members.find((member) => (generations.get(member.id) ?? 0) >= 1) ??
    tree.members.find((member) => member.gender === "male") ??
    tree.members[0];
  const sampleGeneration = sample ? generations.get(sample.id) ?? 1 : 1;
  const samplePalette = PALETTES.find((entry) => entry.value === design.palette) ?? PALETTES[0];

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const findSvg = () => document.getElementById("pat-design-svg") as SVGSVGElement | null;

  const printDiagram = () => {
    const svg = findSvg();
    if (!svg) return;
    printSvgDiagram(svg, tree, {
      fitToPage: printFit,
      grayscale: printGrayscale,
      cropMarks: printCropMarks,
      systemSerif: printSystemSerif,
    });
  };

  const updateTuning = (patch: Partial<typeof tuning>) =>
    setDesign(tree.id, { tuning: { ...tuning, ...patch } });

  const downloadPng = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportDiagramPng(
        "pat-design-svg",
        `${safeName(tree.name)}-pha-do-${dateStamp()}.png`,
        "#fdf6e7",
        { scale: pngScale },
      );
      flash(`Đã tải ảnh PNG ${pngScale}×`);
    } catch {
      flash("Không tạo được PNG, thử in thành PDF");
    } finally {
      setExporting(false);
    }
  };

  const setCustomSize = (axis: "width" | "height", raw: number) => {
    if (!Number.isFinite(raw)) return;
    const value = clamp(Math.round(raw), 200, 5000);
    let widthMm = axis === "width" ? value : paper.widthMm;
    let heightMm = axis === "height" ? value : paper.heightMm;
    if (custom?.ratio === "1:1") {
      widthMm = value;
      heightMm = value;
    } else if (custom?.ratio === "3:2") {
      if (axis === "width") heightMm = Math.round((value * 2) / 3);
      else widthMm = Math.round((value * 3) / 2);
    }
    setDesign(tree.id, {
      customPaper: {
        widthMm: clamp(Math.round(widthMm), 200, 5000),
        heightMm: clamp(Math.round(heightMm), 200, 5000),
        ratio: custom?.ratio ?? "custom",
      },
    });
  };

  const applyRatio = (ratio: "1:1" | "3:2" | "custom") => {
    if (ratio === "custom") {
      setDesign(tree.id, {
        customPaper: { widthMm: Math.round(paper.widthMm), heightMm: Math.round(paper.heightMm), ratio: "custom" },
      });
      return;
    }
    const base = Math.max(paper.widthMm, paper.heightMm);
    setDesign(tree.id, {
      customPaper: {
        widthMm: Math.round(base),
        heightMm: ratio === "1:1" ? Math.round(base) : Math.round((base * 2) / 3),
        ratio,
      },
    });
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      flash("Đặt tên cho bảng thiết kế trước khi lưu");
      return;
    }
    const next: DesignPreset[] = [
      { id: `preset-${Date.now()}`, name, design, savedAt: new Date().toISOString() },
      ...presets.filter((entry) => entry.name !== name),
    ].slice(0, 12);
    setPresets(next);
    window.localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    setPresetName("");
    flash(`Đã lưu bảng thiết kế “${name}”`);
  };

  const removePreset = (preset: DesignPreset) => {
    const next = presets.filter((entry) => entry.id !== preset.id);
    setPresets(next);
    window.localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    flash(`Đã xoá “${preset.name}”`);
  };

  const applyPreset = (preset: DesignPreset) => {
    setConfirm({
      title: "Áp bảng thiết kế?",
      message: `Thay khổ giấy, màu sắc và kiểu thẻ của “${tree.name}” bằng “${preset.name}”. Vị trí kéo tay trên phả đồ vẫn giữ nguyên.`,
      action: () => {
        setDesign(tree.id, { ...DEFAULT_DESIGN, ...preset.design, customPaper: preset.design.customPaper ?? null });
        flash(`Đã áp “${preset.name}”`);
      },
    });
  };

  const restoreDefaults = () => {
    setConfirm({
      title: "Khôi phục thiết kế mặc định?",
      message:
        "Trả khổ giấy, bảng màu, hoa văn, khung viền và kiểu thẻ về mặc định. Vị trí kéo tay và trang trí trên phả đồ vẫn giữ nguyên.",
      action: () => {
        setDesign(tree.id, { ...DEFAULT_DESIGN, customPaper: null, tuning: undefined });
        flash("Đã khôi phục thiết kế mặc định");
      },
    });
  };

  const editorHref = `/gia-pha/${tree.id}/ve-pha-do`;

  return (
    <TreeShell
      tree={tree}
      section="giao-dien"
      title="Thiết kế bản in"
      subtitle="Khổ giấy, nền, hoa văn và bản in"
      actions={
        <>
          <button
            type="button"
            onClick={printDiagram}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="In phả đồ"
          >
            <Printer size={17} />
          </button>
          <button
            type="button"
            onClick={() => void downloadPng()}
            className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
          >
            <Download size={14} /> Tải
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="pat-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--pat-line)] bg-[#fffaf0]/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[var(--pat-red)]" />
              <p className="text-xs font-semibold">Xem trước bản in</p>
            </div>
            <span className="rounded-full border border-[var(--pat-line)] px-2.5 py-0.5 text-[0.72rem] font-semibold text-[var(--pat-muted)]">
              {custom ? "Khổ tự nhập" : design.paper} · {orientation === "portrait" ? "dọc" : "ngang"} · {paperCm}
              {autoRotate && isLargeTree(tree) ? " · tự xoay" : ""}
            </span>
          </div>
          <div ref={previewRef} className="flex max-h-[72vh] overflow-auto bg-[#eadfc8] px-3 py-4">
            <div
              className="relative shrink-0"
              style={{ width: dims.width * scale, height: dims.height * scale }}
            >
              <div className="h-full w-full overflow-hidden rounded-sm shadow-[0_18px_40px_-18px_rgba(74,31,16,0.6)]">
                <div
                  style={{ width: dims.width, height: dims.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                  <DiagramCanvas
                    tree={tree}
                    layout={layout}
                    design={design}
                    decorations={tree.decorations}
                    svgId="pat-design-svg"
                    idPrefix="design"
                  />
                </div>
              </div>
              {showGuides ? (
                <>
                  <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-[#b3261e]/70" />
                  <div
                    className="pointer-events-none absolute border border-dashed border-[#b3261e]"
                    style={{
                      left: `${safeX}%`,
                      right: `${safeX}%`,
                      top: `${safeY}%`,
                      bottom: `${safeY}%`,
                    }}
                  />
                  <span className="pointer-events-none absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full rounded-full bg-[#8f2018] px-2 py-0.5 text-[0.6rem] font-semibold text-[#fff4df]">
                    Đường cắt mép giấy
                  </span>
                  <span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[0.58rem] font-semibold text-[#8f2018]"
                    style={{ top: `${safeY}%` }}
                  >
                    Vùng an toàn {safeMm} mm
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button
              type="button"
              className="pat-btn pat-btn-red h-9 px-4 text-xs"
              onClick={printDiagram}
            >
              <Printer size={14} /> In / Lưu PDF
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-outline h-9 px-4 text-xs"
              onClick={() => void downloadPng()}
              disabled={exporting}
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Tải PNG
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-outline h-9 px-3 text-xs"
              data-active={showGuides}
              onClick={() => setShowGuides((prev) => !prev)}
            >
              <ShieldCheck size={14} /> Khung giấy & vùng an toàn
            </button>
            <label className="flex items-center gap-1 text-[0.7rem] text-[var(--pat-muted)]">
              Lề an toàn
              <input
                type="number"
                min={0}
                max={40}
                value={safeMm}
                onChange={(event) =>
                  setDesign(tree.id, { printSafeMarginMm: clamp(Number(event.target.value) || 0, 0, 40) })
                }
                className="pat-input h-8 w-16 px-1 text-right text-xs tabular-nums"
              />
              mm
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Segmented<"1" | "2" | "3">
                value={String(pngScale) as "1" | "2" | "3"}
                onChange={(value) => setPngScale(Number(value))}
                options={[
                  { value: "1", label: "1×" },
                  { value: "2", label: "2×" },
                  { value: "3", label: "3×" },
                ]}
              />
              <ZoomBar
                percent={Math.round(scale * 100)}
                onZoomOut={() => setZoom((value) => Math.max(0.4, value / 1.25))}
                onZoomIn={() => setZoom((value) => Math.min(8, value * 1.25))}
                onReset={() => setZoom(1)}
              />
            </div>
          </div>
          <p className="border-t border-[var(--pat-line)] px-4 py-2 text-[0.68rem] text-[var(--pat-muted)]">
            Đường đứt ngoài là mép giấy cần cắt; khung đứt bên trong là vùng an toàn để chữ không bị xén. Thay đổi được
            lưu tự động.
          </p>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<Printer size={13} />} title="Tuỳ chọn in / Lưu PDF" />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--pat-ink)]">
              <input
                type="checkbox"
                checked={printFit}
                onChange={(event) => setPrintFit(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-[var(--pat-red)]"
              />
              Vừa trang (co giãn theo khổ giấy)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--pat-ink)]">
              <input
                type="checkbox"
                checked={printGrayscale}
                onChange={(event) => setPrintGrayscale(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-[var(--pat-red)]"
              />
              In đen trắng
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--pat-ink)]">
              <input
                type="checkbox"
                checked={printCropMarks}
                onChange={(event) => setPrintCropMarks(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-[var(--pat-red)]"
              />
              Dấu cắt 4 góc
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--pat-ink)]">
              <input
                type="checkbox"
                checked={printSystemSerif}
                onChange={(event) => setPrintSystemSerif(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-[var(--pat-red)]"
              />
              Font serif hệ thống (mở offline vẫn đúng chữ)
            </label>
          </div>
          <p className="mt-2.5 text-[0.68rem] text-[var(--pat-muted)]">
            Bỏ tick “Vừa trang” để in đúng 100% kích thước thiết kế ({paperCm}). Khi lưu PDF, chọn máy in “Lưu thành
            PDF” và giữ nguyên khổ giấy đã chọn ở trên.
          </p>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<Ruler size={13} />} title="Khổ giấy" />
          <div className="flex flex-wrap gap-2">
            {PAPER_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                className="pat-chip min-w-[76px] justify-center"
                data-active={!custom && design.paper === size}
                onClick={() => setDesign(tree.id, { paper: size, customPaper: null })}
              >
                {size}
                <span className="text-[0.6rem] opacity-75">
                  {(PAPER_MM[size][0] / 10).toLocaleString("vi-VN")}×
                  {(PAPER_MM[size][1] / 10).toLocaleString("vi-VN")} cm
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Chiều giấy">
              <Segmented<"portrait" | "landscape">
                value={orientation}
                onChange={(next) => {
                  setDesign(tree.id, { orientation: next, autoRotate: false });
                  flash(`Đã chọn khổ ${next === "landscape" ? "ngang" : "dọc"}`);
                }}
                options={[
                  { value: "portrait", label: "Dọc" },
                  { value: "landscape", label: "Ngang" },
                ]}
              />
            </Field>
            <div className="flex items-end">
              <div className="w-full">
                <Toggle
                  label="Tự xoay theo phả đồ"
                  active={autoRotate}
                  onClick={() => {
                    const next = !autoRotate;
                    setDesign(tree.id, { autoRotate: next, orientation });
                    flash(
                      next
                        ? isLargeTree(tree)
                          ? "Đã bật tự xoay theo phả đồ"
                          : `Tự xoay áp dụng khi cây từ ${AUTO_ROTATE_MIN_MEMBERS} thành viên`
                        : "Đã tắt tự xoay, giữ khổ hiện tại",
                    );
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">Khổ tự nhập (mm)</p>
                <p className="text-[0.68rem] text-[var(--pat-muted)]">
                  Lưu riêng cho từng gia phả, dùng khi nhà in yêu cầu kích thước khác.
                </p>
              </div>
              <Segmented<"1:1" | "3:2" | "custom">
                value={custom?.ratio ?? "custom"}
                onChange={applyRatio}
                options={[
                  { value: "1:1", label: "1:1" },
                  { value: "3:2", label: "3:2" },
                  { value: "custom", label: "Tự nhập" },
                ]}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label="Ngang (mm)">
                <input
                  type="number"
                  min={200}
                  max={5000}
                  value={Math.round(paper.widthMm)}
                  onChange={(event) => setCustomSize("width", Number(event.target.value))}
                  className="pat-input h-9 text-sm tabular-nums"
                />
              </Field>
              <Field label="Dọc (mm)">
                <input
                  type="number"
                  min={200}
                  max={5000}
                  value={Math.round(paper.heightMm)}
                  onChange={(event) => setCustomSize("height", Number(event.target.value))}
                  className="pat-input h-9 text-sm tabular-nums"
                />
              </Field>
            </div>
            <p className="mt-1 text-[0.68rem] text-[var(--pat-muted)]">
              Hiện tại {paperCm}. Nhà in thường nhận tối đa 1500 mm mỗi chiều.
            </p>
          </div>
          <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
            Cây từ {AUTO_ROTATE_MIN_MEMBERS} thành viên trở lên tự chọn dọc/ngang theo hướng phả đồ khi bật tự xoay.
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<Sparkles size={13} />} title="Kiểu bố cục" />
            <div className="space-y-2">
              {THEMES.map((theme) => {
                const active = design.theme === theme.value;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setDesign(tree.id, { theme: theme.value })}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-[var(--pat-red)] bg-[#f9e3df]/60"
                        : "border-[var(--pat-line)] bg-white/60"
                    }`}
                  >
                    <span className="shrink-0">
                      {theme.value === "ink" ? (
                        <span className="relative flex h-11 w-16 items-center justify-center rounded-md border border-[#e3dccd] bg-white">
                          <span className="absolute left-1/2 top-6 h-px w-10 -translate-x-1/2 bg-[#3f3a34]" />
                          <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[0.55rem] font-semibold text-[#3f3a34]">
                            Aa
                          </span>
                        </span>
                      ) : theme.value === "generations" ? (
                        <span className="flex h-11 w-16 flex-col justify-center gap-0.5 rounded-md border border-[#e9dcc0] bg-[#fdf3dd] p-1">
                          <span className="h-1.5 w-full rounded-sm bg-[#f0dfb4]" />
                          <span className="h-1.5 w-full rounded-sm bg-[#f6e9c8]" />
                          <span className="h-1.5 w-full rounded-sm bg-[#fbf2dc]" />
                        </span>
                      ) : theme.value === "tree" ? (
                        <span className="flex h-11 w-16 items-center justify-center rounded-md border-2 border-[#c9a227] bg-[#fdf3dd]">
                          <span className="h-6 w-10 rounded-sm border border-[#8a1c15] bg-[#f6e9c8]" />
                        </span>
                      ) : (
                        <span className="flex h-11 w-16 items-center justify-center rounded-md border border-dashed border-[#c9b894] bg-[#fdf8ec]">
                          <span className="h-5 w-9 rounded-sm border border-[#c9a227]/60" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{theme.label}</span>
                      <span className="block text-[0.68rem] text-[var(--pat-muted)]">{theme.caption}</span>
                    </span>
                    {active ? <Check size={15} className="shrink-0 text-[var(--pat-red)]" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
              Đổi kiểu bố cục không xoá vị trí kéo tay hay trang trí đã đặt trên phả đồ.
            </p>
          </section>

          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<Palette size={13} />} title="Màu sắc & nền" />
            <Field label="Bảng màu">
              <div className="flex flex-wrap gap-2">
                {PALETTES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDesign(tree.id, { palette: item.value })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      design.palette === item.value
                        ? "border-[var(--pat-red)] text-[var(--pat-red)]"
                        : "border-[var(--pat-line)] text-[var(--pat-muted)]"
                    }`}
                  >
                    <span className="flex items-center">
                      <span className="h-3.5 w-3.5 rounded-full border border-white/70" style={{ background: item.accent }} />
                      <span className="-ml-1 h-3.5 w-3.5 rounded-full border border-white/70" style={{ background: item.gold }} />
                      <span className="-ml-1 h-3.5 w-3.5 rounded-full border border-white/70" style={{ background: item.soft }} />
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </Field>
            <button
              type="button"
              className="pat-btn pat-btn-outline mt-2 h-8 px-3 text-[0.7rem]"
              onClick={() => {
                setComparePalette(PALETTES.find((entry) => entry.value !== design.palette)?.value ?? "jade");
                setCompareOpen(true);
              }}
            >
              <Columns2 size={13} /> So sánh hai bảng màu
            </button>
            {design.theme === "ink" || design.palette === "ink" ? (
              <p className="mt-2 rounded-lg border border-[#c9b894] bg-[#fffaf0] px-2.5 py-1.5 text-[0.68rem] leading-relaxed text-[#6b5a3a]">
                Bảng mực/tiết kiệm mực hợp in trắng đen. Khi in laser, nên xem trước bản PDF để chắc chắn chữ mảnh vẫn
                đậm và tương phản đủ.
              </p>
            ) : null}
            <div className="mt-3">
              <Field label="Hoa văn nền">
                <div className="flex flex-wrap gap-2">
                  {BACKGROUNDS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="pat-chip"
                      data-active={design.background === item.value}
                      onClick={() => setDesign(tree.id, { background: item.value })}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="Độ đậm hoa văn">
                <div className="flex items-center gap-1.5">
                  <input
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.1}
                    value={patternOpacity}
                    onChange={(event) => updateTuning({ patternOpacity: Number(event.target.value) })}
                    className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--pat-red)]"
                  />
                  <span className="w-8 text-right text-[0.68rem] tabular-nums text-[var(--pat-muted)]">
                    {patternOpacity.toFixed(1)}×
                  </span>
                </div>
              </Field>
              <Field label="Cỡ hoa văn">
                <div className="flex items-center gap-1.5">
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    value={patternScale}
                    onChange={(event) => updateTuning({ patternScale: Number(event.target.value) })}
                    className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--pat-red)]"
                  />
                  <span className="w-8 text-right text-[0.68rem] tabular-nums text-[var(--pat-muted)]">
                    {patternScale.toFixed(1)}×
                  </span>
                </div>
              </Field>
            </div>
            <p className="mt-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
              {busyBackground
                ? `Hoa văn rối tự giảm 40% độ đậm (còn ${Math.round(effectiveOpacity * 100)}%). `
                : ""}
              Ước tính mực in: <strong>{inkLevel}</strong>.
            </p>
            <div className="mt-3">
              <Field label="Khung viền">
                <Segmented<"none" | "simple" | "ornate">
                  value={design.borderStyle}
                  onChange={(borderStyle) => setDesign(tree.id, { borderStyle })}
                  options={[
                    { value: "none", label: "Không" },
                    { value: "simple", label: "Đơn giản" },
                    { value: "ornate", label: "Hoa văn" },
                  ]}
                />
              </Field>
            </div>
            <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
              Hoành phi, khung gỗ và khung diềm chỉnh trong trang Tạo phả đồ.
            </p>
          </section>
        </div>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<LayoutTemplate size={13} />} title="Thẻ thành viên" />
          <CardOrientationPicker
            design={design}
            generations={layout.generations}
            onChange={(patch) => setDesign(tree.id, patch)}
          />
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
            <div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Toggle
                  label="Danh xưng"
                  active={design.showTitle !== false}
                  onClick={() => setDesign(tree.id, { showTitle: design.showTitle === false })}
                />
                <Toggle
                  label="Họ và tên"
                  active={design.showName !== false}
                  onClick={() => setDesign(tree.id, { showName: design.showName === false })}
                />
                <Toggle
                  label="Năm sinh – mất"
                  active={design.showDates !== false}
                  onClick={() => setDesign(tree.id, { showDates: design.showDates === false })}
                />
                <Toggle
                  label="Ngày giỗ"
                  active={design.showDeathAnniversary === true}
                  onClick={() => setDesign(tree.id, { showDeathAnniversary: design.showDeathAnniversary !== true })}
                />
                <Toggle
                  label="Ảnh đại diện"
                  active={design.showAvatar}
                  onClick={() => setDesign(tree.id, { showAvatar: !design.showAvatar })}
                />
                <Toggle
                  label="Nhãn đời"
                  active={design.showGenerationLabels}
                  onClick={() => setDesign(tree.id, { showGenerationLabels: !design.showGenerationLabels })}
                />
                <Toggle
                  label="Con thứ"
                  active={design.showBirthOrder === true}
                  onClick={() => setDesign(tree.id, { showBirthOrder: design.showBirthOrder !== true })}
                />
                <Toggle
                  label="Ký hiệu giới tính"
                  active={design.showGenderSymbol === true}
                  onClick={() => setDesign(tree.id, { showGenderSymbol: design.showGenderSymbol !== true })}
                />
              </div>
              <Field label={`Cỡ thẻ (${Math.round(cardScale * 100)}%)`}>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={cardScale}
                  onChange={(event) => updateTuning({ cardScale: Number(event.target.value) })}
                  className="h-1.5 w-full cursor-pointer accent-[var(--pat-red)]"
                />
              </Field>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                Khung dọc hợp với phả đồ nhiều đời; chữ tự xuống dòng trong khung thẻ. Có thể chọn riêng khung ngang hoặc
                dọc cho từng đời. Cỡ thẻ áp dụng cho cả phả đồ.
              </p>
            </div>
            <div>
              <p className="pat-form-section">Thẻ mẫu</p>
              {sample ? (
                <div
                  className="rounded-xl border-2 bg-[#fffdf6] p-2 shadow-sm"
                  style={{
                    borderColor: design.theme === "ink" ? "#3f3a34" : samplePalette.accent,
                    fontFamily: tuning.fontFamily,
                    fontSize: `${Math.round((tuning.fontSize / 10.5) * 11)}px`,
                  }}
                >
                  <div className="flex items-start justify-between gap-1 text-[0.6rem] text-[var(--pat-muted)]">
                    <span className="truncate">
                      {design.showTitle !== false
                        ? sample.title || `Đời ${sampleGeneration}`
                        : `Đời ${sampleGeneration}`}
                    </span>
                    {design.showGenderSymbol ? (
                      <span className="shrink-0 font-semibold" style={{ color: samplePalette.accent }}>
                        {sample.gender === "male" ? "♂" : "♀"}
                      </span>
                    ) : null}
                  </div>
                  <p className="pat-serif truncate text-sm font-semibold" style={{ color: samplePalette.accent }}>
                    {design.showName !== false ? sample.name : "—"}
                  </p>
                  {design.showDates !== false ? (
                    <p className="text-[0.62rem] text-[var(--pat-muted)]">
                      {/\d/.test(lifeSpan(sample)) ? lifeSpan(sample) : "Chưa rõ năm"}
                    </p>
                  ) : null}
                  {design.showBirthOrder && sample.birthOrder > 0 ? (
                    <p className="text-[0.62rem] text-[var(--pat-muted)]">Con thứ {sample.birthOrder}</p>
                  ) : null}
                  {design.showDeathAnniversary && sample.deathAnniversary ? (
                    <p className="text-[0.62rem] text-[var(--pat-muted)]">Giỗ: {sample.deathAnniversary}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[0.68rem] text-[var(--pat-muted)]">Chưa có thành viên để xem thẻ mẫu.</p>
              )}
            </div>
          </div>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<Bookmark size={13} />} title="Bảng thiết kế & khôi phục" />
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Lưu bảng hiện tại">
              <input
                className="pat-input h-9 w-56 text-sm"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Ví dụ: Khổ A1 in treo"
              />
            </Field>
            <button type="button" className="pat-btn pat-btn-red h-9 px-3 text-xs" onClick={savePreset}>
              <Bookmark size={14} /> Lưu
            </button>
            <button type="button" className="pat-btn pat-btn-outline ml-auto h-9 px-3 text-xs" onClick={restoreDefaults}>
              <RotateCcw size={14} /> Khôi phục mặc định
            </button>
          </div>
          {presets.length ? (
            <div className="mt-3 space-y-1.5">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--pat-line)] bg-white/60 px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{preset.name}</span>
                    <span className="block text-[0.66rem] text-[var(--pat-muted)]">
                      {preset.design.paper} · {preset.design.palette} · {preset.design.theme}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="pat-btn pat-btn-outline h-7 px-2 text-[0.68rem]"
                    onClick={() => applyPreset(preset)}
                  >
                    Áp dụng
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--pat-muted)] hover:text-[#8a1c15]"
                    aria-label={`Xoá bảng ${preset.name}`}
                    onClick={() => removePreset(preset)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
              Lưu bảng thiết kế để dùng lại cho gia phả khác. Bảng lưu trên thiết bị này.
            </p>
          )}
          <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
            Áp dụng bảng hoặc khôi phục mặc định sẽ hỏi lại trước khi thay đổi; vị trí kéo tay trên phả đồ không bị xoá.
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push(editorHref)}
            className="flex items-center gap-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-3 text-left transition hover:border-[var(--pat-red)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6e9c8] text-[var(--pat-red)]">
              <LayoutTemplate size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">Mở trong Tạo phả đồ</span>
              <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                Kéo thẻ, thêm trang trí, chỉnh hoành phi và khung gỗ
              </span>
            </span>
            <ArrowRight size={15} className="shrink-0 text-[var(--pat-red)]" />
          </button>
          <button
            type="button"
            onClick={() => router.push(`${editorHref}?grid=1`)}
            className="flex items-center gap-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-3 text-left transition hover:border-[var(--pat-red)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6e9c8] text-[var(--pat-red)]">
              <Ruler size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">Căn chỉnh với lưới</span>
              <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                Mở Tạo phả đồ với lưới bật sẵn để căn thẻ
              </span>
            </span>
            <ArrowRight size={15} className="shrink-0 text-[var(--pat-red)]" />
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-xs text-[var(--pat-muted)]">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          <p>
            Thiết kế áp dụng cho cả bản in và ảnh PNG. Dữ liệu và bố cục kéo thả được lưu trên thiết bị này, không cần
            đăng nhập.
          </p>
        </div>
      </div>

      <Sheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="So sánh bảng màu"
        subtitle="Xem cùng một phả đồ với hai bảng màu cạnh nhau"
        wide
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PALETTES.filter((entry) => entry.value !== design.palette).map((entry) => (
            <button
              key={entry.value}
              type="button"
              className="pat-chip"
              data-active={comparePalette === entry.value}
              onClick={() => setComparePalette(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[design.palette, comparePalette].map((palette, index) => {
            const miniScale = 300 / dims.width;
            return (
              <div key={`${palette}-${index}`} className="min-w-0">
                <p className="mb-1 text-[0.72rem] font-semibold">
                  {PALETTES.find((entry) => entry.value === palette)?.label}
                  {index === 0 ? " (đang dùng)" : ""}
                </p>
                <div
                  className="overflow-hidden rounded-md border border-[var(--pat-line)]"
                  style={{ width: 300, height: Math.min(420, dims.height * miniScale) }}
                >
                  <div
                    style={{
                      width: dims.width,
                      height: dims.height,
                      transform: `scale(${miniScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <DiagramCanvas
                      tree={tree}
                      layout={layout}
                      design={{ ...design, palette }}
                      decorations={tree.decorations}
                      svgId={`pat-cmp-${index}`}
                      idPrefix={`cmp-${index}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--pat-line)] bg-[#fffaf0] p-4 shadow-xl">
            <p className="pat-serif text-base font-semibold text-[var(--pat-red)]">{confirm.title}</p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--pat-muted)]">{confirm.message}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="pat-btn pat-btn-outline h-9 px-3 text-xs"
                onClick={() => setConfirm(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="pat-btn pat-btn-red h-9 px-3 text-xs"
                onClick={() => {
                  confirm.action();
                  setConfirm(null);
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exporting ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
          <div className="flex w-full max-w-xs items-center gap-2 rounded-2xl border border-[var(--pat-line)] bg-[#fffaf0] p-4 text-sm font-semibold text-[var(--pat-red)] shadow-xl">
            <Loader2 size={16} className="animate-spin" /> Đang dựng ảnh PNG {pngScale}×…
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[var(--pat-gold)]/60 bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[var(--pat-red)] shadow-lg md:bottom-6">
          {toast}
        </div>
      ) : null}
    </TreeShell>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
        active
          ? "border-[var(--pat-red)] bg-[#f9e3df]/60 text-[var(--pat-red)]"
          : "border-[var(--pat-line)] bg-white/60 text-[var(--pat-muted)]"
      }`}
    >
      {label}
      <span
        className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${
          active ? "justify-end bg-[var(--pat-red)]" : "justify-start bg-[#d8c8ae]"
        }`}
      >
        <span className="h-3 w-3 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}
