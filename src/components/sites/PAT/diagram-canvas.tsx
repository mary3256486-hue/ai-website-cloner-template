"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type {
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
  cardOrientationFor,
  normalizeTuning,
  type ExtraFieldKey,
} from "./types";
import { computeGenerations, lifeSpan, sortPersons } from "./utils";

const PALETTES: Record<DesignSettings["palette"], { accent: string; deep: string; gold: string; soft: string }> = {
  classic: { accent: "#8a1c15", deep: "#6a100c", gold: "#c9a227", soft: "#f6e9c8" },
  gold: { accent: "#8a5a0f", deep: "#6a430a", gold: "#d4af37", soft: "#f7e9bf" },
  ink: { accent: "#2f2a26", deep: "#1d1916", gold: "#8a6a52", soft: "#efe8dc" },
  jade: { accent: "#1f5e4a", deep: "#143f32", gold: "#b08d3c", soft: "#e3efe8" },
};

export const BANNER_HEIGHT = 58;

export function contentTop(design: DesignSettings) {
  return (design.showBanner ? BANNER_HEIGHT : 0) + 10;
}

export interface DiagramDimensions {
  width: number;
  height: number;
  contentW: number;
  contentH: number;
  offsetX: number;
  offsetY: number;
}

export function diagramDimensions(
  layout: TreeLayout,
  design: DesignSettings,
  paperAspect?: number,
): DiagramDimensions {
  const contentW = Math.max(layout.width, 720);
  const contentH = Math.max(layout.height + contentTop(design) + 16, 420);
  if (!paperAspect || !Number.isFinite(paperAspect) || paperAspect <= 0) {
    return { width: contentW, height: contentH, contentW, contentH, offsetX: 0, offsetY: 0 };
  }
  let width = contentW;
  let height = contentH;
  if (contentW / contentH < paperAspect) width = contentH * paperAspect;
  else height = contentW / paperAspect;
  return { width, height, contentW, contentH, offsetX: (width - contentW) / 2, offsetY: (height - contentH) / 2 };
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
    case "deathAnniversary":
      return person.deathAnniversary ? `Giỗ: ${person.deathAnniversary}` : undefined;
    case "age": {
      const birth = yearOf(person.birthDate);
      const death = yearOf(person.deathDate);
      if (birth === undefined || death === undefined || death < birth) return undefined;
      return `Thọ ${death - birth} tuổi`;
    }
    case "generation":
      return `Đời ${generation}`;
    default:
      return undefined;
  }
}

