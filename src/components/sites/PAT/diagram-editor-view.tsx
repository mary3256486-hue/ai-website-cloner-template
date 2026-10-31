"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Frame,
  Grid3x3,
  ImagePlus,
  Info,
  Palette,
  PanelRight,
  Plus,
  Printer,
  Redo2,
  Save,
  Search,
  Trash2,
  Type,
  Undo2,
  Wand2,
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
import { cardOrientationFor, normalizeTuning } from "./types";
import { computeGenerations, sortPersons, uid } from "./utils";
import { computeLayout } from "./layout";
import { DiagramCanvas, contentTop, diagramDimensions } from "./diagram-canvas";
import { DECOR_CATEGORIES, DECOR_ITEMS, type DecorSlot } from "./decor-library";
import { customToDecorItem, useCustomDecor } from "./decor-library-store";
import {
  exportBackup,
  exportDiagramPng,
  exportMembersCsv,
  paperDimensions,
  printSvgDiagram,
  safeName,
} from "./export";
import { TreeShell } from "./app-shell";
import {
  DecorationInspector,
  GenerationInspector,
  PersonInspector,
  WholeDiagramInspector,
} from "./diagram-inspector";
import { Avatar, Field, Segmented, Sheet, SheetRow, ZoomBar } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";

type Positions = Record<string, { x: number; y: number }>;

type EditorScope =
  | { kind: "diagram" }
  | { kind: "generation"; generation: number }
  | { kind: "person"; memberId: string }
  | { kind: "decoration"; decorationId: string };

interface DragState {
  kind: "node" | "decoration" | "resize" | "pan";
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW?: number;
  origH?: number;
  aspect?: number;
  snapshot: Positions;
}

function descendantIds(rootId: string, members: Person[]) {
  const children = new Map<string, string[]>();
  for (const member of members) {
    for (const parentId of [member.fatherId, member.motherId]) {
      if (!parentId) continue;
      const list = children.get(parentId) ?? [];
      list.push(member.id);
      children.set(parentId, list);
    }
  }
  const result: string[] = [];
  const queue = [rootId];
  const seen = new Set([rootId]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of children.get(current) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      result.push(child);
      queue.push(child);
    }
  }
  return result;
}

