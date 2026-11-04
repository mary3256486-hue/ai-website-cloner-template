"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GitBranch,
  Info,
  Network,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Undo2,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { Branch, FamilyTree, Person } from "./types";
import { branchHeadcounts, computeGenerations, initials, sortPersons } from "./utils";
import { classifyClan } from "./clan";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, EmptyState, Field, SectionTitle, Sheet } from "./ui";

const BRANCH_COLORS = ["#8a1c15", "#b7791f", "#2f6f5e", "#6b4c9a", "#1f6b7a", "#9a4a1f"];

export function BranchesView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { deleteBranch, updateTree } = useGenealogy();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [diagramOpen, setDiagramOpen] = useState(true);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);
  const [undoDelete, setUndoDelete] = useState<{ branch: Branch; index: number; memberIds: string[] } | null>(null);
  const [selectedMen, setSelectedMen] = useState<string[]>([]);
  const [bulkBranchId, setBulkBranchId] = useState("");
  const [manQuery, setManQuery] = useState("");
  const [highlightUnassigned, setHighlightUnassigned] = useState(false);
  const unassignedRef = useRef<HTMLElement>(null);

  const gens = useMemo(() => computeGenerations(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const { men, byBranch } = useMemo(() => branchHeadcounts(tree), [tree]);
  const founder =
    tree.members.find((m) => m.id === tree.founderId) ??
    tree.members.filter((m) => (gens.get(m.id) ?? 1) === 0).sort(sortPersons)[0];
  const assigned = men.filter((m) => m.branchId).length;
  const unassignedMen = useMemo(
    () =>
      men
        .filter((m) => !m.branchId)
        .sort((a, b) => (gens.get(a.id) ?? 99) - (gens.get(b.id) ?? 99) || sortPersons(a, b)),
    [men, gens],
  );
  const unassigned = unassignedMen.length;
  const assignedPct = men.length ? Math.round((assigned / men.length) * 100) : 0;
  const filteredUnassigned = manQuery.trim()
    ? unassignedMen.filter((person) => person.name.toLowerCase().includes(manQuery.trim().toLowerCase()))
    : unassignedMen;
  const activeBranch = tree.branches.find((branch) => branch.id === activeBranchId) ?? null;
  const selectableMen = selectedMen.filter((id) => unassignedMen.some((person) => person.id === id));
  const activeBulkBranchId = tree.branches.some((branch) => branch.id === bulkBranchId) ? bulkBranchId : "";

  useEffect(() => {
    if (!undoDelete) return;
    const timer = window.setTimeout(() => setUndoDelete(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [undoDelete]);

  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const membersOf = (branchId: string) => byBranch.get(branchId) ?? [];
  const listedMembersOf = (branchId: string) =>
    tree.members.filter((member) => member.branchId === branchId && clan.isDisplayed(member.id));

  const generationRange = (members: Person[]) => {
    const values = members
      .map((member) => gens.get(member.id))
      .filter((value): value is number => value !== undefined && value >= 0);
    if (!values.length) return "Chưa xếp người";
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `Đời ${min}` : `Đời ${min}–${max}`;
  };

  const focusUnassigned = () => {
    unassignedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightUnassigned(true);
    window.setTimeout(() => setHighlightUnassigned(false), 1800);
  };

  const assignMen = (ids: string[], branchId: string) => {
    if (!ids.length || !branchId) return;
    const targets = new Set(ids);
    updateTree(tree.id, {
      members: tree.members.map((member) =>
        targets.has(member.id) ? { ...member, branchId } : member,
      ),
    });
    setSelectedMen((prev) => prev.filter((id) => !targets.has(id)));
  };

  const toggleMan = (id: string) => {
    setSelectedMen((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  };

  const removeBranch = () => {
    if (!confirmDelete) return;
    const index = tree.branches.findIndex((branch) => branch.id === confirmDelete.id);
    const memberIds = tree.members.filter((member) => member.branchId === confirmDelete.id).map((member) => member.id);
    setUndoDelete({ branch: confirmDelete, index, memberIds });
    deleteBranch(tree.id, confirmDelete.id);
    setConfirmDelete(null);
    setActiveBranchId(null);
  };

  const undoRemove = () => {
    if (!undoDelete) return;
    const branches = [...tree.branches];
    branches.splice(Math.max(0, undoDelete.index), 0, undoDelete.branch);
    const restore = new Set(undoDelete.memberIds);
    updateTree(tree.id, {
      branches,
      members: tree.members.map((member) =>
        restore.has(member.id) ? { ...member, branchId: undoDelete.branch.id } : member,
      ),
    });
    setUndoDelete(null);
  };

  return (
    <TreeShell
      tree={tree}
      section="danh-sach-nhanh"
      title="Chi phái"
      subtitle={`${tree.name} · ${tree.branches.length} chi phái`}
      actions={
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
        >
          <Plus size={14} /> Tạo chi phái
        </button>
      }
    >
      <div className="space-y-4">
        <section className="pat-card px-4 py-3">
          <div className="grid grid-cols-3 divide-x divide-[var(--pat-line)]">
            <div className="flex flex-col items-center px-1 text-center">
              <span className="text-lg font-bold text-[var(--pat-red)]">{tree.branches.length}</span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--pat-muted)]">
                Chi phái
              </span>
            </div>
            <div className="flex flex-col items-center px-1 text-center">
              <span className="text-lg font-bold text-[var(--pat-ink)]">
                {assigned}
                <span className="ml-1 text-[0.7rem] font-semibold text-[var(--pat-muted)]">· {assignedPct}%</span>
              </span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--pat-muted)]">
                Nam nội tộc đã xếp chi
              </span>
            </div>
            <button
              type="button"
              onClick={focusUnassigned}
              className="flex flex-col items-center px-1 text-center transition hover:text-[var(--pat-red)]"
              aria-label={`Xem ${unassigned} người nam chưa xếp chi`}
            >
              <span className="flex items-center gap-0.5 text-lg font-bold text-[var(--pat-red)]">
                {unassigned}
                <ChevronRight size={14} />
              </span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--pat-muted)]">
                Nam chưa xếp chi
              </span>
            </button>
          </div>
          <p className="mt-2 border-t border-[var(--pat-line)] pt-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            Chi phái chỉ tính người nam thuộc nội tộc, không tính dâu/rể, con của con gái hay hồ sơ tham khảo. Con gái
            vẫn thuộc gia phả nhưng không tính vào số nam của chi phái.
          </p>
        </section>

        <section className="pat-card px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <SectionTitle icon={<Network size={13} />} title="Sơ đồ chi phái" />
            {tree.branches.length > 0 ? (
              <button
                type="button"
                onClick={() => setDiagramOpen((open) => !open)}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
                aria-expanded={diagramOpen}
              >
                {diagramOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {diagramOpen ? "Thu gọn" : "Mở sơ đồ"}
              </button>
            ) : null}
          </div>
          {tree.branches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--pat-line)] px-3 py-4 text-center text-xs text-[var(--pat-muted)]">
              Chưa có chi phái nào. Tạo chi phái để chia dòng họ theo các con trai của Khởi Tổ.
            </p>
          ) : !diagramOpen ? (
            <p className="mt-1 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
              Sơ đồ đang thu gọn để đỡ rối khi dòng họ có nhiều chi. Bấm “Mở sơ đồ” để xem lại.
            </p>
          ) : (
            <div>
              <div className="flex flex-col items-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--pat-red)] to-[#b7791f] text-sm font-bold text-[#fff4df]">
                  {founder ? initials(founder.name) : "Tổ"}
                </span>
                <span className="mt-1 max-w-[12rem] truncate text-[0.7rem] font-semibold">
                  {founder?.name ?? tree.name}
                </span>
                <span className="text-[0.6rem] uppercase tracking-[0.14em] text-[var(--pat-muted)]">Khởi tổ</span>
              </div>
              <div className="mx-auto h-4 w-px bg-[var(--pat-line)]" />
              <div className="relative mx-4 h-px bg-[var(--pat-line)]">
                {tree.branches.length > 1 ? (
                  <span className="absolute left-0 right-0 top-0 flex justify-between">
                    {tree.branches.map((branch) => (
                      <span key={branch.id} className="h-4 w-px bg-[var(--pat-line)]" />
                    ))}
                  </span>
                ) : null}
              </div>
              <div className="pat-scroll mt-3 overflow-x-auto pb-1">
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${tree.branches.length}, minmax(96px, 1fr))`,
                    minWidth: `${tree.branches.length * 104}px`,
                  }}
                >
                  {tree.branches.map((branch) => {
                    const head = tree.members.find((m) => m.id === branch.headId);
                    const active = branch.id === activeBranchId;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setActiveBranchId(active ? null : branch.id)}
                        aria-pressed={active}
                        className={`rounded-xl border bg-white/70 px-2 py-2 text-center transition ${
                          active
                            ? "border-[var(--pat-red)] ring-2 ring-[var(--pat-gold)]/60"
                            : "border-[var(--pat-line)] hover:border-[var(--pat-gold)]"
                        }`}
                      >
                        <span className="mx-auto block h-1 w-8 rounded-full" style={{ background: branch.color }} />
                        <span className="mt-1 flex items-center justify-center gap-1">
                          {branch.code ? (
                            <span
                              className="rounded-full px-1.5 py-px text-[0.55rem] font-bold text-white"
                              style={{ background: branch.color }}
                            >
                              {branch.code}
                            </span>
                          ) : null}
                          <span className="truncate text-[0.7rem] font-semibold">{branch.name}</span>
                        </span>
                        <span className="block truncate text-[0.6rem] text-[var(--pat-muted)]">
                          {head?.name ?? "Chưa có trưởng chi phái"}
                        </span>
                        <span className="mt-0.5 block text-[0.58rem] font-semibold text-[var(--pat-muted)]">
                          {membersOf(branch.id).length} nam
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeBranch ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf] px-3 py-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: activeBranch.color }} />
                  <p className="min-w-0 flex-1 truncate text-[0.7rem] text-[#7a5a10]">
                    Đang chọn <strong>{activeBranch.name}</strong> · chạm lại ô để bỏ chọn
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(activeBranch);
                      setFormOpen(true);
                    }}
                    className="flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
                  >
                    <PencilLine size={12} /> Sửa chi phái
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {tree.branches.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={30} />}
            title="Gia phả chưa có chi phái nào"
            description="Tạo chi phái giúp quản lý từng dòng trong họ, chọn trưởng chi phái và theo dõi số thành viên."
            action={
              <button type="button" className="pat-btn pat-btn-red h-10 text-sm" onClick={() => setFormOpen(true)}>
                <Plus size={15} /> Tạo chi phái
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {tree.branches.map((branch) => {
              const members = membersOf(branch.id);
              const listed = listedMembersOf(branch.id);
              const head = tree.members.find((m) => m.id === branch.headId);
              return (
                <article key={branch.id} className="pat-card overflow-hidden">
                  <div className="h-1.5 w-full" style={{ background: branch.color }} />
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ background: branch.color }}
                      >
                        <GitBranch size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-bold text-[var(--pat-ink)]">{branch.name}</h3>
                          {branch.code ? <Badge tone="muted">{branch.code}</Badge> : null}
                          <Badge tone="muted">{members.length} nam</Badge>
                          <Badge tone="muted">{generationRange(members)}</Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                          {branch.description || "Chưa có mô tả cho chi phái này."}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pat-line)] text-[var(--pat-muted)]"
                          onClick={() => {
                            setEditing(branch);
                            setFormOpen(true);
                          }}
                          aria-label={`Sửa ${branch.name}`}
                        >
                          <PencilLine size={14} />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pat-line)] text-[#a3271d]"
                          onClick={() => setConfirmDelete(branch)}
                          aria-label={`Xoá ${branch.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-2.5 py-2">
                      {head ? (
                        <>
                          <Avatar person={head} size={30} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.6rem] uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                              Trưởng chi phái
                            </p>
                            <p className="truncate text-xs font-semibold">{head.name}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <UserRound size={16} className="text-[var(--pat-muted)]" />
                          <p className="flex-1 text-xs text-[var(--pat-muted)]">Chưa chọn trưởng chi phái</p>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien?nh=${branch.id}`)}
                        className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
                      >
                        <Users size={12} /> Xem {listed.length} thành viên <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section
          ref={unassignedRef}
          className={`pat-card scroll-mt-24 px-4 py-3 transition ${
            highlightUnassigned ? "ring-2 ring-[var(--pat-gold)]" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <SectionTitle icon={<UserPlus size={13} />} title="Nam chưa xếp chi" />
            <Badge tone="muted">{unassigned}</Badge>
          </div>
          <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            Chỉ gán cho người nam thuộc nội tộc. Theo quy ước của dòng họ, người cùng chi thường là hậu duệ của trưởng
            chi phái đó — hãy kiểm tra lại quan hệ cha–con trước khi gán.
          </p>
          {unassigned === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-[var(--pat-line)] px-3 py-3 text-center text-xs text-[var(--pat-muted)]">
              Tất cả nam nội tộc đã được xếp chi phái.
            </p>
          ) : (
            <>
              {unassigned > 5 ? (
                <label className="mt-2 flex h-9 items-center gap-2 rounded-full border border-[var(--pat-line)] bg-white/80 px-3">
                  <Search size={14} className="text-[var(--pat-muted)]" />
                  <input
                    value={manQuery}
                    onChange={(event) => setManQuery(event.target.value)}
                    placeholder="Tìm người chưa xếp chi…"
                    aria-label="Tìm người chưa xếp chi"
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                  />
                  {manQuery ? (
                    <button type="button" onClick={() => setManQuery("")} aria-label="Xoá tìm kiếm">
                      <X size={13} className="text-[var(--pat-muted)]" />
                    </button>
                  ) : null}
                </label>
              ) : null}
              <div className="pat-scroll mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {filteredUnassigned.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-[var(--pat-muted)]">Không có người phù hợp.</p>
                ) : (
                  filteredUnassigned.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/70 px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMen.includes(person.id)}
                        onChange={() => toggleMan(person.id)}
                        aria-label={`Chọn ${person.name}`}
                        className="h-4 w-4 shrink-0 accent-[var(--pat-red)]"
                      />
                      <Avatar person={person} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{person.name}</p>
                        <p className="truncate text-[0.62rem] text-[var(--pat-muted)]">
                          Đời {gens.get(person.id) ?? "?"}
                          {person.fatherId
                            ? ` · con ông ${tree.members.find((m) => m.id === person.fatherId)?.name ?? ""}`
                            : ""}
                        </p>
                      </div>
                      {tree.branches.length ? (
                        <select
                          value=""
                          onChange={(event) => assignMen([person.id], event.target.value)}
                          aria-label={`Gán chi phái cho ${person.name}`}
                          className="h-8 w-28 shrink-0 rounded-lg border border-[var(--pat-line)] bg-white px-1.5 text-[0.66rem]"
                        >
                          <option value="">Gán vào…</option>
                          {tree.branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.code ? `${branch.code} · ` : ""}
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              {tree.branches.length ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-2.5 py-2">
                  <span className="text-[0.68rem] text-[var(--pat-muted)]">
                    Đã chọn <strong>{selectableMen.length}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMen(
                        selectableMen.length === filteredUnassigned.length
                          ? []
                          : filteredUnassigned.map((person) => person.id),
                      )
                    }
                    className="text-[0.68rem] font-semibold text-[var(--pat-red)]"
                  >
                    {selectableMen.length === filteredUnassigned.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                  <select
                    value={bulkBranchId}
                    onChange={(event) => setBulkBranchId(event.target.value)}
                    aria-label="Chi phái để gán hàng loạt"
                    className="ml-auto h-8 max-w-[9rem] rounded-lg border border-[var(--pat-line)] bg-white px-1.5 text-[0.68rem]"
                  >
                    <option value="">Chọn chi phái…</option>
                    {tree.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.code ? `${branch.code} · ` : ""}
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectableMen.length || !activeBulkBranchId}
                    onClick={() => assignMen(selectableMen, activeBulkBranchId)}
                    className="h-8 rounded-full bg-[#8f2018] px-3 text-[0.68rem] font-semibold text-[#fff4df] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Gán vào chi
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
                  Tạo chi phái trước, sau đó quay lại đây để gán nhanh.
                </p>
              )}
            </>
          )}
        </section>

        <details className="pat-card px-4 py-3">
          <summary className="flex cursor-pointer items-center gap-1.5 text-[0.72rem] font-semibold text-[var(--pat-ink)]">
            <Info size={13} className="text-[var(--pat-muted)]" /> Quy ước gọi tên chi phái
          </summary>
          <div className="mt-2 space-y-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            <p>
              <strong>Chi</strong> là đơn vị trong dòng họ, thường gồm con cháu của một người con trai thuộc dòng nội
              tộc. Ứng dụng quản lý một cấp Chi phái; nếu họ lớn, có thể ghi thêm Phái/Ngành vào phần mô tả chi.
            </p>
            <p>
              Cách đặt tên quen dùng: <strong>Chi trưởng</strong> (dòng con trai trưởng của Khởi Tổ),{" "}
              <strong>Chi thứ</strong>, <strong>Chi ba</strong>… Mã ngắn C1, C2 in kèm trên phả đồ, kể cả bản in đen
              trắng.
            </p>
          </div>
        </details>
      </div>

      {undoDelete ? (
        <div className="sticky bottom-3 z-20 mt-3 flex items-center gap-2 rounded-xl border border-[var(--pat-gold)]/60 bg-[#fff4df] px-3 py-2 shadow-lg">
          <Undo2 size={15} className="shrink-0 text-[var(--pat-red)]" />
          <p className="min-w-0 flex-1 text-[0.7rem] leading-snug text-[#7a5a10]">
            Đã xoá <strong>{undoDelete.branch.name}</strong> · gỡ liên kết {undoDelete.memberIds.length} thành viên
          </p>
          <button
            type="button"
            onClick={undoRemove}
            className="shrink-0 rounded-full bg-[#8f2018] px-3 py-1 text-[0.68rem] font-semibold text-[#fff4df]"
          >
            Hoàn tác
          </button>
          <button type="button" onClick={() => setUndoDelete(null)} aria-label="Đóng" className="shrink-0 p-1">
            <X size={14} className="text-[var(--pat-muted)]" />
          </button>
        </div>
      ) : null}

      {formOpen ? (
        <BranchFormSheet key={editing?.id ?? "new-branch"} tree={tree} branch={editing ?? undefined} onClose={close} />
      ) : null}

      {confirmDelete ? (
        <Sheet
          open
          onClose={() => setConfirmDelete(null)}
          title="Xoá chi phái?"
          subtitle={confirmDelete.name}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="h-11 flex-1 rounded-xl border border-[var(--pat-line)] text-sm font-semibold text-[var(--pat-muted)]"
              >
                Huỷ
              </button>
              <button type="button" onClick={removeBranch} className="pat-btn pat-btn-red h-11 flex-1 text-sm">
                Xoá chi phái
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm leading-relaxed text-[var(--pat-ink)]">
            <p>
              Chi phái <strong>{confirmDelete.name}</strong> sẽ bị xoá khỏi danh mục.{" "}
              <strong>{tree.members.filter((member) => member.branchId === confirmDelete.id).length} thành viên</strong>{" "}
              sẽ được gỡ liên kết chi phái nhưng không bị xoá khỏi gia phả.
            </p>
            <p className="text-[var(--pat-muted)]">
              Trưởng chi phái hiện tại cũng chỉ mất liên kết, hồ sơ vẫn còn nguyên. Bạn có thể hoàn tác ngay sau khi
              xoá.
            </p>
            <p className="rounded-xl border border-[#e3cd92] bg-[#f9edcf] px-3 py-2 text-[0.72rem] text-[#7a5a10]">
              Nên xuất sao lưu (JSON) trước khi thay đổi cấu trúc chi phái, để luôn khôi phục được dữ liệu cũ.
            </p>
          </div>
        </Sheet>
      ) : null}
    </TreeShell>
  );
}

