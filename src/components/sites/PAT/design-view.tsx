"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FileText,
  ImageIcon,
  Info,
  LayoutTemplate,
  Palette,
  Printer,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useGenealogy } from "./store";
import type {
  BackgroundPattern,
  CardOrientation,
  DiagramTheme,
  FamilyTree,
  PaletteName,
  PaperSize,
} from "./types";
import { PAPER_MM } from "./types";
import { computeLayout } from "./layout";
import { DiagramCanvas, diagramDimensions } from "./diagram-canvas";
import {
  AUTO_ROTATE_MIN_MEMBERS,
  exportDiagramPng,
  isLargeTree,
  paperDimensions,
  printSvgDiagram,
  resolveOrientation,
  safeName,
} from "./export";
import { TreeShell } from "./app-shell";
import { Field, SectionTitle, Segmented } from "./ui";

const PAPER_OPTIONS: PaperSize[] = ["A4", "A3", "A2", "A1", "A0"];

const THEMES: { value: DiagramTheme; label: string; caption: string }[] = [
  { value: "borderless", label: "Không viền", caption: "Tối giản, nhiều khoảng thở" },
  { value: "tree", label: "Cây gia phả", caption: "Thẻ vàng, viền son truyền thống" },
  { value: "generations", label: "Theo đời", caption: "Nền phân tầng theo thế hệ" },
];

const BACKGROUNDS: { value: BackgroundPattern; label: string }[] = [
  { value: "none", label: "Trơn" },
  { value: "clouds", label: "Mây lành" },
  { value: "dragon", label: "Rồng chầu" },
  { value: "lotus", label: "Hoa sen" },
  { value: "scroll", label: "Thủy ba" },
];

const PALETTES: { value: PaletteName; label: string; swatch: string }[] = [
  { value: "classic", label: "Son mặc", swatch: "#8a1c15" },
  { value: "gold", label: "Kim sa", swatch: "#8a5a0f" },
  { value: "ink", label: "Mực nho", swatch: "#2f2a26" },
  { value: "jade", label: "Ngọc bích", swatch: "#1f5e4a" },
];

