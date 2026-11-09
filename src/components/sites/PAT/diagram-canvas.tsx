"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type {
  BannerSettings,
  CoupletSettings,
  Decoration,
  DesignSettings,
  FamilyTree,
  GenerationStyle,
  Person,
  TreeEdge,
  TreeLayout,
  TreeNode,
} from "./types";
import {
  bandLabelFor,
  CARD_H,
  CARD_VERTICAL_H,
  CARD_VERTICAL_W,
  CARD_W,
  cardOrientationFor,
  COUPLET_FONT_FAMILIES,
  DEFAULT_DESIGN,
  FRAME_CORNER_CLEARANCE,
  GENERATION_LABEL_CARD_SCALE,
  generationBandMetrics,
  generationTag,
  isDeceasedStatus,
  lifeStatusOf,
  normalizeBackgroundImage,
  normalizeBanner,
  normalizeCouplets,
  normalizeTuning,
  type ExtraFieldKey,
} from "./types";
import { computeLayout } from "./layout";
import { cardLifeYears, computeGenerations, deathAnniversaryText, sortPersons } from "./utils";

const PALETTES: Record<DesignSettings["palette"], { accent: string; deep: string; gold: string; soft: string }> = {
  classic: { accent: "#8a1c15", deep: "#6a100c", gold: "#c9a227", soft: "#f6e9c8" },
  gold: { accent: "#8a5a0f", deep: "#6a430a", gold: "#d4af37", soft: "#f7e9bf" },
  ink: { accent: "#2f2a26", deep: "#1d1916", gold: "#8a6a52", soft: "#efe8dc" },
  jade: { accent: "#1f5e4a", deep: "#143f32", gold: "#b08d3c", soft: "#e3efe8" },
};

export const CONTENT_TOP = 10;
const BANNER_ASPECT = 1467 / 751;
const DRAGON_SRC_LEFT = "/sites/PAT/decor/user/dragon-phai.png";
const DRAGON_SRC_RIGHT = "/sites/PAT/decor/user/dragon-trai.png";
const FRAME_CORNER_SRC = "/sites/PAT/decor/khung/goc.png";
const FRAME_HOR_SRC = "/sites/PAT/decor/khung/ngang-giua.png";
const FRAME_VER_SRC = "/sites/PAT/decor/khung/doc-giua.png";
const FRAME_LINE_SRC = "/sites/PAT/decor/khung/noi.png";
/** Kích thước gốc của 4 module (px) dùng để quy đổi theo độ dày khung. */
const FRAME_BASE = 92;
const FRAME_CORNER_RATIO = 180 / FRAME_BASE;
const FRAME_HOR_W_RATIO = 182 / FRAME_BASE;
const FRAME_HOR_H_RATIO = 94 / FRAME_BASE;
const FRAME_VER_H_RATIO = 180 / FRAME_BASE;
const FRAME_LINE_W_RATIO = 90 / FRAME_BASE;

export function bannerHeight(design?: DesignSettings | null) {
  const banner = normalizeBanner(design?.banner);
  return banner.enabled ? banner.width / BANNER_ASPECT : 0;
}

export function contentTop(design?: DesignSettings | null) {
  const height = bannerHeight(design);
  return CONTENT_TOP + (height > 0 ? height + 18 : 0);
}

export function frameInset(design?: DesignSettings | null) {
  const tuning = normalizeTuning(design?.tuning);
  return Math.round(FRAME_CORNER_CLEARANCE * tuning.frameScale);
}

export interface DiagramDimensions {
  width: number;
  height: number;
  contentW: number;
  contentH: number;
  offsetX: number;
  offsetY: number;
  /** Hệ số thu nhỏ nội dung để vừa bề rộng in được; 1 = giữ nguyên. */
  fitScale: number;
}

/** Vị trí mép trên hoành phi theo tỉ lệ chiều cao giấy; tối đa 13%. */
export function bannerTopRatio(design?: DesignSettings | null) {
  const banner = normalizeBanner(design?.banner);
  if (!banner.enabled) return 0;
  return Math.max(0, Math.min(0.13, banner.offsetRatio));
}

/** Độ dày khung hoa văn, co theo chiều rộng khổ in. */
export function frameThickness(width: number, design?: DesignSettings | null) {
  const tuning = normalizeTuning(design?.tuning);
  return Math.max(24, Math.round(Math.min(88, width * 0.0283) * tuning.frameScale));
}

/** Mép trên hoành phi trong hệ toạ độ giấy. */
export function bannerTopFor(width: number, height: number, design?: DesignSettings | null) {
  const banner = normalizeBanner(design?.banner);
  if (!banner.enabled) return 0;
  return Math.round(
    Math.min(height * 0.13, Math.max(frameThickness(width, design), height * bannerTopRatio(design))),
  );
}

/** Mép trên thẻ thành viên đầu tiên tính theo tỉ lệ chiều cao giấy. */
export const FIRST_CARD_TOP_RATIO = 0.26;

/** Gốc dọc của khối nội dung: đặt hàng thẻ đầu tiên ở 26% chiều cao giấy, cộng thêm độ dịch dàn trang. */
export function treeTop(dimensions: DiagramDimensions, layout: TreeLayout, shiftY = 0) {
  const minY = layout.nodes.length ? Math.min(...layout.nodes.map((node) => node.y)) : 0;
  const target = dimensions.height * FIRST_CARD_TOP_RATIO - minY;
  // Khi nội dung phải thu nhỏ, chiều cao chiếm chỗ cũng co theo hệ số thu.
  const scaledBottom = minY + (layout.height - minY) * dimensions.fitScale;
  const base = Math.max(0, Math.min(target, dimensions.height - scaledBottom - 8));
  // Dịch dọc toàn khối chỉ đi trong lòng giấy: không đẩy thẻ đầu lên quá mép trên,
  // không để đáy nội dung tràn mép dưới.
  return Math.max(0, Math.min(base + shiftY, dimensions.height - scaledBottom - 8));
}

export interface ContentOrigin {
  fitScale: number;
  x: number;
  y: number;
}

/**
 * Gốc đặt khối nội dung trên giấy. Mép thẻ và hàng đầu tiên giữ nguyên vị trí,
 * phần dư ra được thu đều để thẻ không tràn khỏi lòng giấy.
 */
