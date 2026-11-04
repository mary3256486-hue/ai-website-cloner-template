"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Crown,
  Download,
  GitBranch,
  Info,
  MapPin,
  MoreHorizontal,
  Network,
  Palette,
  PenTool,
  PencilLine,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree } from "./types";
import { generationTag, UNKNOWN_GENERATION } from "./types";
import {
  branchHeadcounts,
  computeGenerations,
  diagnoseGenerations,
  getGenerationStats,
  getStats,
  initials,
} from "./utils";
import { classifyClan } from "./clan";
import { exportBackup } from "./export";
import { TreeShell } from "./app-shell";
import { Badge, Field, Sheet, SheetRow, SectionTitle, Stat } from "./ui";

const features = [
  {
    key: "members",
    href: "danh-sach-thanh-vien",
    icon: Users,
    label: "Phả hệ",
    caption: "Danh sách thành viên",
  },
  {
    key: "tree",
    href: "chinh-sua-voi-cay-gia-pha",
    icon: Network,
    label: "Cây gia phả",
    caption: "Dựng quan hệ",
  },
  {
    key: "diagram",
    href: "ve-pha-do",
    icon: PenTool,
    label: "Vẽ phả đồ",
    caption: "Kéo thả bố cục",
  },
  {
    key: "design",
    href: "giao-dien",
    icon: Palette,
    label: "Thiết kế bản in",
    caption: "Khổ giấy, màu sắc",
  },
  {
    key: "chronicle",
    href: "pha-ky",
    icon: BookOpen,
    label: "Phả ký",
    caption: "Lịch sử dòng họ",
  },
  {
    key: "branches",
    href: "danh-sach-nhanh",
    icon: GitBranch,
    label: "Chi phái",
    caption: "Trưởng chi phái",
  },
];

