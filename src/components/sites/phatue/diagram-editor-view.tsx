"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Grid3x3,
  ImagePlus,
  Info,
  Palette,
  PencilLine,
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
import type { Decoration, FamilyTree, Person, TreeNode } from "./types";
import { CARD_H, CARD_W } from "./types";
import { computeGenerations, lifeSpan, sortPersons, uid } from "./utils";
import { computeLayout } from "./layout";
import { DiagramCanvas, contentTop, diagramDimensions } from "./diagram-canvas";
import { DECOR_CATEGORIES, DECOR_ITEMS, type DecorSlot } from "./decor-library";
import {
  exportBackup,
  exportDiagramPng,
  exportMembersCsv,
  printSvgDiagram,
  resolveOrientation,
  safeName,
} from "./export";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, Field, Segmented, Sheet, SheetRow } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";

type Positions = Record<string, { x: number; y: number }>;

interface DragState {
  kind: "node" | "decoration";
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  snapshot: Positions;
}

export function DiagramEditorView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { setPositions, setDecoration, removeDecoration } = useGenealogy();
  const viewportRef = useRef<HTMLDivElement>(null);
  const decorationsRef = useRef<Decoration[]>(tree.decorations);

  const [overrides, setOverrides] = useState<Positions>(tree.positions);
  const [past, setPast] = useState<Positions[]>([]);
  const [future, setFuture] = useState<Positions[]>([]);
  const [decorations, setDecorations] = useState<Decoration[]>(tree.decorations);
  const [selectedDecoration, setSelectedDecoration] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const movedRef = useRef(false);
  const [scale, setScale] = useState(0.5);
  const [genFilter, setGenFilter] = useState<Set<number>>(() => {
    const gens = computeGenerations(tree.members);
    return new Set(Array.from(gens.values()));
  });
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [decorOpen, setDecorOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Person | null>(null);
  const [editMember, setEditMember] = useState<Person | null>(null);

  const layout = useMemo(() => computeLayout({ ...tree, positions: overrides }), [tree, overrides]);
  const autoDims = useMemo(
    () => diagramDimensions(computeLayout({ ...tree, positions: {} }), tree.design),
    [tree],
  );
  const dims = diagramDimensions(layout, tree.design);
  const orientation = resolveOrientation(tree);
  const gens = useMemo(() => computeGenerations(tree.members), [tree.members]);
  const top = contentTop(tree.design);

  useEffect(() => {
    decorationsRef.current = decorations;
  }, [decorations]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, Math.max(0.22, (el.clientWidth - 20) / autoDims.width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoDims.width]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
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
    showToast("Đã lưu vị trí phả đồ");
  };

  const autoArrange = () => {
    pushHistory(overrides);
    setOverrides({});
    setSaved(false);
    showToast("Đã sắp xếp lại theo thứ tự gia phả");
  };

  const nodeDown = (event: ReactPointerEvent<SVGGElement>, node: TreeNode) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    movedRef.current = false;
    setSelectedDecoration(null);
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
    setSelectedDecoration(decoration.id);
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

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: PointerEvent) => {
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true;
      if (drag.kind === "node") {
        const x = Math.max(6, Math.round(drag.origX + dx));
        const y = Math.max(6, Math.round(drag.origY + dy));
        setOverrides((prev) => ({ ...prev, [drag.id]: { x, y } }));
      } else {
        const x = Math.max(6, Math.round(drag.origX + dx));
        const y = Math.max(6, Math.round(drag.origY + dy));
        setDecorations((prev) => prev.map((item) => (item.id === drag.id ? { ...item, x, y } : item)));
      }
    };
    const onUp = () => {
      if (drag.kind === "node") {
        if (movedRef.current) {
          pushHistory(drag.snapshot);
          setSaved(false);
        } else {
          const person = tree.members.find((member) => member.id === drag.id);
          if (person) setSelectedMember(person);
        }
      } else {
        const decoration = decorationsRef.current.find((item) => item.id === drag.id);
        if (decoration) setDecoration(tree.id, decoration);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, scale, pushHistory, tree.id, tree.members, setDecoration]);

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
    if (node && el) {
      el.scrollTo({
        left: Math.max(0, node.x * scale - el.clientWidth / 2 + (CARD_W * scale) / 2),
        top: Math.max(0, (node.y + top) * scale - el.clientHeight / 2 + (CARD_H * scale) / 2),
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (!focus) return;
    const person = tree.members.find((member) => member.id === focus);
    if (person) window.setTimeout(() => focusMember(person), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.id]);

  const findSvg = () => document.getElementById("phatue-diagram-svg") as SVGSVGElement | null;

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
    let x = 100;
    let y = 100 + decorations.length * 26;
    if (input.slot === "left") {
      x = 56;
      y = 8;
    } else if (input.slot === "right") {
      x = Math.max(24, dims.width - width - 56);
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
    setSelectedDecoration(decoration.id);
    setDecorOpen(false);
    showToast(input.type === "text" ? "Đã thêm chữ trang trí" : "Đã thêm ảnh trang trí");
  };

  const toggleGen = (generation: number) => {
    setGenFilter((prev) => {
      const next = new Set(prev);
      if (next.has(generation)) next.delete(generation);
      else next.add(generation);
      return next;
    });
  };

  const sidebar = (
    <div className="space-y-4">
      <Field label="Tìm thành viên">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--phatue-muted)]" />
          <input
            className="phatue-input pl-8 text-sm"
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
              onClick={() => focusMember(member)}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--phatue-line)] bg-white/60 px-2 py-1.5 text-left"
            >
              <Avatar person={member} size={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{member.name}</span>
                <span className="block text-[0.62rem] text-[var(--phatue-muted)]">Đời {gens.get(member.id) ?? 1}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="phatue-form-section mb-0 flex-1">Lọc theo đời</p>
          <button
            type="button"
            className="ml-2 text-[0.65rem] font-semibold text-[var(--phatue-red)]"
            onClick={() => setGenFilter(new Set(layout.generations.map((row) => row.generation)))}
          >
            Tất cả
          </button>
        </div>
        <div className="space-y-1">
          {layout.generations.map((row) => {
            const active = genFilter.has(row.generation);
            return (
              <label
                key={row.generation}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-[#f6e9c8]/60"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleGen(row.generation)}
                  className="h-3.5 w-3.5 accent-[var(--phatue-red)]"
                />
                <span className="flex-1 font-medium">Đời {row.generation}</span>
                <span className="text-[0.65rem] text-[var(--phatue-muted)]">{row.count}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <p className="phatue-form-section">Trang trí</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="phatue-btn phatue-btn-outline h-9 text-xs"
            onClick={() => setDecorOpen(true)}
          >
            <Type size={13} /> Thêm chữ
          </button>
          <button
            type="button"
            className="phatue-btn phatue-btn-outline h-9 text-xs"
            onClick={() => setDecorOpen(true)}
          >
            <ImagePlus size={13} /> Thêm ảnh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.68rem] leading-relaxed text-[var(--phatue-muted)]">
        <Info size={12} className="mr-1 inline text-[var(--phatue-gold)]" />
        Kéo ô thành viên để đổi vị trí, chạm để sửa. Nút <strong>Lưu</strong> ghi lại bố cục lên thiết bị.
      </div>
    </div>
  );

  return (
    <TreeShell
      tree={tree}
      section="ve-pha-do"
      title="Tác phả đồ"
      subtitle={`${tree.design.paper} · ${orientation === "portrait" ? "dọc" : "ngang"} · ${tree.members.length} thành viên`}
      wide
      actions={
        <>
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 md:hidden"
            aria-label="Bộ lọc phả đồ"
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
      <div className="grid gap-3 md:grid-cols-[240px_1fr]">
        <aside className="phatue-card hidden self-start px-3 py-3 md:block no-print">{sidebar}</aside>

        <div className="min-w-0 space-y-2">
          <div className="phatue-card flex flex-wrap items-center gap-1 px-1.5 py-1.5 no-print">
            <ToolButton label="Hoàn tác" onClick={undo} disabled={!past.length}>
              <Undo2 size={16} />
            </ToolButton>
            <ToolButton label="Làm lại" onClick={redo} disabled={!future.length}>
              <Redo2 size={16} />
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-[var(--phatue-line)]" />
            <ToolButton label="Lưới" onClick={() => setShowGrid((prev) => !prev)} active={showGrid}>
              <Grid3x3 size={16} />
            </ToolButton>
            <ToolButton label="Tự sắp xếp" onClick={autoArrange}>
              <Wand2 size={16} />
            </ToolButton>
            <ToolButton label="Thêm trang trí" onClick={() => setDecorOpen(true)}>
              <Plus size={16} />
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-[var(--phatue-line)]" />
            <button
              type="button"
              onClick={save}
              className="phatue-btn phatue-btn-red h-8 px-3 text-[0.7rem]"
            >
              <Save size={14} /> Lưu
            </button>
            <span
              className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                saved ? "bg-[#e2f1e8] text-[#1f6b4a]" : "bg-[#f9e3df] text-[#8a1c15]"
              }`}
            >
              {saved ? "Đã lưu" : "Chưa lưu"}
            </span>
            <span className="ml-auto flex items-center gap-1 text-[0.65rem] text-[var(--phatue-muted)]">
              <span className="rounded-md border border-[var(--phatue-line)] px-1.5 py-0.5 font-semibold">
                {tree.design.paper} · {orientation === "portrait" ? "dọc" : "ngang"}
              </span>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-[var(--phatue-red)]"
              >
                <Download size={12} /> Xuất
              </button>
            </span>
          </div>

          <div
            ref={viewportRef}
            className="phatue-scroll relative max-h-[calc(100dvh-13rem)] min-h-[460px] overflow-auto rounded-2xl border border-[var(--phatue-line)] bg-[#eadfc8] p-2 shadow-inner"
            onPointerDown={() => setSelectedDecoration(null)}
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
                    svgId="phatue-diagram-svg"
                    idPrefix="editor"
                    visibleIds={visibleIds}
                    focusId={focusId}
                    selectedDecorationId={selectedDecoration}
                    showGrid={showGrid}
                    interactive
                    onNodePointerDown={nodeDown}
                    onDecorationPointerDown={decorationDown}
                    onDeleteDecoration={(id) => {
                      removeDecoration(tree.id, id);
                      setDecorations((prev) => prev.filter((item) => item.id !== id));
                      setSelectedDecoration(null);
                    }}
                    style={{ cursor: drag?.kind === "node" ? "grabbing" : "default", touchAction: "none" }}
                  />
                </div>
              </div>
            </div>
            {selectedDecoration ? (
              <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[0.62rem] text-[var(--phatue-muted)]">
                Kéo để di chuyển trang trí · bấm × để xoá
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[0.66rem] text-[var(--phatue-muted)] no-print">
            <span>
              {visibleIds ? `${visibleIds.size} / ${tree.members.length} thành viên hiển thị` : `${tree.members.length} thành viên`} ·{" "}
              {Math.round(scale * 100)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <Info size={12} /> In đúng khổ giấy đã chọn trong Thiết kế
            </span>
          </div>
        </div>
      </div>

      <Sheet open={sideOpen} onClose={() => setSideOpen(false)} title="Bộ lọc phả đồ" subtitle={tree.name}>
        {sidebar}
      </Sheet>

      <Sheet
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.name ?? ""}
        subtitle={selectedMember ? `Đời ${gens.get(selectedMember.id) ?? 1} · ${lifeSpan(selectedMember)}` : ""}
      >
        {selectedMember ? (
          <div className="space-y-1">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--phatue-line)] bg-white/60 px-3 py-2.5">
              <Avatar person={selectedMember} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{selectedMember.name}</p>
                <p className="text-xs text-[var(--phatue-muted)]">
                  {selectedMember.title ?? "Thành viên"} · {selectedMember.gender === "male" ? "Nam" : "Nữ"}
                </p>
              </div>
              <Badge tone="gold">{tree.design.paper}</Badge>
            </div>
            <SheetRow
              icon={<PencilLine size={18} />}
              title="Sửa thông tin"
              subtitle="Cập nhật cha mẹ, vợ/chồng, tiểu sử"
              onClick={() => {
                setEditMember(selectedMember);
                setSelectedMember(null);
              }}
            />
            <SheetRow
              icon={<Search size={18} />}
              title="Đưa vào giữa khung"
              onClick={() => {
                focusMember(selectedMember);
                setSelectedMember(null);
              }}
            />
            <SheetRow
              icon={<Trash2 size={18} />}
              title="Bỏ vị trí kéo thả"
              subtitle="Đưa ô về bố cục tự động"
              onClick={() => {
                const next = { ...overrides };
                delete next[selectedMember.id];
                setOverrides(next);
                setSaved(false);
                setSelectedMember(null);
              }}
            />
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Xuất phả đồ"
        subtitle="Miễn phí, không cần đăng nhập hay mua xu"
      >
        <div className="grid gap-1">
          <SheetRow
            icon={<Download size={18} />}
            title="Tải ảnh PNG"
            subtitle="Ảnh phả đồ độ phân giải cao"
            onClick={async () => {
              try {
                await exportDiagramPng("phatue-diagram-svg", `${safeName(tree.name)}-pha-do.png`, "#fdf6e7");
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
            subtitle={`Khổ ${tree.design.paper} ${orientation === "portrait" ? "dọc" : "ngang"}`}
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

      <DecorationSheet
        open={decorOpen}
        onClose={() => setDecorOpen(false)}
        onSubmit={addDecoration}
      />

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
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[var(--phatue-gold)]/60 bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[var(--phatue-red)] shadow-lg no-print md:bottom-6">
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
          ? "border-[var(--phatue-red)] bg-[#f9e3df] text-[var(--phatue-red)]"
          : "border-transparent text-[var(--phatue-muted)] hover:border-[var(--phatue-line)] hover:bg-white/70"
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

function DecorationSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
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
  const [mode, setMode] = useState<"library" | "text" | "image">("library");
  const [category, setCategory] = useState<string>(DECOR_CATEGORIES[0].id);
  const [itemId, setItemId] = useState<string>(DECOR_ITEMS[0].id);
  const [content, setContent] = useState("");
  const [fontSize, setFontSize] = useState("18");
  const [color, setColor] = useState("#8a1c15");
  const [width, setWidth] = useState("120");
  const [height, setHeight] = useState("90");
  const [error, setError] = useState("");

  const item = DECOR_ITEMS.find((entry) => entry.id === itemId) ?? DECOR_ITEMS[0];
  const categoryItems = DECOR_ITEMS.filter((entry) => entry.category === category);

  const submitLibrary = () => {
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
          className="phatue-btn phatue-btn-red h-11 w-full text-sm"
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
                  className="phatue-chip"
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
            </div>

            <div className="rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 p-3">
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
                  <p className="text-[0.68rem] text-[var(--phatue-muted)]">
                    Kích thước gốc {item.nativeWidth} × {item.nativeHeight}
                  </p>
                  {item.credit ? (
                    <p className="text-[0.62rem] text-[var(--phatue-muted)]/80">{item.credit}</p>
                  ) : null}
                </div>
                <span className="rounded-full border border-[var(--phatue-line)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--phatue-muted)]">
                  {item.slot === "left" ? "Đặt bên trái" : "Đặt bên phải"}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--phatue-red)]">
                Thư viện ảnh
              </p>
              <div className="grid grid-cols-3 gap-2">
                {categoryItems.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setItemId(entry.id)}
                    className={`rounded-xl border p-1.5 text-center transition ${
                      itemId === entry.id
                        ? "border-[var(--phatue-red)] bg-[#f9e3df]/50"
                        : "border-[var(--phatue-line)] bg-white/60"
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
            </div>

            <p className="rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] text-[var(--phatue-muted)]">
              Hình trong suốt, không viền trắng khi in. Sau khi thêm, kéo trên phả đồ để căn vị trí rồi bấm{" "}
              <strong>Lưu</strong>.
            </p>
          </>
        ) : mode === "text" ? (
          <>
            <Field label="Nội dung">
              <input
                className="phatue-input"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Ví dụ: Tổ đức lưu phương"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cỡ chữ">
                <input
                  className="phatue-input"
                  type="number"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(event) => setFontSize(event.target.value)}
                />
              </Field>
              <Field label="Màu chữ">
                <input
                  className="phatue-input h-[42px] p-1"
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
                className="phatue-input"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="https://…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rộng (px)">
                <input
                  className="phatue-input"
                  type="number"
                  min={20}
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </Field>
              <Field label="Cao (px)">
                <input
                  className="phatue-input"
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
          <p className="rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] text-[var(--phatue-muted)]">
            Sau khi thêm, kéo trang trí đến vị trí mong muốn rồi bấm <strong>Lưu</strong>. Ảnh từ internet cần cho phép
            tải ảnh khi in.
          </p>
        )}
      </div>
    </Sheet>
  );
}
