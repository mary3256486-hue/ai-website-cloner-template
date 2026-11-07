"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Frame,
  ImagePlus,
  Lock,
  LockOpen,
  Minus,
  MoveHorizontal,
  Palette,
  PencilLine,
  Plus,
  RotateCcw,
  Ruler,
  Settings2,
  Trash2,
  Type as TypeIcon,
  X,
} from "lucide-react";
import { Avatar, Badge, Field, Segmented } from "./ui";
import { lifeSpan } from "./utils";
import type {
  BackgroundImageSettings,
  BannerSettings,
  CardOrientation,
  CoupletSettings,
  Decoration,
  DesignSettings,
  DiagramTuning,
  ExtraFieldKey,
  FamilyTree,
  GenerationStyle,
  Person,
  PersonStyle,
} from "./types";
import {
  BAND_LABELS,
  COUPLET_FONT_LABELS,
  EXTRA_FIELD_LABELS,
  generationTag,
  normalizeBackgroundImage,
  normalizeBanner,
  normalizeCouplets,
  normalizeCustomPaper,
  PAPER_MM,
  type BackgroundPattern,
  type GenerationBandLabel,
} from "./types";

export const FONT_OPTIONS = [
  { value: "'Be Vietnam Pro', sans-serif", label: "Be Vietnam Pro" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "system-ui, sans-serif", label: "Sans hệ thống" },
];

export function InspectorHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-[var(--pat-line)] px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--pat-muted)]">{eyebrow}</p>
        <p className="pat-serif mt-0.5 truncate text-base font-semibold text-[var(--pat-red)]">{title}</p>
        {subtitle ? <p className="mt-0.5 text-[0.72rem] text-[var(--pat-muted)]">{subtitle}</p> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Bỏ chọn"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--pat-line)] text-[var(--pat-muted)] transition hover:bg-white/70"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-b border-[var(--pat-line)]/70 px-3.5 py-3.5 last:border-b-0">
      <div>
        <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--pat-red)]">
          {icon}
          {title}
        </p>
        {hint ? <p className="mt-1 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SectionGroup({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-[var(--pat-line)]/70">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)] transition hover:bg-[#f6e9c8]/40"
      >
        {icon}
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-[var(--pat-muted)] transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open ? <div className="pb-1">{children}</div> : null}
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "px",
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--pat-red)]"
        />
        <span className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="pat-input h-8 w-[68px] px-2 text-right text-xs tabular-nums"
          />
          <span className="text-[0.6rem] text-[var(--pat-muted)]">{suffix}</span>
        </span>
      </div>
    </Field>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-0.5 py-1">
      <span className="min-w-0">
        <span className="block text-[0.74rem] font-semibold">{label}</span>
        {hint ? <span className="block text-[0.68rem] leading-snug text-[var(--pat-muted)]">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--pat-red)]"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value?: string;
  fallback?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || fallback || "#8a1c15"}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-11 cursor-pointer rounded-md border border-[var(--pat-line)] bg-white p-0.5"
        />
        <span className="flex-1 font-mono text-[0.72rem] uppercase text-[var(--pat-muted)]">
          {value || "Tự động"}
        </span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[0.6rem] font-semibold text-[var(--pat-red)]"
          >
            Tự động
          </button>
        ) : null}
      </div>
    </Field>
  );
}

