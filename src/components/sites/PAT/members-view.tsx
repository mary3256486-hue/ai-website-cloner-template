"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  GitBranch,
  Info,
  ListFilter,
  MoreHorizontal,
  Network,
  PencilLine,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree, Person } from "./types";
import { UNKNOWN_GENERATION, generationTag } from "./types";
import { CLAN_ROLE_HINTS, CLAN_ROLE_LABELS, classifyClan } from "./clan";
import {
  ageText,
  buildFamilyIndex,
  computeGenerations,
  getGenerationStats,
  getStats,
  lifeSpan,
  sortGenerations,
  sortPersons,
} from "./utils";
import { exportBackup, exportMembersCsv } from "./export";
import { exportGedcom } from "./gedcom";
import { downloadExcelTemplate } from "./import";
import { ESSENTIAL_HEADERS, MEMBER_COLUMN_COUNT } from "./columns";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, EmptyState, Field, Segmented, Sheet, SheetRow, Stat } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";
import { KinshipSheet } from "./kinship-sheet";

type GenderFilter = "all" | "male" | "female";
type StatusFilter = "all" | "alive" | "deceased";
type SortKey = "genealogy" | "name" | "birth";
type TagFilter = "noGen" | "noBranch" | "hasPhoto";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export function MembersView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { deleteMember } = useGenealogy();
  const [query, setQuery] = useState("");
  const [gen, setGen] = useState<number | "all">("all");
  const [branch, setBranch] = useState<string | "all">("all");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("genealogy");
  const [tags, setTags] = useState<TagFilter[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "clan">("all");
  const [exportColumns, setExportColumns] = useState<"full" | "essential">("full");
  const [moreOpen, setMoreOpen] = useState(false);
  const [kinOpen, setKinOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const doi = Number(params.get("doi"));
    // Deep links (?doi=, ?nh=, ?q=, ?add=1) are client-only and applied after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Number.isFinite(doi) && doi > 0) setGen(doi);
    const nh = params.get("nh");
    if (nh) setBranch(nh);
    const q = params.get("q");
    if (q) setQuery(q);
    if (params.get("add") === "1") setFormOpen(true);
  }, []);

  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const gens = useMemo(() => computeGenerations(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const index = useMemo(() => buildFamilyIndex(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const stats = useMemo(() => getStats(tree), [tree]);
  const generationStats = useMemo(() => getGenerationStats(tree), [tree]);
  const optionCounts = useMemo(() => {
    const displayed = tree.members.filter((person) => clan.isDisplayed(person.id));
    const branchCounts = new Map<string, number>();
    let noGen = 0;
    let noBranch = 0;
    let hasPhoto = 0;
    for (const person of displayed) {
      if ((gens.get(person.id) ?? UNKNOWN_GENERATION) === UNKNOWN_GENERATION) noGen += 1;
      if (person.branchId) branchCounts.set(person.branchId, (branchCounts.get(person.branchId) ?? 0) + 1);
      else noBranch += 1;
      if (person.avatar) hasPhoto += 1;
    }
    return {
      male: displayed.filter((person) => person.gender === "male").length,
      female: displayed.filter((person) => person.gender === "female").length,
      alive: displayed.filter((person) => person.alive).length,
      deceased: displayed.filter((person) => !person.alive).length,
      branchCounts,
      noGen,
      noBranch,
      hasPhoto,
    };
  }, [tree.members, clan, gens]);
  const branchName = useMemo(
    () => new Map(tree.branches.map((branch) => [branch.id, branch.name])),
    [tree.branches],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    const list = tree.members.filter((person) => {
      // Danh sách chỉ gồm người hiển thị trên cây/phả đồ; hồ sơ tham khảo mở từ hồ sơ dâu/rể.
      if (!clan.isDisplayed(person.id)) return false;
      if (gen !== "all" && (gens.get(person.id) ?? 1) !== gen) return false;
      if (branch !== "all" && person.branchId !== branch) return false;
      if (gender !== "all" && person.gender !== gender) return false;
      if (status === "alive" && !person.alive) return false;
      if (status === "deceased" && person.alive) return false;
      if (tags.includes("noGen") && (gens.get(person.id) ?? UNKNOWN_GENERATION) !== UNKNOWN_GENERATION) return false;
      if (tags.includes("noBranch") && person.branchId) return false;
      if (tags.includes("hasPhoto") && !person.avatar) return false;
      if (!needle) return true;
      const haystack = normalize(
        [
          person.name,
          person.birthDate,
          person.hometown,
          person.occupation,
          person.title,
          person.branchId ? branchName.get(person.branchId) : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(needle);
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      if (sort === "birth") {
        const ay = parseInt(a.birthDate ?? "", 10);
        const by = parseInt(b.birthDate ?? "", 10);
        return (Number.isNaN(ay) ? 9999 : ay) - (Number.isNaN(by) ? 9999 : by);
      }
      const ga = gens.get(a.id) ?? 1;
      const gb = gens.get(b.id) ?? 1;
      if (ga !== gb) return sortGenerations(ga, gb);
      return sortPersons(a, b);
    });
  }, [tree.members, query, gen, branch, gender, status, sort, tags, gens, branchName, clan]);

  const activeFilters =
    (gender !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (sort !== "genealogy" ? 1 : 0) +
    (branch !== "all" ? 1 : 0) +
    (gen !== "all" ? 1 : 0) +
    tags.length;
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const printList = () => {
    setExportOpen(false);
    window.setTimeout(() => window.print(), 200);
  };

  return (
    <TreeShell
      tree={tree}
      section="danh-sach-thanh-vien"
      title="Phả hệ"
      subtitle={`${tree.name} · ${stats.total} thành viên`}
      actions={
        <>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="pat-tip flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Xuất dữ liệu"
            data-tip="Xuất dữ liệu"
          >
            <Download size={17} />
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="pat-tip flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Thêm thao tác"
            data-tip="Thêm thao tác"
          >
            <MoreHorizontal size={18} />
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
          >
            <Plus size={14} /> Thêm
          </button>
        </>
      }
    >
      <div className="no-print space-y-4">
        <section className="pat-card px-4 py-3">
          <div className="grid grid-cols-4 divide-x divide-[var(--pat-line)]">
            <Stat value={stats.total} label="Trong gia phả" tone="red" />
            <Stat value={stats.male} label="Nam" />
            <Stat value={stats.female} label="Nữ" />
            <Stat
              value={`${stats.generations} đời`}
              label={stats.ancestorTiers ? `+${stats.ancestorTiers} bậc tổ` : "Sơ tổ"}
            />
          </div>
        </section>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pat-muted)]" />
            <input
              className="pat-input pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên, năm sinh, quê quán, chi phái…"
              aria-label="Tìm thành viên"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[var(--pat-line)] bg-[#fffdf7] text-[var(--pat-red)]"
            aria-label="Bộ lọc"
          >
            <SlidersHorizontal size={17} />
            {activeFilters ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--pat-red)] text-[0.68rem] font-bold text-white">
                {activeFilters}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[var(--pat-line)] bg-[#fffdf7] text-[var(--pat-muted)]"
            aria-label={expanded ? "Thu gọn thẻ" : "Mở rộng thẻ"}
          >
            {expanded ? <ChevronDown size={17} /> : <ListFilter size={17} />}
          </button>
        </div>

        <div className="pat-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            className="pat-chip shrink-0"
            data-active={gen === "all"}
            onClick={() => setGen("all")}
          >
            Tất cả <span className="text-[0.68rem] opacity-80">{stats.total}</span>
          </button>
          {generationStats.map((row) => (
            <button
              key={row.generation}
              type="button"
              className="pat-chip shrink-0"
              data-active={gen === row.generation}
              onClick={() => setGen(row.generation)}
            >
              {row.label}
              <span className="text-[0.68rem] opacity-80">{row.total}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<UserRound size={28} />}
            title="Không có thành viên phù hợp"
            description="Thử xoá từ khoá tìm kiếm hoặc bỏ bộ lọc đời, giới tính, trạng thái."
            action={
              <button
                type="button"
                className="pat-btn pat-btn-outline h-9 text-xs"
                onClick={() => {
                  setQuery("");
                  setGen("all");
                  setBranch("all");
                  setGender("all");
                  setStatus("all");
                  setSort("genealogy");
                }}
              >
                Xoá bộ lọc
              </button>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-1 text-xs text-[var(--pat-muted)]">
              <span>
                {filtered.length} / {stats.total} hồ sơ
                {branch !== "all" ? ` · ${branchName.get(branch) ?? ""}` : ""}
              </span>
              <span>
                {sort === "genealogy" ? "Thứ tự gia phả" : sort === "name" ? "Tên A → Z" : "Năm sinh"}
              </span>
            </div>
            <div className="space-y-2.5">
              {filtered.map((person) => {
                const spouseCount = person.spouseIds.length;
                const children = index.childrenAny.get(person.id) ?? [];
                const father = person.fatherId ? tree.members.find((m) => m.id === person.fatherId) : undefined;
                const mother = person.motherId ? tree.members.find((m) => m.id === person.motherId) : undefined;
                const spouses = person.spouseIds
                  .map((id) => tree.members.find((m) => m.id === id))
                  .filter((m): m is Person => Boolean(m));
                const branch = person.branchId ? branchName.get(person.branchId) : undefined;
                const role = clan.roleOf(person.id);
                return (
                  <article key={person.id} className="pat-card overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${person.id}`)}
                        className="shrink-0"
                        aria-label={`Xem hồ sơ ${person.name}`}
                      >
                        <Avatar person={person} size={48} />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${person.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="truncate text-sm font-bold text-[var(--pat-ink)]">{person.name}</h3>
                          {person.title ? <Badge tone="gold">{person.title}</Badge> : null}
                          {role !== "clan" ? (
                            <span title={CLAN_ROLE_HINTS[role]} className="inline-flex">
                              <Badge tone={role === "ancestor" ? "gold" : role === "maternal" ? "green" : "muted"}>
                                {CLAN_ROLE_LABELS[role]}
                              </Badge>
                            </span>
                          ) : null}
                          {!person.alive ? <Badge tone="muted">Đã mất</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-[0.7rem] text-[var(--pat-muted)]">
                          {lifeSpan(person)}
                          {ageText(person) ? ` · ${ageText(person)}` : ""}
                          {person.hometown ? ` · ${person.hometown}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.72rem]">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f6e9c8] px-2 py-0.5 font-semibold text-[#7a5a10]">
                            {generationTag(gens.get(person.id) ?? 1)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--pat-muted)]">
                            <UserRound size={11} /> {person.gender === "male" ? "Nam" : "Nữ"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--pat-muted)]">
                            <Users size={11} /> {spouseCount} vợ/chồng
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--pat-muted)]">
                            <ChevronRight size={11} /> {children.length} con
                          </span>
                          {branch ? (
                            <span className="inline-flex items-center gap-1 text-[var(--pat-muted)]">
                              <GitBranch size={11} /> {branch}
                            </span>
                          ) : null}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(person)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--pat-line)] text-[var(--pat-muted)] transition hover:text-[var(--pat-red)]"
                        aria-label={`Sửa ${person.name}`}
                      >
                        <PencilLine size={14} />
                      </button>
                    </div>

                    {expanded ? (
                      <div className="space-y-1.5 border-t border-dashed border-[var(--pat-line)] px-3 py-2.5 text-[0.7rem]">
                        {role === "inLaw" || role === "reference" ? (
                          <p className="rounded-lg bg-[#fbf3e2] px-2 py-1 text-[0.72rem] leading-relaxed text-[#7a5a10]">
                            {CLAN_ROLE_HINTS[role]}
                          </p>
                        ) : null}
                        <p className="flex flex-wrap gap-1.5 text-[var(--pat-muted)]">
                          <span className="font-semibold text-[var(--pat-ink)]">Cha:</span>
                          {father ? (
                            <button
                              type="button"
                              className="text-[var(--pat-red)] underline-offset-2 hover:underline"
                              onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${father.id}`)}
                            >
                              {father.name}
                            </button>
                          ) : (
                            <span>chưa rõ</span>
                          )}
                          <span className="font-semibold text-[var(--pat-ink)]">· Mẹ:</span>
                          {mother ? (
                            <button
                              type="button"
                              className="text-[var(--pat-red)] underline-offset-2 hover:underline"
                              onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${mother.id}`)}
                            >
                              {mother.name}
                            </button>
                          ) : (
                            <span>chưa rõ</span>
                          )}
                        </p>
                        <p className="flex flex-wrap gap-1.5 text-[var(--pat-muted)]">
                          <span className="font-semibold text-[var(--pat-ink)]">Vợ/chồng:</span>
                          {spouses.length ? (
                            spouses.map((spouse) => (
                              <button
                                key={spouse.id}
                                type="button"
                                className="text-[var(--pat-red)] underline-offset-2 hover:underline"
                                onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${spouse.id}`)}
                              >
                                {spouse.name}
                              </button>
                            ))
                          ) : (
                            <span>chưa có</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-[var(--pat-ink)]">Con:</span>
                          {children.length ? (
                            children.slice(0, 6).map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                className="rounded-full bg-[#f6e9c8]/80 px-2 py-0.5 font-medium text-[#7a5a10]"
                                onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${child.id}`)}
                              >
                                {child.name}
                              </button>
                            ))
                          ) : (
                            <span className="text-[var(--pat-muted)]">chưa có</span>
                          )}
                          {children.length > 6 ? (
                            <span className="text-[var(--pat-muted)]">+{children.length - 6}</span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 pt-0.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
                            onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${person.id}`)}
                          >
                            Hồ sơ đầy đủ <ChevronRight size={12} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-muted)]"
                            onClick={() => setDeleteTarget(person)}
                          >
                            <Trash2 size={12} /> Xoá
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="pat-btn pat-btn-outline h-11 w-full text-sm"
            >
              <Plus size={15} /> Thêm thành viên mới
            </button>
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-xs text-[var(--pat-muted)]">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          <p>
            Đời được tính tự động từ quan hệ cha/mẹ trong dòng họ hoặc bậc tiền tổ. Dâu/rể theo đời vợ/chồng; con của
            con gái chỉ hiển thị một đời. Hồ sơ tham khảo (cha mẹ của dâu/rể) không nằm trong danh sách, mở từ hồ sơ
            dâu/rể. Chạm vào thẻ để mở hồ sơ, hoặc dùng bút chì để sửa nhanh.
          </p>
        </div>
      </div>

      <div className="print-only p-6 text-[#1a1a1a]">
        <h1 className="pat-serif text-2xl font-bold">{tree.name}</h1>
        <p className="mt-1 text-sm">
          Danh sách thành viên · {filtered.length} người · {stats.generations} đời
          {stats.ancestorTiers ? ` · ${stats.ancestorTiers} bậc tiền tổ` : ""}
        </p>
        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#999] text-left">
              <th className="py-1 pr-2">STT</th>
              <th className="py-1 pr-2">Họ tên</th>
              <th className="py-1 pr-2">Giới tính</th>
              <th className="py-1 pr-2">Đời / bậc tổ</th>
              <th className="py-1 pr-2">Sinh</th>
              <th className="py-1 pr-2">Mất</th>
              <th className="py-1 pr-2">Cha</th>
              <th className="py-1 pr-2">Mẹ</th>
              <th className="py-1 pr-2">Phạm vi</th>
              <th className="py-1 pr-2">Chi phái</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((person, i) => (
              <tr key={person.id} className="border-b border-[#ddd]">
                <td className="py-1 pr-2">{i + 1}</td>
                <td className="py-1 pr-2 font-semibold">{person.name}</td>
                <td className="py-1 pr-2">{person.gender === "male" ? "Nam" : "Nữ"}</td>
                <td className="py-1 pr-2">{generationTag(gens.get(person.id) ?? 1)}</td>
                <td className="py-1 pr-2">{person.birthDate ?? ""}</td>
                <td className="py-1 pr-2">{person.deathDate ?? ""}</td>
                <td className="py-1 pr-2">{tree.members.find((m) => m.id === person.fatherId)?.name ?? ""}</td>
                <td className="py-1 pr-2">{tree.members.find((m) => m.id === person.motherId)?.name ?? ""}</td>
                <td className="py-1 pr-2">{CLAN_ROLE_LABELS[clan.roleOf(person.id)]}</td>
                <td className="py-1 pr-2">{person.branchId ? branchName.get(person.branchId) ?? "" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Lọc & sắp xếp"
        subtitle="Tìm đúng người cần xem trong dòng họ"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="pat-btn pat-btn-outline h-10 flex-1 text-sm"
              onClick={() => {
                setGender("all");
                setStatus("all");
                setSort("genealogy");
                setBranch("all");
                setGen("all");
                setTags([]);
              }}
            >
              Đặt lại
            </button>
            <button type="button" className="pat-btn pat-btn-red h-10 flex-[2] text-sm" onClick={() => setFilterOpen(false)}>
              Xem {filtered.length} thành viên
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Giới tính">
            <Segmented<GenderFilter>
              value={gender}
              onChange={setGender}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "male", label: `Nam (${optionCounts.male})` },
                { value: "female", label: `Nữ (${optionCounts.female})` },
              ]}
            />
          </Field>
          <Field label="Trạng thái">
            <Segmented<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "alive", label: `Còn sống (${optionCounts.alive})` },
                { value: "deceased", label: `Đã mất (${optionCounts.deceased})` },
              ]}
            />
          </Field>
          <Field label="Sắp xếp">
            <Segmented<SortKey>
              value={sort}
              onChange={setSort}
              options={[
                { value: "genealogy", label: "Thứ tự gia phả" },
                { value: "name", label: "Tên A → Z" },
                { value: "birth", label: "Năm sinh" },
              ]}
            />
          </Field>
          <Field label="Đời">
            <div className="pat-scroll flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              <button type="button" className="pat-chip" data-active={gen === "all"} onClick={() => setGen("all")}>
                Tất cả
              </button>
              {generationStats.map((row) => (
                <button
                  key={row.generation}
                  type="button"
                  className="pat-chip"
                  data-active={gen === row.generation}
                  onClick={() => setGen(row.generation)}
                >
                  {row.label} ({row.total})
                </button>
              ))}
            </div>
          </Field>
          {tree.branches.length ? (
            <Field label="Chi phái">
              <div className="pat-scroll flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                <button
                  type="button"
                  className="pat-chip"
                  data-active={branch === "all"}
                  onClick={() => setBranch("all")}
                >
                  Tất cả chi phái
                </button>
                {tree.branches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="pat-chip"
                    data-active={branch === item.id}
                    onClick={() => setBranch(item.id)}
                  >
                    {item.name} ({optionCounts.branchCounts.get(item.id) ?? 0})
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
          <Field label="Lọc thêm">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "noGen", label: "Chưa xác định đời", count: optionCounts.noGen },
                  { key: "noBranch", label: "Chưa xếp chi phái", count: optionCounts.noBranch },
                  { key: "hasPhoto", label: "Có ảnh", count: optionCounts.hasPhoto },
                ] satisfies { key: TagFilter; label: string; count: number }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="pat-chip"
                  data-active={tags.includes(item.key)}
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(item.key) ? prev.filter((tag) => tag !== item.key) : [...prev, item.key],
                    )
                  }
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Sheet>

      <Sheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Xuất dữ liệu"
        subtitle={`${tree.name} · tệp tải trực tiếp, không cần đăng nhập`}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">Phạm vi</p>
            <div className="mt-1.5">
              <Segmented<"all" | "clan">
                value={exportScope}
                onChange={setExportScope}
                options={[
                  { value: "all", label: `Tất cả (${tree.members.length})` },
                  { value: "clan", label: `Trong dòng họ (${clan.clanIds.size})` },
                ]}
              />
            </div>
            <p className="mt-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
              {exportScope === "clan"
                ? "Chỉ người thuộc dòng họ: Sơ Tổ, con cháu nội tộc và dâu/rể của các đời hiển thị."
                : "Mọi hồ sơ đang lưu trong gia phả, gồm cả người tham khảo và hồ sơ đã ẩn khỏi phả đồ."}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">Cột dữ liệu</p>
            <div className="mt-1.5">
              <Segmented<"full" | "essential">
                value={exportColumns}
                onChange={setExportColumns}
                options={[
                  { value: "full", label: `Đầy đủ ${MEMBER_COLUMN_COUNT} cột` },
                  { value: "essential", label: `Thiết yếu ${ESSENTIAL_HEADERS.length} cột` },
                ]}
              />
            </div>
            <p className="mt-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
              {exportColumns === "full"
                ? "Mã, quan hệ, tên cổ, bản đồ, tiểu sử và toàn bộ trường gia phả."
                : "Mã, họ tên, giới tính, cha, mẹ — đủ để nhập lại và nối quan hệ."}
            </p>
          </div>

          <div className="grid gap-1">
            <SheetRow
              icon={<FileSpreadsheet size={18} />}
              title={`Xuất CSV · ${exportColumns === "full" ? `${MEMBER_COLUMN_COUNT} cột` : `${ESSENTIAL_HEADERS.length} cột thiết yếu`}`}
              subtitle={`${exportScope === "clan" ? "Trong dòng họ" : "Tất cả thành viên"} · UTF-8 BOM để Excel mở đúng tiếng Việt`}
              onClick={() => {
                exportMembersCsv(tree, {
                  essentialOnly: exportColumns === "essential",
                  scope: exportScope,
                });
                setExportOpen(false);
              }}
            />
            <SheetRow
              icon={<FileSpreadsheet size={18} />}
              title={`Excel mẫu ${MEMBER_COLUMN_COUNT} cột kèm dữ liệu`}
              subtitle="Đối chiếu rồi nhập lại dưới dạng cập nhật"
              onClick={() => {
                downloadExcelTemplate(tree);
                setExportOpen(false);
              }}
            />
            <SheetRow
              icon={<FileText size={18} />}
              title="Xuất GEDCOM (.ged)"
              subtitle="Tệp chuẩn 5.5.1 để trao đổi với phần mềm gia phả khác"
              onClick={() => {
                exportGedcom(tree);
                setExportOpen(false);
              }}
            />
            <SheetRow
              icon={<FileJson size={18} />}
              title="Sao lưu JSON"
              subtitle="Tệp đầy đủ để khôi phục hoặc chuyển máy"
              onClick={() => {
                exportBackup(tree);
                setExportOpen(false);
              }}
            />
            <SheetRow
              icon={<Printer size={18} />}
              title="In danh sách"
              subtitle="Mở hộp thoại in, chọn Save as PDF nếu cần"
              onClick={printList}
            />
            <SheetRow
              icon={<Network size={18} />}
              title="Xuất phả đồ"
              subtitle="Thiết kế và in phả đồ khổ lớn"
              onClick={() => {
                setExportOpen(false);
                router.push(`/gia-pha/${tree.id}/ve-pha-do`);
              }}
            />
          </div>

          <p className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            <Info size={13} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            Tệp CSV có BOM nên Excel nhận đúng dấu tiếng Việt. GEDCOM và JSON dùng để chuyển sang ứng dụng khác hoặc sao
            lưu toàn bộ.
          </p>
        </div>
      </Sheet>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Công cụ phả hệ" subtitle={tree.name}>
        <div className="grid gap-1">
          <SheetRow
            icon={<Plus size={18} />}
            title="Thêm thành viên"
            onClick={() => {
              setMoreOpen(false);
              setFormOpen(true);
            }}
          />
          <SheetRow
            icon={<Users size={18} />}
            title="Tra cứu cách xưng hô"
            subtitle="Chọn hai thành viên, xem vai vế Bắc/Nam"
            onClick={() => {
              setMoreOpen(false);
              setKinOpen(true);
            }}
          />
          <SheetRow
            icon={<Network size={18} />}
            title="Xem cây gia phả"
            onClick={() => {
              setMoreOpen(false);
              router.push(`/gia-pha/${tree.id}/chinh-sua-voi-cay-gia-pha`);
            }}
          />
          <SheetRow
            icon={<GitBranch size={18} />}
            title="Quản lý chi phái"
            onClick={() => {
              setMoreOpen(false);
              router.push(`/gia-pha/${tree.id}/danh-sach-nhanh`);
            }}
          />
          <SheetRow
            icon={<Filter size={18} />}
            title="Bộ lọc nâng cao"
            onClick={() => {
              setMoreOpen(false);
              setFilterOpen(true);
            }}
          />
        </div>
      </Sheet>

      {formOpen || editing ? (
        <MemberFormSheet
          key={editing?.id ?? "new-member"}
          tree={tree}
          open
          onClose={closeForm}
          member={editing ?? undefined}
        />
      ) : null}

      {kinOpen ? (
        <KinshipSheet
          tree={tree}
          open
          onClose={() => setKinOpen(false)}
          initialA={filtered[0]?.id}
          initialB={filtered[1]?.id}
        />
      ) : null}

      <Sheet
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Xoá ${deleteTarget?.name ?? ""}?`}
        subtitle="Chuyển vào Thùng rác · giữ 30 ngày"
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setDeleteTarget(null)}>
              Giữ lại
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-11 flex-1 text-sm"
              onClick={() => {
                if (deleteTarget) deleteMember(tree.id, deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Chuyển vào Thùng rác
            </button>
          </div>
        }
      >
        {deleteTarget ? (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">
              Hồ sơ của <strong>{deleteTarget.name}</strong> sẽ rời khỏi phả hệ cùng các liên kết. Các mối liên hệ
              (con, vợ/chồng, chi phái) được lưu kèm nên khôi phục lại nguyên vẹn trong 30 ngày.
            </p>
            <p className="text-[0.7rem] text-[var(--pat-muted)]">
              Số người còn sống trong danh sách sẽ giảm đi 1. Nếu chỉ muốn ẩn tạm, hãy chọn Giữ lại.
            </p>
          </div>
        ) : null}
      </Sheet>
    </TreeShell>
  );
}