export function TreeHomeView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { updateTree, archiveTree } = useGenealogy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [issueKind, setIssueKind] = useState<"all" | "cycle" | "conflict" | "unknown">("all");
  const [dismissedIssues, setDismissedIssues] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: tree.name,
    address: tree.address ?? "",
    ownerName: tree.ownerName ?? "",
    description: tree.description ?? "",
    founderId: tree.founderId ?? "",
  });

  const stats = getStats(tree);
  const generationStats = getGenerationStats(tree);
  const clan = classifyClan(tree.members, tree.founderId);
  const gens = computeGenerations(tree.members, tree.founderId);
  const issues = diagnoseGenerations(tree.members, tree.founderId);
  const founder =
    (tree.founderId ? tree.members.find((member) => member.id === tree.founderId) : undefined) ??
    tree.members
      .filter((member) => clan.clanIds.has(member.id) && (gens.get(member.id) ?? 1) >= 0)
      .sort((a, b) => (gens.get(a.id) ?? 1) - (gens.get(b.id) ?? 1) || a.birthOrder - b.birthOrder)[0];
  const rootsAtZero = tree.members.filter(
    (member) => clan.clanIds.has(member.id) && gens.get(member.id) === 0,
  );
  const needsFounder = rootsAtZero.length > 1 && !tree.founderId;
  const visibleIssues = issues.filter(
    (issue) =>
      (issueKind === "all" || issue.kind === issueKind) &&
      !dismissedIssues.includes(`${issue.kind}-${issue.personId ?? issue.message}`),
  );
  const sortedBranches = tree.branches;
  const headcounts = branchHeadcounts(tree);
  const branchMen = headcounts.byBranch;
  const unassignedMen = tree.branches.length
    ? headcounts.men.filter((member) => !tree.branches.some((branch) => branch.id === member.branchId))
    : [];

  const open = (href: string) => router.push(`/gia-pha/${tree.id}/${href}`);

  return (
    <TreeShell
      tree={tree}
      section="trang-chu"
      title={tree.name}
      subtitle={`${stats.total} thành viên · ${stats.generations} đời${
        stats.ancestorTiers ? ` · ${stats.ancestorTiers} bậc tiền tổ` : ""
      }`}
      actions={
        <button
          type="button"
          onClick={() => {
            setForm({
              name: tree.name,
              address: tree.address ?? "",
              ownerName: tree.ownerName ?? "",
              description: tree.description ?? "",
              founderId: tree.founderId ?? "",
            });
            setMenuOpen(true);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
          aria-label="Thao tác"
        >
          <MoreHorizontal size={18} />
        </button>
      }
    >
      <div className="space-y-4">
        <section className="pat-card-red relative overflow-hidden px-5 py-5">
          <div aria-hidden className="pat-ornament absolute inset-x-5 top-3 opacity-50" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">
                <Sparkles size={11} /> GIA PHẢ DÒNG HỌ
              </Badge>
              {tree.sample ? <Badge tone="red">BẢN MẪU</Badge> : null}
            </div>
            <h1 className="pat-serif mt-2 text-2xl font-bold leading-tight text-[#fff4df]">{tree.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#f0d9bd]">
              <MapPin size={13} /> {tree.address || "Chưa cập nhật địa chỉ"}
            </p>

            <div className="mt-4 grid grid-cols-4 divide-x divide-white/15 rounded-xl border border-[rgba(231,206,139,0.35)] bg-black/10 py-2.5 text-center">
              {[
                {
                  value: `${stats.generations} đời`,
                  label: stats.ancestorTiers ? `+${stats.ancestorTiers} bậc tổ` : "Đời 0 · Khởi Tổ",
                  title: `Đời 0 là Khởi Tổ${stats.ancestorTiers ? `; ${stats.ancestorTiers} bậc tiền tổ nằm phía trên` : ""}.`,
                },
                { value: stats.total, label: "Thành viên", title: `${stats.total} thành viên` },
                { value: tree.branches.length, label: "Chi phái", title: `${tree.branches.length} chi phái` },
                { value: stats.alive, label: "Còn sống", title: `${stats.alive} người còn sống` },
              ].map((cell) => (
                <div key={String(cell.label)} className="px-1" title={cell.title}>
                  <p className="text-base font-bold text-[#ffe9bd]">{cell.value}</p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[#efd7b7]/90">{cell.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#f0d9bd]">
              <span className="inline-flex items-center gap-1.5">
                <Crown size={14} className="text-[#f2d27c]" />
                Người tạo: <strong className="text-[#fff4df]">{tree.ownerName || "Chủ gia phả"}</strong>
              </span>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[rgba(231,206,139,0.4)] px-2.5 py-1 font-semibold text-[#ffe9bd] transition hover:bg-white/10"
              >
                <PencilLine size={12} /> Sửa
              </button>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle icon={<Sparkles size={13} />} title="Dựng gia phả" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => open(item.href)}
                  className="pat-card group flex flex-col items-start gap-2 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--pat-gold)]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6e9c8] text-[var(--pat-red)] transition group-hover:bg-[var(--pat-red)] group-hover:text-[#fff4df]">
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.72rem] font-medium leading-tight text-[var(--pat-muted)]">
                      {item.caption}
                    </span>
                    <span className="pat-serif block text-base font-bold leading-tight text-[var(--pat-red)]">
                      {item.label}
                    </span>
                  </span>
                  <ChevronRight size={15} className="absolute right-3 top-4 text-[var(--pat-line)]" />
                </button>
              );
            })}
          </div>
        </section>

        {visibleIssues.length || needsFounder || dismissedIssues.length ? (
          <section className="pat-card border-[#e6b7ad] px-4 py-4">
            <SectionTitle
              icon={<AlertTriangle size={13} />}
              title={`Cần rà soát (${visibleIssues.length + (needsFounder ? 1 : 0)})`}
            />
            {needsFounder ? (
              <div className="mb-2 rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/60 px-3 py-2.5">
                <p className="text-xs font-semibold leading-relaxed text-[#8a1c15]">
                  Có {rootsAtZero.length} người cùng ở Đời 0 nhưng chưa chọn Khởi Tổ cho dòng đang soạn.
                </p>
                <p className="mt-1 text-[0.7rem] leading-relaxed text-[#8a5a52]">
                  Nếu bỏ trống, hệ thống lấy người ở Đời 0 đầu tiên, nên danh xưng và bản in có thể sai. Mỗi dòng họ
                  chỉ có một Khởi Tổ; các vị tổ phía trên nên nối bằng liên kết tiền tổ.
                </p>
                <div className="mt-2 flex gap-1.5">
                  <select
                    className="pat-input h-9 min-w-0 flex-1 text-xs"
                    value=""
                    aria-label="Chọn Khởi Tổ"
                    onChange={(event) => {
                      const id = event.target.value;
                      if (id) updateTree(tree.id, { founderId: id });
                    }}
                  >
                    <option value="">Chọn Khởi Tổ…</option>
                    {[...rootsAtZero]
                      .sort((a, b) => a.birthOrder - b.birthOrder || a.name.localeCompare(b.name, "vi"))
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {member.birthDate ? ` (${member.birthDate})` : ""}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="pat-btn pat-btn-outline h-9 shrink-0 px-2 text-[0.68rem]"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            ) : null}
            {issues.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(["all", "cycle", "conflict", "unknown"] as const).map((kind) => {
                  const count =
                    kind === "all" ? issues.length : issues.filter((issue) => issue.kind === kind).length;
                  if (kind !== "all" && count === 0) return null;
                  const active = issueKind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setIssueKind(kind)}
                      className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold transition ${
                        active
                          ? "border-[var(--pat-red)] bg-[var(--pat-red)] text-[#fff4df]"
                          : "border-[var(--pat-line)] bg-[#fffaf0] text-[var(--pat-muted)]"
                      }`}
                    >
                      {kind === "all"
                        ? "Tất cả"
                        : kind === "cycle"
                          ? "Vòng lặp"
                          : kind === "conflict"
                            ? "Xung đột đời"
                            : "Chưa rõ đời"}{" "}
                      {count}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {visibleIssues.length ? (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {visibleIssues.map((issue) => {
                  const key = `${issue.kind}-${issue.personId ?? issue.message}`;
                  const tone =
                    issue.kind === "cycle"
                      ? "border-[#e6b7ad] bg-[#f9e3df]/50 text-[#8a1c15]"
                      : issue.kind === "conflict"
                        ? "border-[var(--pat-gold)]/60 bg-[#f9edcf]/60 text-[#7a5a10]"
                        : "border-[var(--pat-line)] bg-[#fffaf0]/70 text-[var(--pat-ink)]";
                  const label =
                    issue.kind === "cycle" ? "Vòng lặp" : issue.kind === "conflict" ? "Xung đột đời" : "Chưa rõ đời";
                  return (
                    <li
                      key={key}
                      className={`flex items-stretch gap-1.5 rounded-xl border px-2 py-1.5 text-[0.7rem] leading-relaxed ${tone}`}
                    >
                      <button
                        type="button"
                        disabled={!issue.personId}
                        onClick={() => issue.personId && open(`thanh-vien/${issue.personId}`)}
                        className="flex min-w-0 flex-1 items-start gap-2 py-0.5 text-left transition enabled:hover:opacity-80"
                      >
                        <span className="mt-px shrink-0 rounded-full border border-current/30 px-1.5 py-0.5 text-[0.68rem] font-bold">
                          {label}
                        </span>
                        <span className="min-w-0 flex-1">{issue.message}</span>
                        {issue.personId ? <ChevronRight size={13} className="mt-0.5 shrink-0" /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedIssues((prev) => [...prev, key])}
                        className="shrink-0 self-center rounded-full border border-current/25 px-2 py-1 text-[0.64rem] font-semibold transition hover:bg-white/40"
                        aria-label={`Bỏ qua mục: ${issue.message}`}
                      >
                        Bỏ qua
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : issues.length ? (
              <p className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                Không còn mục nào trong nhóm đang chọn.
              </p>
            ) : null}
            {dismissedIssues.length ? (
              <button
                type="button"
                onClick={() => setDismissedIssues([])}
                className="mt-2 text-[0.68rem] font-semibold text-[var(--pat-red)] underline-offset-2 hover:underline"
              >
                Hiện lại {dismissedIssues.length} mục đã bỏ qua
              </button>
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <section className="pat-card px-4 py-4">
            <SectionTitle
              icon={<Users size={13} />}
              title="Thành viên theo đời"
              action={
                <button
                  type="button"
                  onClick={() => open("danh-sach-thanh-vien")}
                  className="text-[0.68rem] font-semibold text-[var(--pat-red)]"
                >
                  Xem tất cả
                </button>
              }
            />
            <div className="space-y-2">
              {generationStats.map((row) => {
                const pct = stats.total ? Math.round((row.total / stats.total) * 100) : 0;
                return (
                  <button
                    key={row.generation}
                    type="button"
                    onClick={() => open(`danh-sach-thanh-vien?doi=${row.generation}`)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="w-14 shrink-0 text-[0.72rem] font-bold text-[var(--pat-muted)]">
                      {row.label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f3e6cd]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#b7791f] to-[var(--pat-red)]"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </span>
                    <span className="w-7 shrink-0 text-right text-xs font-semibold">{row.total}</span>
                  </button>
                );
              })}
              {generationStats.length === 0 ? (
                <p className="text-xs text-[var(--pat-muted)]">Chưa có thành viên.</p>
              ) : null}
              {stats.ancestorTiers ? (
                <p className="pt-1 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                  Đời 0 là Khởi Tổ; các bậc phía trên là tiền tổ, tính riêng không gộp vào số đời.
                </p>
              ) : null}
            </div>
          </section>

          <section className="pat-card px-4 py-4">
            <SectionTitle
              icon={<GitBranch size={13} />}
              title="Chi phái"
              action={
                <button
                  type="button"
                  onClick={() => open("danh-sach-nhanh")}
                  className="text-[0.68rem] font-semibold text-[var(--pat-red)]"
                >
                  {sortedBranches.length > 4 ? `Xem tất cả (${sortedBranches.length})` : "Quản lý"}
                </button>
              }
            />
            {sortedBranches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--pat-line)] px-3 py-4 text-center">
                <p className="text-xs text-[var(--pat-muted)]">Gia phả chưa tách chi phái nào.</p>
                <button
                  type="button"
                  onClick={() => open("danh-sach-nhanh")}
                  className="pat-btn pat-btn-outline mt-2 h-8 text-xs"
                >
                  <GitBranch size={13} /> Tạo chi phái
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedBranches.slice(0, 4).map((branch) => {
                  const members = branchMen.get(branch.id)?.length ?? 0;
                  const head = tree.members.find((m) => m.id === branch.headId);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => open("danh-sach-nhanh")}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-left"
                    >
                      <span className="h-6 w-1.5 rounded-full" style={{ background: branch.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{branch.name}</span>
                        <span className="block truncate text-[0.68rem] text-[var(--pat-muted)]">
                          {head ? `Trưởng chi phái: ${head.name}` : "Chưa chọn trưởng chi phái"} · {members} nam
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-[var(--pat-muted)]" />
                    </button>
                  );
                })}
                {unassignedMen.length ? (
                  <button
                    type="button"
                    onClick={() => open("danh-sach-thanh-vien")}
                    className="flex w-full items-start gap-2 rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/50 px-3 py-2 text-left text-[0.68rem] leading-relaxed text-[#8a1c15]"
                  >
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>
                      {unassignedMen.length} người nam chưa thuộc chi phái nào. Mở Phả hệ để gán chi.
                    </span>
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {founder ? (
          <section className="pat-card px-4 py-4">
            <SectionTitle
              icon={<Crown size={13} />}
              title={founder.title || "Khởi Tổ"}
              action={
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
                >
                  <PencilLine size={12} /> Sửa Khởi Tổ
                </button>
              }
            />
            <div className="flex items-center gap-3">
              {founder.avatar ? (
                <img
                  src={founder.avatar}
                  alt={founder.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[var(--pat-gold)]"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--pat-red)] to-[#b7791f] text-lg font-semibold text-[#fff4df]">
                  {initials(founder.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {founder.name}
                  {founder.title ? <Badge tone="gold">{founder.title}</Badge> : null}
                </p>
                <p className="text-xs text-[var(--pat-muted)]">
                  {founder.birthDate ? `Sinh ${founder.birthDate}` : "Chưa rõ năm sinh"}
                  {founder.hometown ? ` · ${founder.hometown}` : ""}
                </p>
                <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--pat-red)]">
                  {generationTag(gens.get(founder.id) ?? 0)} · Khởi Tổ của dòng đang soạn
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/gia-pha/${tree.id}/thanh-vien/${founder.id}`)}
                className="pat-btn pat-btn-outline h-8 text-xs"
              >
                Hồ sơ <ChevronRight size={13} />
              </button>
            </div>
          </section>
        ) : null}

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<Download size={13} />} title="Xuất & in" />
          <p className="text-xs leading-relaxed text-[var(--pat-muted)]">
            Dựng phả đồ theo khổ giấy A4–A0, in trực tiếp hoặc lưu PDF/PNG. Danh sách thành viên xuất được Excel và
            tệp sao lưu JSON.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => open("ve-pha-do")} className="pat-btn pat-btn-red h-10 text-xs">
              <PenTool size={14} /> Mở phả đồ
            </button>
            <button type="button" onClick={() => open("giao-dien")} className="pat-btn pat-btn-outline h-10 text-xs">
              <Palette size={14} /> Thiết kế bản in
            </button>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-xs text-[var(--pat-muted)]">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          <p>
            Cập nhật lần cuối{" "}
            {new Date(tree.updatedAt).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Dữ liệu lưu trên thiết bị, không cần đăng nhập.
          </p>
        </div>
      </div>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={tree.name}
        subtitle="Thông tin và thao tác gia phả"
      >
        <div className="grid gap-1">
          <SheetRow
            icon={<PencilLine size={18} />}
            title="Sửa thông tin gia phả"
            subtitle="Tên, địa chỉ, người tạo, mô tả"
            onClick={() => {
              setMenuOpen(false);
              setEditOpen(true);
            }}
          />
          <SheetRow
            icon={<Users size={18} />}
            title="Danh sách thành viên"
            subtitle={`${stats.total} người · ${stats.male} nam · ${stats.female} nữ`}
            onClick={() => open("danh-sach-thanh-vien")}
          />
          <SheetRow
            icon={<Network size={18} />}
            title="Cây gia phả"
            onClick={() => open("chinh-sua-voi-cay-gia-pha")}
          />
          <SheetRow icon={<PenTool size={18} />} title="Vẽ phả đồ" onClick={() => open("ve-pha-do")} />
          <SheetRow icon={<Palette size={18} />} title="Thiết kế bản in" onClick={() => open("giao-dien")} />
          <SheetRow icon={<BookOpen size={18} />} title="Phả ký" onClick={() => open("pha-ky")} />
          <SheetRow icon={<GitBranch size={18} />} title="Chi phái" onClick={() => open("danh-sach-nhanh")} />
          <SheetRow
            icon={<Download size={18} />}
            title="Sao lưu JSON"
            subtitle="Tệp dự phòng toàn bộ gia phả"
            onClick={() => {
              exportBackup(tree);
              setMenuOpen(false);
            }}
          />
          <SheetRow
            icon={<CalendarDays size={18} />}
            title="Xuất dữ liệu"
            subtitle="Excel, JSON, PDF, PNG"
            onClick={() => open("ve-pha-do")}
          />
          {tree.sample ? null : (
            <SheetRow
              icon={<Trash2 size={18} />}
              title="Xóa gia phả"
              subtitle="Chuyển vào Đã xóa, có thể khôi phục"
              danger
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
            />
          )}
        </div>
      </Sheet>

      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Thông tin gia phả"
        subtitle="Cập nhật tên dòng họ và người lập"
        footer={
          <button
            type="button"
            className="pat-btn pat-btn-red h-11 w-full text-sm"
            onClick={() => {
              updateTree(tree.id, {
                name: form.name.trim() || tree.name,
                address: form.address.trim(),
                ownerName: form.ownerName.trim(),
                description: form.description.trim(),
                founderId: form.founderId || undefined,
              });
              setEditOpen(false);
            }}
          >
            Lưu thay đổi
          </button>
        }
      >
        <div className="space-y-3">
          <Field label="Tên gia phả">
            <input className="pat-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Địa chỉ / quê quán">
            <input className="pat-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Người tạo">
            <input className="pat-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </Field>
          <Field label="Mô tả">
            <textarea
              className="pat-input min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field
            label="Khởi Tổ của dòng đang soạn"
            hint="Chỉ chọn một người thuộc nội tộc. Các vị tổ phía trên dùng liên kết tiền tổ trong hồ sơ."
          >
            <select
              className="pat-input"
              value={form.founderId}
              onChange={(e) => setForm({ ...form, founderId: e.target.value })}
            >
              <option value="">Tự động — người ở Đời 0 đầu tiên</option>
              {[...tree.members]
                .filter((member) => clan.clanIds.has(member.id) || member.id === tree.founderId)
                .sort((a, b) => (gens.get(a.id) ?? 999) - (gens.get(b.id) ?? 999) || a.birthOrder - b.birthOrder)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.code ? `${member.code} · ` : ""}
                    {member.name} — {generationTag(gens.get(member.id) ?? UNKNOWN_GENERATION)}
                  </option>
                ))}
            </select>
          </Field>
          {needsFounder ? (
            <p className="rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/60 px-3 py-2 text-[0.7rem] leading-relaxed text-[#8a1c15]">
              Có {rootsAtZero.length} người ở Đời 0. Hãy chọn đúng một Khởi Tổ cho dòng đang soạn để phả đồ và bản in ghi
              đúng danh xưng.
            </p>
          ) : null}
          <div className="grid grid-cols-3 divide-x divide-[var(--pat-line)] rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 py-2">
            <div className="flex justify-center">
              <Stat value={stats.total} label="Thành viên" />
            </div>
            <div className="flex justify-center">
              <Stat
                value={stats.ancestorTiers ? `${stats.generations}+${stats.ancestorTiers}` : stats.generations}
                label={stats.ancestorTiers ? "Đời · bậc tổ" : "Đời"}
                tone="red"
              />
            </div>
            <div className="flex justify-center">
              <Stat value={tree.branches.length} label="Chi phái" />
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Xóa gia phả?"
        subtitle={tree.name}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="pat-btn pat-btn-outline h-11 flex-1 text-sm"
              onClick={() => setDeleteOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-11 flex-1 text-sm"
              onClick={() => {
                archiveTree(tree.id);
                router.push("/");
              }}
            >
              Chuyển vào Đã xóa
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed">
          {stats.total} thành viên, {tree.branches.length} chi phái và toàn bộ bản in sẽ được chuyển vào{" "}
          <strong>Đã xóa</strong>. Bạn có thể khôi phục lại sau.
        </p>
        <button
          type="button"
          onClick={() => {
            exportBackup(tree);
            setDeleteOpen(false);
          }}
          className="pat-btn pat-btn-outline mt-3 h-9 w-full text-xs"
        >
          <Download size={14} /> Sao lưu JSON trước khi xóa
        </button>
      </Sheet>
    </TreeShell>
  );
}
