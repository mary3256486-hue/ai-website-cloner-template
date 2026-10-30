"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Baby,
  ChevronRight,
  HelpCircle,
  Maximize2,
  Minus,
  Network,
  PencilLine,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  ZoomIn,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree, Person } from "./types";
import { CARD_H, CARD_W } from "./types";
import { computeGenerations, lifeSpan, sortPersons } from "./utils";
import { computeLayout } from "./layout";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, Field, Sheet, SheetRow } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";

export function TreeEditorView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { deleteMember } = useGenealogy();
  const viewportRef = useRef<HTMLDivElement>(null);
  const fittedRef = useRef<string | null>(null);

  const layout = useMemo(() => computeLayout(tree), [tree]);
  const gens = useMemo(() => computeGenerations(tree.members), [tree.members]);
  const branchColor = useMemo(
    () => new Map(tree.branches.map((branch) => [branch.id, branch.color])),
    [tree.branches],
  );

  const [view, setView] = useState({ x: 24, y: 24, scale: 0.7 });
  const [pan, setPan] = useState<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [childOf, setChildOf] = useState<Person | null>(null);
  const [spouseOf, setSpouseOf] = useState<Person | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = selectedId ? tree.members.find((member) => member.id === selectedId) : undefined;
  const missingFather = useMemo(
    () => tree.members.filter((member) => !member.fatherId && (gens.get(member.id) ?? 1) > 1).sort(sortPersons),
    [tree.members, gens],
  );
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? tree.members.filter(
          (member) =>
            member.name.toLowerCase().includes(needle) ||
            member.birthDate?.includes(needle) ||
            member.title?.toLowerCase().includes(needle),
        )
      : tree.members;
    return [...list].sort((a, b) => (gens.get(a.id) ?? 1) - (gens.get(b.id) ?? 1) || sortPersons(a, b)).slice(0, 30);
  }, [tree.members, gens, query]);

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el || layout.nodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    const scale = Math.min((rect.width - 32) / layout.width, (rect.height - 32) / layout.height, 1);
    setView({
      scale,
      x: (rect.width - layout.width * scale) / 2,
      y: (rect.height - layout.height * scale) / 2,
    });
  }, [layout.width, layout.height, layout.nodes.length]);

  const centerOn = useCallback(
    (personId: string) => {
      const el = viewportRef.current;
      const node = layout.nodes.find((item) => item.id === personId);
      if (!el || !node) return;
      const rect = el.getBoundingClientRect();
      setView((prev) => ({
        scale: Math.max(prev.scale, 0.8),
        x: rect.width / 2 - (node.x + CARD_W / 2) * Math.max(prev.scale, 0.8),
        y: rect.height / 2 - (node.y + CARD_H / 2) * Math.max(prev.scale, 0.8),
      }));
    },
    [layout.nodes],
  );

  useEffect(() => {
    if (fittedRef.current === tree.id || layout.nodes.length === 0) return;
    fittedRef.current = tree.id;
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (focus) {
      fit();
      window.setTimeout(() => centerOn(focus), 60);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(focus);
      return;
    }
    const root = layout.nodes.find((node) => node.generation === 1 && !node.isSpouse);
    const el = viewportRef.current;
    if (!root || !el) {
      fit();
      return;
    }
    const rect = el.getBoundingClientRect();
    const scale = 0.75;
    setView({
      scale,
      x: rect.width / 2 - (root.x + CARD_W / 2) * scale,
      y: rect.height / 2 - (root.y + CARD_H / 2) * scale,
    });
  }, [tree.id, layout.nodes, fit, centerOn]);

  useEffect(() => {
    if (!pan) return;
    const onMove = (event: PointerEvent) => {
      setView((prev) => ({
        ...prev,
        x: pan.viewX + (event.clientX - pan.startX),
        y: pan.viewY + (event.clientY - pan.startY),
      }));
    };
    const onUp = () => setPan(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pan]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      setView((prev) => {
        const nextScale = Math.min(1.8, Math.max(0.22, prev.scale * Math.exp(-event.deltaY * 0.0015)));
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        return {
          scale: nextScale,
          x: cx - (cx - prev.x) * (nextScale / prev.scale),
          y: cy - (cy - prev.y) * (nextScale / prev.scale),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <TreeShell
      tree={tree}
      section="chinh-sua-voi-cay-gia-pha"
      title="Cây phả hệ"
      subtitle={`${tree.members.length} thành viên · ${layout.generations.length} đời`}
      actions={
        <>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Tìm thành viên"
          >
            <Search size={17} />
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Hướng dẫn"
          >
            <HelpCircle size={17} />
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
          >
            <Plus size={14} /> Thêm
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {missingFather.length ? (
          <button
            type="button"
            onClick={() => setWarningOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-[#e3b95c] bg-[#fbf1d2] px-3 py-2.5 text-left text-xs text-[#7a5a10]"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">
              <strong>{missingFather.length}</strong> thành viên chưa có cha trong gia phả. Bổ sung để phả đồ xếp đúng đời.
            </span>
            <ChevronRight size={14} />
          </button>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl border border-[var(--pat-line)] bg-[#fdf6e7] shadow-inner">
          <div
            ref={viewportRef}
            className="relative h-[calc(100dvh-15rem)] min-h-[440px] w-full touch-none overflow-hidden"
            style={{
              backgroundImage:
                "radial-gradient(rgba(138,108,82,0.16) 0.7px, transparent 0.8px), radial-gradient(rgba(201,162,39,0.08) 0.7px, transparent 0.8px)",
              backgroundSize: "22px 22px, 22px 22px",
              backgroundPosition: "0 0, 11px 11px",
              cursor: pan ? "grabbing" : "grab",
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              setPan({ startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y });
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              }}
            >
              <svg
                width={layout.width}
                height={layout.height}
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                {layout.generations.map((row) => (
                  <g key={row.generation}>
                    <line
                      x1={16}
                      x2={layout.width - 16}
                      y1={row.y - 16}
                      y2={row.y - 16}
                      stroke="#c9a227"
                      strokeOpacity="0.22"
                      strokeDasharray="4 6"
                    />
                    <text x="18" y={row.y + 4} fontSize="10" fontWeight="700" fill="#b08d5c" opacity="0.75">
                      ĐỜI {row.generation}
                    </text>
                  </g>
                ))}
                {layout.edges.map((edge) => (
                  <line
                    key={edge.id}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={edge.type === "spouse" ? "#8a1c15" : "#b7791f"}
                    strokeOpacity={edge.type === "spouse" ? 0.6 : 0.5}
                    strokeWidth={edge.type === "spouse" ? 1.4 : 1.2}
                    strokeDasharray={edge.type === "spouse" ? "5 3" : undefined}
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {layout.nodes.map((node) => {
                const person = node.person;
                const color = (person.branchId && branchColor.get(person.branchId)) || (person.gender === "male" ? "#8a1c15" : "#9a4a6b");
                const active = selectedId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setSelectedId(person.id)}
                    className="pat-node absolute flex items-center gap-2 overflow-hidden rounded-lg border bg-[#fff9e4] px-2 text-left shadow-sm"
                    style={{
                      left: node.x,
                      top: node.y,
                      width: CARD_W,
                      height: CARD_H,
                      borderColor: active ? "#8a1c15" : color,
                      borderStyle: node.isSpouse ? "dashed" : "solid",
                      borderWidth: active ? 2 : 1,
                      outline: active ? "3px solid rgba(138,28,21,0.14)" : undefined,
                    }}
                  >
                    <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
                    <Avatar person={person} size={30} className="ml-1 shrink-0" />
                    <span className="min-w-0 flex-1 pr-1">
                      <span className="block truncate text-[0.58rem] font-semibold uppercase tracking-wide text-[var(--pat-muted)]">
                        {person.title ?? `Đời ${gens.get(person.id) ?? node.generation}`}
                      </span>
                      <span className="block truncate text-[0.72rem] font-bold leading-tight text-[var(--pat-ink)]">
                        {person.name}
                      </span>
                      <span className="block truncate text-[0.58rem] text-[var(--pat-muted)]">{lifeSpan(person)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--pat-line)] bg-[#fffdf7]/95 p-1 shadow-lg"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setView((prev) => ({ ...prev, scale: Math.max(0.22, prev.scale - 0.15) }))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-red)]"
                aria-label="Thu nhỏ"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center text-[0.68rem] font-semibold text-[var(--pat-muted)]">
                {Math.round(view.scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setView((prev) => ({ ...prev, scale: Math.min(1.8, prev.scale + 0.15) }))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-red)]"
                aria-label="Phóng to"
              >
                <ZoomIn size={15} />
              </button>
              <span className="mx-0.5 h-4 w-px bg-[var(--pat-line)]" />
              <button
                type="button"
                onClick={fit}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-red)]"
                aria-label="Vừa khung"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full bg-white/75 px-2 py-1 text-[0.6rem] text-[var(--pat-muted)] sm:block">
              Kéo nền để di chuyển · lăn chuột để phóng to
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] text-[var(--pat-muted)]">
          <Badge tone="gold">{tree.members.length} thành viên</Badge>
          <Badge tone="muted">{tree.branches.length} nhánh</Badge>
          <Badge tone="muted">{layout.generations.length} đời</Badge>
          <span className="ml-auto inline-flex items-center gap-1">
            <Network size={12} /> Chạm vào ô để xem thao tác
          </span>
        </div>
      </div>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `Đời ${gens.get(selected.id) ?? 1} · ${selected.gender === "male" ? "Nam" : "Nữ"} · ${lifeSpan(selected)}` : ""}
      >
        {selected ? (
          <div className="space-y-1">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5">
              <Avatar person={selected} size={44} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  {selected.name}
                  {selected.title ? <Badge tone="gold">{selected.title}</Badge> : null}
                </p>
                <p className="text-xs text-[var(--pat-muted)]">
                  {selected.spouseIds.length} vợ/chồng · {tree.members.filter((m) => m.fatherId === selected.id || m.motherId === selected.id).length} con
                </p>
              </div>
            </div>
            <SheetRow
              icon={<UserRound size={18} />}
              title="Xem hồ sơ đầy đủ"
              onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${selected.id}`)}
            />
            <SheetRow
              icon={<PencilLine size={18} />}
              title="Sửa thông tin"
              subtitle="Cha mẹ, vợ/chồng, tiểu sử, nhánh"
              onClick={() => setEditPerson(selected)}
            />
            <SheetRow
              icon={<Baby size={18} />}
              title="Thêm con"
              subtitle="Tự gán cha/mẹ theo giới tính"
              onClick={() => setChildOf(selected)}
            />
            <SheetRow
              icon={<Users size={18} />}
              title="Thêm vợ/chồng"
              onClick={() => setSpouseOf(selected)}
            />
            <SheetRow
              icon={<Trash2 size={18} />}
              title="Xoá khỏi gia phả"
              danger
              onClick={() => {
                if (window.confirm(`Xoá "${selected.name}" khỏi gia phả?`)) {
                  deleteMember(tree.id, selected.id);
                  setSelectedId(null);
                }
              }}
            />
          </div>
        ) : null}
      </Sheet>

      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Hướng dẫn dựng cây" subtitle="Thao tác nhanh trên phả hệ">
        <div className="space-y-2">
          <SheetRow icon={<ZoomIn size={18} />} title="Kéo nền và phóng to" subtitle="Dùng chuột/tay để di chuyển, lăn chuột hoặc nút +/− để thu phóng" />
          <SheetRow icon={<UserRound size={18} />} title="Chạm vào thành viên" subtitle="Mở thao tác: xem hồ sơ, sửa, thêm con, thêm vợ/chồng, xoá" />
          <SheetRow icon={<Plus size={18} />} title="Thêm thành viên" subtitle="Nút Thêm ở góc trên; sau đó gán cha/mẹ và nhánh" />
          <SheetRow icon={<Network size={18} />} title="Đời tự động" subtitle="Đời được tính từ liên kết cha/mẹ, không cần nhập tay" />
        </div>
      </Sheet>

      <Sheet open={warningOpen} onClose={() => setWarningOpen(false)} title="Thiếu liên kết cha" subtitle={`${missingFather.length} thành viên cần bổ sung`}>
        {missingFather.length ? (
          <div className="space-y-1.5">
            {missingFather.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  setWarningOpen(false);
                  setSelectedId(person.id);
                  centerOn(person.id);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2 text-left"
              >
                <Avatar person={person} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{person.name}</span>
                  <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                    Đời {gens.get(person.id) ?? 1} · {person.gender === "male" ? "Nam" : "Nữ"}
                  </span>
                </span>
                <ChevronRight size={14} className="text-[var(--pat-muted)]" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--pat-muted)]">Tất cả thành viên đã có đủ liên kết cha.</p>
        )}
      </Sheet>

      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Tìm thành viên" subtitle="Đi tới vị trí trên cây">
        <Field label="Tên hoặc năm sinh">
          <input
            className="pat-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: Phạm, 1950"
            autoFocus
          />
        </Field>
        <div className="pat-scroll mt-3 max-h-[50dvh] space-y-1.5 overflow-y-auto">
          {searchResults.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSelectedId(person.id);
                centerOn(person.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2 text-left"
            >
              <Avatar person={person} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{person.name}</span>
                <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                  Đời {gens.get(person.id) ?? 1} · {lifeSpan(person)}
                </span>
              </span>
              <ChevronRight size={14} className="text-[var(--pat-muted)]" />
            </button>
          ))}
          {searchResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--pat-muted)]">Không tìm thấy thành viên.</p>
          ) : null}
        </div>
      </Sheet>

      {editPerson ? (
        <MemberFormSheet key={`edit-${editPerson.id}`} tree={tree} open member={editPerson} onClose={() => setEditPerson(null)} />
      ) : null}
      {childOf ? (
        <MemberFormSheet
          key={`child-${childOf.id}`}
          tree={tree}
          open
          defaults={{
            fatherId: childOf.gender === "male" ? childOf.id : undefined,
            motherId: childOf.gender === "female" ? childOf.id : undefined,
            branchId: childOf.branchId,
            birthOrder:
              tree.members.filter((m) => m.fatherId === childOf.id || m.motherId === childOf.id).length + 1,
          }}
          onSaved={(id) => {
            setSelectedId(id);
            window.setTimeout(() => centerOn(id), 120);
          }}
          onClose={() => setChildOf(null)}
        />
      ) : null}
      {spouseOf ? (
        <MemberFormSheet
          key={`spouse-${spouseOf.id}`}
          tree={tree}
          open
          defaults={{
            spouseIds: [spouseOf.id],
            gender: spouseOf.gender === "male" ? "female" : "male",
            branchId: spouseOf.branchId,
          }}
          onSaved={(id) => {
            setSelectedId(id);
            window.setTimeout(() => centerOn(id), 120);
          }}
          onClose={() => setSpouseOf(null)}
        />
      ) : null}
      {addOpen ? <MemberFormSheet key="add-member" tree={tree} open onClose={() => setAddOpen(false)} /> : null}
    </TreeShell>
  );
}