function BranchFormSheet({
  tree,
  branch,
  onClose,
}: {
  tree: FamilyTree;
  branch?: Branch;
  onClose: () => void;
}) {
  const { addBranch, updateBranch } = useGenealogy();
  const [name, setName] = useState(branch?.name ?? "");
  const [description, setDescription] = useState(branch?.description ?? "");
  const [color, setColor] = useState(branch?.color ?? BRANCH_COLORS[tree.branches.length % BRANCH_COLORS.length]);
  const [code, setCode] = useState(() => {
    if (branch) return branch.code ?? "";
    const used = new Set(tree.branches.map((item) => item.code).filter(Boolean));
    for (let index = 1; index <= 99; index += 1) {
      if (!used.has(`C${index}`)) return `C${index}`;
    }
    return "";
  });
  const [headQuery, setHeadQuery] = useState("");
  const [error, setError] = useState("");

  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const gens = useMemo(() => computeGenerations(tree.members, tree.founderId), [tree.members, tree.founderId]);

  const candidates = useMemo(
    () =>
      tree.members
        .filter(
          (person) =>
            (clan.clanIds.has(person.id) && person.gender === "male") || person.id === branch?.headId,
        )
        .sort((a, b) => (gens.get(a.id) ?? 99) - (gens.get(b.id) ?? 99) || sortPersons(a, b)),
    [tree.members, clan, branch?.headId, gens],
  );

  const suggestedHeadId = useMemo(() => {
    if (branch) return "";
    const taken = new Set(tree.branches.map((item) => item.headId).filter((id): id is string => Boolean(id)));
    return (
      [...tree.members]
        .filter(
          (person) => person.gender === "male" && clan.clanIds.has(person.id) && !taken.has(person.id),
        )
        .sort((a, b) => (gens.get(a.id) ?? 1) - (gens.get(b.id) ?? 1) || sortPersons(a, b))[0]?.id ?? ""
    );
  }, [branch, tree.members, tree.branches, clan, gens]);

  const [headId, setHeadId] = useState(branch?.headId ?? suggestedHeadId);

  const filteredCandidates = useMemo(() => {
    const query = headQuery.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter((person) => person.name.toLowerCase().includes(query));
  }, [candidates, headQuery]);

  const listedCandidates = useMemo(() => {
    const selected = candidates.find((person) => person.id === headId);
    if (selected && !filteredCandidates.some((person) => person.id === selected.id)) {
      return [selected, ...filteredCandidates];
    }
    return filteredCandidates;
  }, [candidates, filteredCandidates, headId]);

  const headPerson = tree.members.find((person) => person.id === headId);
  const otherHeadBranch = headId
    ? tree.branches.find((item) => item.id !== branch?.id && item.headId === headId)
    : undefined;
  const colorOwner = tree.branches.find(
    (item) => item.id !== branch?.id && item.color.toLowerCase() === color.toLowerCase(),
  );
  const trimmedCode = code.trim();
  const codeOwner = trimmedCode
    ? tree.branches.find(
        (item) => item.id !== branch?.id && (item.code ?? "").toLowerCase() === trimmedCode.toLowerCase(),
      )
    : undefined;

  const submit = () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên chi phái.");
      return;
    }
    if (branch) {
      updateBranch(tree.id, branch.id, {
        name: name.trim(),
        description: description.trim(),
        headId: headId || undefined,
        color,
        code: trimmedCode || undefined,
      });
    } else {
      addBranch(tree.id, {
        name: name.trim(),
        description: description.trim(),
        headId: headId || undefined,
        color,
        code: trimmedCode || undefined,
      });
    }
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={branch ? "Sửa chi phái" : "Tạo chi phái mới"}
      subtitle="Chia dòng họ thành các chi phái"
      footer={
        <button type="button" className="pat-btn pat-btn-red h-11 w-full text-sm" onClick={submit}>
          {branch ? "Lưu thay đổi" : "Tạo chi phái"}
        </button>
      }
    >
      <div className="space-y-3">
        <Field label="Tên chi phái *">
          <input
            className="pat-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Chi trưởng, Chi thứ, Chi ba…"
          />
        </Field>
        <Field label="Mô tả">
          <textarea
            className="pat-input min-h-20"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ghi chú về chi phái này, nơi sinh sống, nghề truyền thống…"
          />
        </Field>
        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
          <Field label="Mã chi" hint="In kèm trên phả đồ, hữu ích cho bản in đen trắng.">
            <input
              className="pat-input uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))}
              placeholder="C1"
            />
          </Field>
          <Field label="Màu chi">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              aria-label="Màu chi phái"
              className="h-10 w-full cursor-pointer rounded-xl border border-[var(--pat-line)] bg-white p-1"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BRANCH_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={`Chọn màu ${swatch}`}
              aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
              className={`h-7 w-7 rounded-full border-2 ${
                color.toLowerCase() === swatch.toLowerCase() ? "border-[var(--pat-ink)]" : "border-white"
              }`}
              style={{ background: swatch }}
            />
          ))}
        </div>
        {colorOwner ? (
          <p className="rounded-xl border border-[#e0b28b] bg-[#fdeee2] px-3 py-2 text-[0.7rem] leading-relaxed text-[#8a4318]">
            Màu này đang dùng cho <strong>{colorOwner.name}</strong>. Hai chi trùng màu sẽ khó phân biệt trên phả đồ.
          </p>
        ) : null}
        {codeOwner ? (
          <p className="rounded-xl border border-[#e0b28b] bg-[#fdeee2] px-3 py-2 text-[0.7rem] leading-relaxed text-[#8a4318]">
            Mã <strong>{trimmedCode}</strong> đã dùng cho <strong>{codeOwner.name}</strong>. Nên chọn mã khác để tránh
            nhầm khi in.
          </p>
        ) : null}
        <Field
          label="Trưởng chi phái"
          hint="Quy ước chọn người nam thuộc nội tộc làm trưởng chi phái; có thể giữ chọn tay và đổi bất cứ lúc nào."
        >
          <div className="space-y-1.5">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/80 px-2.5">
              <Search size={14} className="text-[var(--pat-muted)]" />
              <input
                value={headQuery}
                onChange={(event) => setHeadQuery(event.target.value)}
                placeholder="Tìm theo tên…"
                aria-label="Tìm trưởng chi phái theo tên"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
              {headQuery ? (
                <button type="button" onClick={() => setHeadQuery("")} aria-label="Xoá tìm kiếm trưởng chi">
                  <X size={13} className="text-[var(--pat-muted)]" />
                </button>
              ) : null}
            </label>
            <select className="pat-input" value={headId} onChange={(event) => setHeadId(event.target.value)}>
              <option value="">— Chưa chọn —</option>
              {listedCandidates.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {gens.get(person.id) !== undefined ? ` · Đời ${gens.get(person.id)}` : ""}
                  {person.id === suggestedHeadId ? " · gợi ý" : ""}
                </option>
              ))}
            </select>
          </div>
        </Field>
        {otherHeadBranch ? (
          <p className="rounded-xl border border-[#e0b28b] bg-[#fdeee2] px-3 py-2 text-[0.7rem] leading-relaxed text-[#8a4318]">
            <strong>{headPerson?.name}</strong> đang là trưởng <strong>{otherHeadBranch.name}</strong>. Theo quy ước mỗi
            người chỉ giữ một chi; hãy chọn người khác hoặc đổi trưởng chi bên kia trước.
          </p>
        ) : null}
        {!branch && suggestedHeadId ? (
          <p className="rounded-xl border border-[#e3cd92] bg-[#f9edcf] px-3 py-2 text-[0.7rem] leading-relaxed text-[#7a5a10]">
            Gợi ý theo quy ước: chọn người nam nội tộc ở đời cao nhất chưa làm trưởng chi phái. Bạn vẫn có thể đổi lại.
          </p>
        ) : null}
        <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
          Chỉ người nam thuộc nội tộc mới tính vào chi phái và có thể làm trưởng chi phái. Dâu/rể, con của con gái và hồ
          sơ tham khảo không tính. Màu và mã chi được dùng khi tô thẻ, in phả đồ. Sau khi tạo chi phái, gán thành viên
          ngay trong mục “Nam chưa xếp chi” ở trang này.
        </p>
        {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
      </div>
    </Sheet>
  );
}
