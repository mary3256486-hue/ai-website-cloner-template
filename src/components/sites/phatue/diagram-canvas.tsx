"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { Decoration, DesignSettings, FamilyTree, TreeEdge, TreeLayout, TreeNode } from "./types";
import { CARD_H, CARD_W } from "./types";
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

export function diagramDimensions(layout: TreeLayout, design: DesignSettings) {
  return {
    width: Math.max(layout.width, 720),
    height: Math.max(layout.height + contentTop(design) + 16, 420),
  };
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
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
  onNodePointerDown?: (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => void;
  onDecorationPointerDown?: (event: ReactPointerEvent<SVGGElement>, decoration: Decoration) => void;
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
  onNodePointerDown,
  onDecorationPointerDown,
  onDeleteDecoration,
  className,
  style,
}: DiagramCanvasProps) {
  const settings = design ?? tree.design;
  const palette = PALETTES[settings.palette];
  const generations = computeGenerations(tree.members);
  const branchColor = new Map(tree.branches.map((branch) => [branch.id, branch.color]));
  const { width, height } = diagramDimensions(layout, settings);
  const top = contentTop(settings);
  const patternId = `phatue-bg-${idPrefix}`;
  const gridId = `phatue-grid-${idPrefix}`;

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
      </defs>

      <rect width={width} height={height} fill={`url(#${idPrefix}-paper)`} />
      {settings.background !== "none" ? <rect width={width} height={height} fill={`url(#${patternId})`} /> : null}
      {showGrid ? <rect width={width} height={height} fill={`url(#${gridId})`} /> : null}

      {settings.borderStyle !== "none" ? (
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

      <g transform={`translate(0, ${top})`}>
        {settings.showGenerationLabels
          ? layout.generations.map((row) => (
              <g key={`gen-${row.generation}`}>
                <line
                  x1="42"
                  x2={width - 42}
                  y1={row.y - 16}
                  y2={row.y - 16}
                  stroke={palette.gold}
                  strokeOpacity="0.18"
                  strokeDasharray="4 6"
                />
                <text
                  x="44"
                  y={row.y + 4}
                  fontSize="8"
                  fontWeight="700"
                  letterSpacing="1.4"
                  fill={palette.gold}
                  opacity="0.6"
                  fontFamily="'Be Vietnam Pro', sans-serif"
                >
                  ĐỜI {row.generation}
                </text>
              </g>
            ))
          : null}

        <g>
          {layout.edges.filter(edgeVisible).map((edge) => (
            <line
              key={edge.id}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={edge.type === "spouse" ? palette.accent : palette.gold}
              strokeOpacity={edge.type === "spouse" ? 0.7 : 0.55}
              strokeWidth={edge.type === "spouse" ? 1.4 : 1.2}
              strokeDasharray={edge.type === "spouse" ? "5 3" : undefined}
              strokeLinecap="round"
            />
          ))}
        </g>

        <g>
          {layout.nodes
            .filter((node) => nodeVisible(node.id))
            .map((node) => {
              const person = node.person;
              const color = (person.branchId && branchColor.get(person.branchId)) || (person.gender === "male" ? palette.accent : "#9a4a6b");
              const focused = focusId === person.id;
              const clip = `${idPrefix}-clip-${node.id}`;
              return (
                <g
                  key={person.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={interactive ? "cursor-grab active:cursor-grabbing" : undefined}
                  onPointerDown={interactive && onNodePointerDown ? (event) => onNodePointerDown(event, node) : undefined}
                  style={interactive ? { touchAction: "none" } : undefined}
                >
                  <rect
                    width={CARD_W}
                    height={CARD_H}
                    rx="7"
                    fill={node.isSpouse ? "#fffdf7" : settings.theme === "generations" ? palette.soft : "#fff9e4"}
                    fillOpacity={node.isSpouse ? 0.86 : 0.96}
                    stroke={focused ? palette.accent : color}
                    strokeWidth={focused ? 2.6 : 1}
                    strokeDasharray={node.isSpouse ? "5 3" : undefined}
                  />
                  <rect x="0" y="0" width="4" height={CARD_H} rx="2" fill={color} opacity="0.85" />
                  <defs>
                    <clipPath id={clip}>
                      <circle cx="21" cy="23" r="11" />
                    </clipPath>
                  </defs>
                  {settings.showAvatar && person.avatar ? (
                    <image
                      href={person.avatar}
                      x="10"
                      y="12"
                      width="22"
                      height="22"
                      clipPath={`url(#${clip})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <>
                      <circle cx="21" cy="23" r="11" fill={color} opacity="0.92" />
                      <text
                        x="21"
                        y="27"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#fff8e9"
                        fontFamily="'Be Vietnam Pro', sans-serif"
                      >
                        {initials(person.name)}
                      </text>
                    </>
                  )}
                  <text
                    x="39"
                    y="17"
                    fontSize="7.6"
                    fontWeight="600"
                    letterSpacing="0.6"
                    fill={palette.deep}
                    opacity="0.65"
                    fontFamily="'Be Vietnam Pro', sans-serif"
                  >
                    {truncate(person.title || `ĐỜI ${isGen(node)}`, 22)}
                  </text>
                  <text
                    x="39"
                    y="32"
                    fontSize="11"
                    fontWeight="600"
                    fill="#3d2a1e"
                    fontFamily="'Be Vietnam Pro', sans-serif"
                  >
                    {truncate(person.name, 18)}
                  </text>
                  {settings.showDates ? (
                    <text
                      x="39"
                      y="48"
                      fontSize="8"
                      fill="#8a6a52"
                      fontFamily="'Be Vietnam Pro', sans-serif"
                    >
                      {truncate(lifeSpan(person), 26)}
                    </text>
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
              transform={`translate(${decoration.x + size + 6}, ${decoration.y + top - 14})`}
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