function ImagePicker({
  label,
  src,
  options,
  onPick,
  onUpload,
}: {
  label: string;
  src: string;
  options: { src: string; label: string }[];
  onPick: (src: string) => void;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option) => (
          <button
            key={option.src}
            type="button"
            title={option.label}
            onClick={() => onPick(option.src)}
            className={`h-10 w-14 overflow-hidden rounded-md border bg-[#fffaf0] p-0.5 ${
              src === option.src ? "border-[var(--pat-red)]" : "border-[var(--pat-line)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.src} alt={option.label} className="h-full w-full object-contain" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-10 items-center gap-1 rounded-md border border-dashed border-[var(--pat-line)] px-2 text-[0.68rem] font-semibold text-[var(--pat-muted)] transition hover:text-[var(--pat-red)]"
        >
          <ImagePlus size={12} /> Tải lên
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = "";
          }}
        />
      </div>
    </Field>
  );
}

function readImageFile(file: File, onLoad: (src: string) => void) {
  if (!file.type.startsWith("image/")) return;
  if (file.size > 1_600_000) return;
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.readAsDataURL(file);
}

function BannerSection({
  banner,
  couplets,
  onChange,
  onCouplets,
}: {
  banner: BannerSettings;
  couplets: CoupletSettings;
  onChange: (patch: Partial<BannerSettings>) => void;
  onCouplets: (patch: Partial<CoupletSettings>) => void;
}) {
  return (
    <Section
      title="Hoành phi"
      icon={<Frame size={13} />}
      hint="Ảnh cuốn thư đặt giữa đầu phả đồ, có thể thay bằng ảnh khác và thêm chữ."
    >
      <ToggleRow
        label="Hiện hoành phi"
        checked={banner.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <ImagePicker
        label="Ảnh hoành phi"
        src={banner.src}
        options={[
          { src: "/sites/PAT/decor/user/hoanh-phi.png", label: "Hoành phi rồng" },
        ]}
        onPick={(src) => onChange({ src })}
        onUpload={(file) => readImageFile(file, (src) => onChange({ src }))}
      />
      <Field label="Chữ trên hoành phi" hint="Xuống dòng để thêm dòng thứ hai.">
        <textarea
          rows={2}
          value={banner.text}
          onChange={(event) => onChange({ text: event.target.value })}
          className="pat-input min-h-[52px] resize-y px-2 py-1.5 text-xs"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <SliderField
          label="Cỡ chữ"
          value={banner.textSize}
          min={12}
          max={90}
          onChange={(textSize) => onChange({ textSize })}
        />
        <SliderField
          label="Dịch chữ dọc"
          value={banner.textOffsetY}
          min={-120}
          max={120}
          onChange={(textOffsetY) => onChange({ textOffsetY })}
        />
      </div>
      <ColorField
        label="Màu chữ"
        value={banner.textColor}
        fallback="#f7e3b5"
        onChange={(textColor) => onChange({ textColor: textColor || "#f7e3b5" })}
      />
      <SliderField
        label="Rộng hoành phi"
        value={banner.width}
        min={400}
        max={1600}
        step={10}
        onChange={(width) => onChange({ width })}
      />
      <SliderField
        label="Vị trí dọc"
        value={Math.round(banner.offsetRatio * 1000) / 10}
        min={0}
        max={13}
        step={0.5}
        suffix="%"
        hint="Mép trên hoành phi tính từ mép trên giấy. Mặc định 6%; dịch lên tới sát khung trên, dịch xuống tối đa 13% chiều cao giấy. Kéo trực tiếp hoành phi trên phả đồ để chỉnh lên/xuống."
        onChange={(value) => onChange({ offsetRatio: value / 100 })}
      />
      <ToggleRow
        label="Rồng chầu hai bên"
        checked={banner.showDragons}
        onChange={(showDragons) => onChange({ showDragons })}
      />
      {banner.showDragons ? (
        <SliderField
          label="Cỡ rồng"
          value={banner.dragonScale}
          min={0.6}
          max={1.8}
          step={0.05}
          suffix="×"
          hint="Kéo trực tiếp một bên rồng trên phả đồ để di chuyển; bên còn lại đối xứng qua trục giữa, trong khoảng từ cạnh hoành phi đến cạnh giấy."
          onChange={(dragonScale) => onChange({ dragonScale })}
        />
      ) : null}
      <ToggleRow
        label="Câu đối dọc hai bên rồng"
        checked={couplets.enabled}
        onChange={(enabled) => onCouplets({ enabled })}
      />
      {couplets.enabled ? (
        <>
          <Field label="Vế trái" hint="Mỗi âm tiết xếp thành một dòng dọc.">
            <textarea
              rows={2}
              value={couplets.leftText}
              onChange={(event) => onCouplets({ leftText: event.target.value })}
              className="pat-input min-h-[52px] resize-y px-2 py-1.5 text-xs"
            />
          </Field>
          <Field label="Vế phải">
            <textarea
              rows={2}
              value={couplets.rightText}
              onChange={(event) => onCouplets({ rightText: event.target.value })}
              className="pat-input min-h-[52px] resize-y px-2 py-1.5 text-xs"
            />
          </Field>
          <Field label="Kiểu chữ câu đối">
            <select
              value={couplets.font ?? "hai-yen-1"}
              onChange={(event) =>
                onCouplets({
                  font: event.target.value === "thu-phap-viet" ? "thu-phap-viet" : "hai-yen-1",
                })
              }
              className="pat-input h-9 text-sm"
            >
              {(Object.keys(COUPLET_FONT_LABELS) as Array<keyof typeof COUPLET_FONT_LABELS>).map((key) => (
                <option key={key} value={key}>
                  {COUPLET_FONT_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label="Cỡ chữ câu đối"
              value={couplets.fontSize}
              min={12}
              max={90}
              suffix="px"
              onChange={(fontSize) => onCouplets({ fontSize })}
            />
            <ColorField
              label="Màu chữ"
              value={couplets.color}
              fallback="#8a1c15"
              onChange={(color) => onCouplets({ color: color || "#8a1c15" })}
            />
          </div>
          <p className="text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            Font thư pháp Hải Yến do bạn cung cấp (bản 4 của bộ font bị lỗi khoảng cách chữ nên không
            dùng được). Kéo trực tiếp một bên câu đối trên phả đồ để dịch trong khoảng từ cạnh rồng tới
            mép trong khung; vế còn lại tự đối xứng qua trục giữa.
          </p>
        </>
      ) : null}
    </Section>
  );
}

export function BannerInspector({
  banner,
  couplets,
  onChange,
  onCouplets,
  onClose,
}: {
  banner: BannerSettings;
  couplets: CoupletSettings;
  onChange: (patch: Partial<BannerSettings>) => void;
  onCouplets: (patch: Partial<CoupletSettings>) => void;
  onClose?: () => void;
}) {
  return (
    <div className="divide-y divide-[var(--pat-line)]/70">
      <InspectorHeader
        eyebrow="Phạm vi"
        title="Hoành phi & câu đối"
        subtitle="Bấm vào hoành phi, rồng hoặc câu đối trên phả đồ để mở lại bảng này"
        onClose={onClose}
      />
      <BannerSection banner={banner} couplets={couplets} onChange={onChange} onCouplets={onCouplets} />
    </div>
  );
}

const BACKGROUND_OPTIONS: { value: BackgroundPattern; label: string }[] = [
  { value: "none", label: "Trơn" },
  { value: "clouds", label: "Mây" },
  { value: "dragon", label: "Rồng" },
  { value: "lotus", label: "Sen" },
  { value: "scroll", label: "Thủy ba" },
  { value: "ornament", label: "Hoa văn" },
];

function BackgroundSection({
  pattern,
  art,
  onChange,
}: {
  pattern: BackgroundPattern;
  art: BackgroundImageSettings;
  onChange: (patch: Partial<DesignSettings>, imagePatch?: Partial<BackgroundImageSettings>) => void;
}) {
  return (
    <Section
      title="Hoa văn nền"
      icon={<Palette size={13} />}
      hint="Hoa văn phủ mờ phía sau phả đồ, giữ chữ và đường nối rõ ràng."
    >
      <div className="flex flex-wrap gap-1.5">
        {BACKGROUND_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="pat-chip text-[0.72rem]"
            data-active={pattern === option.value}
            onClick={() => onChange({ background: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>
      {pattern === "ornament" ? (
        <>
          <ImagePicker
            label="Mẫu hoa văn"
            src={art.src}
            options={[
              { src: "/sites/PAT/decor/user/hoa-van-01.png", label: "Hoa văn 01" },
              { src: "/sites/PAT/decor/user/hoa-van-02.png", label: "Hoa văn 02" },
            ]}
            onPick={(src) => onChange({}, { src })}
            onUpload={(file) => readImageFile(file, (src) => onChange({}, { src }))}
          />
          <ColorField label="Màu hoa văn" value={art.color} onChange={(color) => onChange({}, { color })} />
          <SliderField
            label="Độ đậm"
            value={art.opacity}
            min={0.03}
            max={0.6}
            step={0.01}
            suffix="×"
            onChange={(opacity) => onChange({}, { opacity })}
          />
          <SliderField
            label="Cỡ hoa văn"
            value={art.scale}
            min={0.2}
            max={1.2}
            step={0.02}
            suffix="%"
            onChange={(scale) => onChange({}, { scale })}
          />
        </>
      ) : null}
    </Section>
  );
}

function mm(value: number) {
  return Math.round(value);
}

export function WholeDiagramInspector({
  tree,
  tuning,
  paper,
  shiftRange,
  onTuning,
  onDesign,
  onReset,
}: {
  tree: FamilyTree;
  tuning: DiagramTuning;
  paper: { widthMm: number; heightMm: number };
  /** Giới hạn dịch dọc toàn bộ suy ra từ khổ giấy hiện tại. */
  shiftRange?: { min: number; max: number };
  onTuning: (patch: Partial<DiagramTuning>) => void;
  onDesign: (patch: Partial<DesignSettings>) => void;
  onReset: () => void;
}) {
  const custom = normalizeCustomPaper(tree.design.customPaper);
  const preset = custom ? null : tree.design.paper;
  const ratio = custom?.ratio;
  const banner = normalizeBanner(tree.design.banner);
  const couplets = normalizeCouplets(tree.design.couplets);
  const bgArt = normalizeBackgroundImage(tree.design.backgroundImage);
  const updateBanner = (patch: Partial<BannerSettings>) => onDesign({ banner: { ...banner, ...patch } });
  const updateCouplets = (patch: Partial<CoupletSettings>) =>
    onDesign({ couplets: { ...couplets, ...patch } });
  const updateBackground = (
    patch: Partial<DesignSettings>,
    imagePatch?: Partial<BackgroundImageSettings>,
  ) =>
    onDesign(
      imagePatch ? { ...patch, backgroundImage: { ...bgArt, ...imagePatch } } : patch,
    );

  const applyRatio = (next: "1:1" | "3:2" | "custom") => {
    if (next === "custom") {
      onDesign({
        customPaper: {
          widthMm: mm(paper.widthMm),
          heightMm: mm(paper.heightMm),
          ratio: "custom",
        },
      });
      return;
    }
    const base = Math.max(paper.widthMm, paper.heightMm);
    onDesign({
      customPaper: {
        widthMm: Math.round(base),
        heightMm: next === "1:1" ? Math.round(base) : Math.round((base * 2) / 3),
        ratio: next,
      },
    });
  };

  const setSize = (axis: "width" | "height", raw: number) => {
    if (!Number.isFinite(raw)) return;
    const value = Math.min(5000, Math.max(200, Math.round(raw)));
    let widthMm = axis === "width" ? value : mm(paper.widthMm);
    let heightMm = axis === "height" ? value : mm(paper.heightMm);
    if (ratio === "1:1") {
      widthMm = value;
      heightMm = value;
    } else if (ratio === "3:2") {
      if (axis === "width") heightMm = Math.round((value * 2) / 3);
      else widthMm = Math.round((value * 3) / 2);
    }
    onDesign({
      customPaper: {
        widthMm: Math.min(5000, Math.max(200, widthMm)),
        heightMm: Math.min(5000, Math.max(200, heightMm)),
        ratio: ratio ?? "custom",
      },
    });
  };

  return (
    <div className="divide-y divide-[var(--pat-line)]/70">
      <InspectorHeader
        eyebrow="Phạm vi"
        title="Cả phả đồ"
        subtitle={`${(paper.widthMm / 10).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} × ${(
          paper.heightMm / 10
        ).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} cm · ${tree.members.length} thành viên`}
      />

      <SectionGroup title="Giấy & bố cục" icon={<Ruler size={13} />} defaultOpen>
      <Section
        title="Khổ giấy"
        icon={<Ruler size={13} />}
        hint="Nhập đúng chiều muốn in. Nhà in thường nhận tối đa 1500 mm mỗi chiều."
      >
        <div className="grid grid-cols-5 gap-1">
          {Object.keys(PAPER_MM).map((size) => (
            <button
              key={size}
              type="button"
              className="pat-chip justify-center px-1 text-[0.72rem]"
              data-active={preset === size}
              onClick={() => onDesign({ paper: size as DesignSettings["paper"], customPaper: null })}
            >
              {size}
            </button>
          ))}
        </div>
        <Segmented<"1:1" | "3:2" | "custom">
          value={ratio ?? "custom"}
          onChange={applyRatio}
          options={[
            { value: "1:1", label: "1:1" },
            { value: "3:2", label: "3:2" },
            { value: "custom", label: "Tự nhập" },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Chiều ngang (mm)">
            <input
              type="number"
              min={200}
              max={5000}
              value={mm(paper.widthMm)}
              onChange={(event) => setSize("width", Number(event.target.value))}
              className="pat-input h-9 text-sm tabular-nums"
            />
          </Field>
          <Field label="Chiều dọc (mm)">
            <input
              type="number"
              min={200}
              max={5000}
              value={mm(paper.heightMm)}
              onChange={(event) => setSize("height", Number(event.target.value))}
              className="pat-input h-9 text-sm tabular-nums"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Khoảng cách & lề"
        icon={<AlignHorizontalSpaceAround size={13} />}
        hint="Các số này dùng để cân bố cục và khớp bản in."
      >
        <SliderField
          label="Khoảng cách giữa các đời"
          value={tuning.generationGap}
          min={20}
          max={240}
          onChange={(generationGap) => onTuning({ generationGap })}
          hint="Từ mép dưới ô đời trên tới mép trên ô đời dưới."
        />
        <SliderField
          label="Giãn ngang giữa anh em"
          value={tuning.siblingGap}
          min={8}
          max={120}
          onChange={(siblingGap) => onTuning({ siblingGap })}
          hint="Nếu nội dung rộng quá khổ giấy, bản vẽ tự thu nhỏ để thẻ không tràn ra ngoài."
        />
        <Field label="Chiều thứ tự anh em" hint="Chỉ đổi cách bày trên phả đồ, không đổi thứ tự sinh đã lưu.">
          <Segmented<DiagramTuning["siblingOrder"]>
            value={tuning.siblingOrder}
            onChange={(siblingOrder) => onTuning({ siblingOrder })}
            options={[
              { value: "asc", label: "1 → n (lớn trước)" },
              { value: "desc", label: "n → 1 (nhỏ trước)" },
            ]}
          />
        </Field>
        <SliderField
          label="Giãn giữa các chi"
          value={tuning.branchGap}
          min={12}
          max={200}
          onChange={(branchGap) => onTuning({ branchGap })}
        />
        <SliderField
          label="Dịch dọc toàn bộ"
          value={Math.round(tuning.contentShiftY ?? 0)}
          min={shiftRange?.min ?? -600}
          max={shiftRange?.max ?? 600}
          step={10}
          onChange={(contentShiftY) => onTuning({ contentShiftY })}
          hint="Dịch cả khối phả đồ lên/xuống để dàn trang; hoành phi, rồng, câu đối và khung giữ nguyên. Có thể kéo dọc thẻ đầu tiên trên phả đồ."
        />
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["marginTop", "Lề trên"],
              ["marginBottom", "Lề dưới"],
              ["marginLeft", "Lề trái"],
              ["marginRight", "Lề phải"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={20}
                max={240}
                value={tuning[key]}
                onChange={(event) => onTuning({ [key]: Number(event.target.value) } as Partial<DiagramTuning>)}
                className="pat-input h-8 px-2 text-xs tabular-nums"
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Đường nối" icon={<AlignVerticalSpaceAround size={13} />}>
        <SliderField
          label="Độ dày nét"
          value={tuning.connectorWidth}
          min={1}
          max={20}
          step={0.5}
          onChange={(connectorWidth) => onTuning({ connectorWidth })}
        />
        <ColorField
          label="Màu nét"
          value={tuning.connectorColor}
          fallback="#8a1c15"
          onChange={(connectorColor) => onTuning({ connectorColor })}
        />
        <ToggleRow
          label="Nét đứt"
          hint="Áp cho cả nét vợ chồng và nét con cái."
          checked={tuning.connectorDash}
          onChange={(connectorDash) => onTuning({ connectorDash })}
        />
        <ToggleRow
          label="Đường nối mẹ đến con"
          hint="Nét đứt mảnh từ mẹ tới từng con, chạy song song nét chính từ cha."
          checked={tuning.motherLine}
          onChange={(motherLine) => onTuning({ motherLine })}
        />
        <ToggleRow
          label="Tô màu nét theo mức"
          hint="Mỗi đời một màu để dễ nhìn các nhánh chồng nhau. Màu đặt riêng cho một người được ưu tiên."
          checked={tuning.tintByLevel}
          onChange={(tintByLevel) => onTuning({ tintByLevel })}
        />
        <ToggleRow
          label="Ghi chú nét đứt"
          hint="Hiện nhãn “cách n đời” hoặc quan hệ trên đường nối tiền tổ."
          checked={tuning.showLinkGap}
          onChange={(showLinkGap) => onTuning({ showLinkGap })}
        />
      </Section>

      <Section title="Dải đời" icon={<Frame size={13} />}>
        <ToggleRow
          label="Hiện dải đời"
          checked={tree.design.showGenerationLabels}
          onChange={(showGenerationLabels) => onDesign({ showGenerationLabels })}
        />
        <Field label="Kiểu nhãn">
          <Segmented<GenerationBandLabel>
            value={tuning.generationBandLabel}
            onChange={(generationBandLabel) => onTuning({ generationBandLabel })}
            options={(Object.keys(BAND_LABELS) as GenerationBandLabel[]).map((key) => ({
              value: key,
              label: BAND_LABELS[key],
            }))}
          />
        </Field>
        <ColorField
          label="Màu nhãn đời"
          value={tuning.generationBandColor}
          fallback="#6a100c"
          onChange={(generationBandColor) => onTuning({ generationBandColor })}
        />
        <SliderField
          label="Cỡ nhãn đời"
          value={tuning.generationLabelScale ?? 1}
          min={0.4}
          max={2}
          step={0.05}
          suffix="×"
          hint="Nhãn tự nhân theo cỡ thẻ của từng đời. Khổ A0: nhãn cách mép trong khung 2,5 cm và cách mép thẻ 2,5 cm."
          onChange={(generationLabelScale) => onTuning({ generationLabelScale })}
        />
        <p className="text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
          Nhãn hai bên được canh giữa thẻ thành viên. Mặc định dùng tông đậm của bảng màu phả
          đồ; chọn màu nếu muốn nhãn nổi hơn trên nền giấy.
        </p>
      </Section>
      </SectionGroup>

      <SectionGroup title="Hoành phi & câu đối" icon={<Frame size={13} />}>
        <BannerSection
          banner={banner}
          couplets={couplets}
          onChange={updateBanner}
          onCouplets={updateCouplets}
        />
      </SectionGroup>

      <SectionGroup title="Kiểu thẻ & chữ" icon={<TypeIcon size={13} />}>
      <Section
        title="Trình bày thẻ"
        icon={<TypeIcon size={13} />}
        hint="Mặc định cho mọi đời; có thể ghi đè riêng ở phạm vi Thế hệ."
      >
        <Field label="Font chữ">
          <select
            value={tuning.fontFamily}
            onChange={(event) => onTuning({ fontFamily: event.target.value })}
            className="pat-input h-9 text-sm"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cỡ chữ (px)">
            <input
              type="number"
              min={7}
              max={24}
              value={tuning.fontSize}
              onChange={(event) => onTuning({ fontSize: Number(event.target.value) })}
              className="pat-input h-8 px-2 text-xs tabular-nums"
            />
          </Field>
          <Field label="Số dòng tên">
            <input
              type="number"
              min={1}
              max={5}
              value={tuning.lineCount}
              onChange={(event) => onTuning({ lineCount: Number(event.target.value) })}
              className="pat-input h-8 px-2 text-xs tabular-nums"
            />
          </Field>
        </div>
      </Section>
      </SectionGroup>

      <SectionGroup title="Nền & khung" icon={<Palette size={13} />}>
        <BackgroundSection pattern={tree.design.background} art={bgArt} onChange={updateBackground} />

        <Section title="Khung phả đồ" icon={<Frame size={13} />}>
        <SliderField
          label="Cỡ viền"
          value={tuning.frameScale}
          min={0.5}
          max={2}
          step={0.05}
          suffix="×"
          onChange={(frameScale) => onTuning({ frameScale })}
          hint="Khung tự canh khít khổ giấy; độ dày nét co giãn theo khổ in. Viền dày hơn sẽ tự thu lề để nội dung không đè lên hoa văn."
        />
        <p className="text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
          Phả đồ dùng khung hoa văn cố định; chỉ chỉnh được độ dày viền. Nội dung và dữ liệu
          thành viên giữ nguyên.
        </p>
        </Section>
      </SectionGroup>

      <div className="px-3.5 py-3">
        <button
          type="button"
          onClick={onReset}
          className="pat-btn pat-btn-outline h-9 w-full text-xs"
        >
          <RotateCcw size={13} /> Về bố cục mặc định
        </button>
      </div>
    </div>
  );
}

export function GenerationInspector({
  generation,
  count,
  resolved,
  extraFields,
  sample,
  members,
  onStyle,
  onReset,
  onEditMember,
  onClose,
}: {
  generation: number;
  count: number;
  resolved: {
    orientation: CardOrientation;
    showAvatar: boolean;
    showTitle: boolean;
    showName: boolean;
    showDates: boolean;
    showDeathAnniversary: boolean;
    fontFamily: string;
    fontSize: number;
    lineCount: number;
    cardColor?: string;
    cardScale: number;
  };
  extraFields: ExtraFieldKey[];
  sample?: Person;
  members: Person[];
  onStyle: (patch: Partial<GenerationStyle>) => void;
  onReset: () => void;
  onEditMember: (member: Person) => void;
  onClose?: () => void;
}) {
  const toggleExtra = (key: ExtraFieldKey) => {
    const next = extraFields.includes(key)
      ? extraFields.filter((item) => item !== key)
      : [...extraFields, key];
    onStyle({ extraFields: next });
  };

  return (
    <div>
      <InspectorHeader
        eyebrow="Phạm vi"
        title={generationTag(generation)}
        subtitle={`${count} thành viên · thay đổi áp dụng cho cả ${generation < 0 ? "bậc" : "đời"}`}
        onClose={onClose}
      />

      <Section
        title="Thẻ trong đời này"
        icon={<PencilLine size={13} />}
        hint="Bấm Sửa để chỉnh hồ sơ của từng thành viên."
      >
        <div className="max-h-60 space-y-1.5 overflow-auto pr-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--pat-line)]/70 bg-white/60 px-2 py-1.5"
            >
              <Avatar person={member} size={24} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{member.name}</p>
                <p className="truncate text-[0.66rem] text-[var(--pat-muted)]">
                  {member.title || generationTag(generation)} · {lifeSpan(member)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditMember(member)}
                className="pat-btn pat-btn-outline h-7 px-2 text-[0.66rem]"
              >
                <PencilLine size={11} /> Sửa
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kiểu thẻ" icon={<Settings2 size={13} />}>
        {sample ? (
          <div className="rounded-xl border border-[var(--pat-line)] p-3" style={{ background: resolved.cardColor || "#fff9e4" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {resolved.showTitle ? (
                  <p className="truncate uppercase tracking-wide opacity-60" style={{ fontFamily: resolved.fontFamily, fontSize: Math.max(7, resolved.fontSize * 0.72) }}>
                    {generationTag(generation)}
                  </p>
                ) : null}
                {resolved.showName ? (
                  <p className="truncate font-semibold" style={{ fontFamily: resolved.fontFamily, fontSize: Math.max(9, resolved.fontSize) }}>
                    {sample.name}
                  </p>
                ) : null}
                {resolved.showDates ? (
                  <p className="truncate opacity-70" style={{ fontFamily: resolved.fontFamily, fontSize: Math.max(7, resolved.fontSize * 0.78) }}>
                    {lifeSpan(sample)}
                  </p>
                ) : null}
              </div>
              {resolved.showAvatar ? <Avatar person={sample} size={28} /> : null}
            </div>
            <p className="mt-2 text-[0.62rem] text-[var(--pat-muted)]">Thẻ mẫu cập nhật ngay khi chỉnh bên dưới.</p>
          </div>
        ) : null}
        <Segmented<CardOrientation>
          value={resolved.orientation}
          onChange={(orientation) => onStyle({ orientation })}
          options={[
            { value: "horizontal", label: "Ô nằm ngang" },
            { value: "vertical", label: "Ô nằm dọc" },
          ]}
        />
        <SliderField
          label="Cỡ thẻ"
          value={resolved.cardScale}
          min={0.6}
          max={1.8}
          step={0.05}
          suffix="×"
          hint="Áp dụng cho mọi thẻ cùng đời. Cũng có thể bấm vào một thẻ rồi kéo tay nắm ở góc dưới phải."
          onChange={(cardScale) => onStyle({ cardScale })}
        />
        <ToggleRow
          label="Ảnh chân dung"
          checked={resolved.showAvatar}
          onChange={(showAvatar) => onStyle({ showAvatar })}
        />
        <ToggleRow
          label="Danh xưng"
          hint="Thủy tổ, Hương trưởng hoặc số đời"
          checked={resolved.showTitle}
          onChange={(showTitle) => onStyle({ showTitle })}
        />
        <ToggleRow
          label="Họ và tên"
          checked={resolved.showName}
          onChange={(showName) => onStyle({ showName })}
        />
        <ToggleRow
          label="Năm sinh – năm mất"
          checked={resolved.showDates}
          onChange={(showDates) => onStyle({ showDates })}
        />
        <ToggleRow
          label="Ngày giỗ"
          checked={resolved.showDeathAnniversary}
          onChange={(showDeathAnniversary) => onStyle({ showDeathAnniversary })}
        />
      </Section>

      <Section
        title="Thông tin thêm trên ô"
        icon={<Plus size={13} />}
        hint="Chỉ hiện khi thành viên có dữ liệu tương ứng và còn chỗ trên thẻ."
      >
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(EXTRA_FIELD_LABELS) as ExtraFieldKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="pat-chip text-[0.72rem]"
              data-active={extraFields.includes(key)}
              onClick={() => toggleExtra(key)}
            >
              {extraFields.includes(key) ? <X size={10} /> : <Plus size={10} />}
              {EXTRA_FIELD_LABELS[key]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Chữ trong ô" icon={<TypeIcon size={13} />}>
        <Field label="Font chữ">
          <select
            value={resolved.fontFamily}
            onChange={(event) => onStyle({ fontFamily: event.target.value })}
            className="pat-input h-9 text-sm"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cỡ chữ (px)">
            <input
              type="number"
              min={7}
              max={24}
              value={resolved.fontSize}
              onChange={(event) => onStyle({ fontSize: Number(event.target.value) })}
              className="pat-input h-8 px-2 text-xs tabular-nums"
            />
          </Field>
          <Field label="Số dòng tên">
            <input
              type="number"
              min={1}
              max={5}
              value={resolved.lineCount}
              onChange={(event) => onStyle({ lineCount: Number(event.target.value) })}
              className="pat-input h-8 px-2 text-xs tabular-nums"
            />
          </Field>
        </div>
        <ColorField
          label="Màu nền thẻ"
          value={resolved.cardColor}
          fallback="#fff9e4"
          onChange={(cardColor) => onStyle({ cardColor })}
        />
      </Section>

      <div className="px-3.5 py-3">
        <button type="button" onClick={onReset} className="pat-btn pat-btn-outline h-9 w-full text-xs">
          <RotateCcw size={13} /> Bỏ ghi đè của đời này
        </button>
      </div>
    </div>
  );
}

export function PersonInspector({
  member,
  generation,
  offsetX,
  style,
  onResetPosition,
  onStyle,
  onResetStyle,
  onEdit,
  onFocus,
  onClose,
}: {
  member: Person;
  generation: number;
  offsetX: number;
  style: PersonStyle;
  onResetPosition: () => void;
  onStyle: (patch: Partial<PersonStyle>) => void;
  onResetStyle?: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onClose?: () => void;
}) {
  return (
    <div>
      <InspectorHeader
        eyebrow="Phạm vi"
        title={member.name}
        subtitle={`${generationTag(generation)} · ${member.gender === "male" ? "Nam" : "Nữ"}`}
        onClose={onClose}
      />

      <div className="flex items-center gap-3 border-b border-[var(--pat-line)]/70 px-3.5 py-3">
        <Avatar person={member} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{member.name}</p>
          <p className="truncate text-[0.72rem] text-[var(--pat-muted)]">
            {member.birthDate || "?"} — {member.alive ? "nay" : member.deathDate || "?"}
          </p>
        </div>
        <Badge tone="gold">{generationTag(generation)}</Badge>
      </div>

      <Section title="Hồ sơ" icon={<PencilLine size={13} />}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onEdit} className="pat-btn pat-btn-outline h-9 text-xs">
            <PencilLine size={13} /> Sửa hồ sơ
          </button>
          <button type="button" onClick={onFocus} className="pat-btn pat-btn-outline h-9 text-xs">
            <MoveHorizontal size={13} /> Đưa vào giữa
          </button>
        </div>
        <p className="text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
          Tên, năm sinh/mất và ảnh sửa ở hồ sơ; màu và vị trí bên dưới chỉ đổi cách trình bày.
        </p>
      </Section>

      {offsetX !== 0 ? (
        <Section title="Vị trí trên phả đồ" icon={<MoveHorizontal size={13} />}>
          <p className="text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
            Thẻ đang lệch {Math.round(offsetX)} đơn vị so với vị trí tự xếp — kéo thẻ trên phả đồ để chỉnh lại.
          </p>
          <button type="button" onClick={onResetPosition} className="pat-btn pat-btn-outline h-9 w-full text-[0.68rem]">
            <RotateCcw size={12} /> Về vị trí gốc
          </button>
        </Section>
      ) : null}

      <Section title="Màu & hiển thị" icon={<Palette size={13} />}>
        <ToggleRow
          label="Ẩn năm sinh – năm mất"
          checked={style.hideDates === true}
          onChange={(hideDates) => onStyle({ hideDates })}
        />
        <ColorField
          label="Màu thẻ"
          value={style.color}
          fallback="#8a1c15"
          onChange={(color) => onStyle({ color })}
        />
        <ColorField
          label="Màu nét nối vào người này"
          value={style.lineColor}
          fallback="#c9a227"
          onChange={(lineColor) => onStyle({ lineColor })}
        />
        {onResetStyle ? (
          <button type="button" onClick={onResetStyle} className="pat-btn pat-btn-outline h-9 w-full text-[0.68rem]">
            <RotateCcw size={12} /> Khôi phục kiểu mặc định
          </button>
        ) : null}
      </Section>
    </div>
  );
}

export function DecorationInspector({
  decoration,
  onUpdate,
  onDelete,
  onScale,
  onDuplicate,
  onToggleLock,
  onLayer,
  canMoveUp,
  canMoveDown,
  onClose,
}: {
  decoration: Decoration;
  onUpdate: (decoration: Decoration) => void;
  onDelete: () => void;
  onScale: (factor: number) => void;
  onDuplicate?: () => void;
  onToggleLock?: () => void;
  onLayer?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onClose?: () => void;
}) {
  const isText = decoration.type === "text";
  const width = Math.round(decoration.width ?? 120);
  const height = Math.round(decoration.height ?? 90);

  return (
    <div>
      <InspectorHeader
        eyebrow="Phạm vi"
        title="Trang trí"
        subtitle={isText ? "Chữ trang trí trên phả đồ" : "Ảnh trang trí trên phả đồ"}
        onClose={onClose}
      />

      <Section title={isText ? "Nội dung" : "Kích thước"} icon={isText ? <TypeIcon size={13} /> : <ImagePlus size={13} />}>
        {isText ? (
          <>
            <Field label="Chữ">
              <input
                className="pat-input text-sm"
                value={decoration.content}
                onChange={(event) => onUpdate({ ...decoration, content: event.target.value })}
              />
            </Field>
            <Field label="Cỡ chữ (px)">
              <input
                type="number"
                min={8}
                max={96}
                value={Math.round(decoration.fontSize ?? 16)}
                onChange={(event) =>
                  onUpdate({ ...decoration, fontSize: Math.max(8, Number(event.target.value)) })
                }
                className="pat-input h-9 text-sm tabular-nums"
              />
            </Field>
            <ColorField
              label="Màu chữ"
              value={decoration.color}
              fallback="#8a1c15"
              onChange={(color) => onUpdate({ ...decoration, color })}
            />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rộng (px)">
              <input
                type="number"
                min={24}
                max={640}
                value={width}
                onChange={(event) =>
                  onUpdate({
                    ...decoration,
                    width: Math.max(24, Number(event.target.value)),
                    height: Math.round(Math.max(24, Number(event.target.value)) * (height / width)),
                  })
                }
                className="pat-input h-9 text-sm tabular-nums"
              />
            </Field>
            <Field label="Cao (px)">
              <input
                type="number"
                min={12}
                max={640}
                value={height}
                onChange={(event) =>
                  onUpdate({
                    ...decoration,
                    height: Math.max(12, Number(event.target.value)),
                    width: Math.round(Math.max(12, Number(event.target.value)) * (width / height)),
                  })
                }
                className="pat-input h-9 text-sm tabular-nums"
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Điều chỉnh" icon={<Settings2 size={13} />}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onScale(0.85)} className="pat-btn pat-btn-outline h-9 text-xs">
            <Minus size={13} /> Thu nhỏ
          </button>
          <button type="button" onClick={() => onScale(1.18)} className="pat-btn pat-btn-outline h-9 text-xs">
            <Plus size={13} /> Phóng to
          </button>
        </div>
        {onDuplicate || onToggleLock ? (
          <div className="grid grid-cols-2 gap-2">
            {onDuplicate ? (
              <button type="button" onClick={onDuplicate} className="pat-btn pat-btn-outline h-9 text-xs">
                <Copy size={13} /> Nhân bản
              </button>
            ) : null}
            {onToggleLock ? (
              <button
                type="button"
                onClick={onToggleLock}
                className="pat-btn pat-btn-outline h-9 text-xs"
                aria-pressed={decoration.locked === true}
              >
                {decoration.locked ? <LockOpen size={13} /> : <Lock size={13} />}
                {decoration.locked ? "Mở khoá" : "Khoá vị trí"}
              </button>
            ) : null}
          </div>
        ) : null}
        {onLayer ? (
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] text-[var(--pat-muted)]">Thứ tự lớp</span>
            <button
              type="button"
              onClick={() => onLayer("down")}
              disabled={!canMoveDown}
              className="pat-btn pat-btn-outline h-8 flex-1 text-[0.68rem] disabled:opacity-40"
            >
              <ArrowDown size={12} /> Xuống dưới
            </button>
            <button
              type="button"
              onClick={() => onLayer("up")}
              disabled={!canMoveUp}
              className="pat-btn pat-btn-outline h-8 flex-1 text-[0.68rem] disabled:opacity-40"
            >
              <ArrowUp size={12} /> Lên trên
            </button>
          </div>
        ) : null}
        {!isText ? (
          <ToggleRow
            label="Lật ngang"
            checked={decoration.flip === true}
            onChange={(flip) => onUpdate({ ...decoration, flip })}
          />
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#e6b7ad] bg-[#f9e3df] text-xs font-semibold text-[#8a1c15] transition hover:bg-[#f4d3cc]"
        >
          <Trash2 size={13} /> Xoá trang trí
        </button>
      </Section>
    </div>
  );
}
