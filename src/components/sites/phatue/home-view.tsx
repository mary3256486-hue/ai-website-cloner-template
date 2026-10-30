"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  GitBranch,
  Info,
  MapPin,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree } from "./types";
import { getStats } from "./utils";
import { HomeBottomNav, HomeHeader, ScopeNotice } from "./app-shell";
import { Badge, Field, Sheet, SheetRow } from "./ui";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function HomeView() {
  const { trees, hydrated, createTree, deleteTree } = useGenealogy();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [scope, setScope] = useState<string | null>(null);
  const [manageTree, setManageTree] = useState<FamilyTree | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    ownerName: "",
    founderName: "",
    founderGender: "male" as "male" | "female",
    founderBirth: "",
  });
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const hasOwn = trees.some((tree) => !tree.sample);
    return hasOwn ? trees.filter((tree) => !tree.sample) : trees;
  }, [trees]);

  const submit = () => {
    if (!form.name.trim() || !form.founderName.trim()) {
      setError("Vui lòng nhập tên gia phả và họ tên thủy tổ.");
      return;
    }
    const id = createTree({
      name: form.name,
      address: form.address,
      ownerName: form.ownerName,
      founderName: form.founderName,
      founderGender: form.founderGender,
      founderBirth: form.founderBirth,
    });
    setCreateOpen(false);
    setForm({ name: "", address: "", ownerName: "", founderName: "", founderGender: "male", founderBirth: "" });
    setError("");
    router.push(`/gia-pha/${id}/trang-chu`);
  };

  return (
    <div className="phatue-shell min-h-dvh pb-24">
      <HomeHeader onCreate={() => setCreateOpen(true)} onHelp={() => setHelpOpen(true)} />

      <main className="mx-auto w-full max-w-3xl px-3 pt-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h1 className="phatue-serif text-xl font-semibold text-[var(--phatue-red)]">Gia phả của tôi</h1>
          <span className="text-xs text-[var(--phatue-muted)]">{visible.length} gia phả</span>
        </div>

        {!hydrated ? (
          <div className="phatue-card px-5 py-10 text-center text-sm text-[var(--phatue-muted)]">Đang tải gia phả…</div>
        ) : visible.length === 0 ? (
          <div className="phatue-card px-6 py-10 text-center">
            <p className="phatue-serif text-lg font-semibold text-[var(--phatue-red)]">Chưa có cây gia phả nào</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--phatue-muted)]">
              Nhấn nút <strong>+ Lập Gia Phả</strong> để bắt đầu ghi chép cội nguồn dòng họ. Không cần đăng nhập.
            </p>
            <button type="button" className="phatue-btn phatue-btn-red mt-4 h-10 px-5 text-sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Tạo gia phả đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((tree) => {
              const stats = getStats(tree);
              return (
                <article key={tree.id} className="phatue-card relative overflow-hidden">
                  <Link
                    href={`/gia-pha/${tree.id}/trang-chu`}
                    className="block px-4 pt-4 text-left"
                  >
                    <div className="min-w-0 pr-10">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="phatue-serif truncate text-lg font-semibold text-[var(--phatue-red)]">{tree.name}</h2>
                        {tree.sample ? <Badge tone="gold">GIA PHẢ MẪU</Badge> : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--phatue-muted)]">
                        {tree.address ?? "Chưa cập nhật địa chỉ"}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--phatue-line)] rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 py-2 text-center">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--phatue-muted)]">
                        <div className="text-sm font-bold text-[var(--phatue-ink)]">{stats.generations} Đời</div>
                      </div>
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--phatue-muted)]">
                        <div className="text-sm font-bold text-[var(--phatue-ink)]">{stats.total} Thành viên</div>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[0.68rem] text-[var(--phatue-muted)]">
                        <CalendarDays size={12} />
                        {formatDate(tree.updatedAt)}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-dashed border-[var(--phatue-line)] py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3e6cd] text-[var(--phatue-red)]">
                        <Users size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--phatue-muted)]">Người tạo</p>
                        <p className="truncate text-sm font-semibold">{tree.ownerName ?? "Chủ gia phả"}</p>
                      </div>
                      <ChevronRight size={16} className="text-[var(--phatue-muted)]" />
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setManageTree(tree)}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--phatue-line)] bg-[#fffaf0] text-[var(--phatue-muted)]"
                    aria-label="Thao tác gia phả"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`)}
                      className="phatue-btn phatue-btn-red h-14 flex-col gap-0.5 rounded-lg text-[0.7rem]"
                    >
                      <span>Danh sách thành viên</span>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Users size={15} /> Phả Hệ
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-nhanh`)}
                      className="phatue-btn phatue-btn-red h-14 flex-col gap-0.5 rounded-lg text-[0.7rem]"
                    >
                      <span>Danh sách chi, cành</span>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <GitBranch size={15} /> Nhánh
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-[var(--phatue-gold)]/40 bg-[#f9edcf] px-3 py-2.5 text-xs text-[#7a5a10]">
          <Info size={15} className="mt-0.5 shrink-0" />
          <p>
            Gia phả mẫu tự ẩn khi bạn tạo thành công gia phả đầu tiên. Dữ liệu lưu ngay trên thiết bị này, không cần
            đăng nhập.
          </p>
        </div>
      </main>

      <HomeBottomNav onScope={setScope} />
      {scope ? <ScopeNotice name={scope} onClose={() => setScope(null)} /> : null}

      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Lập Gia Phả"
        subtitle="Khởi tạo cây gia phả và ghi danh thủy tổ"
        footer={
          <button type="button" className="phatue-btn phatue-btn-red h-11 w-full text-sm" onClick={submit}>
            Tạo gia phả
          </button>
        }
      >
        <div className="space-y-3">
          <Field label="Tên gia phả *">
            <input
              className="phatue-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ví dụ: Gia phả dòng họ Phạm"
            />
          </Field>
          <Field label="Địa chỉ / quê quán">
            <input
              className="phatue-input"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="Xã, huyện, tỉnh"
            />
          </Field>
          <Field label="Người tạo">
            <input
              className="phatue-input"
              value={form.ownerName}
              onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
              placeholder="Họ tên người lập gia phả"
            />
          </Field>
          <div className="phatue-ornament my-2" />
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--phatue-red)]">Thủy tổ</p>
          <Field label="Họ tên thủy tổ *">
            <input
              className="phatue-input"
              value={form.founderName}
              onChange={(event) => setForm({ ...form, founderName: event.target.value })}
              placeholder="Họ tên vị tổ đầu tiên"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giới tính">
              <div className="flex gap-2">
                <button
                  type="button"
                  data-active={form.founderGender === "male"}
                  className="phatue-chip flex-1 justify-center"
                  onClick={() => setForm({ ...form, founderGender: "male" })}
                >
                  Nam
                </button>
                <button
                  type="button"
                  data-active={form.founderGender === "female"}
                  className="phatue-chip flex-1 justify-center"
                  onClick={() => setForm({ ...form, founderGender: "female" })}
                >
                  Nữ
                </button>
              </div>
            </Field>
            <Field label="Năm sinh">
              <input
                className="phatue-input"
                value={form.founderBirth}
                onChange={(event) => setForm({ ...form, founderBirth: event.target.value })}
                placeholder="1850"
              />
            </Field>
          </div>
          {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
          <p className="text-[0.7rem] leading-relaxed text-[var(--phatue-muted)]">
            Sau khi tạo, bạn có thể thêm vợ/chồng, con cháu, nhánh họ và xuất phả đồ để in. Không có bước đăng nhập.
          </p>
        </div>
      </Sheet>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Bắt đầu với gia phả" subtitle="Bốn bước để dựng cây">
        <div className="space-y-2">
          <SheetRow icon={<Plus size={18} />} title="1. Lập gia phả" subtitle="Đặt tên dòng họ và ghi danh thủy tổ" onClick={() => { setHelpOpen(false); setCreateOpen(true); }} />
          <SheetRow icon={<Users size={18} />} title="2. Thêm thành viên" subtitle="Ghi cha mẹ, vợ/chồng, con cái, tiểu sử" />
          <SheetRow icon={<GitBranch size={18} />} title="3. Tách nhánh" subtitle="Chia chi, cành và chọn trưởng nhánh" />
          <SheetRow icon={<MapPin size={18} />} title="4. Xuất bản in" subtitle="Thiết kế phả đồ, tải PDF/PNG hoặc in trực tiếp" />
        </div>
      </Sheet>

      <Sheet
        open={Boolean(manageTree)}
        onClose={() => setManageTree(null)}
        title={manageTree?.name ?? ""}
        subtitle="Thao tác gia phả"
      >
        {manageTree ? (
          <div className="grid gap-1">
            <SheetRow
              icon={<ChevronRight size={18} />}
              title="Mở gia phả"
              onClick={() => router.push(`/gia-pha/${manageTree.id}/trang-chu`)}
            />
            <SheetRow
              icon={<Users size={18} />}
              title="Danh sách thành viên"
              onClick={() => router.push(`/gia-pha/${manageTree.id}/danh-sach-thanh-vien`)}
            />
            <SheetRow
              icon={<Trash2 size={18} />}
              title="Xoá gia phả"
              danger
              onClick={() => {
                if (window.confirm(`Xoá gia phả "${manageTree.name}"? Thao tác không thể hoàn tác.`)) {
                  deleteTree(manageTree.id);
                  setManageTree(null);
                }
              }}
            />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
