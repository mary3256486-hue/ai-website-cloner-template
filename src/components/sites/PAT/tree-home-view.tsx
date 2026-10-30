"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  Users,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree } from "./types";
import { computeGenerations, getGenerationStats, getStats, initials } from "./utils";
import { TreeShell } from "./app-shell";
import { Badge, Field, Sheet, SheetRow, SectionTitle, Stat } from "./ui";

const features = [
  {
    key: "members",
    href: "danh-sach-thanh-vien",
    icon: Users,
    label: "Phả Hệ",
    caption: "Danh sách thành viên",
  },
  {
    key: "tree",
    href: "chinh-sua-voi-cay-gia-pha",
    icon: Network,
    label: "CÂY PHẢ HỆ",
    caption: "Chỉnh sửa với",
  },
  {
    key: "diagram",
    href: "ve-pha-do",
    icon: PenTool,
    label: "TÁC PHẢ ĐỒ",
    caption: "Tạo và kéo thả phả đồ",
  },
  {
    key: "design",
    href: "giao-dien",
    icon: Palette,
    label: "PHẢ ĐỒ",
    caption: "Thiết kế bản in",
  },
  {
    key: "chronicle",
    href: "pha-ky",
    icon: BookOpen,
    label: "PHẢ KÝ",
    caption: "Ghi chép lịch sử họ",
  },
  {
    key: "branches",
    href: "danh-sach-nhanh",
    icon: GitBranch,
    label: "NHÁNH HỌ",
    caption: "Chi, cành và trưởng nhánh",
  },
];

export function TreeHomeView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { updateTree } = useGenealogy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: tree.name,
    address: tree.address ?? "",
    ownerName: tree.ownerName ?? "",
    description: tree.description ?? "",
  });

  const stats = getStats(tree);
  const generationStats = getGenerationStats(tree);
  const gens = computeGenerations(tree.members);
  const founder = tree.members
    .filter((member) => (gens.get(member.id) ?? 1) === 1)
    .sort((a, b) => a.birthOrder - b.birthOrder)[0];
  const sortedBranches = tree.branches;

  const open = (href: string) => router.push(`/gia-pha/${tree.id}/${href}`);

  return (
    <TreeShell
      tree={tree}
      section="trang-chu"
      title={tree.name}
      subtitle={`${stats.total} thành viên · ${stats.generations} đời`}
      actions={
        <button
          type="button"
          onClick={() => {
            setForm({
              name: tree.name,
              address: tree.address ?? "",
              ownerName: tree.ownerName ?? "",
              description: tree.description ?? "",
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
                [stats.generations, "Đời"],
                [stats.total, "Thành viên"],
                [tree.branches.length, "Nhánh"],
                [stats.alive, "Còn sống"],
              ].map(([value, label]) => (
                <div key={String(label)} className="px-1">
                  <p className="text-base font-bold text-[#ffe9bd]">{value}</p>
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#efd7b7]/80">{label}</p>
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
                    <span className="block text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.12em] text-[var(--pat-muted)]">
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
              {generationStats.slice(0, 6).map((row) => {
                const pct = stats.total ? Math.round((row.total / stats.total) * 100) : 0;
                return (
                  <button
                    key={row.generation}
                    type="button"
                    onClick={() => open(`danh-sach-thanh-vien?doi=${row.generation}`)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="w-14 shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--pat-muted)]">
                      Đời {row.generation}
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
            </div>
          </section>

          <section className="pat-card px-4 py-4">
            <SectionTitle
              icon={<GitBranch size={13} />}
              title="Chi, cành"
              action={
                <button
                  type="button"
                  onClick={() => open("danh-sach-nhanh")}
                  className="text-[0.68rem] font-semibold text-[var(--pat-red)]"
                >
                  Quản lý
                </button>
              }
            />
            {sortedBranches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--pat-line)] px-3 py-4 text-center">
                <p className="text-xs text-[var(--pat-muted)]">Gia phả chưa tách nhánh nào.</p>
                <button
                  type="button"
                  onClick={() => open("danh-sach-nhanh")}
                  className="pat-btn pat-btn-outline mt-2 h-8 text-xs"
                >
                  <GitBranch size={13} /> Tách nhánh
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedBranches.slice(0, 4).map((branch) => {
                  const members = tree.members.filter((m) => m.branchId === branch.id).length;
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
                          {head ? `Trưởng nhánh: ${head.name}` : "Chưa chọn trưởng nhánh"} · {members} người
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-[var(--pat-muted)]" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {founder ? (
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<Crown size={13} />} title="Thủy tổ" />
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--pat-red)] to-[#b7791f] text-lg font-semibold text-[#fff4df]">
                {initials(founder.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {founder.name}
                  {founder.title ? <Badge tone="gold">{founder.title}</Badge> : null}
                </p>
                <p className="text-xs text-[var(--pat-muted)]">
                  {founder.birthDate ? `Sinh ${founder.birthDate}` : "Chưa rõ năm sinh"}
                  {founder.hometown ? ` · ${founder.hometown}` : ""}
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
          <SectionTitle icon={<Download size={13} />} title="Xuất bản in" />
          <p className="text-xs leading-relaxed text-[var(--pat-muted)]">
            Dựng phả đồ theo khổ giấy A4–A0, in trực tiếp hoặc lưu PDF/PNG. Danh sách thành viên xuất được Excel và
            tệp sao lưu JSON.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => open("ve-pha-do")} className="pat-btn pat-btn-red h-10 text-xs">
              <PenTool size={14} /> Mở phả đồ
            </button>
            <button type="button" onClick={() => open("giao-dien")} className="pat-btn pat-btn-outline h-10 text-xs">
              <Palette size={14} /> Thiết kế in
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
            title="Cây phả hệ"
            onClick={() => open("chinh-sua-voi-cay-gia-pha")}
          />
          <SheetRow icon={<PenTool size={18} />} title="Tạo phả đồ" onClick={() => open("ve-pha-do")} />
          <SheetRow icon={<Palette size={18} />} title="Thiết kế phả đồ" onClick={() => open("giao-dien")} />
          <SheetRow icon={<BookOpen size={18} />} title="Phả ký" onClick={() => open("pha-ky")} />
          <SheetRow icon={<GitBranch size={18} />} title="Nhánh họ" onClick={() => open("danh-sach-nhanh")} />
          <SheetRow icon={<CalendarDays size={18} />} title="Xuất dữ liệu" subtitle="Excel, JSON, PDF, PNG" onClick={() => open("ve-pha-do")} />
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
          <div className="grid grid-cols-3 divide-x divide-[var(--pat-line)] rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 py-2">
            <div className="flex justify-center">
              <Stat value={stats.total} label="Thành viên" />
            </div>
            <div className="flex justify-center">
              <Stat value={stats.generations} label="Đời" tone="red" />
            </div>
            <div className="flex justify-center">
              <Stat value={tree.branches.length} label="Nhánh" />
            </div>
          </div>
        </div>
      </Sheet>
    </TreeShell>
  );
}
