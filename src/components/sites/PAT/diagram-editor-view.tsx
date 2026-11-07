"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Columns3,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  Frame,
  Grid3x3,
  ImagePlus,
  Info,
  Loader2,
  Magnet,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Printer,
  Redo2,
  Rows3,
  Save,
  ScrollText,
  Search,
  Trash2,
  Type,
  Undo2,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import { useGenealogy } from "./store";
import type {
  Decoration,
  DiagramTuning,
  FamilyTree,
  GenerationStyle,
  Person,
  PersonStyle,
  TreeNode,
} from "./types";
import {
  cardOrientationFor,
  defaultGenerationCardScale,
  FRAME_CORNER_CLEARANCE,
  GENERATION_LABEL_CARD_SCALE,
  generationBandMetrics,
  generationTag,
  normalizeBanner,
  normalizeCouplets,
  normalizeTuning,
} from "./types";
import { computeGenerations, sortPersons, uid } from "./utils";
import { classifyClan } from "./clan";
import { computeLayout } from "./layout";
import { computeBranchScope, parseBranchView, type BranchViewOptions } from "./branch-view";
import {
  DiagramCanvas,
  bannerTopFor,
  coupletBounds,
  coupletOffsets,
  contentOrigin,
  diagramDimensions,
  paperUnitsFor,
  dragonBounds,
  dragonOffsets,
  frameThickness,
  treeTop,
} from "./diagram-canvas";
import { DECOR_CATEGORIES, DECOR_ITEMS, type DecorSlot } from "./decor-library";
import { customToDecorItem, useCustomDecor } from "./decor-library-store";
import {
  dateStamp,
  exportBackup,
  exportDiagramPng,
  exportMembersCsv,
  paperDimensions,
  printSvgDiagram,
  safeName,
} from "./export";
import { TreeShell } from "./app-shell";
import {
  BannerInspector,
  DecorationInspector,
  GenerationInspector,
  PersonInspector,
  WholeDiagramInspector,
} from "./diagram-inspector";
import { Avatar, Field, Segmented, Sheet, SheetRow, ZoomBar } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";

type Positions = Record<string, { x: number; y: number }>;

const SNAP_SIZE = 24;
const ALIGN_THRESHOLD = 6;
const DRAFT_INTERVAL_MS = 15_000;

function readFlag(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === "1";
}

function readText(key: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được tệp"));
    reader.readAsDataURL(file);
  });
}

function snapAxis(value: number, target: number) {
  return Math.abs(value - target) <= ALIGN_THRESHOLD ? target : value;
}

type EditorScope =
  | { kind: "diagram" }
  | { kind: "generation"; generation: number }
  | { kind: "person"; memberId: string }
  | { kind: "banner" }
  | { kind: "decoration"; decorationId: string };

interface DragState {
  kind: "node" | "decoration" | "resize" | "dragon" | "couplet" | "banner" | "nodeResize" | "pan";
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW?: number;
  origH?: number;
  aspect?: number;
  side?: "left" | "right";
  generation?: number;
  origScale?: number;
  origShiftY?: number;
  unitId?: string;
  unitBase?: Record<string, number>;
  unitMinLeft?: number;
  unitMaxLeft?: number;
  snapshot: Positions;
}

interface SafeBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function decorationBox(item: Decoration) {
  if (item.type === "image") {
    return { w: item.width ?? 120, h: item.height ?? 90 };
  }
  return { w: Math.max(80, item.content.length * 8), h: Math.max(20, (item.fontSize ?? 16) * 1.4) };
}

function clampToSafeBox(x: number, y: number, w: number, h: number, box: SafeBox) {
  return {
    x: Math.round(Math.min(Math.max(x, box.minX), Math.max(box.minX, box.maxX - w))),
    y: Math.round(Math.min(Math.max(y, box.minY), Math.max(box.minY, box.maxY - h))),
  };
}

function resizeInSafeBox(origW: number, dx: number, aspect: number, x: number, y: number, box: SafeBox) {
  const maxWidth = Math.max(24, Math.min(640, Math.floor(box.maxX - x)));
  const maxHeight = Math.max(12, Math.floor(box.maxY - y));
  let width = Math.max(24, Math.min(maxWidth, Math.round(origW + dx)));
  let height = Math.max(12, Math.round(width / aspect));
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.max(24, Math.round(height * aspect));
  }
  return { width, height };
}

const MIN_UNIT_GAP = 16;

/**
 * Khoảng x mà cụm thẻ được phép dịch: không vượt qua cụm kế bên trong cùng
 * đời (giữ nguyên thứ tự gia đình) và không vượt biên bản vẽ.
 */
function unitDragRange(
  layout: ReturnType<typeof computeLayout>,
  node: TreeNode,
  bandLeft: number,
) {
  const unit = layout.nodes.filter((entry) => entry.unitId === node.unitId);
  const left = Math.min(...unit.map((entry) => entry.x));
  const right = Math.max(...unit.map((entry) => entry.x + entry.width));
  const width = right - left;
  const hardMax = Math.max(bandLeft, layout.width - bandLeft - width);
  let lower = bandLeft;
  let upper = hardMax;
  for (const entry of layout.nodes) {
    if (entry.generation !== node.generation || entry.unitId === node.unitId) continue;
    if (entry.x + entry.width <= left + 0.5) {
      lower = Math.max(lower, entry.x + entry.width + MIN_UNIT_GAP);
    } else if (entry.x >= right - 0.5) {
      upper = Math.min(upper, entry.x - MIN_UNIT_GAP - width);
    }
  }
  return {
    minLeft: Math.min(left, Math.max(bandLeft, lower)),
    maxLeft: Math.max(left, Math.min(hardMax, upper)),
  };
}

