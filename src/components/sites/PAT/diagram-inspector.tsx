"use client";

import type { ReactNode } from "react";
import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Frame,
  ImagePlus,
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
import type {
  CardOrientation,
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
  EXTRA_FIELD_LABELS,
  normalizeCustomPaper,
  PAPER_MM,
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
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[var(--pat-muted)]">{eyebrow}</p>
        <p className="pat-serif mt-0.5 truncate text-base font-semibold text-[var(--pat-red)]">{title}</p>
        {subtitle ? <p className="mt-0.5 text-[0.66rem] text-[var(--pat-muted)]">{subtitle}</p> : null}
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
        <p className="flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--pat-red)]">
          {icon}
          {title}
        </p>
        {hint ? <p className="mt-1 text-[0.64rem] leading-relaxed text-[var(--pat-muted)]">{hint}</p> : null}
      </div>
      {children}
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
        {hint ? <span className="block text-[0.62rem] leading-snug text-[var(--pat-muted)]">{hint}</span> : null}
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
        <span className="flex-1 font-mono text-[0.65rem] uppercase text-[var(--pat-muted)]">
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

function mm(value: number) {
  return Math.round(value);
}

export function WholeDiagramInspector({
  tree,
  tuning,
  paper,
  onTuning,
  onDesign,
  onReset,
}: {
  tree: FamilyTree;
  tuning: DiagramTuning;
  paper: { widthMm: number; heightMm: number };
  onTuning: (patch: Partial<DiagramTuning>) => void;
  onDesign: (patch: Partial<DesignSettings>) => void;
  onReset: () => void;
}) {
  const custom = normalizeCustomPaper(tree.design.customPaper);
  const preset = custom ? null : tree.design.paper;
  const ratio = custom?.ratio;

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
              className="pat-chip justify-center px-1 text-[0.65rem]"
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
        />
        <SliderField
          label="Giãn giữa các chi"
          value={tuning.branchGap}
          min={12}
          max={200}
          onChange={(branchGap) => onTuning({ branchGap })}
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
          label="Tô màu nét theo mức"
          hint="Mỗi đời một màu để dễ nhìn các nhánh chồng nhau. Màu đặt riêng cho một người được ưu tiên."
          checked={tuning.tintByLevel}
          onChange={(tintByLevel) => onTuning({ tintByLevel })}
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
          label="Màu nhấn"
          value={tuning.generationBandColor}
          fallback="#c9a227"
          onChange={(generationBandColor) => onTuning({ generationBandColor })}
        />
      </Section>

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

      <Section title="Khung phả đồ" icon={<Frame size={13} />}>
        <Segmented<DiagramTuning["frameStyle"]>
          value={tuning.frameStyle}
          onChange={(frameStyle) => onTuning({ frameStyle })}
          options={[
            { value: "none", label: "Giấy sơn mài" },
            { value: "wood", label: "Khung gỗ" },
          ]}
        />
        <p className="text-[0.64rem] leading-relaxed text-[var(--pat-muted)]">
          Khung gỗ chỉ đổi cách trình bày, nội dung và dữ liệu thành viên giữ nguyên.
        </p>
      </Section>

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
  onStyle,
  onReset,
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
  };
  extraFields: ExtraFieldKey[];
  onStyle: (patch: Partial<GenerationStyle>) => void;
  onReset: () => void;
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
        title={`Đời ${generation}`}
        subtitle={`${count} thành viên · thay đổi áp dụng cho cả đời`}
        onClose={onClose}
      />

      <Section title="Kiểu thẻ" icon={<Settings2 size={13} />}>
        <Segmented<CardOrientation>
          value={resolved.orientation}
          onChange={(orientation) => onStyle({ orientation })}
          options={[
            { value: "horizontal", label: "Ô nằm ngang" },
            { value: "vertical", label: "Ô nằm dọc" },
          ]}
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
              className="pat-chip text-[0.65rem]"
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
  offsetY,
  style,
  onOffset,
  onApplyBranch,
  onResetPosition,
  onStyle,
  onEdit,
  onFocus,
  onClose,
}: {
  member: Person;
  generation: number;
  offsetX: number;
  offsetY: number;
  style: PersonStyle;
  onOffset: (axis: "x" | "y", value: number) => void;
  onApplyBranch: () => void;
  onResetPosition: () => void;
  onStyle: (patch: Partial<PersonStyle>) => void;
  onEdit: () => void;
  onFocus: () => void;
  onClose?: () => void;
}) {
  return (
    <div>
      <InspectorHeader
        eyebrow="Phạm vi"
        title={member.name}
        subtitle={`Đời ${generation} · ${member.gender === "male" ? "Nam" : "Nữ"}`}
        onClose={onClose}
      />

      <div className="flex items-center gap-3 border-b border-[var(--pat-line)]/70 px-3.5 py-3">
        <Avatar person={member} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{member.name}</p>
          <p className="truncate text-[0.65rem] text-[var(--pat-muted)]">
            {member.birthDate || "?"} — {member.alive ? "nay" : member.deathDate || "?"}
          </p>
        </div>
        <Badge tone="gold">Đời {generation}</Badge>
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
        <p className="text-[0.64rem] leading-relaxed text-[var(--pat-muted)]">
          Tên, năm sinh/mất và ảnh sửa ở hồ sơ; màu và vị trí bên dưới chỉ đổi cách trình bày.
        </p>
      </Section>

      <Section title="Vị trí trên phả đồ" icon={<MoveHorizontal size={13} />}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Dịch ngang (px)">
            <input
              type="number"
              value={Math.round(offsetX)}
              onChange={(event) => onOffset("x", Number(event.target.value))}
              className="pat-input h-9 text-sm tabular-nums"
            />
          </Field>
          <Field label="Dịch dọc (px)">
            <input
              type="number"
              value={Math.round(offsetY)}
              onChange={(event) => onOffset("y", Number(event.target.value))}
              className="pat-input h-9 text-sm tabular-nums"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onApplyBranch} className="pat-btn pat-btn-outline h-9 text-[0.68rem]">
            Áp cho cả nhánh con
          </button>
          <button type="button" onClick={onResetPosition} className="pat-btn pat-btn-outline h-9 text-[0.68rem]">
            <RotateCcw size={12} /> Về vị trí gốc
          </button>
        </div>
      </Section>

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
      </Section>
    </div>
  );
}

export function DecorationInspector({
  decoration,
  onUpdate,
  onDelete,
  onScale,
  onClose,
}: {
  decoration: Decoration;
  onUpdate: (decoration: Decoration) => void;
  onDelete: () => void;
  onScale: (factor: number) => void;
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