export function DesignView({ tree }: { tree: FamilyTree }) {
  const { setDesign } = useGenealogy();
  const design = tree.design;
  const layout = useMemo(() => computeLayout(tree), [tree]);
  const dims = useMemo(() => diagramDimensions(layout, design), [layout, design]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 24;
      setScale(Math.min(0.85, Math.max(0.18, Math.min(available / dims.width, 540 / dims.height))));
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

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const findSvg = () => document.getElementById("pat-design-svg") as SVGSVGElement | null;

  return (
    <TreeShell
      tree={tree}
      section="giao-dien"
      title="Thiết kế phả đồ"
      subtitle="Khổ giấy, nền, hoa văn và bản in"
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              const svg = findSvg();
              if (svg) void printSvgDiagram(svg, tree);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="In phả đồ"
          >
            <Printer size={17} />
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await exportDiagramPng("pat-design-svg", `${safeName(tree.name)}-pha-do.png`, "#fdf6e7");
                flash("Đã tải ảnh PNG");
              } catch {
                flash("Không tạo được PNG, thử in thành PDF");
              }
            }}
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
            <span className="rounded-full border border-[var(--pat-line)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[var(--pat-muted)]">
              {design.paper} · {orientation === "portrait" ? "dọc" : "ngang"} · {paperCm}
              {autoRotate && isLargeTree(tree) ? " · tự xoay" : ""}
            </span>
          </div>
          <div ref={previewRef} className="flex justify-center overflow-hidden bg-[#eadfc8] px-3 py-4">
            <div
              style={{ width: dims.width * scale, height: dims.height * scale }}
              className="overflow-hidden rounded-sm shadow-[0_18px_40px_-18px_rgba(74,31,16,0.6)]"
            >
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
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button
              type="button"
              className="pat-btn pat-btn-red h-9 px-4 text-xs"
              onClick={() => {
                const svg = findSvg();
                if (svg) void printSvgDiagram(svg, tree);
              }}
            >
              <Printer size={14} /> In / Lưu PDF
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-outline h-9 px-4 text-xs"
              onClick={async () => {
                try {
                  await exportDiagramPng("pat-design-svg", `${safeName(tree.name)}-pha-do.png`, "#fdf6e7");
                  flash("Đã tải ảnh PNG");
                } catch {
                  flash("Không tạo được PNG");
                }
              }}
            >
              <ImageIcon size={14} /> Tải PNG
            </button>
            <span className="ml-auto text-[0.65rem] text-[var(--pat-muted)]">
              Thay đổi được lưu tự động
            </span>
          </div>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<RotateCcw size={13} />} title="Khổ giấy" />
          <div className="flex flex-wrap gap-2">
            {PAPER_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                className="pat-chip min-w-[64px] justify-center"
                data-active={design.paper === size}
                onClick={() => setDesign(tree.id, { paper: size })}
              >
                {size}
                <span className="text-[0.6rem] opacity-75">
                  {PAPER_MM[size][0]}×{PAPER_MM[size][1]}
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
          <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
            Bản in dùng đúng khổ chọn ở trên. Cây từ {AUTO_ROTATE_MIN_MEMBERS} thành viên trở lên tự chọn dọc/ngang
            theo hướng phả đồ khi bật tự xoay.
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<Sparkles size={13} />} title="Kiểu bố cục" />
            <div className="space-y-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => setDesign(tree.id, { theme: theme.value })}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    design.theme === theme.value
                      ? "border-[var(--pat-red)] bg-[#f9e3df]/60"
                      : "border-[var(--pat-line)] bg-white/60"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6e9c8] text-[var(--pat-red)]">
                    {design.theme === theme.value ? <Check size={15} /> : <Palette size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{theme.label}</span>
                    <span className="block text-[0.68rem] text-[var(--pat-muted)]">{theme.caption}</span>
                  </span>
                </button>
              ))}
            </div>
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
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: item.swatch }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </Field>
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
          </section>
        </div>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<LayoutTemplate size={13} />} title="Thẻ thành viên" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kiểu khung">
              <Segmented<CardOrientation>
                value={design.cardOrientation === "vertical" ? "vertical" : "horizontal"}
                onChange={(cardOrientation) => {
                  setDesign(tree.id, { cardOrientation });
                  flash(`Đã chọn khung thẻ ${cardOrientation === "vertical" ? "dọc" : "ngang"}`);
                }}
                options={[
                  { value: "horizontal", label: "Ngang" },
                  { value: "vertical", label: "Dọc" },
                ]}
              />
            </Field>
            <div className="flex items-end">
              <p className="w-full rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                Khung dọc hợp với phả đồ nhiều đời; chữ tự xuống dòng trong khung thẻ.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          </div>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<FileText size={13} />} title="Hoành phi & câu đối" />
          <Field label="Chữ trên hoành phi">
            <input
              className="pat-input"
              value={design.bannerText}
              onChange={(event) => setDesign(tree.id, { bannerText: event.target.value })}
              placeholder="GIA PHẢ"
            />
          </Field>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Toggle
              label="Hoành phi"
              active={design.showBanner}
              onClick={() => setDesign(tree.id, { showBanner: !design.showBanner })}
            />
            <Toggle
              label="Câu đối hai bên"
              active={design.showCouplets}
              onClick={() => setDesign(tree.id, { showCouplets: !design.showCouplets })}
            />
            <Toggle
              label="Nhãn đời"
              active={design.showGenerationLabels}
              onClick={() => setDesign(tree.id, { showGenerationLabels: !design.showGenerationLabels })}
            />
            <Toggle
              label="Ảnh đại diện"
              active={design.showAvatar}
              onClick={() => setDesign(tree.id, { showAvatar: !design.showAvatar })}
            />
            <Toggle
              label="Lưới căn chỉnh"
              active={false}
              onClick={() => flash("Lưới bật/tắt trong trang Tạo phả đồ")}
            />
          </div>
          <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
            Câu đối mặc định: “Tổ đức lưu phương” — “Gia phong kế thế”. Sửa nội dung chi tiết trong phần trang trí của
            Tạo phả đồ.
          </p>
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-xs text-[var(--pat-muted)]">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          <p>
            Thiết kế áp dụng cho cả bản in và ảnh PNG. Dữ liệu và bố cục kéo thả được lưu trên thiết bị này, không cần
            đăng nhập.
          </p>
        </div>
      </div>

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