export function DiagramEditorView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { setPositions, setDecoration, removeDecoration, setDesign, updateTree } = useGenealogy();
  const viewportRef = useRef<HTMLDivElement>(null);
  const decorationsRef = useRef<Decoration[]>(tree.decorations);
  const overridesRef = useRef<Positions>(tree.positions);

  const [overrides, setOverrides] = useState<Positions>(tree.positions);
  const [past, setPast] = useState<Positions[]>([]);
  const [future, setFuture] = useState<Positions[]>([]);
  const [decorations, setDecorations] = useState<Decoration[]>(tree.decorations);
  const [scope, setScope] = useState<EditorScope>({ kind: "diagram" });
  const [showGrid, setShowGrid] = useState(true);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragonPreview, setDragonPreview] = useState<{ x: number; y: number } | null>(null);
  const dragonPreviewRef = useRef<{ x: number; y: number } | null>(null);
  const [coupletPreview, setCoupletPreview] = useState<{ x: number; y: number } | null>(null);
  const coupletPreviewRef = useRef<{ x: number; y: number } | null>(null);
  const [bannerPreview, setBannerPreview] = useState<number | null>(null);
  const bannerPreviewRef = useRef<number | null>(null);
  const [panning, setPanning] = useState(false);
  const movedRef = useRef(false);
  const [fitScale, setFitScale] = useState(0.2);
  const [zoom, setZoom] = useState(1);
  const scale = Math.min(4, Math.max(0.02, fitScale * zoom));
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [decorOpen, setDecorOpen] = useState(false);
  const [decorMode, setDecorMode] = useState<"library" | "text" | "image">("library");
  const [editMember, setEditMember] = useState<Person | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guides, setGuides] = useState<{ x?: number; y?: number }[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pngScale, setPngScale] = useState(2);
  const [exporting, setExporting] = useState<{ step: number; label: string } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [branchParams, setBranchParams] = useState<BranchViewOptions | null>(null);
  const [branchTitleDraft, setBranchTitleDraft] = useState<string | null>(null);

  const tuning = useMemo(() => normalizeTuning(tree.design.tuning), [tree.design.tuning]);
  const branchScope = useMemo(
    () => (branchParams ? computeBranchScope(tree, branchParams) : null),
    [tree, branchParams],
  );
  const scopedTree = useMemo(
    () => (branchScope ? { ...tree, positions: {} } : tree),
    [tree, branchScope],
  );
  const baseLayout = useMemo(
    () => computeLayout(scopedTree, branchScope?.ids),
    [scopedTree, branchScope],
  );
  const layout = useMemo(
    () => (branchScope ? baseLayout : computeLayout({ ...tree, positions: overrides }, undefined)),
    [tree, overrides, branchScope, baseLayout],
  );
  const paper = useMemo(() => paperDimensions(tree), [tree]);
  const paperAspect = paper.widthMm / paper.heightMm;
  const paperUnits = useMemo(() => paperUnitsFor(tree, paper), [tree, paper]);
  const paperLabel = `${Math.round(paper.widthMm)} × ${Math.round(paper.heightMm)} mm`;
  const contentDims = useMemo(
    () => diagramDimensions(baseLayout, tree.design),
    [baseLayout, tree.design],
  );
  const dims = diagramDimensions(layout, tree.design, paperUnits);
  const gens = useMemo(() => computeGenerations(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const displayedCount = useMemo(
    () =>
      branchScope
        ? branchScope.ids.size
        : tree.members.filter((member) => clan.isDisplayed(member.id)).length,
    [branchScope, clan, tree.members],
  );
  const genCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const member of tree.members) {
      if (!clan.isDisplayed(member.id)) continue;
      const generation = gens.get(member.id);
      if (generation === undefined) continue;
      counts.set(generation, (counts.get(generation) ?? 0) + 1);
    }
    return counts;
  }, [clan, gens, tree.members]);
  const origin = contentOrigin(dims, layout, tuning.contentShiftY ?? 0);
  const contentFit = dims.fitScale || 1;
  const safeMarginMm = Math.max(0, Math.min(40, tree.design.printSafeMarginMm ?? 10));
  const pageScale = Math.min(dims.width / paper.widthMm, dims.height / paper.heightMm);
  const safeInset = safeMarginMm * pageScale;
  const safeBox = useMemo<SafeBox>(
    () => ({
      minX: (safeInset - origin.x) / contentFit,
      maxX: (dims.width - safeInset - origin.x) / contentFit,
      minY: (safeInset - origin.y) / contentFit,
      maxY: (dims.height - safeInset - origin.y) / contentFit,
    }),
    [safeInset, dims.width, dims.height, contentFit, origin.x, origin.y],
  );
  useEffect(() => {
    decorationsRef.current = decorations;
  }, [decorations]);

  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);

  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    return () => {
      if (savedRef.current) return;
      window.localStorage.setItem(
        `phatue.diagramDraft.${tree.id}`,
        JSON.stringify({ positions: overridesRef.current, at: new Date().toISOString() }),
      );
    };
  }, [tree.id]);

  useEffect(() => {
    if (saved) return;
    if (JSON.stringify(overrides) === JSON.stringify(tree.positions)) setSaved(true);
  }, [overrides, tree.positions, saved]);

  useEffect(() => {
    setSnapToGrid(readFlag(`phatue.diagramSnap.${tree.id}`, true));
    setSideCollapsed(readFlag(`phatue.diagramSide.${tree.id}`, false));
    setInspectorCollapsed(readFlag(`phatue.diagramInspector.${tree.id}`, false));
    setLastSavedAt(readText(`phatue.diagramSavedAt.${tree.id}`));
  }, [tree.id]);

  useEffect(() => {
    const parsed = parseBranchView(window.location.search);
    if (!parsed) return;
    setBranchParams(parsed);
    setBranchTitleDraft(parsed.title || null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`phatue.diagramSnap.${tree.id}`, snapToGrid ? "1" : "0");
  }, [snapToGrid, tree.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`phatue.diagramSide.${tree.id}`, sideCollapsed ? "1" : "0");
  }, [sideCollapsed, tree.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`phatue.diagramInspector.${tree.id}`, inspectorCollapsed ? "1" : "0");
  }, [inspectorCollapsed, tree.id]);

  const previousAspectRef = useRef(paperAspect);
  useEffect(() => {
    if (previousAspectRef.current === paperAspect) return;
    previousAspectRef.current = paperAspect;
    window.setTimeout(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) * 0.5);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) * 0.5);
    }, 60);
  }, [paperAspect]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const availableW = Math.max(160, el.clientWidth - 20);
      const availableH = Math.max(220, el.clientHeight - 20);
      const fit = Math.min(
        1,
        Math.max(0.02, Math.min(availableW / contentDims.width, availableH / contentDims.height)),
      );
      setFitScale(fit);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentDims.width, contentDims.height]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    const raw = readText(`phatue.diagramDraft.${tree.id}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { positions?: Positions; at?: string };
      if (!parsed?.positions || !Object.keys(parsed.positions).length) return;
      const baseX = new Map(baseLayout.nodes.map((node) => [node.id, node.x]));
      const changesX = Object.entries(parsed.positions).some(([memberId, position]) => {
        const savedX = tree.positions[memberId]?.x ?? baseX.get(memberId);
        return savedX !== position.x;
      });
      if (!changesX) return;
      setOverrides(parsed.positions);
      setSaved(false);
      showToast(`Đã khôi phục bản nháp lúc ${timeLabel(parsed.at ?? null)}`);
    } catch {
      window.localStorage.removeItem(`phatue.diagramDraft.${tree.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.id]);

  useEffect(() => {
    if (saved) return;
    const writeDraft = () => {
      window.localStorage.setItem(
        `phatue.diagramDraft.${tree.id}`,
        JSON.stringify({ positions: overridesRef.current, at: new Date().toISOString() }),
      );
    };
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      writeDraft();
    };
    const timer = window.setInterval(writeDraft, DRAFT_INTERVAL_MS);
    window.addEventListener("pagehide", writeDraft);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", writeDraft);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [saved, tree.id]);

  useEffect(() => {
    if (saved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved]);

  const selectScope = useCallback((next: EditorScope, reveal = false) => {
    setScope(next);
    if (reveal && window.matchMedia("(max-width: 1279px)").matches) setInspectorOpen(true);
  }, []);

  const pushHistory = useCallback((snapshot: Positions) => {
    setPast((prev) => [...prev.slice(-49), snapshot]);
    setFuture([]);
  }, []);

  const undo = () => {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setFuture((prev) => [overrides, ...prev]);
    setOverrides(previous);
    setPast((prev) => prev.slice(0, -1));
    setSaved(false);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setPast((prev) => [...prev, overrides]);
    setOverrides(next);
    setFuture((prev) => prev.slice(1));
    setSaved(false);
  };

  const branchTitle = branchTitleDraft ?? branchScope?.title ?? "";

  const save = () => {
    if (branchScope) {
      showToast("Chế độ xem chi — lựa chọn và bố cục không được lưu.");
      return;
    }
    setPositions(tree.id, overrides);
    const now = new Date().toISOString();
    setLastSavedAt(now);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`phatue.diagramSavedAt.${tree.id}`, now);
      window.localStorage.removeItem(`phatue.diagramDraft.${tree.id}`);
    }
    setSaved(true);
    showToast("Đã lưu bố cục phả đồ");
  };

  const shortcutsRef = useRef({ undo: () => {}, redo: () => {}, save: () => {} });
  shortcutsRef.current = { undo, redo, save };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        shortcutsRef.current.undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        shortcutsRef.current.redo();
      } else if (key === "s") {
        event.preventDefault();
        shortcutsRef.current.save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const autoArrange = () => {
    pushHistory(overrides);
    setOverrides({});
    setSaved(false);
    showToast("Đã sắp xếp lại theo thứ tự gia phả");
  };

  const updateTuning = useCallback(
    (patch: Partial<DiagramTuning>) => {
      setDesign(tree.id, { tuning: { ...tuning, ...patch } });
    },
    [tuning, tree.id, setDesign],
  );

  const updateGenerationStyle = useCallback(
    (generation: number, patch: Partial<GenerationStyle>) => {
      const styles = { ...(tuning.generationStyles ?? {}) };
      const key = String(generation);
      styles[key] = { ...(styles[key] ?? {}), ...patch };
      setDesign(tree.id, { tuning: { ...tuning, generationStyles: styles } });
    },
    [tuning, tree.id, setDesign],
  );

  const resetGenerationStyle = (generation: number) => {
    const styles = { ...(tuning.generationStyles ?? {}) };
    delete styles[String(generation)];
    updateTuning({ generationStyles: styles });
  };

  const updatePersonStyle = (memberId: string, patch: Partial<PersonStyle>) => {
    const styles = { ...(tuning.personStyles ?? {}) };
    styles[memberId] = { ...(styles[memberId] ?? {}), ...patch };
    updateTuning({ personStyles: styles });
  };

  const resolveGeneration = (generation: number) => {
    const style = tuning.generationStyles?.[String(generation)] ?? {};
    return {
      orientation: cardOrientationFor(tree.design, generation, genCounts.get(generation)),
      showAvatar: style.showAvatar ?? tree.design.showAvatar,
      showTitle: style.showTitle ?? tree.design.showTitle !== false,
      showName: style.showName ?? tree.design.showName !== false,
      showDates: style.showDates ?? tree.design.showDates !== false,
      showDeathAnniversary: style.showDeathAnniversary ?? tree.design.showDeathAnniversary === true,
      fontFamily: style.fontFamily ?? tuning.fontFamily,
      fontSize: style.fontSize ?? tuning.fontSize,
      lineCount: style.lineCount ?? tuning.lineCount,
      cardColor: style.cardColor,
      cardScale: style.cardScale ?? defaultGenerationCardScale(generation, layout.topGenerations),
    };
  };

  const resetDiagram = () => {
    pushHistory(overrides);
    setOverrides({});
    setDesign(tree.id, { tuning: undefined });
    setSaved(false);
    showToast("Đã trả bố cục và kiểu trình bày về mặc định");
  };

  const resetPosition = (memberId: string) => {
    const ids = new Set(
      baseLayout.nodes
        .filter((node) => node.unitId === memberId || node.id === memberId)
        .map((node) => node.id),
    );
    const next = { ...overrides };
    let changed = false;
    for (const id of ids) {
      if (id in next) {
        delete next[id];
        changed = true;
      }
    }
    if (!changed) return;
    pushHistory(overrides);
    setOverrides(next);
    setSaved(false);
    showToast("Đã trả ô về đúng bố cục");
  };

  const nodeDown = (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => {
    if (event.button !== 0) return;
    if (branchScope) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id],
      );
      return;
    }
    setSelectedIds([]);
    movedRef.current = false;
    setFocusId(node.id);
    selectScope({ kind: "person", memberId: node.id }, true);
    const labelGap = Math.round(73 * tuning.frameScale);
    const bandLeft =
      tree.design.showGenerationLabels !== false
        ? Math.round(
            Math.round((FRAME_CORNER_CLEARANCE * tuning.frameScale * 92) / 180) +
              labelGap +
              Math.max(
                0,
                ...layout.generations.map(
                  (row) =>
                    generationBandMetrics(
                      row.label ?? generationTag(row.generation),
                      (tuning.generationLabelScale ?? 1) * GENERATION_LABEL_CARD_SCALE,
                    ).width,
                ),
              ) +
              labelGap,
          )
        : 6;
    const range = unitDragRange(layout, node, bandLeft);
    setDrag({
      kind: "node",
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: node.x,
      origY: node.y,
      origShiftY: tuning.contentShiftY ?? 0,
      unitId: node.unitId,
      unitBase: Object.fromEntries(
        layout.nodes
          .filter((entry) => entry.unitId === node.unitId)
          .map((entry) => [entry.id, entry.x]),
      ),
      unitMinLeft: range.minLeft,
      unitMaxLeft: range.maxLeft,
      snapshot: overrides,
    });
  };

  const decorationDown = (event: ReactPointerEvent<SVGGElement>, decoration: Decoration) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    if (decoration.locked) {
      selectScope({ kind: "decoration", decorationId: decoration.id }, true);
      showToast("Trang trí đang khoá — mở khoá trong bảng chỉnh để di chuyển");
      return;
    }
    movedRef.current = false;
    selectScope({ kind: "decoration", decorationId: decoration.id }, true);
    setDrag({
      kind: "decoration",
      id: decoration.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: decoration.x,
      origY: decoration.y,
      snapshot: overrides,
    });
  };

  const decorationResizeDown = (event: ReactPointerEvent<SVGGElement>, decoration: Decoration) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    movedRef.current = false;
    const width = decoration.width ?? 120;
    const height = decoration.height ?? 90;
    selectScope({ kind: "decoration", decorationId: decoration.id }, true);
    setDrag({
      kind: "resize",
      id: decoration.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: decoration.x,
      origY: decoration.y,
      origW: width,
      origH: height,
      aspect: height > 0 ? width / height : 1,
      snapshot: overrides,
    });
  };

  const bannerDown = (event: ReactPointerEvent<SVGGElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    movedRef.current = false;
    selectScope({ kind: "banner" }, true);
    const top = bannerTopFor(dims.width, dims.height, tree.design);
    bannerPreviewRef.current = top;
    setBannerPreview(top);
    setDrag({
      kind: "banner",
      id: "banner",
      startX: event.clientX,
      startY: event.clientY,
      origX: 0,
      origY: top,
      snapshot: overrides,
    });
  };

  const dragonDown = (event: ReactPointerEvent<SVGGElement>, side: "left" | "right") => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    movedRef.current = false;
    selectScope({ kind: "banner" }, true);
    const banner = normalizeBanner(tree.design.banner);
    const bounds = dragonBounds(
      dims.width,
      dims.height,
      bannerTopFor(dims.width, dims.height, tree.design),
      banner,
    );
    const { dx, dy } = dragonOffsets(bounds, banner);
    dragonPreviewRef.current = { x: dx, y: dy };
    setDragonPreview({ x: dx, y: dy });
    setDrag({
      kind: "dragon",
      id: side,
      side,
      startX: event.clientX,
      startY: event.clientY,
      origX: dx,
      origY: dy,
      snapshot: overrides,
    });
  };

  const coupletBoundsNow = useCallback(() => {
    const banner = normalizeBanner(tree.design.banner);
    const bannerTop = bannerTopFor(dims.width, dims.height, tree.design);
    const box = dragonBounds(dims.width, dims.height, bannerTop, banner);
    const dragon = dragonOffsets(box, banner);
    const couplets = normalizeCouplets(tree.design.couplets);
    const bounds = coupletBounds(
      dims.width,
      dims.height,
      bannerTop,
      frameThickness(dims.width, tree.design),
      banner,
      box,
      dragon,
      couplets,
    );
    return { bounds, couplets };
  }, [tree.design, dims.width, dims.height]);

  const coupletDown = (event: ReactPointerEvent<SVGGElement>, side: "left" | "right") => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const { bounds, couplets } = coupletBoundsNow();
    if (!couplets.enabled) return;
    movedRef.current = false;
    selectScope({ kind: "banner" }, true);
    const { dx, dy } = coupletOffsets(bounds, couplets);
    coupletPreviewRef.current = { x: dx, y: dy };
    setCoupletPreview({ x: dx, y: dy });
    setDrag({
      kind: "couplet",
      id: side,
      side,
      startX: event.clientX,
      startY: event.clientY,
      origX: dx,
      origY: dy,
      snapshot: overrides,
    });
  };

  const nodeResizeDown = (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => {
    if (event.button !== 0) return;
    if (branchScope) return;
    event.stopPropagation();
    event.preventDefault();
    movedRef.current = false;
    setFocusId(node.id);
    selectScope({ kind: "person", memberId: node.id }, true);
    setDrag({
      kind: "nodeResize",
      id: node.id,
      generation: node.generation,
      startX: event.clientX,
      startY: event.clientY,
      origX: node.x,
      origY: node.y,
      origW: node.width,
      origH: node.height,
      aspect: node.height > 0 ? node.width / node.height : 1,
      origScale:
        tuning.generationStyles?.[String(node.generation)]?.cardScale ??
        defaultGenerationCardScale(node.generation, layout.topGenerations),
      snapshot: overrides,
    });
  };

  const panDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = viewportRef.current;
    if (!el) return;
    movedRef.current = false;
    setPanning(true);
    setDrag({
      kind: "pan",
      id: "viewport",
      startX: event.clientX,
      startY: event.clientY,
      origX: el.scrollLeft,
      origY: el.scrollTop,
      snapshot: overrides,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: PointerEvent) => {
      if (drag.kind === "pan") {
        if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 2) {
          movedRef.current = true;
        }
        const el = viewportRef.current;
        if (el) {
          el.scrollLeft = drag.origX + (drag.startX - event.clientX);
          el.scrollTop = drag.origY + (drag.startY - event.clientY);
        }
        return;
      }
      // Chuyển con trỏ sang đơn vị giấy; nội dung có thể đang thu vừa khổ nên chia thêm hệ số thu.
      const dxPaper = (event.clientX - drag.startX) / scale;
      const dyPaper = (event.clientY - drag.startY) / scale;
      const dx = dxPaper / contentFit;
      const dy = dyPaper / contentFit;
      if (Math.abs(dxPaper) + Math.abs(dyPaper) > 2) movedRef.current = true;
      if (drag.kind === "node") {
        const node = layout.nodes.find((entry) => entry.id === drag.id);
        if (!node) return;
        // Kéo dọc thẻ ở hàng trên cùng → dịch cả khối phả đồ (phục vụ dàn trang).
        if (!branchScope && Math.abs(dyPaper) > Math.abs(dxPaper) && Math.abs(dyPaper) > 4) {
          // "Thẻ đầu tiên" = thẻ có tọa độ y nhỏ nhất (hàng trên cùng), kể cả tiền tổ.
          const topY = layout.nodes.length
            ? Math.min(...layout.nodes.map((entry) => entry.y))
            : node.y;
          if (node.y === topY) {
            const base = treeTop(dims, layout, 0);
            const upper = treeTop(dims, layout, Number.MAX_SAFE_INTEGER);
            const min = -Math.round(base);
            const max = Math.round(upper - base);
            const next = Math.max(min, Math.min(max, Math.round((drag.origShiftY ?? 0) + dyPaper)));
            updateTuning({ contentShiftY: next });
            return;
          }
        }
        const unitId = drag.unitId ?? node.unitId;
        const unit = layout.nodes.filter((entry) => entry.unitId === unitId);
        let x = Math.max(6, Math.round(drag.origX + dx));
        const nextGuides: { x?: number; y?: number }[] = [];
        if (snapToGrid) {
          x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
          let bestX: { delta: number; guide: number } | null = null;
          for (const other of layout.nodes) {
            if (other.unitId === unitId) continue;
            const xTargets = [
              { self: x, guide: other.x },
              { self: x + node.width / 2, guide: other.x + other.width / 2 },
              { self: x + node.width, guide: other.x + other.width },
            ];
            for (const target of xTargets) {
              const delta = snapAxis(target.self, target.guide) - target.self;
              if (Math.abs(delta) <= ALIGN_THRESHOLD && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
                bestX = { delta, guide: target.guide };
              }
            }
          }
          if (bestX) {
            x += bestX.delta;
            nextGuides.push({ x: bestX.guide });
          }
        }
        const baseOf = (entry: { id: string; x: number }) =>
          drag.unitBase?.[entry.id] ?? drag.snapshot[entry.id]?.x ?? entry.x;
        const wantedShift = x - drag.origX;
        const leftMost = Math.min(...unit.map(baseOf));
        const minShift = (drag.unitMinLeft ?? leftMost) - leftMost;
        const maxShift = (drag.unitMaxLeft ?? leftMost) - leftMost;
        const shift = Math.max(minShift, Math.min(maxShift, wantedShift));
        if (Math.abs(shift - wantedShift) > 0.5) nextGuides.length = 0;
        setGuides(nextGuides);
        setOverrides((prev) => {
          const next = { ...prev };
          for (const entry of unit) {
            next[entry.id] = { x: Math.round(baseOf(entry) + shift), y: drag.origY };
          }
          return next;
        });
      } else if (drag.kind === "resize") {
        const aspect = drag.aspect && drag.aspect > 0 ? drag.aspect : 1;
        const { width, height } = resizeInSafeBox(
          drag.origW ?? 120,
          dx,
          aspect,
          drag.origX,
          drag.origY,
          safeBox,
        );
        setDecorations((prev) =>
          prev.map((item) => (item.id === drag.id ? { ...item, width, height } : item)),
        );
      } else if (drag.kind === "dragon") {
        const banner = normalizeBanner(tree.design.banner);
        const bounds = dragonBounds(
          dims.width,
          dims.height,
          bannerTopFor(dims.width, dims.height, tree.design),
          banner,
        );
        const outward = drag.side === "left" ? -dxPaper : dxPaper;
        const next = {
          x: Math.max(bounds.dxMin, Math.min(bounds.dxMax, drag.origX + outward)),
          y: Math.max(bounds.dyMin, Math.min(bounds.dyMax, drag.origY + dyPaper)),
        };
        dragonPreviewRef.current = next;
        setDragonPreview(next);
      } else if (drag.kind === "couplet") {
        const { bounds } = coupletBoundsNow();
        const outward = drag.side === "left" ? -dxPaper : dxPaper;
        const next = {
          x: Math.max(bounds.dxMin, Math.min(bounds.dxMax, drag.origX + outward)),
          y: Math.max(bounds.dyMin, Math.min(bounds.dyMax, drag.origY + dyPaper)),
        };
        coupletPreviewRef.current = next;
        setCoupletPreview(next);
      } else if (drag.kind === "banner") {
        const minTop = frameThickness(dims.width, tree.design);
        const maxTop = Math.max(minTop, dims.height * 0.13);
        const next = Math.max(minTop, Math.min(maxTop, drag.origY + dyPaper));
        bannerPreviewRef.current = next;
        setBannerPreview(next);
      } else if (drag.kind === "nodeResize") {
        const own = Math.max(0.6, Math.min(1.8, drag.origScale ?? 1));
        const aspect = drag.aspect && drag.aspect > 0 ? drag.aspect : 1;
        const deltaW = Math.abs(dx) >= Math.abs(dy * aspect) ? dx : dy * aspect;
        const ratio = 1 + deltaW / Math.max(1, drag.origW ?? 168);
        const nextScale = Math.max(0.6, Math.min(1.8, own * ratio));
        updateGenerationStyle(drag.generation ?? 0, { cardScale: Math.round(nextScale * 20) / 20 });
      } else {
        let x = Math.round(drag.origX + dx);
        let y = Math.round(drag.origY + dy);
        if (snapToGrid) {
          x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
          y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;
        }
        const item = decorationsRef.current.find((entry) => entry.id === drag.id);
        const { w, h } = decorationBox(item ?? { id: drag.id, type: "image", content: "", x: 0, y: 0 });
        const next = clampToSafeBox(x, y, w, h, safeBox);
        setDecorations((prev) =>
          prev.map((entry) => (entry.id === drag.id ? { ...entry, ...next } : entry)),
        );
      }
    };
    const onUp = (event: PointerEvent) => {
      setGuides([]);
      if (drag.kind === "pan") {
        setPanning(false);
        if (!movedRef.current) {
          selectScope({ kind: "diagram" });
          setFocusId(null);
          setSelectedIds([]);
        }
        setDrag(null);
        return;
      }
      if (drag.kind === "node") {
        if (movedRef.current) {
          pushHistory(drag.snapshot);
          setSaved(false);
        }
      } else if (drag.kind === "dragon") {
        const preview = dragonPreviewRef.current;
        if (preview && movedRef.current) {
          setDesign(tree.id, {
            banner: {
              ...normalizeBanner(tree.design.banner),
              dragonOffsetX: Math.round(preview.x * 10) / 10,
              dragonOffsetY: Math.round(preview.y * 10) / 10,
            },
          });
          setSaved(false);
        }
        dragonPreviewRef.current = null;
        setDragonPreview(null);
      } else if (drag.kind === "couplet") {
        const preview = coupletPreviewRef.current;
        if (preview && movedRef.current) {
          setDesign(tree.id, {
            couplets: {
              ...normalizeCouplets(tree.design.couplets),
              offsetX: Math.round(preview.x * 10) / 10,
              offsetY: Math.round(preview.y * 10) / 10,
            },
          });
          setSaved(false);
        }
        coupletPreviewRef.current = null;
        setCoupletPreview(null);
      } else if (drag.kind === "banner") {
        const preview = bannerPreviewRef.current;
        if (preview != null && movedRef.current) {
          setDesign(tree.id, {
            banner: {
              ...normalizeBanner(tree.design.banner),
              offsetRatio: Math.round((preview / dims.height) * 10000) / 10000,
            },
          });
          setSaved(false);
        }
        bannerPreviewRef.current = null;
        setBannerPreview(null);
      } else if (drag.kind === "nodeResize") {
        if (movedRef.current) {
          setSaved(false);
          showToast(`Đã đổi cỡ thẻ cho ${generationTag(drag.generation ?? 0)} và toàn bộ thẻ cùng đời`);
        }
      } else if (drag.kind === "resize") {
        const dx = (event.clientX - drag.startX) / (scale * contentFit);
        const aspect = drag.aspect && drag.aspect > 0 ? drag.aspect : 1;
        const { width, height } = resizeInSafeBox(
          drag.origW ?? 120,
          dx,
          aspect,
          drag.origX,
          drag.origY,
          safeBox,
        );
        const current = decorationsRef.current.find((item) => item.id === drag.id);
        if (current) {
          const decoration = { ...current, width, height };
          setDecorations((prev) => prev.map((item) => (item.id === drag.id ? decoration : item)));
          setDecoration(tree.id, decoration);
        }
      } else {
        const decoration = decorationsRef.current.find((item) => item.id === drag.id);
        if (decoration) setDecoration(tree.id, decoration);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [
    drag,
    scale,
    contentFit,
    pushHistory,
    selectScope,
    showToast,
    coupletBoundsNow,
    updateGenerationStyle,
    tree.id,
    tree.design,
    dims,
    setDesign,
    setDecoration,
    snapToGrid,
    layout,
    safeBox,
    branchScope,
    updateTuning,
  ]);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return tree.members
      .filter((member) => member.name.toLowerCase().includes(needle) || member.birthDate?.includes(needle))
      .sort(sortPersons)
      .slice(0, 8);
  }, [tree.members, query]);

  const focusMember = (member: Person) => {
    setFocusId(member.id);
    setSideOpen(false);
    const node = layout.nodes.find((item) => item.id === member.id);
    const el = viewportRef.current;
    if (!node || !el) return;
    el.scrollTo({
      left: Math.max(
        0,
        (origin.x + contentFit * (node.x + node.width / 2)) * scale - el.clientWidth / 2,
      ),
      top: Math.max(
        0,
        (origin.y + contentFit * (node.y + node.height / 2)) * scale - el.clientHeight / 2,
      ),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (!focus) return;
    const person = tree.members.find((member) => member.id === focus);
    if (person) window.setTimeout(() => focusMember(person), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("grid") === "1") setShowGrid(true);
  }, []);

  const findSvg = () => document.getElementById("pat-diagram-svg") as SVGSVGElement | null;

  const downloadPng = async () => {
    if (exporting) return;
    setExporting({ step: 0.02, label: "Đang chuẩn bị phả đồ" });
    try {
      await exportDiagramPng(
        "pat-diagram-svg",
        `${safeName(tree.name)}-pha-do-${dateStamp()}.png`,
        "#fdf6e7",
        { scale: pngScale, onProgress: (step, label) => setExporting({ step, label }) },
      );
      setExportOpen(false);
      showToast(
        `Đã tải PNG ${Math.round(dims.width * pngScale)} × ${Math.round(dims.height * pngScale)} px`,
      );
    } catch {
      showToast("Không tạo được PNG, thử in thành PDF");
    } finally {
      window.setTimeout(() => setExporting(null), 500);
    }
  };

  const printDiagram = () => {
    const svg = findSvg();
    if (svg) void printSvgDiagram(svg, tree);
    setExportOpen(false);
  };

  const exitBranchView = () => {
    setBranchParams(null);
    setBranchTitleDraft(null);
    router.replace(`/gia-pha/${tree.id}/ve-pha-do`);
  };

  const openDecor = (mode: "library" | "text" | "image") => {
    setDecorMode(mode);
    setDecorOpen(true);
  };

  const addDecoration = (input: {
    type: "text" | "image";
    content: string;
    slot?: DecorSlot;
    fontSize?: number;
    color?: string;
    width?: number;
    height?: number;
    flip?: boolean;
  }) => {
    const width = input.width ?? 120;
    const height = input.height ?? 90;
    let x = Math.max(12, Math.round(dims.contentW / 2 - width / 2));
    let y = Math.max(12, 8 + decorations.length * 26);
    if (input.slot === "left") {
      x = 56;
      y = 8;
    } else if (input.slot === "right") {
      x = Math.max(24, dims.contentW - width - 56);
      y = 8;
    }
    const draft: Decoration = {
      id: uid("dec"),
      type: input.type,
      content: input.content,
      x,
      y,
      fontSize: input.fontSize,
      color: input.color,
      width: input.type === "image" ? width : undefined,
      height: input.type === "image" ? height : undefined,
      flip: input.flip,
    };
    const box = decorationBox(draft);
    const placed = clampToSafeBox(draft.x, draft.y, box.w, box.h, safeBox);
    const decoration: Decoration = { ...draft, x: placed.x, y: placed.y };
    const next = [...decorations, decoration];
    setDecorations(next);
    setDecoration(tree.id, decoration);
    setDecorOpen(false);
    selectScope({ kind: "decoration", decorationId: decoration.id }, true);
    showToast(input.type === "text" ? "Đã thêm chữ trang trí" : "Đã thêm ảnh trang trí");
  };

  const addDroppedFiles = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      showToast("Chỉ hỗ trợ tệp ảnh PNG, JPG hoặc SVG");
      return;
    }
    let added = 0;
    for (const file of images) {
      if (file.size > 2_500_000) {
        showToast(`${file.name} lớn hơn 2,5 MB`);
        continue;
      }
      try {
        const src = await readFileAsDataUrl(file);
        addDecoration({ type: "image", content: src, width: 160, height: 120 });
        added += 1;
      } catch {
        showToast(`Không đọc được ${file.name}`);
      }
    }
    if (added) showToast(`Đã thêm ${added} ảnh trang trí từ tệp`);
  };

  const updateDecoration = (decoration: Decoration) => {
    setDecorations((prev) => prev.map((item) => (item.id === decoration.id ? decoration : item)));
    setDecoration(tree.id, decoration);
  };

  const deleteDecoration = (id: string) => {
    removeDecoration(tree.id, id);
    setDecorations((prev) => prev.filter((item) => item.id !== id));
    if (scope.kind === "decoration" && scope.decorationId === id) selectScope({ kind: "diagram" });
  };

  const scaleDecoration = (decoration: Decoration, factor: number) => {
    if (decoration.type === "text") {
      const fontSize = Math.max(8, Math.min(96, Math.round((decoration.fontSize ?? 16) * factor)));
      updateDecoration({ ...decoration, fontSize });
      return;
    }
    const currentW = decoration.width ?? 120;
    const currentH = decoration.height ?? 90;
    const width = Math.max(24, Math.min(640, Math.round(currentW * factor)));
    const height = Math.max(12, Math.round(currentH * (width / currentW)));
    updateDecoration({ ...decoration, width, height });
  };

  const duplicateDecoration = (decoration: Decoration) => {
    const copy: Decoration = {
      ...decoration,
      id: uid("dec"),
      x: decoration.x + 24,
      y: decoration.y + 24,
      locked: false,
    };
    const next = [...decorations, copy];
    setDecorations(next);
    updateTree(tree.id, { decorations: next });
    selectScope({ kind: "decoration", decorationId: copy.id }, true);
    showToast("Đã nhân bản trang trí");
  };

  const moveDecorationLayer = (decoration: Decoration, direction: "up" | "down") => {
    const index = decorations.findIndex((item) => item.id === decoration.id);
    if (index < 0) return;
    const target = direction === "up" ? index + 1 : index - 1;
    if (target < 0 || target >= decorations.length) return;
    const next = [...decorations];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setDecorations(next);
    updateTree(tree.id, { decorations: next });
    showToast(direction === "up" ? "Đã đưa trang trí lên trên" : "Đã đưa trang trí xuống dưới");
  };

  const toggleDecorationLock = (decoration: Decoration) => {
    updateDecoration({ ...decoration, locked: !decoration.locked });
    showToast(decoration.locked ? "Đã mở khoá trang trí" : "Đã khoá vị trí trang trí");
  };

  const alignSelected = (axis: "x" | "y") => {
    if (selectedIds.length < 2) return;
    const anchorId = selectedIds[0];
    const anchorNode = baseLayout.nodes.find((node) => node.id === anchorId);
    if (!anchorNode) return;
    const anchor = overrides[anchorId] ?? { x: anchorNode.x, y: anchorNode.y };
    const next = { ...overrides };
    for (const node of baseLayout.nodes) {
      if (!selectedIds.includes(node.id)) continue;
      const current = next[node.id] ?? { x: node.x, y: node.y };
      next[node.id] = {
        x: axis === "x" ? anchor.x : current.x,
        y: axis === "y" ? anchor.y : current.y,
      };
    }
    pushHistory(overrides);
    setOverrides(next);
    setSaved(false);
    showToast(axis === "x" ? "Đã căn cột theo thẻ đầu tiên" : "Đã căn hàng theo thẻ đầu tiên");
  };

  const copyStyleToSelection = () => {
    if (selectedIds.length < 2) return;
    const [sourceId, ...rest] = selectedIds;
    const styles = { ...(tuning.personStyles ?? {}) };
    const source = styles[sourceId] ?? {};
    for (const id of rest) styles[id] = { ...source };
    updateTuning({ personStyles: styles });
    showToast(`Đã sao chép kiểu sang ${rest.length} thẻ`);
  };

  const resetPersonStyle = (memberId: string) => {
    const styles = { ...(tuning.personStyles ?? {}) };
    delete styles[memberId];
    updateTuning({ personStyles: styles });
    showToast("Đã trả kiểu thẻ về mặc định");
  };

  const rowLabel = (generation: number) =>
    layout.generations.find((entry) => entry.generation === generation)?.label ?? generationTag(generation);
  const nonAncestorRows = layout.generations.filter((row) => !row.isAncestor);
  const ancestorRows = layout.generations.filter((row) => row.isAncestor);

  // Biên độ dịch dọc toàn khối: từ vị trí tự xếp (shiftY = 0) tới đáy mép trong của khung.
  // Làm tròn hai đầu về bội của 10 để giá trị 0 nằm đúng bước nhảy của slider (step 10).
  const baseShiftY = treeTop(dims, layout, 0);
  const maxShiftY = treeTop(dims, layout, Number.MAX_SAFE_INTEGER);
  const shiftRange = {
    min: Math.floor(-baseShiftY / 10) * 10,
    max: Math.ceil((maxShiftY - baseShiftY) / 10) * 10,
  };

  const scopeLabel =
    scope.kind === "generation"
      ? rowLabel(scope.generation)
      : scope.kind === "person"
        ? tree.members.find((member) => member.id === scope.memberId)?.name ?? "Thành viên"
        : scope.kind === "banner"
          ? "Hoành phi & câu đối"
          : scope.kind === "decoration"
            ? "Trang trí"
            : "Cả phả đồ";

  const hintText = (() => {
    if (branchScope) {
      return `${branchTitle || branchScope.title} · ${branchScope.count} thành viên nội tộc · chỉ xem, không lưu thay đổi`;
    }
    if (scope.kind === "generation") {
      const row = layout.generations.find((entry) => entry.generation === scope.generation);
      return `Đang chỉnh ${row?.label ?? rowLabel(scope.generation)} · ${row?.count ?? 0} thành viên · bấm ra nền để chọn cả phả đồ`;
    }
    if (scope.kind === "person") {
      return `${scopeLabel} · kéo ô để đổi vị trí · bấm ra nền để chọn cả phả đồ`;
    }
    if (scope.kind === "banner") {
      return "Đang chỉnh hoành phi & câu đối · kéo rồng/câu đối trên phả đồ để dịch vị trí";
    }
    if (scope.kind === "decoration") {
      return "Đang chỉnh trang trí · kéo để di chuyển, kéo ô vuông góc để đổi kích thước";
    }
    return `${displayedCount} thành viên · ${nonAncestorRows.length} đời${
      ancestorRows.length ? ` · ${ancestorRows.length} bậc tiền tổ` : ""
    }`;
  })();

  const renderInspector = (onClose?: () => void) => {
    if (scope.kind === "generation") {
      const generation = scope.generation;
      const row = layout.generations.find((entry) => entry.generation === generation);
      const style = tuning.generationStyles?.[String(generation)];
      const sample = tree.members.find(
        (member) => gens.get(member.id) === generation && clan.isDisplayed(member.id),
      );
      const members = layout.nodes
        .filter((node) => node.generation === generation)
        .sort((a, b) => a.x - b.x)
        .map((node) => node.person);
      return (
        <GenerationInspector
          generation={generation}
          count={row?.count ?? 0}
          resolved={resolveGeneration(generation)}
          extraFields={style?.extraFields ?? tuning.extraFields}
          sample={sample}
          members={members}
          onStyle={(patch) => updateGenerationStyle(generation, patch)}
          onReset={() => resetGenerationStyle(generation)}
          onEditMember={(member) => setEditMember(member)}
          onClose={onClose}
        />
      );
    }
    if (scope.kind === "person") {
      const member = tree.members.find((entry) => entry.id === scope.memberId);
      const base = baseLayout.nodes.find((node) => node.id === scope.memberId);
      if (member && base) {
        const override = overrides[member.id];
        const offsetX = override ? override.x - base.x : 0;
        return (
          <PersonInspector
            member={member}
            generation={gens.get(member.id) ?? 1}
            offsetX={offsetX}
            style={tuning.personStyles?.[member.id] ?? {}}
            onResetPosition={() => resetPosition(member.id)}
            onStyle={(patch) => updatePersonStyle(member.id, patch)}
            onResetStyle={() => resetPersonStyle(member.id)}
            onEdit={() => setEditMember(member)}
            onFocus={() => focusMember(member)}
            onClose={onClose}
          />
        );
      }
    }
    if (scope.kind === "banner") {
      const banner = normalizeBanner(tree.design.banner);
      const couplets = normalizeCouplets(tree.design.couplets);
      return (
        <BannerInspector
          banner={banner}
          couplets={couplets}
          onChange={(patch) => setDesign(tree.id, { banner: { ...banner, ...patch } })}
          onCouplets={(patch) => setDesign(tree.id, { couplets: { ...couplets, ...patch } })}
          onClose={onClose}
        />
      );
    }
    if (scope.kind === "decoration") {
      const index = decorations.findIndex((entry) => entry.id === scope.decorationId);
      const decoration = index >= 0 ? decorations[index] : undefined;
      if (decoration) {
        return (
          <DecorationInspector
            decoration={decoration}
            onUpdate={updateDecoration}
            onDelete={() => deleteDecoration(decoration.id)}
            onScale={(factor) => scaleDecoration(decoration, factor)}
            onDuplicate={() => duplicateDecoration(decoration)}
            onToggleLock={() => toggleDecorationLock(decoration)}
            onLayer={(direction) => moveDecorationLayer(decoration, direction)}
            canMoveUp={index < decorations.length - 1}
            canMoveDown={index > 0}
            onClose={onClose}
          />
        );
      }
    }
    return (
      <WholeDiagramInspector
        tree={tree}
        tuning={tuning}
        paper={paper}
        shiftRange={shiftRange}
        onTuning={updateTuning}
        onDesign={(patch) => setDesign(tree.id, patch)}
        onReset={resetDiagram}
      />
    );
  };

  const inspectorContent = renderInspector(() => selectScope({ kind: "diagram" }));

  const inspectorTitle =
    scope.kind === "generation"
      ? rowLabel(scope.generation)
      : scope.kind === "person"
        ? tree.members.find((member) => member.id === scope.memberId)?.name ?? "Thành viên"
        : scope.kind === "banner"
          ? "Hoành phi & câu đối"
          : scope.kind === "decoration"
            ? "Trang trí"
            : "Cả phả đồ";

  const sidebar = (
    <div className="space-y-4">
      <Field label="Tìm thành viên">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pat-muted)]" />
          <input
            className="pat-input pl-8 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên hoặc năm sinh"
          />
        </div>
      </Field>
      {searchResults.length ? (
        <div className="space-y-1">
          {searchResults.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                focusMember(member);
                selectScope({ kind: "person", memberId: member.id }, true);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--pat-line)] bg-white/60 px-2 py-1.5 text-left"
            >
              <Avatar person={member} size={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{member.name}</span>
                <span className="block text-[0.68rem] text-[var(--pat-muted)]">{generationTag(gens.get(member.id) ?? 1)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <p className="pat-form-section">Đời & bố cục</p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => selectScope({ kind: "diagram" }, true)}
            className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition ${
              scope.kind === "diagram"
                ? "border-[var(--pat-red)] bg-[#f9e3df]/60 text-[var(--pat-red)]"
                : "border-[var(--pat-line)] bg-white/60 hover:bg-[#f6e9c8]/50"
            }`}
          >
            <Frame size={13} /> Cả phả đồ
          </button>
          <button
            type="button"
            onClick={() => selectScope({ kind: "banner" }, true)}
            className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition ${
              scope.kind === "banner"
                ? "border-[var(--pat-red)] bg-[#f9e3df]/60 text-[var(--pat-red)]"
                : "border-[var(--pat-line)] bg-white/60 hover:bg-[#f6e9c8]/50"
            }`}
          >
            <ScrollText size={13} /> Hoành phi & câu đối
          </button>
          {layout.generations.map((row) => {
            const selected = scope.kind === "generation" && scope.generation === row.generation;
            return (
              <button
                key={row.generation}
                type="button"
                onClick={() => selectScope({ kind: "generation", generation: row.generation }, true)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                  selected
                    ? "border-[var(--pat-red)] bg-[#f9e3df]/60 text-[var(--pat-red)]"
                    : "border-[var(--pat-line)] bg-white/60 hover:bg-[#f6e9c8]/50"
                }`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {row.label ?? generationTag(row.generation)}
                </span>
                <span className="text-[0.68rem] text-[var(--pat-muted)]">{row.count}</span>
                <PanelRight size={11} className="text-[var(--pat-muted)]" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="pat-form-section">Trang trí</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="pat-btn pat-btn-outline h-9 text-xs" onClick={() => openDecor("text")}>
            <Type size={13} /> Thêm chữ
          </button>
          <button type="button" className="pat-btn pat-btn-outline h-9 text-xs" onClick={() => openDecor("library")}>
            <ImagePlus size={13} /> Thêm ảnh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
        <Info size={12} className="mr-1 inline text-[var(--pat-gold)]" />
        Bấm vào ô để chỉnh riêng một người, bấm vào tên đời để chỉnh cả đời. Kéo nền để di chuyển khung phả đồ.
        <strong> Lưu</strong> ghi bố cục lên thiết bị.
      </div>
    </div>
  );

  return (
    <TreeShell
      tree={tree}
      section="ve-pha-do"
      title={branchScope ? "Phả đồ chi" : "Vẽ phả đồ"}
      subtitle={
        branchScope
          ? `${branchTitle || branchScope.title} · ${branchScope.count} thành viên nội tộc`
          : `${paperLabel} · ${displayedCount} thành viên`
      }
      wide
      actions={
        <>
          {branchScope ? null : (
            <button
              type="button"
              onClick={() => setSideOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 xl:hidden"
              aria-label="Đời, bộ lọc và trang trí"
            >
              <Search size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/gia-pha/${tree.id}/giao-dien`)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Thiết kế phả đồ"
          >
            <Palette size={17} />
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Xuất phả đồ"
            title="Xuất phả đồ"
          >
            <Download size={17} />
          </button>
        </>
      }
    >
      <div
        className={`grid gap-3 ${
          branchScope
            ? "xl:grid-cols-1"
            : sideCollapsed && inspectorCollapsed
              ? "xl:grid-cols-1"
              : sideCollapsed
                ? "xl:grid-cols-[minmax(0,1fr)_340px]"
                : inspectorCollapsed
                  ? "xl:grid-cols-[250px_minmax(0,1fr)]"
                  : "xl:grid-cols-[250px_minmax(0,1fr)_340px]"
        }`}
      >
        {branchScope || sideCollapsed ? null : (
          <aside className="pat-card hidden self-start px-3 py-3 no-print xl:block">{sidebar}</aside>
        )}

        <div className="min-w-0 space-y-2">
          {branchScope ? (
            <div className="pat-card flex flex-wrap items-center gap-2 px-2 py-1.5 no-print">
              <span className="rounded-full bg-[#f6e9c8] px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-[#7a5a10]">
                Xem theo chi
              </span>
              <span className="text-xs font-semibold text-[var(--pat-ink)]">{branchScope.head.name}</span>
              <span className="text-[0.66rem] text-[var(--pat-muted)]">
                {branchScope.count} thành viên nội tộc · {branchScope.ids.size} người hiển thị ·{" "}
                {branchScope.generationSpan} đời
                {branchScope.options.ancestorGenerations
                  ? ` · ${branchScope.options.ancestorGenerations} đời trên`
                  : ""}
                {branchScope.options.generationLimit
                  ? ` · giới hạn ${branchScope.options.generationLimit} đời`
                  : ""}
              </span>
              <label className="ml-auto flex items-center gap-1.5 text-[0.68rem]">
                <span className="font-semibold text-[var(--pat-ink)]">Hoành phi</span>
                <input
                  value={branchTitle}
                  onChange={(event) => setBranchTitleDraft(event.target.value)}
                  placeholder={branchScope.title}
                  aria-label="Chữ hoành phi của chi"
                  className="h-8 w-40 rounded-lg border border-[var(--pat-line)] bg-white px-2 text-[0.7rem] outline-none focus:border-[var(--pat-red)] sm:w-52"
                />
              </label>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--pat-line)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <Download size={12} /> Xuất / In
              </button>
              <button
                type="button"
                onClick={exitBranchView}
                className="inline-flex items-center gap-1 rounded-full bg-[#8f2018] px-2.5 py-1 text-[0.68rem] font-semibold text-[#fff4df]"
              >
                Xem toàn bộ
              </button>
              <p className="w-full text-[0.64rem] leading-snug text-[var(--pat-muted)]">
                Chế độ này chỉ để xem và in; lựa chọn chi, bố cục và chữ hoành phi không được lưu vào gia phả.
              </p>
            </div>
          ) : (
          <div className="pat-card flex flex-wrap items-center gap-1 px-1.5 py-1.5 no-print">
            <span className="rounded-full bg-[#f6e9c8] px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-[#7a5a10]">
              Sửa
            </span>
            <ToolButton label="Hoàn tác (Ctrl+Z)" onClick={undo} disabled={!past.length}>
              <Undo2 size={16} />
            </ToolButton>
            <ToolButton label="Làm lại (Ctrl+Shift+Z)" onClick={redo} disabled={!future.length}>
              <Redo2 size={16} />
            </ToolButton>
            <ToolButton
              label="Tự sắp xếp — xoá mọi vị trí kéo tay"
              onClick={autoArrange}
            >
              <Wand2 size={16} />
            </ToolButton>
            <ToolButton
              label={snapToGrid ? "Hít lưới 24 px (đang bật)" : "Hít lưới 24 px (đang tắt)"}
              onClick={() => setSnapToGrid((prev) => !prev)}
              active={snapToGrid}
            >
              <Magnet size={16} />
            </ToolButton>
            <ToolButton label="Thêm trang trí" onClick={() => openDecor("library")}>
              <Plus size={16} />
            </ToolButton>

            <span className="mx-1 h-5 w-px bg-[var(--pat-line)]" />
            <span className="rounded-full bg-[#f6e9c8] px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.1em] text-[#7a5a10]">
              Xem
            </span>
            <ToolButton label="Lưới nền" onClick={() => setShowGrid((prev) => !prev)} active={showGrid}>
              <Grid3x3 size={16} />
            </ToolButton>
            <span className="hidden xl:inline-flex">
              <ToolButton
                label={sideCollapsed ? "Mở cột trái" : "Thu cột trái"}
                onClick={() => setSideCollapsed((prev) => !prev)}
                active={!sideCollapsed}
              >
                {sideCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </ToolButton>
            </span>
            <span className="hidden xl:inline-flex">
              <ToolButton
                label={inspectorCollapsed ? "Mở bảng chỉnh" : "Thu bảng chỉnh"}
                onClick={() => setInspectorCollapsed((prev) => !prev)}
                active={!inspectorCollapsed}
              >
                {inspectorCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
              </ToolButton>
            </span>
            <span className="xl:hidden">
              <ToolButton label="Bảng chỉnh" onClick={() => setInspectorOpen(true)} active={scope.kind !== "diagram"}>
                <PanelRight size={16} />
              </ToolButton>
            </span>
            <span className="hidden items-center gap-1 rounded-full bg-[#f6e9c8] px-2 py-0.5 text-[0.6rem] font-bold text-[#7a5a10] sm:inline-flex">
              {scopeLabel}
            </span>

            <span className="ml-auto inline-flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                  saved ? "bg-[#e2f1e8] text-[#1f6b4a]" : "bg-[#f9e3df] text-[#8a1c15]"
                }`}
                title="Phả đồ tự lưu bản nháp mỗi 15 giây; bấm Lưu để ghi hẳn"
              >
                {saved
                  ? lastSavedAt
                    ? `Đã lưu lúc ${timeLabel(lastSavedAt)}`
                    : "Đã lưu"
                  : "Chưa lưu"}
              </span>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-[var(--pat-red)]"
              >
                <Download size={12} /> {paperLabel}
              </button>
              <button
                type="button"
                onClick={save}
                title="Lưu bố cục (Ctrl+S)"
                className="pat-btn pat-btn-red h-8 px-3 text-[0.7rem]"
              >
                <Save size={14} /> Lưu
              </button>
            </span>
          </div>
          )}

          <div
            ref={viewportRef}
            onPointerDown={panDown}
            onDragOver={(event) => {
              if (branchScope) return;
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }}
            onDragLeave={(event) => {
              if (branchScope) return;
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              setDropActive(false);
            }}
            onDrop={(event) => {
              if (branchScope) return;
              if (!event.dataTransfer.files.length) return;
              event.preventDefault();
              setDropActive(false);
              void addDroppedFiles(event.dataTransfer.files);
            }}
            className={`pat-scroll relative h-[calc(100dvh-19rem)] min-h-[460px] select-none overflow-auto rounded-2xl border bg-[#eadfc8] p-2 shadow-inner ${
              dropActive ? "border-[var(--pat-red)]" : "border-[var(--pat-line)]"
            }`}
            style={{ touchAction: "none" }}
          >
            <div
              style={{
                width: dims.width * scale,
                height: dims.height * scale,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  width: dims.width,
                  height: dims.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <div className="overflow-hidden rounded-md shadow-[0_14px_40px_-20px_rgba(74,31,16,0.55)]">
                  <DiagramCanvas
                    tree={tree}
                    layout={layout}
                    decorations={branchScope ? [] : decorations}
                    svgId="pat-diagram-svg"
                    idPrefix="editor"
                    focusId={focusId}
                    selectedIds={branchScope ? [] : selectedIds}
                    guides={guides}
                    selectedDecorationId={
                      !branchScope && scope.kind === "decoration" ? scope.decorationId : null
                    }
                    showGrid={showGrid}
                    interactive={!branchScope}
                    paper={paperUnits}
                    bannerTextOverride={branchScope ? branchTitle : null}
                    showDatesOverride={
                      branchScope ? branchScope.options.cardStyle === "full" : null
                    }
                    dragonDrag={branchScope ? null : dragonPreview}
                    coupletDrag={branchScope ? null : coupletPreview}
                    bannerDrag={
                      branchScope || bannerPreview == null ? null : { top: bannerPreview }
                    }
                    onNodePointerDown={branchScope ? undefined : nodeDown}
                    onNodeResizeStart={branchScope ? undefined : nodeResizeDown}
                    onBannerPointerDown={branchScope ? undefined : bannerDown}
                    onDragonPointerDown={branchScope ? undefined : dragonDown}
                    onCoupletPointerDown={branchScope ? undefined : coupletDown}
                    onDecorationPointerDown={branchScope ? undefined : decorationDown}
                    onDecorationResizeStart={branchScope ? undefined : decorationResizeDown}
                    onDeleteDecoration={branchScope ? undefined : deleteDecoration}
                    style={{
                      cursor: branchScope ? "grab" : drag?.kind === "node" ? "grabbing" : "grab",
                      touchAction: "none",
                    }}
                  />
                </div>
              </div>
            </div>
            {panning ? (
              <span className="pointer-events-none absolute right-3 top-2 rounded-full bg-white/85 px-2.5 py-0.5 text-[0.6rem] font-semibold text-[var(--pat-muted)]">
                Đang di chuyển khung
              </span>
            ) : null}
            {dropActive ? (
              <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--pat-red)] bg-[#fdf4e0]/90 text-center">
                <UploadCloud size={30} className="text-[var(--pat-red)]" />
                <p className="text-sm font-semibold text-[var(--pat-red)]">Thả ảnh để thêm trang trí</p>
                <p className="text-[0.7rem] text-[var(--pat-muted)]">PNG, JPG hoặc SVG · tối đa 2,5 MB mỗi tệp</p>
              </div>
            ) : null}
          </div>

          {selectedIds.length >= 2 ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--pat-red)]/40 bg-[#fffaf0] px-2 py-1.5 text-[0.7rem] no-print">
              <span className="font-semibold text-[var(--pat-red)]">Đã chọn {selectedIds.length} thẻ</span>
              <span className="text-[var(--pat-muted)]">· căn theo thẻ chọn đầu tiên</span>
              <button
                type="button"
                className="pat-btn pat-btn-outline h-7 px-2 text-[0.68rem]"
                onClick={() => alignSelected("x")}
              >
                <Columns3 size={12} /> Căn cột
              </button>
              <button
                type="button"
                className="pat-btn pat-btn-outline h-7 px-2 text-[0.68rem]"
                onClick={() => alignSelected("y")}
              >
                <Rows3 size={12} /> Căn hàng
              </button>
              <button
                type="button"
                className="pat-btn pat-btn-outline h-7 px-2 text-[0.68rem]"
                onClick={copyStyleToSelection}
              >
                <Copy size={12} /> Sao chép kiểu
              </button>
              <button
                type="button"
                className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.68rem] font-semibold text-[var(--pat-muted)] hover:text-[var(--pat-red)]"
                onClick={() => setSelectedIds([])}
              >
                <X size={12} /> Bỏ chọn
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[0.72rem] text-[var(--pat-muted)] no-print">
            <div className="min-w-0 flex-1">
              <p className="truncate">{hintText}</p>
              <p className="truncate text-[0.66rem] opacity-80">
                Giữ Shift bấm thẻ để chọn nhiều · Ctrl+Z hoàn tác · Ctrl+S lưu
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1 sm:inline-flex">
                <Info size={12} /> In đúng khổ {paperLabel}
              </span>
              <ZoomBar
                percent={Math.round(scale * 100)}
                onZoomOut={() => setZoom((value) => Math.max(0.2, value / 1.25))}
                onZoomIn={() => setZoom((value) => Math.min(8, value * 1.25))}
                onReset={() => setZoom(1)}
              />
            </div>
          </div>
        </div>

        {branchScope || inspectorCollapsed ? null : (
          <aside className="pat-card hidden max-h-[calc(100dvh-11rem)] self-start overflow-y-auto no-print xl:block">
            {inspectorContent}
          </aside>
        )}
      </div>

      <Sheet
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        title="Đời, bộ lọc và trang trí"
        subtitle={tree.name}
      >
        {sidebar}
      </Sheet>

      <Sheet
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        title={inspectorTitle}
        subtitle="Chỉnh bố cục và cách hiển thị phả đồ"
        wide
      >
        {renderInspector()}
      </Sheet>

      <Sheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={branchScope ? "Xuất phả đồ chi" : "Xuất phả đồ"}
        subtitle={
          branchScope
            ? "Chỉ in đúng phạm vi chi đang xem, không lưu thay đổi"
            : "Miễn phí, không cần đăng nhập hay mua xu"
        }
      >
        <div className="mb-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2">
          <p className="text-[0.72rem] font-semibold text-[var(--pat-red)]">
            {branchScope
              ? `${branchTitle || branchScope.title} · ${branchScope.count} thành viên nội tộc · ${branchScope.ids.size} người hiển thị`
              : `${paperLabel} · ${displayedCount} thành viên · ${nonAncestorRows.length} đời${
                  ancestorRows.length ? ` · ${ancestorRows.length} bậc tiền tổ` : ""
                }`}
          </p>
          {paper.widthMm > 1500 || paper.heightMm > 1500 ? (
            <p className="mt-1 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
              Khổ lớn hơn 1500 mm có thể bị nhà in tự thu nhỏ. Nên xem trước bản PDF trước khi gửi in.
            </p>
          ) : null}
          {displayedCount > 120 ? (
            <p className="mt-1 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
              Phả đồ nhiều thành viên: nên chọn khổ lớn hơn hoặc giảm số dòng tên để chữ còn đọc được khi in.
            </p>
          ) : null}
        </div>

        <div className="mb-3">
          <p className="pat-form-section">Độ phân giải PNG</p>
          <Segmented<"1" | "2" | "3">
            value={String(pngScale) as "1" | "2" | "3"}
            onChange={(value) => setPngScale(Number(value))}
            options={[
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "3", label: "3×" },
            ]}
          />
          <p className="mt-1 text-[0.68rem] text-[var(--pat-muted)]">
            Kích thước ảnh khoảng {Math.round(dims.width * pngScale)} × {Math.round(dims.height * pngScale)} px.
            Phả đồ lớn nên dùng 2× để in rõ.
          </p>
        </div>

        <div className="grid gap-1">
          <SheetRow
            icon={<Download size={18} />}
            title="Tải ảnh PNG"
            subtitle={`${pngScale}× · ảnh độ phân giải cao`}
            onClick={() => void downloadPng()}
          />
          <SheetRow
            icon={<Printer size={18} />}
            title="In / Lưu PDF"
            subtitle={`In đúng ${paperLabel}`}
            onClick={() => void printDiagram()}
          />
          {branchScope ? null : (
            <>
              <SheetRow
                icon={<FileSpreadsheet size={18} />}
                title="CSV danh sách thành viên"
                subtitle="Bảng phẳng mở bằng Excel — không phải bản vẽ phả đồ"
                onClick={() => {
                  exportMembersCsv(tree);
                  setExportOpen(false);
                }}
              />
              <SheetRow
                icon={<FileJson size={18} />}
                title="Sao lưu JSON"
                subtitle="Tệp khôi phục đầy đủ — không mở bằng Excel"
                onClick={() => {
                  exportBackup(tree);
                  setExportOpen(false);
                }}
              />
              <SheetRow
                icon={<Palette size={18} />}
                title="Thiết kế bản in"
                subtitle="Khổ giấy, nền, hoa văn, hoành phi"
                onClick={() => {
                  setExportOpen(false);
                  router.push(`/gia-pha/${tree.id}/giao-dien`);
                }}
              />
            </>
          )}
        </div>

        {exporting ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-xs rounded-2xl border border-[var(--pat-line)] bg-[#fffaf0] p-4 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pat-red)]">
                <Loader2 size={16} className="animate-spin" /> Đang xuất PNG
              </div>
              <p className="mt-1 text-[0.72rem] text-[var(--pat-muted)]">{exporting.label}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadfc8]">
                <div
                  className="h-full rounded-full bg-[var(--pat-red)] transition-all"
                  style={{ width: `${Math.round(exporting.step * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[0.66rem] text-[var(--pat-muted)]">
                {Math.round(exporting.step * 100)}%
              </p>
            </div>
          </div>
        ) : null}
      </Sheet>

      {decorOpen ? (
        <DecorationSheet
          open
          onClose={() => setDecorOpen(false)}
          initialMode={decorMode}
          onSubmit={addDecoration}
        />
      ) : null}

      {editMember ? (
        <MemberFormSheet
          key={`edit-${editMember.id}`}
          tree={tree}
          open
          member={editMember}
          onClose={() => setEditMember(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[var(--pat-gold)]/60 bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[var(--pat-red)] shadow-lg no-print md:bottom-6">
          {toast}
        </div>
      ) : null}
    </TreeShell>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        active
          ? "border-[var(--pat-red)] bg-[#f9e3df] text-[var(--pat-red)]"
          : "border-transparent text-[var(--pat-muted)] hover:border-[var(--pat-line)] hover:bg-white/70"
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

function DecorationSheet({
  open,
  onClose,
  initialMode = "library",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: "library" | "text" | "image";
  onSubmit: (input: {
    type: "text" | "image";
    content: string;
    slot?: DecorSlot;
    fontSize?: number;
    color?: string;
    width?: number;
    height?: number;
    flip?: boolean;
  }) => void;
}) {
  const [mode, setMode] = useState<"library" | "text" | "image">(initialMode);
  const [category, setCategory] = useState<string>(DECOR_CATEGORIES[0].id);
  const [itemId, setItemId] = useState<string>(DECOR_ITEMS[0].id);
  const [content, setContent] = useState("");
  const [fontSize, setFontSize] = useState("18");
  const [color, setColor] = useState("#8a1c15");
  const [width, setWidth] = useState("120");
  const [height, setHeight] = useState("90");
  const [error, setError] = useState("");
  const { customItems, add: addCustom, remove: removeCustom } = useCustomDecor();

  const isCustom = category === "custom";
  const customItem = customItems.find((entry) => entry.id === itemId);
  const item = isCustom
    ? customItem
      ? customToDecorItem(customItem)
      : null
    : DECOR_ITEMS.find((entry) => entry.id === itemId) ?? DECOR_ITEMS[0];
  const categoryItems = DECOR_ITEMS.filter((entry) => entry.category === category);

  const submitLibrary = () => {
    if (!item) {
      setError("Chọn một hình trong thư viện của bạn.");
      return;
    }
    onSubmit({
      type: "image",
      content: item.src,
      slot: item.slot,
      width: item.width,
      height: item.height,
      flip: item.flip,
    });
    setError("");
  };

  const uploadCustom = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const added = await addCustom(file);
      setCategory("custom");
      setItemId(added.id);
      setError("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thêm được ảnh.");
    }
  };

  const submit = () => {
    if (!content.trim()) {
      setError(mode === "text" ? "Nhập nội dung chữ." : "Nhập đường dẫn ảnh.");
      return;
    }
    onSubmit({
      type: mode === "text" ? "text" : "image",
      content: content.trim(),
      fontSize: mode === "text" ? Number(fontSize) || 18 : undefined,
      color: mode === "text" ? color : undefined,
      width: mode === "image" ? Number(width) || 120 : undefined,
      height: mode === "image" ? Number(height) || 90 : undefined,
    });
    setContent("");
    setError("");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Trang trí"
      subtitle="Thư viện hình trang trí, chữ và ảnh trên phả đồ"
      wide
      footer={
        <button
          type="button"
          className="pat-btn pat-btn-red h-11 w-full text-sm"
          onClick={mode === "library" ? submitLibrary : submit}
        >
          <Plus size={15} /> Thêm vào phả đồ
        </button>
      }
    >
      <div className="space-y-4">
        <Segmented<"library" | "text" | "image">
          value={mode}
          onChange={setMode}
          options={[
            { value: "library", label: "Thư viện" },
            { value: "text", label: "Chữ trang trí" },
            { value: "image", label: "Ảnh của tôi" },
          ]}
        />

        {mode === "library" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {DECOR_CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="pat-chip"
                  data-active={category === entry.id}
                  onClick={() => {
                    setCategory(entry.id);
                    const first = DECOR_ITEMS.find((decor) => decor.category === entry.id);
                    if (first) setItemId(first.id);
                  }}
                >
                  {entry.label}
                </button>
              ))}
              <button
                type="button"
                className="pat-chip"
                data-active={isCustom}
                onClick={() => {
                  setCategory("custom");
                  setItemId(customItems[0]?.id ?? "");
                }}
              >
                Của tôi
                {customItems.length ? (
                  <span className="ml-1 rounded-full bg-[#7a5a10] px-1.5 text-[0.68rem] font-bold text-[#fff4df]">
                    {customItems.length}
                  </span>
                ) : null}
              </button>
            </div>

            {item ? (
              <div className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.label}
                  className="mx-auto h-36 w-auto object-contain"
                  style={item.flip ? { transform: "scaleX(-1)" } : undefined}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[0.68rem] text-[var(--pat-muted)]">
                      Kích thước gốc {item.nativeWidth} × {item.nativeHeight}
                    </p>
                    {item.credit ? (
                      <p className="text-[0.68rem] text-[var(--pat-muted)]/80">{item.credit}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-[var(--pat-line)] px-2 py-0.5 text-[0.72rem] font-semibold text-[var(--pat-muted)]">
                    {item.slot === "left" ? "Đặt bên trái" : "Đặt bên phải"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#fffaf0]/70 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[var(--pat-red)]">Thư viện của bạn đang trống</p>
                <p className="mt-1 text-[0.7rem] text-[var(--pat-muted)]">
                  Tải ảnh trang trí (PNG, SVG, JPG) để dùng lại cho phả đồ này và các phả đồ khác.
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--pat-red)]">
                {isCustom ? "Hình của bạn" : "Thư viện ảnh"}
              </p>
              {isCustom ? (
                <div className="grid grid-cols-3 gap-2">
                  {customItems.map((entry) => (
                    <div
                      key={entry.id}
                      className={`relative rounded-xl border p-1.5 text-center transition ${
                        itemId === entry.id
                          ? "border-[var(--pat-red)] bg-[#f9e3df]/50"
                          : "border-[var(--pat-line)] bg-white/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setItemId(entry.id)}
                        className="block w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.src}
                          alt={entry.label}
                          className="mx-auto h-16 w-full object-contain"
                        />
                        <span className="mt-1 block truncate text-[0.68rem] font-semibold">{entry.label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeCustom(entry.id);
                          if (itemId === entry.id) setItemId("");
                        }}
                        aria-label={`Xoá ${entry.label} khỏi thư viện`}
                        style={{ top: -6, right: -6 }}
                        className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[#e6b7ad] bg-[#f9e3df] text-[#8a1c15] shadow-sm"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-full min-h-[92px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--pat-line)] bg-white/50 px-1 text-center text-[0.68rem] font-semibold text-[var(--pat-muted)] transition hover:border-[var(--pat-red)] hover:text-[var(--pat-red)]">
                    <ImagePlus size={18} />
                    Tải ảnh lên
                    <input type="file" accept="image/*" className="hidden" onChange={uploadCustom} />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {categoryItems.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setItemId(entry.id)}
                      className={`rounded-xl border p-1.5 text-center transition ${
                        itemId === entry.id
                          ? "border-[var(--pat-red)] bg-[#f9e3df]/50"
                          : "border-[var(--pat-line)] bg-white/60"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.src}
                        alt={entry.label}
                        className="mx-auto h-16 w-full object-contain"
                        style={entry.flip ? { transform: "scaleX(-1)" } : undefined}
                      />
                      <span className="mt-1 block truncate text-[0.68rem] font-semibold">{entry.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] text-[var(--pat-muted)]">
              Hình trong suốt, không viền trắng khi in. Ảnh tải lên được lưu trên thiết bị và có thể xoá khỏi thư
              viện. Sau khi thêm, kéo trên phả đồ để căn vị trí rồi bấm <strong>Lưu</strong>.
            </p>
          </>
        ) : mode === "text" ? (
          <>
            <Field label="Nội dung">
              <input
                className="pat-input"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Ví dụ: Tổ đức lưu phương"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cỡ chữ">
                <input
                  className="pat-input"
                  type="number"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(event) => setFontSize(event.target.value)}
                />
              </Field>
              <Field label="Màu chữ">
                <input
                  className="pat-input h-[42px] p-1"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Đường dẫn ảnh">
              <input
                className="pat-input"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="https://…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rộng (px)">
                <input
                  className="pat-input"
                  type="number"
                  min={20}
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </Field>
              <Field label="Cao (px)">
                <input
                  className="pat-input"
                  type="number"
                  min={20}
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
        {mode === "library" ? null : (
          <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] text-[var(--pat-muted)]">
            Sau khi thêm, kéo trang trí đến vị trí mong muốn rồi bấm <strong>Lưu</strong>. Ảnh từ internet cần cho phép
            tải ảnh khi in.
          </p>
        )}
      </div>
    </Sheet>
  );
}
