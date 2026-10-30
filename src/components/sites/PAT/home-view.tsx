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
import type { FamilyTree, Person } from "./types";
import { ANCESTOR_TITLES, HONORS, MANDARIN_RANKS, NOBLE_TITLES } from "./types";
import { getStats } from "./utils";
import { HomeBottomNav, HomeHeader, ScopeNotice } from "./app-shell";
import { Badge, Field, Sheet, SheetRow } from "./ui";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const EMPTY_CREATE_FORM = {
  name: "",
  address: "",
  ownerName: "",
  founderName: "",
  founderGender: "male" as "male" | "female",
  founderBirth: "",
  founderTitle: "Thủy tổ",
  founderGenerationNote: "",
  founderTabooName: "",
  founderCourtesyName: "",
  founderStyleName: "",
  founderPosthumousName: "",
  founderOfficeTitle: "",
  founderMandarinRank: "",
  founderHonors: "",
};

export function HomeView() {
  const { trees, hydrated, createTree, deleteTree } = useGenealogy();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [scope, setScope] = useState<string | null>(null);
  const [manageTree, setManageTree] = useState<FamilyTree | null>(null);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [error, setError] = useState("");

  const visible = useMemo(() => {
    const hasOwn = trees.some((tree) => !tree.sample);
    return hasOwn ? trees.filter((tree) => !tree.sample) : trees;
  }, [trees]);

  const submit = () => {
    if (!form.name.trim() || !form.founderName.trim()) {
      setError("Vui lòng nhập tên gia phả và họ tên vị tổ.");
      return;
    }
    const founderDetails: Partial<Person> = {};
    const setIfFilled = (key: keyof Person, value: string) => {
      const text = value.trim();
      if (text) (founderDetails as Record<string, string>)[key] = text;
    };
    setIfFilled("title", form.founderTitle);
    setIfFilled("generationNote", form.founderGenerationNote);
    setIfFilled("tabooName", form.founderTabooName);
    setIfFilled("courtesyName", form.founderCourtesyName);
    setIfFilled("styleName", form.founderStyleName);
    setIfFilled("posthumousName", form.founderPosthumousName);
    setIfFilled("officeTitle", form.founderOfficeTitle);
    setIfFilled("mandarinRank", form.founderMandarinRank);
    setIfFilled("honors", form.founderHonors);

    const id = createTree({
      name: form.name,
      address: form.address,
      ownerName: form.ownerName,
      founderName: form.founderName,
      founderGender: form.founderGender,
      founderBirth: form.founderBirth,
      founderDetails,
    });
    setCreateOpen(false);
    setForm(EMPTY_CREATE_FORM);
    setError("");
    router.push(`/gia-pha/${id}/trang-chu`);
  };

  return (
    <div className="pat-shell min-h-dvh pb-24">
      <HomeHeader onCreate={() => setCreateOpen(true)} onHelp={() => setHelpOpen(true)} />

      <main className="mx-auto w-full max-w-3xl px-3 pt-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h1 className="pat-serif text-xl font-semibold text-[var(--pat-red)]">Gia phả của tôi</h1>
          <span className="text-xs text-[var(--pat-muted)]">{visible.length} gia phả</span>
        </div>

        {!hydrated ? (
          <div className="pat-card px-5 py-10 text-center text-sm text-[var(--pat-muted)]">Đang tải gia phả…</div>
        ) : visible.length === 0 ? (
          <div className="pat-card px-6 py-10 text-center">
            <p className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Chưa có cây gia phả nào</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--pat-muted)]">
              Nhấn nút <strong>+ Lập Gia Phả</strong> để bắt đầu ghi chép cội nguồn dòng họ. Không cần đăng nhập.
            </p>
            <button type="button" className="pat-btn pat-btn-red mt-4 h-10 px-5 text-sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Tạo gia phả đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((tree) => {
              const stats = getStats(tree);
              return (
                <article key={tree.id} className="pat-card relative overflow-hidden">
                  <Link
                    href={`/gia-pha/${tree.id}/trang-chu`}
                    className="block px-4 pt-4 text-left"
                  >
                    <div className="min-w-0 pr-10">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="pat-serif truncate text-lg font-semibold text-[var(--pat-red)]">{tree.name}</h2>
                        {tree.sample ? <Badge tone="gold">GIA PHẢ MẪU</Badge> : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--pat-muted)]">
                        {tree.address ?? "Chưa cập nhật địa chỉ"}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--pat-line)] rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 py-2 text-center">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--pat-muted)]">
                        <div className="text-sm font-bold text-[var(--pat-ink)]">{stats.generations} Đời</div>
                      </div>
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--pat-muted)]">
                        <div className="text-sm font-bold text-[var(--pat-ink)]">{stats.total} Thành viên</div>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[0.68rem] text-[var(--pat-muted)]">
                        <CalendarDays size={12} />
                        {formatDate(tree.updatedAt)}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-dashed border-[var(--pat-line)] py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3e6cd] text-[var(--pat-red)]">
                        <Users size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--pat-muted)]">Người tạo</p>
                        <p className="truncate text-sm font-semibold">{tree.ownerName ?? "Chủ gia phả"}</p>
                      </div>
                      <ChevronRight size={16} className="text-[var(--pat-muted)]" />
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setManageTree(tree)}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pat-line)] bg-[#fffaf0] text-[var(--pat-muted)]"
                    aria-label="Thao tác gia phả"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`)}
                      className="pat-btn pat-btn-red h-14 flex-col gap-0.5 rounded-lg text-[0.7rem]"
                    >
                      <span>Danh sách thành viên</span>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Users size={15} /> Phả Hệ
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-nhanh`)}
                      className="pat-btn pat-btn-red h-14 flex-col gap-0.5 rounded-lg text-[0.7rem]"
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

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-[var(--pat-gold)]/40 bg-[#f9edcf] px-3 py-2.5 text-xs text-[#7a5a10]">
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
        subtitle="Khởi tạo cây gia phả và ghi danh vị tổ"
        footer={
          <button type="button" className="pat-btn pat-btn-red h-11 w-full text-sm" onClick={submit}>
            Tạo gia phả
          </button>
        }
      >
        <div className="space-y-3">
          <Field label="Tên gia phả *">
            <input
              className="pat-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ví dụ: Gia phả dòng họ Phạm"
            />
          </Field>
          <Field label="Địa chỉ / quê quán">
            <input
              className="pat-input"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="Xã, huyện, tỉnh"
            />
          </Field>
          <Field label="Người tạo">
            <input
              className="pat-input"
              value={form.ownerName}
              onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
              placeholder="Họ tên người lập gia phả"
            />
          </Field>
          <div className="pat-ornament my-2" />
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">Vị tổ khai sáng</p>
          <Field label="Họ tên vị tổ *" hint="Tên thường dùng, hiển thị trên phả đồ.">
            <input
              className="pat-input"
              value={form.founderName}
              onChange={(event) => setForm({ ...form, founderName: event.target.value })}
              placeholder="Họ tên vị tổ đầu tiên"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Danh xưng / thế thứ" hint="Thủy tổ, Khởi tổ, Viễn tổ…">
              <input
                className="pat-input"
                list="founder-ancestor-titles"
                value={form.founderTitle}
                onChange={(event) => setForm({ ...form, founderTitle: event.target.value })}
                placeholder="Thủy tổ"
              />
            </Field>
            <Field label="Ghi chú thế thứ" hint="Đích tôn, trưởng chi, chi thứ…">
              <input
                className="pat-input"
                value={form.founderGenerationNote}
                onChange={(event) => setForm({ ...form, founderGenerationNote: event.target.value })}
                placeholder="Đích tôn chi trưởng"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Giới tính">
              <div className="flex gap-2">
                <button
                  type="button"
                  data-active={form.founderGender === "male"}
                  className="pat-chip flex-1 justify-center"
                  onClick={() => setForm({ ...form, founderGender: "male" })}
                >
                  Nam
                </button>
                <button
                  type="button"
                  data-active={form.founderGender === "female"}
                  className="pat-chip flex-1 justify-center"
                  onClick={() => setForm({ ...form, founderGender: "female" })}
                >
                  Nữ
                </button>
              </div>
            </Field>
            <Field label="Năm sinh">
              <input
                className="pat-input"
                value={form.founderBirth}
                onChange={(event) => setForm({ ...form, founderBirth: event.target.value })}
                placeholder="1850"
              />
            </Field>
          </div>

          <p className="pt-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">
            Tên húy, tự, hiệu, thụy · công danh
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên húy" hint="Tên thật, con cháu kiêng gọi.">
              <input
                className="pat-input"
                value={form.founderTabooName}
                onChange={(event) => setForm({ ...form, founderTabooName: event.target.value })}
                placeholder="Tên kiêng"
              />
            </Field>
            <Field label="Tên tự" hint="Tên chữ do cha mẹ, thầy đặt.">
              <input
                className="pat-input"
                value={form.founderCourtesyName}
                onChange={(event) => setForm({ ...form, founderCourtesyName: event.target.value })}
                placeholder="Tên tự"
              />
            </Field>
            <Field label="Tên hiệu">
              <input
                className="pat-input"
                value={form.founderStyleName}
                onChange={(event) => setForm({ ...form, founderStyleName: event.target.value })}
                placeholder="Hiệu, biệt hiệu"
              />
            </Field>
            <Field label="Thụy hiệu" hint="Tên đặt sau khi mất.">
              <input
                className="pat-input"
                value={form.founderPosthumousName}
                onChange={(event) => setForm({ ...form, founderPosthumousName: event.target.value })}
                placeholder="Thụy hiệu"
              />
            </Field>
            <Field label="Chức tước" hint="Tước vị, chức quan thời trước.">
              <input
                className="pat-input"
                list="founder-noble-titles"
                value={form.founderOfficeTitle}
                onChange={(event) => setForm({ ...form, founderOfficeTitle: event.target.value })}
                placeholder="Quận công, Tri huyện…"
              />
            </Field>
            <Field label="Phẩm hàm">
              <input
                className="pat-input"
                list="founder-mandarin-ranks"
                value={form.founderMandarinRank}
                onChange={(event) => setForm({ ...form, founderMandarinRank: event.target.value })}
                placeholder="Chánh tam phẩm…"
              />
            </Field>
          </div>
          <Field label="Khoa bảng / danh hiệu" hint="Thi cử, đỗ đạt hoặc danh hiệu được ban.">
            <input
              className="pat-input"
              list="founder-honors"
              value={form.founderHonors}
              onChange={(event) => setForm({ ...form, founderHonors: event.target.value })}
              placeholder="Tiến sĩ, Cử nhân, Nho sinh…"
            />
          </Field>
          <datalist id="founder-ancestor-titles">
            {ANCESTOR_TITLES.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="founder-noble-titles">
            {NOBLE_TITLES.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="founder-mandarin-ranks">
            {MANDARIN_RANKS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="founder-honors">
            {HONORS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
          <p className="text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
            Gia phả xưa chép đủ “húy – tự – hiệu – thụy” và chức tước, phẩm hàm để con cháu nhớ cội nguồn. Mục nào chưa
            rõ có thể để trống và bổ sung sau. Không có bước đăng nhập.
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