export function contentOrigin(
  dimensions: DiagramDimensions,
  layout: TreeLayout,
  shiftY = 0,
): ContentOrigin {
  const fitScale = dimensions.fitScale;
  const minY = layout.nodes.length ? Math.min(...layout.nodes.map((node) => node.y)) : 0;
  return {
    fitScale,
    x: dimensions.offsetX,
    y: treeTop(dimensions, layout, shiftY) + minY * (1 - fitScale),
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export interface DragonBounds {
  dxMin: number;
  dxMax: number;
  dyMin: number;
  dyMax: number;
  /** Mép trên rồng khi chưa dịch, trong hệ toạ độ của nhóm hoành phi. */
  defaultY: number;
  gap: number;
  dragonW: number;
  dragonH: number;
}

/** Giới hạn kéo rồng: ngang từ cạnh hoành phi tới cạnh giấy, dọc trong lòng giấy. */
export function dragonBounds(
  width: number,
  height: number,
  bannerTop: number,
  banner: BannerSettings,
): DragonBounds {
  const bannerH = banner.width / BANNER_ASPECT;
  const dragonH = bannerH * 1.02 * banner.dragonScale;
  const dragonW = (dragonH * 1000) / 1232;
  const gap = banner.width * 0.015;
  const defaultY = bannerH - dragonH + bannerH * 0.06;
  const dxMin = -gap;
  const dxMax = Math.max(dxMin, width / 2 - banner.width / 2 - gap - dragonW);
  return {
    dxMin,
    dxMax,
    dyMin: -(bannerTop + defaultY),
    dyMax: height - bannerTop - defaultY - dragonH,
    defaultY,
    gap,
    dragonW,
    dragonH,
  };
}

export function dragonOffsets(bounds: DragonBounds, banner: BannerSettings) {
  return {
    dx: clampValue(banner.dragonOffsetX ?? 0, bounds.dxMin, bounds.dxMax),
    dy: clampValue(banner.dragonOffsetY ?? 0, bounds.dyMin, bounds.dyMax),
  };
}

export interface CoupletMetrics {
  width: number;
  height: number;
  charStep: number;
  lines: string[];
}

/** Câu đối xếp dọc theo từng âm tiết, mỗi dòng một âm tiết. */
export function coupletMetrics(
  couplets: Pick<CoupletSettings, "fontSize" | "leftText" | "rightText">,
): CoupletMetrics {
  const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
  const left = words(couplets.leftText);
  const right = words(couplets.rightText);
  const count = Math.max(1, left.length, right.length);
  const charStep = couplets.fontSize * 1.3;
  return {
    width: couplets.fontSize * 1.65,
    height: count * charStep,
    charStep,
    lines: left.length >= right.length ? left : right,
  };
}

export interface CoupletBounds {
  dxMin: number;
  dxMax: number;
  dyMin: number;
  dyMax: number;
  /** Mép trên câu đối khi chưa dịch, trong hệ toạ độ nhóm hoành phi. */
  defaultTop: number;
  width: number;
  height: number;
  gap: number;
}

/** Giới hạn kéo câu đối: từ mép ngoài rồng tới mép trong khung giấy, dọc trong lòng giấy. */
export function coupletBounds(
  width: number,
  height: number,
  bannerTop: number,
  frameS: number,
  banner: BannerSettings,
  dragonBox: DragonBounds,
  dragonShift: { dx: number; dy: number },
  couplets: CoupletSettings,
): CoupletBounds {
  const metrics = coupletMetrics(couplets);
  const gap = Math.max(10, banner.width * 0.02);
  const dragonOuterLeft =
    -banner.width / 2 - dragonBox.gap - dragonBox.dragonW - dragonShift.dx;
  const defaultInnerLeft = dragonOuterLeft - gap;
  const minOuterLeft = -width / 2 + frameS + 8;
  const dxMax = Math.max(0, defaultInnerLeft - metrics.width - minOuterLeft);
  const defaultTop = dragonBox.defaultY + (dragonBox.dragonH - metrics.height) / 2;
  const minTop = -bannerTop + frameS + 8;
  const maxTop = height - bannerTop - frameS - 8 - metrics.height;
  return {
    dxMin: 0,
    dxMax,
    dyMin: minTop - defaultTop,
    dyMax: Math.max(minTop - defaultTop, maxTop - defaultTop),
    defaultTop,
    width: metrics.width,
    height: metrics.height,
    gap,
  };
}

export function coupletOffsets(bounds: CoupletBounds, couplets: CoupletSettings) {
  return {
    dx: clampValue(couplets.offsetX ?? 0, bounds.dxMin, bounds.dxMax),
    dy: clampValue(couplets.offsetY ?? 0, bounds.dyMin, bounds.dyMax),
  };
}

/**
 * Mốc quy đổi mm → đơn vị phả đồ: khổ A0 ngang rộng 1189 mm ứng với 3486 đơn vị.
 * Nhờ mốc cố định này, đổi chi tiết không làm tỉ lệ giấy co giãn.
 */
export const PAPER_UNITS_PER_MM = 3486 / 1189;

export interface PaperUnits {
  width: number;
  height: number;
}

/**
 * Khung giấy cố định theo khổ đã chọn. Chỉ nới theo bố cục chuẩn (thiết kế mặc định,
 * không vị trí kéo tay) để cây nhỏ trên khổ nhỏ vẫn vừa như trước; mọi thay đổi chi
 * tiết (cỡ thẻ, cỡ nhãn, câu đối, hoành phi…) không đổi khung giấy.
 */
export function paperUnitsFor(
  tree: FamilyTree,
  paper: { widthMm: number; heightMm: number },
): PaperUnits {
  const aspect = paper.widthMm / paper.heightMm;
  const reference = computeLayout({ ...tree, positions: {}, design: DEFAULT_DESIGN });
  const referenceW = Math.max(reference.width, 720);
  const referenceH = Math.max(reference.height + contentTop(DEFAULT_DESIGN) + 16, 420);
  const width = Math.max(paper.widthMm * PAPER_UNITS_PER_MM, referenceW, referenceH * aspect);
  return { width, height: width / aspect };
}

export function diagramDimensions(
  layout: TreeLayout,
  design: DesignSettings,
  paper?: PaperUnits,
): DiagramDimensions {
  const contentW = Math.max(layout.width, 720);
  const baseH = Math.max(layout.height + contentTop(design) + 16, 420);
  const width = paper?.width ?? contentW;
  const height = paper?.height ?? baseH;
  const nodeLeft = layout.nodes.length ? Math.min(...layout.nodes.map((node) => node.x)) : 0;
  const nodeRight = layout.nodes.length
    ? Math.max(...layout.nodes.map((node) => node.x + node.width))
    : contentW;
  const marginRight = Math.max(0, layout.width - nodeRight);
  // Vùng đặt thẻ nằm giữa hai dải nhãn đời; giữ nguyên khoảng 2,5 cm tới nhãn.
  const available = Math.max(1, width - nodeLeft - marginRight);
  const span = Math.max(1, nodeRight - nodeLeft);
  const fitScale = paper ? Math.min(1, available / span) : 1;
  return {
    width,
    height,
    contentW,
    contentH: baseH,
    // Khi nội dung rộng hơn giấy, thu đều vùng thẻ về giữa hai dải nhãn.
    offsetX: nodeLeft * (1 - fitScale) + (available - span * fitScale) / 2,
    offsetY: (height - baseH) / 2,
    fitScale,
  };
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const limit = Math.max(4, maxChars);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= limit) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word.slice(0, limit);
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
  return kept;
}

function yearOf(value?: string) {
  const match = value?.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

function extraFieldText(key: ExtraFieldKey, person: Person, generation: number) {
  switch (key) {
    case "hometown":
      return person.hometown ? `Quê: ${person.hometown}` : undefined;
    case "occupation":
      return person.occupation ? `Nghề: ${person.occupation}` : undefined;
    case "address":
      return person.address ? `Ở: ${person.address}` : undefined;
    case "tabooName":
      return person.tabooName ? `Húy: ${person.tabooName}` : undefined;
    case "education":
      return person.education ? `Học: ${person.education}` : undefined;
    case "deathAnniversary": {
      const anniv = deathAnniversaryText(person);
      return anniv ? `Giỗ ${anniv}` : undefined;
    }
    case "age": {
      const birth = yearOf(person.birthDate);
      const death = yearOf(person.deathDate);
      if (birth === undefined || death === undefined || death < birth) return undefined;
      return `Thọ ${death - birth} tuổi`;
    }
    case "generation":
      return generationTag(generation);
    default:
      return undefined;
  }
}

function edgeMembers(edge: TreeEdge): string[] {
  if (edge.fromId && edge.toId) return [edge.fromId, edge.toId];
  if (edge.type === "spouse") return edge.id.replace(/^sp-/, "").split("-");
  const parts = edge.id.split("-");
  return [parts[1], parts[2]];
}

interface DiagramCanvasProps {
  tree: FamilyTree;
  layout: TreeLayout;
  design?: DesignSettings;
  decorations?: Decoration[];
  svgId: string;
  idPrefix?: string;
  visibleIds?: Set<string> | null;
  focusId?: string | null;
  selectedIds?: string[];
  guides?: { x?: number; y?: number }[];
  selectedDecorationId?: string | null;
  showGrid?: boolean;
  interactive?: boolean;
  /** Khung giấy cố định (đơn vị canvas) theo khổ đã chọn. */
  paper?: PaperUnits;
  /** Chữ hoành phi riêng cho bản xem chi (thay cho text đã lưu trong thiết kế). */
  bannerTextOverride?: string | null;
  /** Ép hiện/ẩn năm sinh–mất trên thẻ, dùng cho lựa chọn Gọn/Đầy đủ. */
  showDatesOverride?: boolean | null;
  /** Vị trí rồng đang kéo (toạ độ tương đối so với vị trí mặc định). */
  dragonDrag?: { x: number; y: number } | null;
  /** Vị trí câu đối đang kéo (độ dịch ra ngoài và dịch dọc). */
  coupletDrag?: { x: number; y: number } | null;
  /** Mép trên hoành phi đang kéo (toạ độ giấy), thay cho vị trí đã lưu. */
  bannerDrag?: { top: number } | null;
  onNodePointerDown?: (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => void;
  onNodeResizeStart?: (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => void;
  onDragonPointerDown?: (event: ReactPointerEvent<SVGGElement>, side: "left" | "right") => void;
  onCoupletPointerDown?: (event: ReactPointerEvent<SVGGElement>, side: "left" | "right") => void;
  onBannerPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
  onDecorationPointerDown?: (event: ReactPointerEvent<SVGGElement>, decoration: Decoration) => void;
  onDecorationResizeStart?: (event: ReactPointerEvent<SVGGElement>, decoration: Decoration) => void;
  onDeleteDecoration?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function DiagramCanvas({
  tree,
  layout,
  design,
  decorations = [],
  svgId,
  idPrefix = "d",
  visibleIds,
  focusId,
  selectedIds,
  guides,
  selectedDecorationId,
  showGrid = false,
  interactive = false,
  paper,
  bannerTextOverride,
  showDatesOverride,
  dragonDrag,
  coupletDrag,
  bannerDrag,
  onNodePointerDown,
  onNodeResizeStart,
  onDragonPointerDown,
  onCoupletPointerDown,
  onBannerPointerDown,
  onDecorationPointerDown,
  onDecorationResizeStart,
  onDeleteDecoration,
  className,
  style,
}: DiagramCanvasProps) {
  const settings = design ?? tree.design;
  const tuning = normalizeTuning(settings.tuning);
  const palette = PALETTES[settings.palette];
  const branchColor = new Map(tree.branches.map((branch) => [branch.id, branch.color]));
  const branchCode = new Map(tree.branches.map((branch) => [branch.id, branch.code]));
  const dimensions = diagramDimensions(layout, settings, paper);
  const { width, height, contentW } = dimensions;
  const origin = contentOrigin(dimensions, layout, tuning.contentShiftY ?? 0);
  const banner = normalizeBanner(settings.banner);
  const bannerH = banner.enabled ? banner.width / BANNER_ASPECT : 0;
  const bgArt = normalizeBackgroundImage(settings.backgroundImage);
  const busyPattern = settings.background === "dragon" || settings.background === "ornament";
  const inkSaver = settings.theme === "ink";
  const patternOpacity = Math.max(
    0.02,
    (tuning.patternOpacity ?? 1) * (busyPattern ? 0.6 : 1) * (inkSaver ? 0.3 : 1),
  );
  const patternScale = tuning.patternScale ?? 1;
  const generationCounts = new Map<number, number>();
  for (const node of layout.nodes) {
    generationCounts.set(node.generation, (generationCounts.get(node.generation) ?? 0) + 1);
  }
  const patternId = `pat-bg-${idPrefix}`;
  const gridId = `pat-grid-${idPrefix}`;
  const tintId = `pat-tint-${idPrefix}`;
  const bandColor = tuning.generationBandColor || palette.deep;
  // Khổ A0: 2,5 cm tính từ mép trong khung viền tới nhãn, tương đương 73 đơn vị.
  const labelGap = Math.round(73 * tuning.frameScale);
  const connectorColor = tuning.connectorColor || "";
  const tintColors = [palette.accent, palette.gold, "#3f6b52", "#3f5f86", "#9a4a6b", "#7a5a10"];
  // Độ dày khung ≈ 2,8% chiều rộng khổ in, nên in khổ lớn thì nét tự dày theo.
  const frameS = frameThickness(width, settings);
  // Mép trên hoành phi: mặc định 6% chiều cao giấy, không vượt khung trên và không quá 13%.
  const bannerTopY = banner.enabled
    ? bannerDrag
      ? Math.round(
          Math.max(frameS, Math.min(height * 0.13, bannerDrag.top)),
        )
      : bannerTopFor(width, height, settings)
    : 0;
  const dragonBox = banner.enabled && banner.showDragons ? dragonBounds(width, height, bannerTopY, banner) : null;
  const dragonShift = dragonBox
    ? {
        dx: clampValue(dragonDrag?.x ?? banner.dragonOffsetX ?? 0, dragonBox.dxMin, dragonBox.dxMax),
        dy: clampValue(dragonDrag?.y ?? banner.dragonOffsetY ?? 0, dragonBox.dyMin, dragonBox.dyMax),
      }
    : { dx: 0, dy: 0 };
  const couplets = normalizeCouplets(settings.couplets);
  const coupletBox =
    banner.enabled && banner.showDragons && dragonBox && couplets.enabled
      ? coupletBounds(width, height, bannerTopY, frameS, banner, dragonBox, dragonShift, couplets)
      : null;
  const coupletShift = coupletBox
    ? {
        dx: clampValue(
          coupletDrag?.x ?? couplets.offsetX ?? 0,
          coupletBox.dxMin,
          coupletBox.dxMax,
        ),
        dy: clampValue(
          coupletDrag?.y ?? couplets.offsetY ?? 0,
          coupletBox.dyMin,
          coupletBox.dyMax,
        ),
      }
    : { dx: 0, dy: 0 };
  const coupletWords = {
    left: couplets.leftText.trim().split(/\s+/).filter(Boolean),
    right: couplets.rightText.trim().split(/\s+/).filter(Boolean),
  };
  const coupletStep = couplets.fontSize * 1.3;
  const frameCorner = FRAME_CORNER_RATIO * frameS;
  const frameHorW = FRAME_HOR_W_RATIO * frameS;
  const frameHorH = FRAME_HOR_H_RATIO * frameS;
  const frameVerH = FRAME_VER_H_RATIO * frameS;
  const frameLineW = FRAME_LINE_W_RATIO * frameS;
  /** Chia một khoảng trống thành các tile nối, co giãn đều để khít hai đầu. */
  const frameSegments = (start: number, end: number) => {
    const length = end - start;
    if (length <= 0.5) return [] as { center: number; step: number }[];
    const count = Math.max(1, Math.round(length / frameLineW));
    const step = length / count;
    return Array.from({ length: count }, (_, index) => ({
      center: start + step * (index + 0.5),
      step,
    }));
  };
  const frameTop = [
    ...frameSegments(frameCorner, width / 2 - frameHorW / 2),
    ...frameSegments(width / 2 + frameHorW / 2, width - frameCorner),
  ];
  const frameSide = [
    ...frameSegments(frameCorner, height / 2 - frameVerH / 2),
    ...frameSegments(height / 2 + frameVerH / 2, height - frameCorner),
  ];
  const bannerRaw =
    bannerTextOverride && bannerTextOverride.trim() ? bannerTextOverride : banner.text;
  const bannerLines = bannerRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const nodeVisible = (id: string) => !visibleIds || visibleIds.has(id);
  const edgeVisible = (edge: TreeEdge) => {
    if (!visibleIds) return true;
    const [a, b] = edgeMembers(edge);
    return nodeVisible(a) && nodeVisible(b);
  };

  return (
    <svg
      id={svgId}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label={`Phả đồ ${tree.name}`}
    >
      <defs>
        <pattern id={patternId} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform={`scale(${patternScale})`}>
          {settings.background === "lotus" ? (
            <g fill="none" stroke={palette.gold} strokeOpacity={0.13 * patternOpacity} strokeWidth="1">
              <path d="M28 14c-5 6-5 12 0 17 5-5 5-11 0-17Z" />
              <path d="M17 24c6-1 10 2 11 7-6 1-10-2-11-7Z" />
              <path d="M39 24c-6-1-10 2-11 7 6 1 10-2 11-7Z" />
            </g>
          ) : settings.background === "dragon" ? (
            <g fill="none" stroke={palette.accent} strokeOpacity={0.07 * patternOpacity} strokeWidth="1">
              <path d="M4 42c10-18 22-18 28-4 4 10 14 10 20-2" />
              <circle cx="46" cy="16" r="3" />
            </g>
          ) : settings.background === "scroll" ? (
            <g fill="none" stroke={palette.accent} strokeOpacity={0.07 * patternOpacity} strokeWidth="1">
              <path d="M0 18c9-8 18 8 28 0s19 8 28 0" />
              <path d="M0 42c9-8 18 8 28 0s19 8 28 0" />
            </g>
          ) : (
            <g fill={palette.accent} fillOpacity={0.045 * patternOpacity}>
              <circle cx="14" cy="14" r="9" />
              <circle cx="30" cy="20" r="6" />
              <circle cx="20" cy="32" r="5" />
            </g>
          )}
        </pattern>
        <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#b08d5c" strokeOpacity="0.18" strokeWidth="0.6" />
        </pattern>
        <linearGradient id={`${idPrefix}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf8ec" />
          <stop offset="55%" stopColor="#fdf4e0" />
          <stop offset="100%" stopColor="#f8ecd4" />
        </linearGradient>
        <filter id={tintId} x="0" y="0" width="100%" height="100%">
          <feFlood floodColor={bgArt.color} result="flood" />
          <feComposite in="flood" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <rect width={width} height={height} fill={inkSaver ? "#ffffff" : `url(#${idPrefix}-paper)`} />
      {settings.background === "ornament" ? (
        <image
          href={bgArt.src}
          x={(width - width * bgArt.scale) / 2}
          y={(height - width * bgArt.scale * 0.62) / 2}
          width={width * bgArt.scale}
          height={width * bgArt.scale * 0.62}
          preserveAspectRatio="xMidYMid meet"
          opacity={bgArt.opacity * patternOpacity}
          filter={`url(#${tintId})`}
        />
      ) : settings.background !== "none" ? (
        <rect width={width} height={height} fill={`url(#${patternId})`} />
      ) : null}
      {showGrid ? <rect width={width} height={height} fill={`url(#${gridId})`} /> : null}

      <g>
          {/* Thân nối ngang: cạnh trên lật dọc để chỉ đỏ hướng vào trong. */}
          {frameTop.map(({ center, step }, index) => (
            <image
              key={`frame-top-${index}`}
              href={FRAME_LINE_SRC}
              x={-step / 2}
              y={-frameS / 2}
              width={step}
              height={frameS}
              preserveAspectRatio="none"
              transform={`translate(${center} ${frameS / 2}) scale(1 -1)`}
            />
          ))}
          {frameTop.map(({ center, step }, index) => (
            <image
              key={`frame-bottom-${index}`}
              href={FRAME_LINE_SRC}
              x={-step / 2}
              y={-frameS / 2}
              width={step}
              height={frameS}
              preserveAspectRatio="none"
              transform={`translate(${center} ${height - frameS / 2})`}
            />
          ))}
          {/* Thân nối đứng: cạnh trái xoay 90°, cạnh phải xoay -90° để chỉ đỏ vào trong. */}
          {frameSide.map(({ center, step }, index) => (
            <image
              key={`frame-left-${index}`}
              href={FRAME_LINE_SRC}
              x={-step / 2}
              y={-frameS / 2}
              width={step}
              height={frameS}
              preserveAspectRatio="none"
              transform={`translate(${frameS / 2} ${center}) rotate(90)`}
            />
          ))}
          {frameSide.map(({ center, step }, index) => (
            <image
              key={`frame-right-${index}`}
              href={FRAME_LINE_SRC}
              x={-step / 2}
              y={-frameS / 2}
              width={step}
              height={frameS}
              preserveAspectRatio="none"
              transform={`translate(${width - frameS / 2} ${center}) rotate(-90)`}
            />
          ))}
          {/* Khối giữa 4 cạnh. */}
          <image
            href={FRAME_HOR_SRC}
            x={-frameHorW / 2}
            y={-frameHorH / 2}
            width={frameHorW}
            height={frameHorH}
            preserveAspectRatio="none"
            transform={`translate(${width / 2} ${frameHorH / 2}) scale(1 -1)`}
          />
          <image
            href={FRAME_HOR_SRC}
            x={-frameHorW / 2}
            y={-frameHorH / 2}
            width={frameHorW}
            height={frameHorH}
            preserveAspectRatio="none"
            transform={`translate(${width / 2} ${height - frameHorH / 2})`}
          />
          <image
            href={FRAME_VER_SRC}
            x={-frameS / 2}
            y={-frameVerH / 2}
            width={frameS}
            height={frameVerH}
            preserveAspectRatio="none"
            transform={`translate(${frameS / 2} ${height / 2}) scale(-1 1)`}
          />
          <image
            href={FRAME_VER_SRC}
            x={-frameS / 2}
            y={-frameVerH / 2}
            width={frameS}
            height={frameVerH}
            preserveAspectRatio="none"
            transform={`translate(${width - frameS / 2} ${height / 2})`}
          />
          {/* 4 khối góc, lật từ mẫu góc dưới - phải. */}
          <image
            href={FRAME_CORNER_SRC}
            x={-frameCorner / 2}
            y={-frameCorner / 2}
            width={frameCorner}
            height={frameCorner}
            preserveAspectRatio="none"
            transform={`translate(${frameCorner / 2} ${frameCorner / 2}) scale(-1 -1)`}
          />
          <image
            href={FRAME_CORNER_SRC}
            x={-frameCorner / 2}
            y={-frameCorner / 2}
            width={frameCorner}
            height={frameCorner}
            preserveAspectRatio="none"
            transform={`translate(${width - frameCorner / 2} ${frameCorner / 2}) scale(1 -1)`}
          />
          <image
            href={FRAME_CORNER_SRC}
            x={-frameCorner / 2}
            y={-frameCorner / 2}
            width={frameCorner}
            height={frameCorner}
            preserveAspectRatio="none"
            transform={`translate(${frameCorner / 2} ${height - frameCorner / 2}) scale(-1 1)`}
          />
          <image
            href={FRAME_CORNER_SRC}
            x={-frameCorner / 2}
            y={-frameCorner / 2}
            width={frameCorner}
            height={frameCorner}
            preserveAspectRatio="none"
            transform={`translate(${width - frameCorner / 2} ${height - frameCorner / 2})`}
          />
      </g>

      {banner.enabled ? (
        <g
          transform={`translate(${width / 2}, ${bannerTopY})`}
          onPointerDown={
            interactive && onBannerPointerDown ? (event) => onBannerPointerDown(event) : undefined
          }
          style={
            interactive && onBannerPointerDown
              ? { cursor: "grab", touchAction: "none" }
              : undefined
          }
        >
          {banner.showDragons && dragonBox ? (
            <>
              {(["left", "right"] as const).map((side) => {
                const x =
                  side === "left"
                    ? -banner.width / 2 - dragonBox.gap - dragonBox.dragonW - dragonShift.dx
                    : banner.width / 2 + dragonBox.gap + dragonShift.dx;
                const y = dragonBox.defaultY + dragonShift.dy;
                return (
                  <g
                    key={`dragon-${side}`}
                    transform={`translate(${x}, ${y})`}
                    onPointerDown={
                      interactive && onDragonPointerDown
                        ? (event) => onDragonPointerDown(event, side)
                        : undefined
                    }
                    style={interactive ? { cursor: "grab", touchAction: "none" } : undefined}
                  >
                    <rect
                      width={dragonBox.dragonW}
                      height={dragonBox.dragonH}
                      fill="#000"
                      fillOpacity="0"
                    />
                    <image
                      href={side === "left" ? DRAGON_SRC_LEFT : DRAGON_SRC_RIGHT}
                      width={dragonBox.dragonW}
                      height={dragonBox.dragonH}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                );
              })}
            </>
          ) : null}
          <image
            href={banner.src}
            x={-banner.width / 2}
            y={0}
            width={banner.width}
            height={bannerH}
            preserveAspectRatio="xMidYMid meet"
          />
          {bannerLines.length ? (
            <text textAnchor="middle" fontFamily="'Be Vietnam Pro', sans-serif">
              {bannerLines.map((line, index) => (
                <tspan
                  key={`banner-${index}`}
                  x={0}
                  y={bannerH * 0.455 + banner.textOffsetY + index * banner.textSize * 1.18}
                  fontSize={banner.textSize}
                  fontWeight="700"
                  letterSpacing="1.6"
                  fill={banner.textColor}
                >
                  {line}
                </tspan>
              ))}
            </text>
          ) : null}
          {coupletBox ? (
            <>
              {(["left", "right"] as const).map((side) => {
                const dragonOuter =
                  side === "left"
                    ? -banner.width / 2 - dragonBox!.gap - dragonBox!.dragonW - dragonShift.dx
                    : banner.width / 2 + dragonBox!.gap + dragonBox!.dragonW + dragonShift.dx;
                const outward = coupletShift.dx;
                const blockX =
                  side === "left"
                    ? dragonOuter - coupletBox.gap - outward - coupletBox.width
                    : dragonOuter + coupletBox.gap + outward;
                const words = coupletWords[side];
                const top = coupletBox.defaultTop + coupletShift.dy;
                return (
                  <g
                    key={`couplet-${side}`}
                    transform={`translate(${blockX}, ${top})`}
                    onPointerDown={
                      interactive && onCoupletPointerDown
                        ? (event) => onCoupletPointerDown(event, side)
                        : undefined
                    }
                    style={interactive ? { cursor: "grab", touchAction: "none" } : undefined}
                  >
                    <rect
                      width={coupletBox.width}
                      height={coupletBox.height}
                      fill="#000"
                      fillOpacity="0"
                    />
                    <text
                      x={coupletBox.width / 2}
                      y={couplets.fontSize * 0.92}
                      textAnchor="middle"
                      fontSize={couplets.fontSize}
                      className="pat-couplet"
                      fontFamily={COUPLET_FONT_FAMILIES[couplets.font ?? "hai-yen-1"]}
                      fontWeight="400"
                      fill={couplets.color}
                    >
                      {words.map((word, index) => (
                        <tspan
                          key={`${side}-${index}`}
                          x={coupletBox.width / 2}
                          y={couplets.fontSize * 0.92 + index * coupletStep}
                        >
                          {word}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </>
          ) : null}
        </g>
      ) : null}

      {/* Nhãn đời neo theo giấy: khoảng 2,5 cm tới khung và tới thẻ không đổi khi nội dung thu vừa khổ. */}
      {settings.showGenerationLabels ? (
        <g pointerEvents="none">
          {layout.generations.map((row) => {
              const label = row.label ?? bandLabelFor(tuning.generationBandLabel, row.generation);
              // Nhãn đời dùng chung một cỡ (tương ứng cỡ thẻ 1,5); khổ A0 giữ 2,5 cm tới khung và 2,5 cm tới thẻ.
              const band = generationBandMetrics(
                label,
                (tuning.generationLabelScale ?? 1) * GENERATION_LABEL_CARD_SCALE,
              );
              const leftX = frameS + labelGap;
              const rightX = width - frameS - labelGap - band.width;
              // Canh giữa nhãn theo chiều cao thẻ của đời này (không neo ở đỉnh hàng).
              const rowHeight = layout.nodes.reduce(
                (max, node) => (node.generation === row.generation ? Math.max(max, node.height) : max),
                0,
              );
              const pillCenterY =
                origin.y +
                origin.fitScale * (row.y + Math.max(rowHeight / 2, band.height / 2));
              const pillY = pillCenterY - band.height / 2;
              return (
                <g key={`gen-${row.generation}`}>
                  <rect
                    x={leftX}
                    y={pillY}
                    width={band.width}
                    height={band.height}
                    rx={band.radius}
                    fill={bandColor}
                    fillOpacity="0.16"
                    stroke={bandColor}
                    strokeOpacity="0.55"
                    strokeWidth="0.7"
                  />
                  <text
                    x={leftX + band.width / 2}
                    y={pillCenterY + band.fontSize * 0.36}
                    textAnchor="middle"
                    fontSize={band.fontSize}
                    fontWeight="700"
                    letterSpacing={band.letterSpacing}
                    fill={bandColor}
                    fontFamily="'Be Vietnam Pro', sans-serif"
                  >
                    {label}
                  </text>
                  <rect
                    x={rightX}
                    y={pillY}
                    width={band.width}
                    height={band.height}
                    rx={band.radius}
                    fill={bandColor}
                    fillOpacity="0.16"
                    stroke={bandColor}
                    strokeOpacity="0.55"
                    strokeWidth="0.7"
                  />
                  <text
                    x={rightX + band.width / 2}
                    y={pillCenterY + band.fontSize * 0.36}
                    textAnchor="middle"
                    fontSize={band.fontSize}
                    fontWeight="700"
                    letterSpacing={band.letterSpacing}
                    fill={bandColor}
                    fontFamily="'Be Vietnam Pro', sans-serif"
                  >
                    {label}
                  </text>
                  <line
                    x1={leftX + band.width + 6}
                    x2={rightX - 6}
                    y1={pillCenterY}
                    y2={pillCenterY}
                    stroke={bandColor}
                    strokeOpacity="0.2"
                    strokeDasharray="4 6"
                  />
                </g>
              );
            })}
        </g>
      ) : null}

      <g transform={`translate(${origin.x}, ${origin.y}) scale(${origin.fitScale})`}>
        {guides?.length ? (
          <g pointerEvents="none">
            {guides.map((guide, index) =>
              guide.x !== undefined ? (
                <line
                  key={`guide-x-${index}`}
                  x1={guide.x}
                  x2={guide.x}
                  y1={0}
                  y2={layout.height}
                  stroke="#b3261e"
                  strokeOpacity="0.55"
                  strokeWidth="0.8"
                  strokeDasharray="5 4"
                />
              ) : null,
            )}
            {guides.map((guide, index) =>
              guide.y !== undefined ? (
                <line
                  key={`guide-y-${index}`}
                  x1={0}
                  x2={contentW}
                  y1={guide.y}
                  y2={guide.y}
                  stroke="#b3261e"
                  strokeOpacity="0.55"
                  strokeWidth="0.8"
                  strokeDasharray="5 4"
                />
              ) : null,
            )}
          </g>
        ) : null}

        <g>
          {layout.edges.filter(edgeVisible).map((edge) => {
            const personLineColor = edge.subjectId
              ? tuning.personStyles?.[edge.subjectId]?.lineColor
              : undefined;
            const tint =
              tuning.tintByLevel && edge.generation !== undefined
                ? tintColors[
                    ((edge.generation % tintColors.length) + tintColors.length) % tintColors.length
                  ]
                : undefined;
            const stroke =
              personLineColor ||
              connectorColor ||
              tint ||
              (edge.type === "spouse" ? palette.accent : palette.gold);
            return (
              <line
                key={edge.id}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke={stroke}
                strokeOpacity={
                  edge.secondary
                    ? 0.5
                    : connectorColor || personLineColor || tint
                      ? 0.85
                      : edge.type === "spouse"
                        ? 0.7
                        : edge.indirect
                          ? 0.8
                          : 0.55
                }
                strokeWidth={
                  tuning.connectorWidth *
                  (edge.secondary ? 0.55 : edge.type === "spouse" ? 1.08 : 1)
                }
                strokeDasharray={
                  edge.secondary
                    ? "5 4"
                    : edge.maternal
                      ? "2 3"
                      : edge.indirect
                        ? "5 4"
                        : tuning.connectorDash
                          ? "6 4"
                          : edge.type === "spouse"
                            ? "5 3"
                            : undefined
                }
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {tuning.showLinkGap ? (
          <g>
            {layout.edges
              .filter((edge) => edge.label && edgeVisible(edge))
              .map((edge) => {
                const label = edge.label ?? "";
                const boxW = Math.max(28, label.length * 3.4 + 10);
                return (
                  <g
                    key={`lbl-${edge.id}`}
                    transform={`translate(${(edge.x1 + edge.x2) / 2}, ${(edge.y1 + edge.y2) / 2 - 1})`}
                  >
                    <rect
                      x={-boxW / 2}
                      y={-6}
                      width={boxW}
                      height={11}
                      rx={5.5}
                      fill={palette.soft}
                      stroke={palette.gold}
                      strokeOpacity="0.45"
                      strokeWidth="0.6"
                    />
                    <text
                      y="2.4"
                      textAnchor="middle"
                      fontSize="6.2"
                      fontWeight="600"
                      fill={palette.accent}
                      fontFamily="'Be Vietnam Pro', sans-serif"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
          </g>
        ) : null}

        <g>
          {layout.nodes
            .filter((node) => nodeVisible(node.id))
            .map((node) => {
              const person = node.person;
              const genStyle: GenerationStyle | undefined = tuning.generationStyles?.[String(node.generation)];
              const personStyle = tuning.personStyles?.[person.id];
              const color =
                personStyle?.color ||
                (!inkSaver && person.branchId ? branchColor.get(person.branchId) : undefined) ||
                (inkSaver ? "#3f3a34" : person.gender === "male" ? palette.accent : "#9a4a6b");
              const focused = focusId === person.id;
              const selected = selectedIds?.includes(person.id) === true;
              const clipText = `${idPrefix}-clip-text-${node.id}`;
              const vertical =
                (genStyle?.orientation ??
                  cardOrientationFor(settings, node.generation, generationCounts.get(node.generation))) ===
                "vertical";
              // Nội dung thẻ vẽ ở kích thước gốc rồi scale theo cỡ thẻ của đời.
              const baseW = vertical ? CARD_VERTICAL_W : CARD_W;
              const baseH = vertical ? CARD_VERTICAL_H : CARD_H;
              const contentScale = node.width / baseW;
              const showName = genStyle?.showName ?? settings.showName !== false;
              const showDates =
                showDatesOverride ??
                ((genStyle?.showDates ?? settings.showDates !== false) && !personStyle?.hideDates);
              const anniversary = deathAnniversaryText(person);
              const showAnniversary =
                (genStyle?.showDeathAnniversary ?? settings.showDeathAnniversary !== false) && Boolean(anniversary);
              const deceased = isDeceasedStatus(lifeStatusOf(person));
              const meta: string[] = [];
              if (deceased) {
                if (settings.showBirthOrder && person.birthOrder > 0) meta.push(`Con thứ ${person.birthOrder}`);
                if (showDates) meta.push(cardLifeYears(person));
                if (showAnniversary && anniversary) meta.push(`Giỗ ${anniversary}`);
              }
              const extraFields = genStyle?.extraFields ?? tuning.extraFields;
              for (const key of extraFields) {
                if (key === "generation" || key === "deathAnniversary") continue;
                const text = extraFieldText(key, person, node.generation);
                if (text) meta.push(text);
              }

              const textX = baseW / 2;
              const anchor = "middle";
              const fontFamily = genStyle?.fontFamily || tuning.fontFamily;
              const nameSize = (genStyle?.fontSize || tuning.fontSize) * 1.16;
              const nameLineHeight = nameSize + 2;
              const metaSize = Math.max(6.2, nameSize * 0.66);
              const maxLines = Math.max(1, genStyle?.lineCount || tuning.lineCount);
              const nameWidth = baseW - 12;
              const nameLines = showName
                ? wrapText(person.name.toUpperCase(), Math.floor(nameWidth / (nameSize * 0.56)), maxLines)
                : [];
              const metaLines = meta.flatMap((line) =>
                wrapText(line, Math.floor((baseW - 12) / (metaSize * 0.54)), 2),
              );
              const metaLineHeight = metaSize + 2.4;
              const blockH =
                nameLines.length * nameLineHeight +
                (metaLines.length ? 3 + metaLines.length * metaLineHeight : 0);
              const nameStart = Math.max(nameSize, (baseH - blockH) / 2 + nameSize * 0.82);
              const nameLastY = nameStart + Math.max(0, nameLines.length - 1) * nameLineHeight;
              const metaStart = nameLines.length
                ? nameLastY + nameLineHeight + 1
                : (baseH - blockH) / 2 + metaSize;
              const cardFill =
                genStyle?.cardColor ||
                (inkSaver
                  ? "#ffffff"
                  : node.isSpouse
                    ? "#fffdf7"
                    : settings.theme === "generations"
                      ? palette.soft
                      : "#fff9e4");

              return (
                <g
                  key={person.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={interactive ? "cursor-grab active:cursor-grabbing" : undefined}
                  onPointerDown={interactive && onNodePointerDown ? (event) => onNodePointerDown(event, node) : undefined}
                  style={interactive ? { touchAction: "none" } : undefined}
                >
                  <rect
                    width={node.width}
                    height={node.height}
                    rx="7"
                    fill={cardFill}
                    fillOpacity={inkSaver ? 1 : node.isSpouse ? 0.86 : 0.96}
                    stroke={focused ? palette.accent : color}
                    strokeWidth={focused ? 2.6 : selected ? 2.2 : inkSaver ? 0.7 : 1}
                    strokeDasharray={
                      selected && !focused ? "4 2" : node.maternal ? "2 3" : node.isSpouse ? "5 3" : undefined
                    }
                  />
                  <rect
                    x="0"
                    y="0"
                    width={vertical ? node.width : 4}
                    height={vertical ? 4 : node.height}
                    rx="2"
                    fill={color}
                    opacity={inkSaver ? 0.3 : 0.85}
                  />
                  <defs>
                    <clipPath id={clipText}>
                      <rect x="0" y="0" width={baseW} height={baseH} rx="7" />
                    </clipPath>
                  </defs>
                  <g transform={`scale(${contentScale})`}>
                  <g clipPath={`url(#${clipText})`}>
                    {nameLines.length ? (
                      <text
                        x={textX}
                        y={nameStart}
                        textAnchor={anchor}
                        fontSize={nameSize}
                        fontWeight="700"
                        fill="#3d2a1e"
                        fontFamily={fontFamily}
                      >
                        {nameLines.map((line, index) => (
                          <tspan key={`${person.id}-name-${index}`} x={textX} dy={index === 0 ? 0 : nameLineHeight}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    ) : null}
                    {meta.length ? (
                      <text
                        x={textX}
                        y={metaStart}
                        textAnchor={anchor}
                        fontSize={metaSize}
                        fill="#8a6a52"
                        fontFamily={fontFamily}
                      >
                        {metaLines.map((line, index) => (
                          <tspan key={`${person.id}-meta-${index}`} x={textX} dy={index === 0 ? 0 : metaSize + 2.4}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    ) : null}
                    {branchCode.get(person.branchId ?? "") ? (
                      <text
                        x={6}
                        y={baseH - 5.5}
                        textAnchor="start"
                        fontSize={Math.max(5.4, nameSize * 0.54)}
                        fontWeight="700"
                        fill={inkSaver ? "#3f3a34" : color}
                        opacity={inkSaver ? 0.9 : 0.75}
                        fontFamily="'Be Vietnam Pro', sans-serif"
                      >
                        {branchCode.get(person.branchId ?? "")}
                      </text>
                    ) : null}
                    {node.maternal ? (
                      <text
                        x={baseW - 6}
                        y={baseH - 5}
                        textAnchor="end"
                        fontSize={Math.max(5.4, nameSize * 0.54)}
                        fill={palette.gold}
                        opacity="0.9"
                        fontFamily={fontFamily}
                      >
                        ngoại tộc
                      </text>
                    ) : null}
                    {settings.showGenderSymbol ? (
                      <text
                        x={baseW - 6}
                        y={vertical ? 11 : 12}
                        textAnchor="end"
                        fontSize={Math.max(9, nameSize * 0.86)}
                        fontWeight="700"
                        fill={color}
                        opacity="0.85"
                        fontFamily={fontFamily}
                      >
                        {person.gender === "male" ? "♂" : "♀"}
                      </text>
                    ) : null}
                  </g>
                  </g>
                  {focused && interactive && onNodeResizeStart ? (
                    <g
                      transform={`translate(${node.width - 9}, ${node.height - 9})`}
                      className="cursor-nwse-resize"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        onNodeResizeStart(event, node);
                      }}
                    >
                      <title>Kéo để đổi cỡ thẻ cho cả đời</title>
                      <rect x="-9" y="-9" width="18" height="18" fill="transparent" />
                      <circle r="6" fill="#fffaf0" stroke={palette.accent} strokeWidth="1.6" />
                      <path
                        d="M-2.4 2.4 L2.4 -2.4 M-2.4 -2.4 L2.4 -2.4 M2.4 -2.4 L2.4 2.4"
                        fill="none"
                        stroke={palette.accent}
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : null}
                </g>
              );
            })}
        </g>

        {decorations.map((decoration) => {
          if (decoration.type === "text") {
            return (
              <g
                key={decoration.id}
                transform={`translate(${decoration.x}, ${decoration.y}) rotate(${decoration.rotate ?? 0})`}
                onPointerDown={
                  interactive && onDecorationPointerDown
                    ? (event) => onDecorationPointerDown(event, decoration)
                    : undefined
                }
                style={interactive ? { touchAction: "none", cursor: decoration.locked ? "not-allowed" : "grab" } : undefined}
              >
                {selectedDecorationId === decoration.id ? (
                  <rect x="-6" y="-16" width={Math.max(80, decoration.content.length * 8)} height="26" fill="none" stroke={palette.accent} strokeDasharray="4 3" rx="4" />
                ) : null}
                {decoration.locked ? (
                  <g transform="translate(-8 -18)" pointerEvents="none">
                    <circle r="6" fill={palette.gold} opacity="0.9" />
                    <rect x="-2.6" y="-0.6" width="5.2" height="4" rx="0.8" fill="#fff8e9" />
                    <path d="M-1.6 -0.8v-1.3a1.6 1.6 0 0 1 3.2 0v1.3" fill="none" stroke="#fff8e9" strokeWidth="1" />
                  </g>
                ) : null}
                <text
                  fontSize={decoration.fontSize ?? 16}
                  fill={decoration.color ?? palette.accent}
                  fontFamily="'Playfair Display', 'Be Vietnam Pro', serif"
                  fontWeight="600"
                >
                  {decoration.content}
                </text>
              </g>
            );
          }
          const w = decoration.width ?? 120;
          const h = decoration.height ?? 90;
          return (
            <g
              key={decoration.id}
              transform={`translate(${decoration.x}, ${decoration.y}) rotate(${decoration.rotate ?? 0})`}
              onPointerDown={
                interactive && onDecorationPointerDown
                  ? (event) => onDecorationPointerDown(event, decoration)
                  : undefined
              }
              style={interactive ? { touchAction: "none", cursor: decoration.locked ? "not-allowed" : "grab" } : undefined}
            >
              <image
                href={decoration.content}
                width={w}
                height={h}
                preserveAspectRatio="xMidYMid meet"
                transform={decoration.flip ? `translate(${w} 0) scale(-1 1)` : undefined}
              />
              {decoration.locked ? (
                <g transform="translate(-8 -8)" pointerEvents="none">
                  <circle r="6" fill={palette.gold} opacity="0.9" />
                  <rect x="-2.6" y="-0.6" width="5.2" height="4" rx="0.8" fill="#fff8e9" />
                  <path d="M-1.6 -0.8v-1.3a1.6 1.6 0 0 1 3.2 0v1.3" fill="none" stroke="#fff8e9" strokeWidth="1" />
                </g>
              ) : null}
              {selectedDecorationId === decoration.id ? (
                <rect width={w} height={h} rx="6" fill="none" stroke={palette.accent} strokeDasharray="4 3" />
              ) : null}
              {selectedDecorationId === decoration.id && interactive && onDecorationResizeStart ? (
                <g
                  transform={`translate(${w}, ${h})`}
                  onPointerDown={(event) => onDecorationResizeStart(event, decoration)}
                  style={{ cursor: "nwse-resize", touchAction: "none" }}
                >
                  <rect x="-8" y="-8" width="16" height="16" rx="3" fill={palette.accent} stroke="#fff4df" strokeWidth="1.5" />
                </g>
              ) : null}
            </g>
          );
        })}
      </g>

      {interactive && selectedDecorationId && onDeleteDecoration ? (
        (() => {
          const decoration = decorations.find((item) => item.id === selectedDecorationId);
          if (!decoration) return null;
          const size = decoration.type === "image" ? decoration.width ?? 120 : Math.max(80, decoration.content.length * 8);
          return (
            <g
              transform={`translate(${origin.x + origin.fitScale * (decoration.x + size + 6)}, ${origin.y + origin.fitScale * (decoration.y - 14)})`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteDecoration(decoration.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <circle r="9" fill={palette.accent} />
              <path d="M-3.5 -3.5 3.5 3.5 M3.5 -3.5 -3.5 3.5" stroke="#fff4df" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        })()
      ) : null}

      <g transform={`translate(${width - 74}, ${height - 20})`} opacity="0.45">
        <text fontSize="8" fill={palette.accent} textAnchor="end" fontFamily="'Be Vietnam Pro', sans-serif">
          {layout.nodes.length} thành viên ·{" "}
          {layout.generations.filter((row) => !row.isAncestor).length} đời
          {layout.generations.some((row) => row.isAncestor)
            ? ` · ${layout.generations.filter((row) => row.isAncestor).length} bậc tiền tổ`
            : ""}
        </text>
      </g>

      {layout.nodes.length === 0 ? (
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          <text textAnchor="middle" fontSize="14" fill="#8a6a52" fontFamily="'Be Vietnam Pro', sans-serif">
            Chưa có thành viên để vẽ phả đồ
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function orderedMembers(tree: FamilyTree) {
  const gens = computeGenerations(tree.members, tree.founderId);
  return [...tree.members].sort((a, b) => {
    const ga = gens.get(a.id) ?? 1;
    const gb = gens.get(b.id) ?? 1;
    if (ga !== gb) return ga - gb;
    return sortPersons(a, b);
  });
}

export function findMember(tree: FamilyTree, id: string) {
  return tree.members.find((member) => member.id === id);
}

export function memberById(tree: FamilyTree, id?: string) {
  if (!id) return undefined;
  return findMember(tree, id);
}

export { PALETTES };