function edgeMembers(edge: TreeEdge): string[] {
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
  selectedDecorationId?: string | null;
  showGrid?: boolean;
  interactive?: boolean;
  paperAspect?: number;
  onNodePointerDown?: (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => void;
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
  selectedDecorationId,
  showGrid = false,
  interactive = false,
  paperAspect,
  onNodePointerDown,
  onDecorationPointerDown,
  onDecorationResizeStart,
  onDeleteDecoration,
  className,
  style,
}: DiagramCanvasProps) {
  const settings = design ?? tree.design;
  const tuning = normalizeTuning(settings.tuning);
  const palette = PALETTES[settings.palette];
  const generations = computeGenerations(tree.members);
  const branchColor = new Map(tree.branches.map((branch) => [branch.id, branch.color]));
  const { width, height, contentW, offsetX, offsetY } = diagramDimensions(
    layout,
    settings,
    paperAspect,
  );
  const top = contentTop(settings);
  const patternId = `pat-bg-${idPrefix}`;
  const gridId = `pat-grid-${idPrefix}`;
  const bandColor = tuning.generationBandColor || palette.gold;
  const connectorColor = tuning.connectorColor || "";
  const tintColors = [palette.accent, palette.gold, "#3f6b52", "#3f5f86", "#9a4a6b", "#7a5a10"];

  const nodeVisible = (id: string) => !visibleIds || visibleIds.has(id);
  const edgeVisible = (edge: TreeEdge) => {
    if (!visibleIds) return true;
    const [a, b] = edgeMembers(edge);
    return nodeVisible(a) && nodeVisible(b);
  };

  const isGen = (node: TreeNode) => generations.get(node.person.id) ?? node.generation;

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
        <pattern id={patternId} width="56" height="56" patternUnits="userSpaceOnUse">
          {settings.background === "lotus" ? (
            <g fill="none" stroke={palette.gold} strokeOpacity="0.13" strokeWidth="1">
              <path d="M28 14c-5 6-5 12 0 17 5-5 5-11 0-17Z" />
              <path d="M17 24c6-1 10 2 11 7-6 1-10-2-11-7Z" />
              <path d="M39 24c-6-1-10 2-11 7 6 1 10-2 11-7Z" />
            </g>
          ) : settings.background === "dragon" ? (
            <g fill="none" stroke={palette.accent} strokeOpacity="0.07" strokeWidth="1">
              <path d="M4 42c10-18 22-18 28-4 4 10 14 10 20-2" />
              <circle cx="46" cy="16" r="3" />
            </g>
          ) : settings.background === "scroll" ? (
            <g fill="none" stroke={palette.accent} strokeOpacity="0.07" strokeWidth="1">
              <path d="M0 18c9-8 18 8 28 0s19 8 28 0" />
              <path d="M0 42c9-8 18 8 28 0s19 8 28 0" />
            </g>
          ) : (
            <g fill={palette.accent} fillOpacity="0.045">
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
        <linearGradient id={`${idPrefix}-wood`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6f4426" />
          <stop offset="32%" stopColor="#a97144" />
          <stop offset="58%" stopColor="#6b3d20" />
          <stop offset="82%" stopColor="#9a6238" />
          <stop offset="100%" stopColor="#5e351b" />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill={`url(#${idPrefix}-paper)`} />
      {settings.background !== "none" ? <rect width={width} height={height} fill={`url(#${patternId})`} /> : null}
      {showGrid ? <rect width={width} height={height} fill={`url(#${gridId})`} /> : null}

      {tuning.frameStyle === "wood" ? (
        <g>
          <rect x="9" y="9" width={width - 18} height={height - 18} fill="none" stroke={`url(#${idPrefix}-wood)`} strokeWidth="18" />
          <rect x="20" y="20" width={width - 40} height={height - 40} fill="none" stroke={palette.gold} strokeOpacity="0.55" strokeWidth="1" />
          <rect x="24" y="24" width={width - 48} height={height - 48} fill="none" stroke={palette.gold} strokeOpacity="0.28" strokeWidth="0.6" />
        </g>
      ) : null}

      {settings.borderStyle !== "none" && tuning.frameStyle !== "wood" ? (
        <g fill="none" stroke={palette.gold}>
          <rect x="10" y="10" width={width - 20} height={height - 20} strokeWidth={settings.borderStyle === "ornate" ? 2 : 1} />
          {settings.borderStyle === "ornate" ? (
            <>
              <rect x="16" y="16" width={width - 32} height={height - 32} strokeWidth="0.8" strokeOpacity="0.65" />
              {[
                [10, 10],
                [width - 10, 10],
                [10, height - 10],
                [width - 10, height - 10],
              ].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`} fill={palette.accent} stroke="none" opacity="0.75">
                  <circle cx={cx} cy={cy} r="5" />
                  <circle cx={cx} cy={cy} r="2" fill={palette.gold} />
                </g>
              ))}
            </>
          ) : null}
        </g>
      ) : null}

      {settings.showBanner ? (
        <g transform={`translate(${width / 2}, 30)`}>
          <rect x="-190" y="-21" width="380" height="42" rx="7" fill={palette.accent} />
          <rect x="-184" y="-16" width="368" height="32" rx="5" fill="none" stroke={palette.gold} strokeWidth="0.8" />
          <text
            textAnchor="middle"
            y="-2"
            fontSize="12"
            fontWeight="700"
            letterSpacing="2.4"
            fill="#ffe9bd"
            fontFamily="'Be Vietnam Pro', sans-serif"
          >
            {truncate(settings.bannerText || "GIA PHẢ", 30)}
          </text>
          <text
            textAnchor="middle"
            y="13"
            fontSize="9"
            fill="#f4dcb6"
            fontFamily="'Be Vietnam Pro', sans-serif"
          >
            {truncate(tree.name, 48)}
          </text>
        </g>
      ) : null}

      {settings.showCouplets ? (
        <>
          <text
            transform={`translate(24, ${height / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize="11"
            letterSpacing="1.5"
            fill={palette.accent}
            opacity="0.7"
            fontFamily="'Be Vietnam Pro', sans-serif"
          >
            Tổ đức lưu phương
          </text>
          <text
            transform={`translate(${width - 24}, ${height / 2}) rotate(90)`}
            textAnchor="middle"
            fontSize="11"
            letterSpacing="1.5"
            fill={palette.accent}
            opacity="0.7"
            fontFamily="'Be Vietnam Pro', sans-serif"
          >
            Gia phong kế thế
          </text>
        </>
      ) : null}

      <g transform={`translate(${offsetX}, ${top + offsetY})`}>
        {settings.showGenerationLabels
          ? layout.generations.map((row) => {
              const label = bandLabelFor(tuning.generationBandLabel, row.generation);
              return (
                <g key={`gen-${row.generation}`}>
                  <rect
                    x="34"
                    y={row.y - 28}
                    width="86"
                    height="20"
                    rx="10"
                    fill={bandColor}
                    fillOpacity="0.12"
                    stroke={bandColor}
                    strokeOpacity="0.35"
                    strokeWidth="0.7"
                  />
                  <text
                    x="77"
                    y={row.y - 14}
                    textAnchor="middle"
                    fontSize="7.2"
                    fontWeight="700"
                    letterSpacing="0.8"
                    fill={bandColor}
                    fontFamily="'Be Vietnam Pro', sans-serif"
                  >
                    {label}
                  </text>
                  <line
                    x1="126"
                    x2={contentW - 42}
                    y1={row.y - 18}
                    y2={row.y - 18}
                    stroke={bandColor}
                    strokeOpacity="0.2"
                    strokeDasharray="4 6"
                  />
                </g>
              );
            })
          : null}

        <g>
          {layout.edges.filter(edgeVisible).map((edge) => {
            const personLineColor = edge.subjectId
              ? tuning.personStyles?.[edge.subjectId]?.lineColor
              : undefined;
            const tint =
              tuning.tintByLevel && edge.generation
                ? tintColors[(edge.generation - 1) % tintColors.length]
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
                strokeOpacity={connectorColor || personLineColor || tint ? 0.85 : edge.type === "spouse" ? 0.7 : 0.55}
                strokeWidth={tuning.connectorWidth * (edge.type === "spouse" ? 1.08 : 1)}
                strokeDasharray={tuning.connectorDash ? "6 4" : edge.type === "spouse" ? "5 3" : undefined}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        <g>
          {layout.nodes
            .filter((node) => nodeVisible(node.id))
            .map((node) => {
              const person = node.person;
              const genStyle: GenerationStyle | undefined = tuning.generationStyles?.[String(node.generation)];
              const personStyle = tuning.personStyles?.[person.id];
              const color =
                personStyle?.color ||
                (person.branchId && branchColor.get(person.branchId)) ||
                (person.gender === "male" ? palette.accent : "#9a4a6b");
              const focused = focusId === person.id;
              const clip = `${idPrefix}-clip-${node.id}`;
              const clipText = `${idPrefix}-clip-text-${node.id}`;
              const vertical = (genStyle?.orientation ?? cardOrientationFor(settings, node.generation)) === "vertical";
              const showTitle = genStyle?.showTitle ?? settings.showTitle !== false;
              const showName = genStyle?.showName ?? settings.showName !== false;
              const showDates = (genStyle?.showDates ?? settings.showDates !== false) && !personStyle?.hideDates;
              const showAvatar = genStyle?.showAvatar ?? settings.showAvatar;
              const anniversary = person.deathAnniversary?.trim();
              const showAnniversary =
                (genStyle?.showDeathAnniversary ?? settings.showDeathAnniversary === true) && Boolean(anniversary);
              const title = person.title || `ĐỜI ${isGen(node)}`;
              const meta: string[] = [];
              if (showDates) meta.push(lifeSpan(person));
              if (showAnniversary && anniversary) meta.push(`Giỗ: ${anniversary}`);
              const extraFields = genStyle?.extraFields ?? tuning.extraFields;
              for (const key of extraFields) {
                const text = extraFieldText(key, person, node.generation);
                if (text) meta.push(text);
              }

              const avatar = vertical
                ? { cx: node.width / 2, cy: 27, r: 13, initialsY: 31, initialsSize: 9 }
                : { cx: 22, cy: 26, r: 11, initialsY: 30, initialsSize: 8.5 };
              const textX = vertical ? node.width / 2 : 40;
              const anchor = vertical ? "middle" : "start";
              const fontFamily = genStyle?.fontFamily || tuning.fontFamily;
              const nameSize = genStyle?.fontSize || tuning.fontSize;
              const nameLineHeight = nameSize + 2;
              const titleSize = Math.max(6.2, nameSize * 0.7);
              const metaSize = Math.max(6.2, nameSize * 0.74);
              const maxLines = Math.max(1, genStyle?.lineCount || tuning.lineCount);
              const nameWidth = vertical ? node.width - 14 : node.width - 50;
              const nameLines = showName
                ? wrapText(person.name, Math.floor(nameWidth / (nameSize * 0.56)), maxLines)
                : [];
              const nameStart = vertical ? (showTitle ? 69 : 59) : showTitle ? 31 : 27;
              const nameLastY = nameStart + Math.max(0, nameLines.length - 1) * nameLineHeight;
              const metaStart = nameLines.length
                ? nameLastY + nameLineHeight + 1
                : vertical
                  ? showTitle
                    ? 70
                    : 59
                  : nameStart;
              const metaLines = meta.flatMap((line) =>
                vertical
                  ? wrapText(line, Math.floor((node.width - 12) / (metaSize * 0.54)), 2)
                  : [truncate(line, 30)],
              );
              const cardFill =
                genStyle?.cardColor ||
                (node.isSpouse ? "#fffdf7" : settings.theme === "generations" ? palette.soft : "#fff9e4");

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
                    fillOpacity={node.isSpouse ? 0.86 : 0.96}
                    stroke={focused ? palette.accent : color}
                    strokeWidth={focused ? 2.6 : 1}
                    strokeDasharray={node.isSpouse ? "5 3" : undefined}
                  />
                  <rect
                    x="0"
                    y="0"
                    width={vertical ? node.width : 4}
                    height={vertical ? 4 : node.height}
                    rx="2"
                    fill={color}
                    opacity="0.85"
                  />
                  <defs>
                    <clipPath id={clip}>
                      <circle cx={avatar.cx} cy={avatar.cy} r={avatar.r} />
                    </clipPath>
                    <clipPath id={clipText}>
                      <rect x="0" y="0" width={node.width} height={node.height} rx="7" />
                    </clipPath>
                  </defs>
                  {showAvatar && person.avatar ? (
                    <image
                      href={person.avatar}
                      x={avatar.cx - avatar.r}
                      y={avatar.cy - avatar.r}
                      width={avatar.r * 2}
                      height={avatar.r * 2}
                      clipPath={`url(#${clip})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <>
                      <circle cx={avatar.cx} cy={avatar.cy} r={avatar.r} fill={color} opacity="0.92" />
                      <text
                        x={avatar.cx}
                        y={avatar.initialsY}
                        textAnchor="middle"
                        fontSize={avatar.initialsSize}
                        fontWeight="700"
                        fill="#fff8e9"
                        fontFamily="'Be Vietnam Pro', sans-serif"
                      >
                        {initials(person.name)}
                      </text>
                    </>
                  )}
                  <g clipPath={`url(#${clipText})`}>
                    {showTitle ? (
                      <text
                        x={textX}
                        y={vertical ? 54 : 16}
                        textAnchor={anchor}
                        fontSize={titleSize}
                        fontWeight="600"
                        letterSpacing={vertical ? 0.2 : 0.6}
                        fill={palette.deep}
                        opacity="0.65"
                        fontFamily={fontFamily}
                      >
                        {truncate(title, vertical ? 18 : 22)}
                      </text>
                    ) : null}
                    {nameLines.length ? (
                      <text
                        x={textX}
                        y={nameStart}
                        textAnchor={anchor}
                        fontSize={nameSize}
                        fontWeight="600"
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
                  </g>
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
                style={interactive ? { touchAction: "none", cursor: "grab" } : undefined}
              >
                {selectedDecorationId === decoration.id ? (
                  <rect x="-6" y="-16" width={Math.max(80, decoration.content.length * 8)} height="26" fill="none" stroke={palette.accent} strokeDasharray="4 3" rx="4" />
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
              style={interactive ? { touchAction: "none", cursor: "grab" } : undefined}
            >
              <image
                href={decoration.content}
                width={w}
                height={h}
                preserveAspectRatio="xMidYMid meet"
                transform={decoration.flip ? `translate(${w} 0) scale(-1 1)` : undefined}
              />
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
              transform={`translate(${offsetX + decoration.x + size + 6}, ${top + offsetY + decoration.y - 14})`}
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
          {tree.members.length} thành viên · {layout.generations.length} đời
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
  return [...tree.members].sort((a, b) => {
    const ga = computeGenerations(tree.members).get(a.id) ?? 1;
    const gb = computeGenerations(tree.members).get(b.id) ?? 1;
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
