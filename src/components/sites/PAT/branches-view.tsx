"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  GitBranch,
  Info,
  Network,
  PencilLine,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { Branch, FamilyTree } from "./types";
import { branchHeadcounts, computeGenerations, initials, sortPersons } from "./utils";
import { classifyClan } from "./clan";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, EmptyState, Field, SectionTitle, Sheet, Stat } from "./ui";

export function BranchesView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { deleteBranch } = useGenealogy();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const gens = useMemo(() => computeGenerations(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const { men, byBranch } = useMemo(() => branchHeadcounts(tree), [tree]);
  const founder =
    tree.members.find((m) => m.id === tree.founderId) ??
    tree.members.filter((m) => (gens.get(m.id) ?? 1) === 0).sort(sortPersons)[0];
  const assigned = men.filter((m) => m.branchId).length;
  const unassigned = men.length - assigned;
  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const membersOf = (branchId: string) => byBranch.get(branchId) ?? [];

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
            <Stat value={tree.branches.length} label="Chi phái" tone="red" />
            <Stat value={assigned} label="Nam đã xếp chi" />
            <Stat value={unassigned} label="Nam chưa xếp chi" />
          </div>
          <p className="mt-2 border-t border-[var(--pat-line)] pt-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            Chi phái chỉ tính người nam thuộc nội tộc, không tính dâu/rể, con của con gái hay hồ sơ tham khảo. Con gái
            vẫn thuộc gia phả nhưng không tính vào số nam của chi phái.
          </p>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<Network size={13} />} title="Sơ đồ chi phái" />
          {tree.branches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--pat-line)] px-3 py-4 text-center text-xs text-[var(--pat-muted)]">
              Chưa có chi phái nào. Tạo chi phái để chia dòng họ theo các con trai của Khởi Tổ.
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
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tree.branches.map((branch) => {
                  const head = tree.members.find((m) => m.id === branch.headId);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setEditing(branch);
                        setFormOpen(true);
                      }}
                      className="rounded-xl border border-[var(--pat-line)] bg-white/70 px-2 py-2 text-center transition hover:border-[var(--pat-gold)]"
                    >
                      <span className="mx-auto block h-1 w-8 rounded-full" style={{ background: branch.color }} />
                      <span className="mt-1 block truncate text-[0.7rem] font-semibold">{branch.name}</span>
                      <span className="block truncate text-[0.6rem] text-[var(--pat-muted)]">
                        {head?.name ?? "Chưa có trưởng chi phái"}
                      </span>
                    </button>
                  );
                })}
              </div>
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
                          <Badge tone="muted">{members.length} nam</Badge>
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
                          onClick={() => {
                            if (
                              window.confirm(
                                `Xoá chi phái "${branch.name}"? ${members.length} thành viên sẽ được gỡ khỏi chi phái (không bị xoá khỏi gia phả).`,
                              )
                            ) {
                              deleteBranch(tree.id, branch.id);
                            }
                          }}
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
                        className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
                      >
                        <Users size={12} /> Thành viên <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {unassigned > 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-gold)]/40 bg-[#f9edcf] px-3 py-2.5 text-xs text-[#7a5a10]">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>
              Còn <strong>{unassigned}</strong> người nam nội tộc chưa xếp chi phái. Mở hồ sơ thành viên để chọn chi phái
              trong phần sửa.
            </p>
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <BranchFormSheet
          key={editing?.id ?? "new-branch"}
          tree={tree}
          branch={editing ?? undefined}
          onClose={close}
        />
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
  const [error, setError] = useState("");

  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);

  const candidates = useMemo(
    () =>
      tree.members
        .filter(
          (person) =>
            (clan.clanIds.has(person.id) && person.gender === "male") || person.id === branch?.headId,
        )
        .sort(sortPersons),
    [tree.members, clan, branch?.headId],
  );

  const suggestedHeadId = useMemo(() => {
    if (branch) return "";
    const gens = computeGenerations(tree.members, tree.founderId);
    const taken = new Set(tree.branches.map((item) => item.headId).filter((id): id is string => Boolean(id)));
    return (
      [...tree.members]
        .filter(
          (person) => person.gender === "male" && clan.clanIds.has(person.id) && !taken.has(person.id),
        )
        .sort((a, b) => (gens.get(a.id) ?? 1) - (gens.get(b.id) ?? 1) || sortPersons(a, b))[0]?.id ?? ""
    );
  }, [branch, tree.members, tree.founderId, tree.branches, clan]);

  const [headId, setHeadId] = useState(branch?.headId ?? suggestedHeadId);

  const submit = () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên chi phái.");
      return;
    }
    if (branch) {
      updateBranch(tree.id, branch.id, { name: name.trim(), description: description.trim(), headId: headId || undefined });
    } else {
      addBranch(tree.id, { name: name.trim(), description: description.trim(), headId: headId || undefined });
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
        <Field
          label="Trưởng chi phái"
          hint="Quy ước chọn người nam thuộc nội tộc làm trưởng chi phái; có thể giữ chọn tay và đổi bất cứ lúc nào."
        >
          <select className="pat-input" value={headId} onChange={(event) => setHeadId(event.target.value)}>
            <option value="">— Chưa chọn —</option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.id === suggestedHeadId ? " · gợi ý" : ""}
              </option>
            ))}
          </select>
        </Field>
        {!branch && suggestedHeadId ? (
          <p className="rounded-xl border border-[#e3cd92] bg-[#f9edcf] px-3 py-2 text-[0.7rem] leading-relaxed text-[#7a5a10]">
            Gợi ý theo quy ước: chọn người nam nội tộc ở đời cao nhất chưa làm trưởng chi phái. Bạn vẫn có thể đổi lại.
          </p>
        ) : null}
        <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
          Chỉ người nam thuộc nội tộc mới tính vào chi phái và có thể làm trưởng chi phái. Dâu/rể, con của con gái và hồ
          sơ tham khảo không tính. Sau khi tạo chi phái, mở từng thành viên để gán chi phái. Phả đồ có thể tô màu theo
          chi phái trong phần thiết kế.
        </p>
        {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
      </div>
    </Sheet>
  );
}