export function DiagramEditorView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { setPositions, setDecoration, removeDecoration, setDesign } = useGenealogy();
  const viewportRef = useRef<HTMLDivElement>(null);
  const decorationsRef = useRef<Decoration[]>(tree.decorations);

  const [overrides, setOverrides] = useState<Positions>(tree.positions);
  const [past, setPast] = useState<Positions[]>([]);
  const [future, setFuture] = useState<Positions[]>([]);
  const [decorations, setDecorations] = useState<Decoration[]>(tree.decorations);
  const [scope, setScope] = useState<EditorScope>({ kind: "diagram" });
  const [showGrid, setShowGrid] = useState(true);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [panning, setPanning] = useState(false);
  const movedRef = useRef(false);
  const zoomInitializedRef = useRef(false);
  const [fitScale, setFitScale] = useState(0.2);
  const [zoom, setZoom] = useState(1);
  const scale = Math.min(4, Math.max(0.02, fitScale * zoom));
  const [genFilter, setGenFilter] = useState<Set<number>>(() => {
    const gens = computeGenerations(tree.members);
    return new Set(Array.from(gens.values()));
  });
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [decorOpen, setDecorOpen] = useState(false);
  const [decorMode, setDecorMode] = useState<"library" | "text" | "image">("library");
  const [editMember, setEditMember] = useState<Person | null>(null);

  const tuning = useMemo(() => normalizeTuning(tree.design.tuning), [tree.design.tuning]);
  const baseLayout = useMemo(() => computeLayout({ ...tree, positions: {} }), [tree]);
  const layout = useMemo(() => computeLayout({ ...tree, positions: overrides }), [tree, overrides]);
  const paper = useMemo(() => paperDimensions(tree, baseLayout), [tree, baseLayout]);
  const paperAspect = paper.widthMm / paper.heightMm;
  const paperLabel = `${Math.round(paper.widthMm)} × ${Math.round(paper.heightMm)} mm`;
  const contentDims = useMemo(
    () => diagramDimensions(baseLayout, tree.design),
    [baseLayout, tree.design],
  );
  const dims = diagramDimensions(layout, tree.design, paperAspect);
  const gens = useMemo(() => computeGenerations(tree.members), [tree.members]);
  const top = contentTop(tree.design);

  useEffect(() => {
    decorationsRef.current = decorations;
  }, [decorations]);

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
      if (!zoomInitializedRef.current) {
        zoomInitializedRef.current = true;
        if (fit < 0.45) {
          setZoom(Math.min(8, 0.45 / fit));
          window.setTimeout(() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) * 0.5);
            viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) * 0.5);
          }, 80);
        }
      }
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

  const save = () => {
    setPositions(tree.id, overrides);
    setSaved(true);
    showToast("Đã lưu bố cục phả đồ");
  };

  const autoArrange = () => {
    pushHistory(overrides);
    setOverrides({});
    setSaved(false);
    showToast("Đã sắp xếp lại theo thứ tự gia phả");
  };

  const updateTuning = (patch: Partial<DiagramTuning>) => {
    setDesign(tree.id, { tuning: { ...tuning, ...patch } });
  };

  const updateGenerationStyle = (generation: number, patch: Partial<GenerationStyle>) => {
    const styles = { ...(tuning.generationStyles ?? {}) };
    const key = String(generation);
    styles[key] = { ...(styles[key] ?? {}), ...patch };
    updateTuning({ generationStyles: styles });
  };

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
      orientation: cardOrientationFor(tree.design, generation),
      showAvatar: style.showAvatar ?? tree.design.showAvatar,
      showTitle: style.showTitle ?? tree.design.showTitle !== false,
      showName: style.showName ?? tree.design.showName !== false,
      showDates: style.showDates ?? tree.design.showDates !== false,
      showDeathAnniversary: style.showDeathAnniversary ?? tree.design.showDeathAnniversary === true,
      fontFamily: style.fontFamily ?? tuning.fontFamily,
      fontSize: style.fontSize ?? tuning.fontSize,
      lineCount: style.lineCount ?? tuning.lineCount,
      cardColor: style.cardColor,
    };
  };

  const resetDiagram = () => {
    pushHistory(overrides);
    setOverrides({});
    setDesign(tree.id, { tuning: undefined });
    setSaved(false);
    showToast("Đã trả bố cục và kiểu trình bày về mặc định");
  };

  const applyBranch = (memberId: string, dx: number, dy: number) => {
    const member = tree.members.find((entry) => entry.id === memberId);
    const units = new Set([memberId, ...descendantIds(memberId, tree.members)]);
    const next = { ...overrides };
    for (const node of baseLayout.nodes) {
      if (!units.has(node.unitId)) continue;
      next[node.id] = { x: node.x + dx, y: node.y + dy };
    }
    pushHistory(overrides);
    setOverrides(next);
    setSaved(false);
    if (member) showToast(`Đã dịch cả nhánh của ${member.name}`);
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
    event.stopPropagation();
    event.preventDefault();
    movedRef.current = false;
    setFocusId(node.id);
    selectScope({ kind: "person", memberId: node.id }, true);
    setDrag({
      kind: "node",
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: node.x,
      origY: node.y,
      snapshot: overrides,
    });
  };

  const decorationDown = (event: ReactPointerEvent<SVGGElement>, decoration: Decoration) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
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
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true;
      if (drag.kind === "node") {
        const x = Math.max(6, Math.round(drag.origX + dx));
        const y = Math.max(6, Math.round(drag.origY + dy));
        setOverrides((prev) => ({ ...prev, [drag.id]: { x, y } }));
      } else if (drag.kind === "resize") {
        const width = Math.max(24, Math.min(640, Math.round((drag.origW ?? 120) + dx)));
        const aspect = drag.aspect && drag.aspect > 0 ? drag.aspect : 1;
        const height = Math.max(12, Math.round(width / aspect));
        setDecorations((prev) =>
          prev.map((item) => (item.id === drag.id ? { ...item, width, height } : item)),
        );
      } else {
        const x = Math.max(6, Math.round(drag.origX + dx));
        const y = Math.max(6, Math.round(drag.origY + dy));
        setDecorations((prev) => prev.map((item) => (item.id === drag.id ? { ...item, x, y } : item)));
      }
    };
    const onUp = (event: PointerEvent) => {
      if (drag.kind === "pan") {
        setPanning(false);
        if (!movedRef.current) {
          selectScope({ kind: "diagram" });
          setFocusId(null);
        }
        setDrag(null);
        return;
      }
      if (drag.kind === "node") {
        if (movedRef.current) {
          pushHistory(drag.snapshot);
          setSaved(false);
        }
      } else if (drag.kind === "resize") {
        const dx = (event.clientX - drag.startX) / scale;
        const width = Math.max(24, Math.min(640, Math.round((drag.origW ?? 120) + dx)));
        const aspect = drag.aspect && drag.aspect > 0 ? drag.aspect : 1;
        const height = Math.max(12, Math.round(width / aspect));
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
  }, [drag, scale, pushHistory, selectScope, tree.id, setDecoration]);

  const visibleIds = useMemo(() => {
    const all = Array.from(gens.values());
    const every = all.every((value) => genFilter.has(value));
    if (every) return null;
    return new Set(tree.members.filter((member) => genFilter.has(gens.get(member.id) ?? 1)).map((member) => member.id));
  }, [tree.members, gens, genFilter]);

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
      left: Math.max(0, (dims.offsetX + node.x) * scale - el.clientWidth / 2 + (node.width * scale) / 2),
      top: Math.max(
        0,
        (top + dims.offsetY + node.y) * scale - el.clientHeight / 2 + (node.height * scale) / 2,
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

  const findSvg = () => document.getElementById("pat-diagram-svg") as SVGSVGElement | null;

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
    const decoration: Decoration = {
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
    const next = [...decorations, decoration];
    setDecorations(next);
    setDecoration(tree.id, decoration);
    setDecorOpen(false);
    selectScope({ kind: "decoration", decorationId: decoration.id }, true);
    showToast(input.type === "text" ? "Đã thêm chữ trang trí" : "Đã thêm ảnh trang trí");
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

  const toggleGen = (generation: number) => {
    setGenFilter((prev) => {
      const next = new Set(prev);
      if (next.has(generation)) next.delete(generation);
      else next.add(generation);
      return next;
    });
  };

  const scopeLabel =
    scope.kind === "generation"
      ? `Đời ${scope.generation}`
      : scope.kind === "person"
        ? tree.members.find((member) => member.id === scope.memberId)?.name ?? "Thành viên"
        : scope.kind === "decoration"
          ? "Trang trí"
          : "Cả phả đồ";

  const hintText = (() => {
    if (scope.kind === "generation") {
      const row = layout.generations.find((entry) => entry.generation === scope.generation);
      return `Đang chỉnh Đời ${scope.generation} · ${row?.count ?? 0} thành viên · bấm ra nền để chọn cả phả đồ`;
    }
    if (scope.kind === "person") {
      return `${scopeLabel} · kéo ô để đổi vị trí · bấm ra nền để chọn cả phả đồ`;
    }
    if (scope.kind === "decoration") {
      return "Đang chỉnh trang trí · kéo để di chuyển, kéo ô vuông góc để đổi kích thước";
    }
    return visibleIds
      ? `${visibleIds.size} / ${tree.members.length} thành viên đang hiển thị`
      : `${tree.members.length} thành viên · ${layout.generations.length} đời`;
  })();

  const renderInspector = (onClose?: () => void) => {
    if (scope.kind === "generation") {
      const generation = scope.generation;
      const row = layout.generations.find((entry) => entry.generation === generation);
      const style = tuning.generationStyles?.[String(generation)];
      return (
        <GenerationInspector
          generation={generation}
          count={row?.count ?? 0}
          resolved={resolveGeneration(generation)}
          extraFields={style?.extraFields ?? tuning.extraFields}
          onStyle={(patch) => updateGenerationStyle(generation, patch)}
          onReset={() => resetGenerationStyle(generation)}
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
        const offsetY = override ? override.y - base.y : 0;
        return (
          <PersonInspector
            member={member}
            generation={gens.get(member.id) ?? 1}
            offsetX={offsetX}
            offsetY={offsetY}
            style={tuning.personStyles?.[member.id] ?? {}}
            onOffset={(axis, value) => {
              const current = overrides[member.id] ?? { x: base.x, y: base.y };
              setOverrides((prev) => ({
                ...prev,
                [member.id]: {
                  x: axis === "x" ? base.x + value : current.x,
                  y: axis === "y" ? base.y + value : current.y,
                },
              }));
              setSaved(false);
            }}
            onApplyBranch={() => applyBranch(member.id, offsetX, offsetY)}
            onResetPosition={() => resetPosition(member.id)}
            onStyle={(patch) => updatePersonStyle(member.id, patch)}
            onEdit={() => setEditMember(member)}
            onFocus={() => focusMember(member)}
            onClose={onClose}
          />
        );
      }
    }
    if (scope.kind === "decoration") {
      const decoration = decorations.find((entry) => entry.id === scope.decorationId);
      if (decoration) {
        return (
          <DecorationInspector
            decoration={decoration}
            onUpdate={updateDecoration}
            onDelete={() => deleteDecoration(decoration.id)}
            onScale={(factor) => scaleDecoration(decoration, factor)}
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
        onTuning={updateTuning}
        onDesign={(patch) => setDesign(tree.id, patch)}
        onReset={resetDiagram}
      />
    );
  };

  const inspectorContent = renderInspector(() => selectScope({ kind: "diagram" }));

  const inspectorTitle =
    scope.kind === "generation"
      ? `Đời ${scope.generation}`
      : scope.kind === "person"
        ? tree.members.find((member) => member.id === scope.memberId)?.name ?? "Thành viên"
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
                <span className="block text-[0.62rem] text-[var(--pat-muted)]">Đời {gens.get(member.id) ?? 1}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="pat-form-section mb-0 flex-1">Đời & bố cục</p>
          <button
            type="button"
            className="ml-2 text-[0.65rem] font-semibold text-[var(--pat-red)]"
            onClick={() => setGenFilter(new Set(layout.generations.map((row) => row.generation)))}
          >
            Hiện tất cả
          </button>
        </div>
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
          {layout.generations.map((row) => {
            const active = genFilter.has(row.generation);
            const selected = scope.kind === "generation" && scope.generation === row.generation;
            return (
              <div
                key={row.generation}
                className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${
                  selected ? "bg-[#f9e3df]/60" : "hover:bg-[#f6e9c8]/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleGen(row.generation)}
                  className="h-3.5 w-3.5 shrink-0 accent-[var(--pat-red)]"
                  aria-label={`Hiện đời ${row.generation}`}
                />
                <button
                  type="button"
                  onClick={() => selectScope({ kind: "generation", generation: row.generation }, true)}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs"
                >
                  <span
                    className={`min-w-0 flex-1 truncate font-medium ${selected ? "text-[var(--pat-red)]" : ""}`}
                  >
                    Đời {row.generation}
                  </span>
                  <span className="text-[0.62rem] text-[var(--pat-muted)]">{row.count}</span>
                  <PanelRight size={11} className="text-[var(--pat-muted)]" />
                </button>
              </div>
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
      title="Tạo phả đồ"
      subtitle={`${paperLabel} · ${tree.members.length} thành viên`}
      wide
      actions={
        <>
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 xl:hidden"
            aria-label="Đời, bộ lọc và trang trí"
          >
            <Search size={17} />
          </button>
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Xuất phả đồ"
          >
            <Download size={17} />
          </button>
        </>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[250px_minmax(0,1fr)_340px]">
        <aside className="pat-card hidden self-start px-3 py-3 no-print xl:block">{sidebar}</aside>

        <div className="min-w-0 space-y-2">
          <div className="pat-card flex flex-wrap items-center gap-1 px-1.5 py-1.5 no-print">
            <ToolButton label="Hoàn tác" onClick={undo} disabled={!past.length}>
              <Undo2 size={16} />
            </ToolButton>
            <ToolButton label="Làm lại" onClick={redo} disabled={!future.length}>
              <Redo2 size={16} />
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-[var(--pat-line)]" />
            <ToolButton label="Lưới" onClick={() => setShowGrid((prev) => !prev)} active={showGrid}>
              <Grid3x3 size={16} />
            </ToolButton>
            <ToolButton label="Tự sắp xếp" onClick={autoArrange}>
              <Wand2 size={16} />
            </ToolButton>
            <ToolButton label="Thêm trang trí" onClick={() => openDecor("library")}>
              <Plus size={16} />
            </ToolButton>
            <span className="xl:hidden">
              <ToolButton label="Bảng chỉnh" onClick={() => setInspectorOpen(true)} active={scope.kind !== "diagram"}>
                <PanelRight size={16} />
              </ToolButton>
            </span>
            <span className="mx-1 h-5 w-px bg-[var(--pat-line)]" />
            <button type="button" onClick={save} className="pat-btn pat-btn-red h-8 px-3 text-[0.7rem]">
              <Save size={14} /> Lưu
            </button>
            <span
              className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                saved ? "bg-[#e2f1e8] text-[#1f6b4a]" : "bg-[#f9e3df] text-[#8a1c15]"
              }`}
            >
              {saved ? "Đã lưu" : "Chưa lưu"}
            </span>
            <span className="hidden items-center gap-1 rounded-full bg-[#f6e9c8] px-2 py-0.5 text-[0.6rem] font-bold text-[#7a5a10] sm:inline-flex">
              {scopeLabel}
            </span>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="ml-auto inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[var(--pat-red)]"
            >
              <Download size={12} /> {paperLabel}
            </button>
          </div>

          <div
            ref={viewportRef}
            onPointerDown={panDown}
            className="pat-scroll relative max-h-[calc(100dvh-13rem)] min-h-[460px] select-none overflow-auto rounded-2xl border border-[var(--pat-line)] bg-[#eadfc8] p-2 shadow-inner"
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
                    decorations={decorations}
                    svgId="pat-diagram-svg"
                    idPrefix="editor"
                    visibleIds={visibleIds}
                    focusId={focusId}
                    selectedDecorationId={scope.kind === "decoration" ? scope.decorationId : null}
                    showGrid={showGrid}
                    interactive
                    paperAspect={paperAspect}
                    onNodePointerDown={nodeDown}
                    onDecorationPointerDown={decorationDown}
                    onDecorationResizeStart={decorationResizeDown}
                    onDeleteDecoration={deleteDecoration}
                    style={{ cursor: drag?.kind === "node" ? "grabbing" : "grab", touchAction: "none" }}
                  />
                </div>
              </div>
            </div>
            {panning ? (
              <span className="pointer-events-none absolute right-3 top-2 rounded-full bg-white/85 px-2.5 py-0.5 text-[0.6rem] font-semibold text-[var(--pat-muted)]">
                Đang di chuyển khung
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[0.66rem] text-[var(--pat-muted)] no-print">
            <span className="min-w-0 flex-1 truncate">{hintText}</span>
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

        <aside className="pat-card hidden max-h-[calc(100dvh-8rem)] self-start overflow-y-auto no-print xl:block">
          {inspectorContent}
        </aside>
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
        title="Xuất phả đồ"
        subtitle="Miễn phí, không cần đăng nhập hay mua xu"
      >
        <div className="mb-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2">
          <p className="text-[0.72rem] font-semibold text-[var(--pat-red)]">
            {paperLabel} · {tree.members.length} thành viên · {layout.generations.length} đời
          </p>
          {paper.widthMm > 1500 || paper.heightMm > 1500 ? (
            <p className="mt-1 text-[0.66rem] leading-relaxed text-[var(--pat-muted)]">
              Khổ lớn hơn 1500 mm có thể bị nhà in tự thu nhỏ. Nên xem trước bản PDF trước khi gửi in.
            </p>
          ) : null}
          {tree.members.length > 120 ? (
            <p className="mt-1 text-[0.66rem] leading-relaxed text-[var(--pat-muted)]">
              Phả đồ nhiều thành viên: nên chọn khổ lớn hơn hoặc giảm số dòng tên để chữ còn đọc được khi in.
            </p>
          ) : null}
        </div>
        <div className="grid gap-1">
          <SheetRow
            icon={<Download size={18} />}
            title="Tải ảnh PNG"
            subtitle="Ảnh phả đồ độ phân giải cao"
            onClick={async () => {
              try {
                await exportDiagramPng("pat-diagram-svg", `${safeName(tree.name)}-pha-do.png`, "#fdf6e7");
                setExportOpen(false);
                showToast("Đã tải ảnh PNG");
              } catch {
                showToast("Không tạo được PNG, thử in thành PDF");
              }
            }}
          />
          <SheetRow
            icon={<Printer size={18} />}
            title="In / Lưu PDF"
            subtitle={`In đúng ${paperLabel}`}
            onClick={() => {
              const svg = findSvg();
              if (svg) void printSvgDiagram(svg, tree);
              setExportOpen(false);
            }}
          />
          <SheetRow
            icon={<FileSpreadsheet size={18} />}
            title="Excel (CSV)"
            subtitle="Danh sách thành viên và quan hệ"
            onClick={() => {
              exportMembersCsv(tree);
              setExportOpen(false);
            }}
          />
          <SheetRow
            icon={<FileJson size={18} />}
            title="Sao lưu JSON"
            subtitle="Toàn bộ gia phả để khôi phục"
            onClick={() => {
              exportBackup(tree);
              setExportOpen(false);
            }}
          />
          <SheetRow
            icon={<Palette size={18} />}
            title="Thiết kế bản in"
            subtitle="Khổ giấy, nền, hoa văn, câu đối"
            onClick={() => {
              setExportOpen(false);
              router.push(`/gia-pha/${tree.id}/giao-dien`);
            }}
          />
        </div>
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
                  <span className="ml-1 rounded-full bg-[#7a5a10] px-1.5 text-[0.55rem] font-bold text-[#fff4df]">
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
                      <p className="text-[0.62rem] text-[var(--pat-muted)]/80">{item.credit}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-[var(--pat-line)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--pat-muted)]">
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
                        <span className="mt-1 block truncate text-[0.62rem] font-semibold">{entry.label}</span>
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
                  <label className="flex h-full min-h-[92px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--pat-line)] bg-white/50 px-1 text-center text-[0.62rem] font-semibold text-[var(--pat-muted)] transition hover:border-[var(--pat-red)] hover:text-[var(--pat-red)]">
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
                      <span className="mt-1 block truncate text-[0.62rem] font-semibold">{entry.label}</span>
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
