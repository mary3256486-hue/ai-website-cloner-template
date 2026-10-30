"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  GitBranch,
  HelpCircle,
  History,
  Info,
  MapPin,
  MoreHorizontal,
  PenLine,
  PenTool,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGenealogy, type ArchivedTree } from "./store";
import type { FamilyTree, Person } from "./types";
import { ANCESTOR_TITLES, HONORS, MANDARIN_RANKS, NOBLE_TITLES } from "./types";
import { getStats } from "./utils";
import { createDemoTree } from "./seed";
import { downloadExcelTemplate, importSpreadsheet, type ImportResult } from "./import";
import { readBackup } from "./export";
import { Field, Sheet, SheetRow } from "./ui";

type HomeTab = "mau" | "tao" | "luu";

const TABS: { key: HomeTab; label: string; icon: typeof Sparkles }[] = [
  { key: "mau", label: "Gia phả mẫu", icon: BookOpen },
  { key: "tao", label: "Tạo gia phả", icon: PenLine },
  { key: "luu", label: "Lưu trữ", icon: Archive },
];

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
  const {
    trees,
    archived,
    hydrated,
    createTree,
    updateTree,
    archiveTree,
    restoreTree,
    purgeTree,
    importTree,
  } = useGenealogy();
  const router = useRouter();

  const [tab, setTab] = useState<HomeTab>("mau");
  const [helpOpen, setHelpOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageTree, setManageTree] = useState<FamilyTree | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyTree | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [purgeTarget, setPurgeTarget] = useState<ArchivedTree | null>(null);
  const [toast, setToast] = useState<{ message: string; treeId?: string } | null>(null);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [error, setError] = useState("");
  const [importError, setImportError] = useState("");
  const [pendingImport, setPendingImport] = useState<ImportResult | null>(null);
  const spreadsheetRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  const sample = useMemo(() => trees.find((tree) => tree.sample), [trees]);
  const ownTrees = useMemo(
    () => trees.filter((tree) => !tree.sample).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [trees],
  );

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "tao" || hash === "luu") {
      // The hash is only known in the browser, so the tab is restored after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(hash);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectTab = (next: HomeTab) => {
    setTab(next);
    const base = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", next === "mau" ? base : `${base}#${next}`);
  };

  const openTree = (id: string, section = "trang-chu") => router.push(`/gia-pha/${id}/${section}`);

  const closeDelete = () => {
    setDeleteStep(0);
    setDeleteTarget(null);
    setDeleteInput("");
    setDeleteError("");
  };

  const startDelete = (tree: FamilyTree) => {
    setManageTree(null);
    setDeleteTarget(tree);
    setDeleteInput("");
    setDeleteError("");
    setDeleteStep(1);
  };

  const nameMatches =
    Boolean(deleteTarget) &&
    deleteInput.trim().toLocaleLowerCase("vi") ===
      (deleteTarget?.name ?? "").trim().toLocaleLowerCase("vi");

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (!nameMatches) {
      setDeleteError("Tên nhập vào chưa khớp. Hãy nhập đúng tên gia phả để xác nhận.");
      return;
    }
    const target = deleteTarget;
    if (!archiveTree(target.id)) {
      setDeleteError("Bộ nhớ thiết bị đã đầy nên chưa lưu được bản khôi phục. Hãy dọn bớt ảnh rồi thử lại.");
      return;
    }
    setToast({ message: `Đã chuyển “${target.name}” vào mục Đã xóa.`, treeId: target.id });
    closeDelete();
    selectTab("luu");
  };

  const confirmPurge = () => {
    if (!purgeTarget) return;
    const purgedId = purgeTarget.tree.id;
    purgeTree(purgedId);
    setPurgeTarget(null);
    if (toast?.treeId === purgedId) setToast(null);
  };

  const restoreArchived = (id: string) => {
    if (restoreTree(id)) {
      setToast({ message: "Đã khôi phục gia phả vào Lưu trữ." });
    } else {
      setToast({ message: "Không tìm thấy bản đã xóa để khôi phục." });
    }
  };

  const restoreSample = () => {
    const id = importTree(createDemoTree(), { suffix: false });
    updateTree(id, { sample: true });
    selectTab("mau");
  };

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

  const onSpreadsheetPicked = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    try {
      setPendingImport(await importSpreadsheet(file));
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : "Không đọc được tệp Excel.");
    }
  };

  const onBackupPicked = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    try {
      const tree = await readBackup(file);
      const id = importTree(tree);
      router.push(`/gia-pha/${id}/trang-chu`);
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : "Không đọc được tệp sao lưu.");
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const id = importTree(pendingImport.tree, { suffix: false });
    setPendingImport(null);
    router.push(`/gia-pha/${id}/trang-chu`);
  };

  return (
    <div className="pat-shell min-h-dvh pb-10">
      <header className="no-print sticky top-0 z-30 border-b border-[var(--pat-line)]/70 bg-[var(--pat-cream)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <span
            aria-hidden
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e3cd92] bg-[var(--pat-red)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          >
            <Image
              src="/sites/PAT/images/han-pham.png"
              alt=""
              width={585}
              height={728}
              priority
              className="h-full w-auto max-w-none object-contain"
            />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="pat-serif text-base font-semibold text-[var(--pat-red)]">Tiểu Phạm</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-[var(--pat-muted)]">
              Gia phả Việt
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pat-line)] bg-white/70 text-[var(--pat-red)]"
            aria-label="Hướng dẫn sử dụng"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <span
          aria-hidden
          className="pat-han pat-vertical absolute left-4 top-10 hidden text-lg tracking-[0.32em] text-[#b7791f]/30 sm:block"
        >
          祖德流芳
        </span>
        <span
          aria-hidden
          className="pat-han pat-vertical absolute right-4 top-10 hidden text-lg tracking-[0.32em] text-[#b7791f]/30 sm:block"
        >
          宗功永續
        </span>
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-3 pt-6 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-3 top-6 flex items-center justify-center"
          >
            <Image
              src="/sites/PAT/images/han-pham.png"
              alt=""
              width={585}
              height={728}
              className="h-full w-auto max-w-none object-contain opacity-20 blur-[2.5px]"
            />
          </div>
          <div className="relative">
            <div className="relative mx-auto h-[6.75rem] w-[12rem] sm:h-[7.75rem] sm:w-[13.75rem]">
              <span
                aria-hidden
                className="absolute inset-x-4 inset-y-3 rounded-full bg-[radial-gradient(ellipse,rgba(201,162,39,0.22),transparent_70%)]"
              />
              <Image
                src="/sites/PAT/images/han-gia-pha.png"
                alt=""
                width={1200}
                height={676}
                priority
                className="pat-hero-art relative h-full w-full object-contain"
              />
            </div>
            <h1 className="pat-serif mt-2 text-[2.3rem] font-bold leading-none tracking-[0.16em] text-[var(--pat-red)] sm:text-[2.6rem]">
              GIA PHẢ
            </h1>
            <div className="pat-ornament mx-auto mt-3 w-28" />
            <p className="mt-2 text-xs font-medium tracking-[0.04em] text-[var(--pat-muted)]">
              Ghi chép cội nguồn · Nối dài thế hệ
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-3xl px-3 pt-7">
        <div role="tablist" aria-label="Trang chủ gia phả" className="pat-card grid grid-cols-3 gap-1 p-1.5">
          {TABS.map((item) => {
            const active = tab === item.key;
            const Icon = item.icon;
            const caption =
              item.key === "mau"
                ? "Bản dựng sẵn"
                : item.key === "tao"
                  ? "Bắt đầu dòng họ"
                  : ownTrees.length
                    ? `${ownTrees.length} gia phả`
                    : "Chưa có";
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(item.key)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2.5 transition",
                  active
                    ? "text-[#fff4df] shadow-[0_10px_20px_-14px_rgba(90,15,10,0.85)]"
                    : "text-[var(--pat-muted)] hover:bg-white/70",
                )}
                style={
                  active
                    ? { backgroundImage: "linear-gradient(135deg, #9c251c, #7d1712 62%, #6a100c)" }
                    : undefined
                }
              >
                <Icon size={18} className={active ? "text-[#f2d27c]" : "text-[var(--pat-gold)]"} />
                <span className={cn("text-[0.76rem] font-semibold leading-tight", active && "pat-serif")}>
                  {item.label}
                </span>
                <span
                  className={cn(
                    "text-[0.56rem] leading-tight",
                    active ? "text-[#f0d9bd]/90" : "text-[var(--pat-muted)]/80",
                  )}
                >
                  {caption}
                </span>
              </button>
            );
          })}
        </div>

        <div key={tab} className="pat-panel mt-3">
          {tab === "mau" ? (
            <SampleTab
              sample={sample}
              ready={hydrated}
              onOpen={(section) => (sample ? openTree(sample.id, section) : undefined)}
              onRestoreSample={restoreSample}
            />
          ) : null}

          {tab === "tao" ? (
            <CreateTab
              importError={importError}
              onCreate={() => {
                setError("");
                setCreateOpen(true);
              }}
              onSpreadsheet={() => spreadsheetRef.current?.click()}
              onTemplate={() => downloadExcelTemplate()}
              onBackup={() => backupRef.current?.click()}
            />
          ) : null}

          {tab === "luu" ? (
            <ArchiveTab
              trees={ownTrees}
              archived={archived}
              ready={hydrated}
              onNew={() => selectTab("tao")}
              onOpen={(id, section) => openTree(id, section)}
              onMore={setManageTree}
              onDelete={startDelete}
              onRestore={restoreArchived}
              onPurge={setPurgeTarget}
            />
          ) : null}
        </div>

        <footer className="mt-8 text-center">
          <div className="pat-ornament mx-auto w-24" />
          <p className="pat-han mt-2 text-[0.68rem] tracking-[0.28em] text-[#b7791f]/45">
            祖德流芳 · 宗功永續
          </p>
        </footer>
      </main>

      <input
        ref={spreadsheetRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(event) => {
          void onSpreadsheetPicked(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={backupRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          void onBackupPicked(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <Sheet
        open={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="Xác nhận nhập gia phả"
        subtitle={pendingImport?.tree.name ?? ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setPendingImport(null)}>
              Huỷ
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-1 text-sm" onClick={confirmImport}>
              Nhập {pendingImport?.memberCount ?? 0} thành viên
            </button>
          </div>
        }
      >
        {pendingImport ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--pat-ink)]">
              Tìm thấy <strong>{pendingImport.memberCount}</strong> thành viên
              {pendingImport.tree.branches.length ? ` trong ${pendingImport.tree.branches.length} nhánh` : ""}. Kiểm tra
              kỹ trước khi nhập.
            </p>
            {pendingImport.warnings.length ? (
              <ul className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf]/60 px-3 py-2 text-[0.7rem] leading-relaxed text-[#7a5a10]">
                {pendingImport.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--pat-muted)]">Không có cảnh báo — mọi quan hệ đều khớp.</p>
            )}
          </div>
        ) : null}
      </Sheet>

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

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Bắt đầu với gia phả" subtitle="Ba khu vực trên trang chủ">
        <div className="space-y-2">
          <SheetRow
            icon={<BookOpen size={18} />}
            title="Gia phả mẫu"
            subtitle="Xem bản dựng sẵn 6 đời để học cách trình bày"
            onClick={() => {
              setHelpOpen(false);
              selectTab("mau");
            }}
          />
          <SheetRow
            icon={<PenLine size={18} />}
            title="Tạo gia phả"
            subtitle="Nhập tay, nạp Excel/CSV hoặc khôi phục tệp sao lưu"
            onClick={() => {
              setHelpOpen(false);
              selectTab("tao");
            }}
          />
          <SheetRow
            icon={<Archive size={18} />}
            title="Lưu trữ gia phả"
            subtitle="Mở, xóa 2 bước và khôi phục gia phả đã xóa"
            onClick={() => {
              setHelpOpen(false);
              selectTab("luu");
            }}
          />
          <SheetRow
            icon={<Info size={18} />}
            title="Dữ liệu trên thiết bị"
            subtitle="Không cần đăng nhập; xóa nhầm vẫn khôi phục được"
          />
        </div>
      </Sheet>

      <Sheet
        open={Boolean(deleteTarget) && deleteStep === 1}
        onClose={closeDelete}
        title="Xóa gia phả?"
        subtitle={deleteTarget?.name ?? ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={closeDelete}>
              Giữ lại
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-11 flex-1 text-sm"
              onClick={() => setDeleteStep(2)}
            >
              Tiếp tục xóa
            </button>
          </div>
        }
      >
        {deleteTarget ? (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f9e3df] text-[#a3271d]">
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold">{deleteTarget.name}</p>
                <p className="text-xs text-[var(--pat-muted)]">
                  {deleteTarget.members.length} thành viên · {deleteTarget.branches.length} nhánh · cập nhật{" "}
                  {formatDate(deleteTarget.updatedAt) || "chưa rõ"}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">
              Gia phả sẽ được chuyển vào mục <strong>Đã xóa</strong> trong Lưu trữ. Thành viên, nhánh, phả đồ và phả ký
              được giữ nguyên để khôi phục khi cần.
            </p>
            <div className="rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf]/70 px-3 py-2 text-xs text-[#7a5a10]">
              Bước 1/2 — chưa có dữ liệu nào bị xóa ở bước này.
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(deleteTarget) && deleteStep === 2}
        onClose={closeDelete}
        title="Xác nhận lần cuối"
        subtitle={deleteTarget ? `Bước 2/2 · ${deleteTarget.name}` : ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={closeDelete}>
              Giữ lại
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-11 flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!nameMatches}
              onClick={confirmDelete}
            >
              Chuyển vào Đã xóa
            </button>
          </div>
        }
      >
        {deleteTarget ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">
              Để tránh xóa nhầm, hãy nhập đúng tên gia phả bên dưới:
            </p>
            <p className="rounded-lg border border-dashed border-[var(--pat-line)] bg-[#f3e6cd] px-3 py-2 text-sm font-semibold text-[var(--pat-red)]">
              {deleteTarget.name}
            </p>
            <Field label="Tên gia phả">
              <input
                className="pat-input"
                value={deleteInput}
                onChange={(event) => {
                  setDeleteInput(event.target.value);
                  setDeleteError("");
                }}
                placeholder="Nhập tên chính xác"
                autoFocus
              />
            </Field>
            {deleteError ? <p className="text-xs font-semibold text-[#a3271d]">{deleteError}</p> : null}
            <p className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
              <RotateCcw size={13} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
              Sau khi xác nhận, gia phả nằm trong mục Đã xóa và có thể khôi phục bất cứ lúc nào.
            </p>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(purgeTarget)}
        onClose={() => setPurgeTarget(null)}
        title="Xóa vĩnh viễn?"
        subtitle={purgeTarget?.tree.name ?? ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setPurgeTarget(null)}>
              Huỷ
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-1 text-sm" onClick={confirmPurge}>
              Xóa vĩnh viễn
            </button>
          </div>
        }
      >
        {purgeTarget ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">
              Bản đã xóa của <strong>{purgeTarget.tree.name}</strong> sẽ bị gỡ khỏi thiết bị. Thao tác này không thể
              khôi phục.
            </p>
            <p className="text-xs text-[var(--pat-muted)]">
              {purgeTarget.tree.members.length} thành viên · đã xóa {formatDate(purgeTarget.deletedAt)}. Nếu chỉ muốn ẩn
              tạm, hãy chọn Huỷ.
            </p>
          </div>
        ) : null}
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
              onClick={() => openTree(manageTree.id)}
            />
            <SheetRow
              icon={<Users size={18} />}
              title="Danh sách thành viên"
              onClick={() => openTree(manageTree.id, "danh-sach-thanh-vien")}
            />
            <SheetRow
              icon={<PenTool size={18} />}
              title="Phả đồ"
              onClick={() => openTree(manageTree.id, "ve-pha-do")}
            />
            <SheetRow
              icon={<Trash2 size={18} />}
              title="Xóa gia phả"
              subtitle="Xác nhận 2 bước · vẫn khôi phục được"
              danger
              onClick={() => startDelete(manageTree)}
            />
          </div>
        ) : null}
      </Sheet>

      {toast ? (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md">
          <div className="pat-card flex items-center gap-3 border-[#e3cd92] bg-[#fffaf0]/98 px-3.5 py-2.5 shadow-[0_18px_40px_-24px_rgba(60,20,10,0.7)]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6e9c8] text-[#7a5a10]">
              <Info size={15} />
            </span>
            <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-[var(--pat-ink)]">{toast.message}</p>
            {toast.treeId ? (
              <button
                type="button"
                className="shrink-0 text-xs font-bold text-[var(--pat-red)]"
                onClick={() => restoreArchived(toast.treeId!)}
              >
                Hoàn tác
              </button>
            ) : (
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-[var(--pat-muted)]"
                onClick={() => setToast(null)}
                aria-label="Đóng thông báo"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SampleTab({
  sample,
  ready,
  onOpen,
  onRestoreSample,
}: {
  sample?: FamilyTree;
  ready: boolean;
  onOpen: (section: string) => void;
  onRestoreSample: () => void;
}) {
  if (!ready) {
    return <div className="pat-card px-5 py-10 text-center text-sm text-[var(--pat-muted)]">Đang tải gia phả mẫu…</div>;
  }

  if (!sample) {
    return (
      <section className="pat-card relative overflow-hidden px-6 py-9 text-center">
        <span
          aria-hidden
          className="pat-han pointer-events-none absolute -right-2 -top-6 text-[6rem] leading-none text-[var(--pat-gold)]/[0.08]"
        >
          譜
        </span>
        <div className="relative">
          <p className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Chưa có gia phả mẫu</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--pat-muted)]">
            Khôi phục bản mẫu 6 đời để xem cách ghi chép thành viên, nhánh họ và trình bày phả đồ.
          </p>
          <button type="button" className="pat-btn pat-btn-red mt-4 h-10 px-5 text-sm" onClick={onRestoreSample}>
            <Sparkles size={15} /> Khôi phục gia phả mẫu
          </button>
        </div>
      </section>
    );
  }

  const stats = getStats(sample);
  const highlights = [
    { icon: Users, label: `${stats.total} thành viên`, hint: `Đủ ${stats.generations} đời, có vợ/chồng và con cái` },
    { icon: GitBranch, label: `${sample.branches.length} chi, cành`, hint: "Nhánh họ tách rõ, có trưởng nhánh" },
    { icon: PenTool, label: "Phả đồ in sẵn", hint: "Khung ngang/dọc, xuất PDF và PNG" },
  ];

  return (
    <section className="pat-card overflow-hidden">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#9c251c_0%,#7d1712_58%,#6a100c_100%)] px-5 pb-5 pt-4 text-[#fff3dd]">
        <span
          aria-hidden
          className="pat-han pointer-events-none absolute -right-3 -top-5 text-[7.5rem] leading-none text-[#e7ce8b]/[0.13]"
        >
          譜
        </span>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-black/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#f6e0a8]">
              <Sparkles size={11} /> Gia phả mẫu
            </span>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[0.6rem] text-[#f0d9bd]">
              Miễn phí · không cần đăng nhập
            </span>
          </div>
          <h2 className="pat-serif mt-2 text-2xl font-bold leading-tight text-[#fff7e8]">{sample.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#f0d9bd]">
            <MapPin size={13} /> {sample.address || "Chưa cập nhật địa chỉ"}
          </p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-xl border border-[rgba(231,206,139,0.35)] bg-black/10 py-2.5 text-center">
            {[
              [stats.generations, "Đời"],
              [stats.total, "Thành viên"],
              [sample.branches.length, "Nhánh"],
            ].map(([value, label]) => (
              <div key={String(label)} className="px-1">
                <p className="text-base font-bold text-[#ffe9bd]">{value}</p>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#efd7b7]/80">{label}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#f0d9bd]/90">{sample.description}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="pat-btn pat-btn-gold h-11 flex-1 text-sm"
              onClick={() => onOpen("trang-chu")}
            >
              Mở gia phả mẫu <ChevronRight size={15} />
            </button>
            <button
              type="button"
              className="pat-btn h-11 flex-1 border border-[rgba(231,206,139,0.5)] bg-white/10 text-sm text-[#ffe9bd] transition hover:bg-white/15"
              onClick={() => onOpen("ve-pha-do")}
            >
              <PenTool size={14} /> Xem phả đồ mẫu
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">Bản mẫu có gì</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5"
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--pat-ink)]">{item.label}</p>
                  <p className="mt-0.5 text-[0.64rem] leading-snug text-[var(--pat-muted)]">{item.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
          Bản mẫu chỉ để tham khảo cách trình bày — không lẫn vào gia phả của bạn. Mọi chỉnh sửa trên bản mẫu chỉ lưu
          trên thiết bị này.
        </p>
      </div>
    </section>
  );
}

function CreateTab({
  importError,
  onCreate,
  onSpreadsheet,
  onTemplate,
  onBackup,
}: {
  importError: string;
  onCreate: () => void;
  onSpreadsheet: () => void;
  onTemplate: () => void;
  onBackup: () => void;
}) {
  const modes = [
    { key: "manual", icon: PenLine, title: "Nhập tay", hint: "Lập gia phả và ghi từng thành viên", onClick: onCreate },
    {
      key: "excel",
      icon: FileSpreadsheet,
      title: "Nhập Excel / CSV",
      hint: "Chọn tệp .xlsx, .xls, .csv đã điền",
      onClick: onSpreadsheet,
    },
    { key: "template", icon: FileDown, title: "File Excel mẫu", hint: "Tải cột chuẩn để điền dữ liệu", onClick: onTemplate },
    { key: "backup", icon: History, title: "Phục hồi sao lưu", hint: "Nạp lại từ tệp .json đã xuất", onClick: onBackup },
  ];

  return (
    <section className="pat-card relative overflow-hidden px-4 py-4">
      <span
        aria-hidden
        className="pat-han pointer-events-none absolute -right-2 -top-6 text-[7rem] leading-none text-[var(--pat-gold)]/[0.08]"
      >
        創
      </span>
      <div className="relative">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">Khởi tạo</p>
        <h2 className="pat-serif mt-1 text-xl font-semibold text-[var(--pat-red)]">Bắt đầu một dòng họ</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--pat-muted)]">
          Chọn cách nhập dữ liệu phù hợp. Có thể bổ sung thành viên, nhánh và phả ký sau.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={mode.onClick}
                className="group flex h-full flex-col items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/80 px-3.5 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-[var(--pat-gold)] hover:bg-white"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3e6cd] text-[var(--pat-red)] transition group-hover:bg-[var(--pat-red)] group-hover:text-[#fff4df]">
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--pat-ink)]">{mode.title}</span>
                  <span className="mt-0.5 block text-[0.66rem] leading-snug text-[var(--pat-muted)]">{mode.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {importError ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#e6b7ad] bg-[#f9e3df] px-3 py-2 text-xs font-semibold leading-snug text-[#a3271d]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {importError}
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-[var(--pat-line)] bg-white/50 px-3.5 py-3">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">Ba bước dựng phả</p>
          <ol className="mt-2 grid gap-2 sm:grid-cols-3">
            {["Lập gia phả", "Thêm thành viên, nhánh", "In phả đồ"].map((label, index) => (
              <li key={label} className="flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#e3cd92] bg-[#f6e9c8] text-[0.66rem] font-bold text-[#7a5a10]">
                  {index + 1}
                </span>
                <span className="font-medium text-[var(--pat-ink)]">{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
          <Info size={14} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          Gia phả lưu ngay trên thiết bị này, không cần đăng nhập hay mua xu. Nên xuất tệp sao lưu JSON định kỳ để giữ
          dữ liệu an toàn.
        </p>
      </div>
    </section>
  );
}

function ArchiveTab({
  trees,
  archived,
  ready,
  onNew,
  onOpen,
  onMore,
  onDelete,
  onRestore,
  onPurge,
}: {
  trees: FamilyTree[];
  archived: ArchivedTree[];
  ready: boolean;
  onNew: () => void;
  onOpen: (id: string, section: string) => void;
  onMore: (tree: FamilyTree) => void;
  onDelete: (tree: FamilyTree) => void;
  onRestore: (id: string) => void;
  onPurge: (entry: ArchivedTree) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="pat-serif text-xl font-semibold text-[var(--pat-red)]">Gia phả đã tạo</h2>
          <p className="text-[0.7rem] text-[var(--pat-muted)]">
            {ready ? `${trees.length} gia phả · lưu trên thiết bị này` : "Đang tải…"}
          </p>
        </div>
        <button type="button" className="pat-btn pat-btn-red h-9 px-3.5 text-xs" onClick={onNew}>
          <Plus size={14} /> Tạo mới
        </button>
      </div>

      {!ready ? (
        <div className="pat-card px-5 py-8 text-center text-sm text-[var(--pat-muted)]">Đang tải gia phả…</div>
      ) : trees.length === 0 ? (
        <div className="pat-card relative overflow-hidden px-6 py-8 text-center">
          <div className="relative">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#e3cd92] bg-[#f6e9c8] text-[var(--pat-red)]">
              <Archive size={20} />
            </span>
            <p className="pat-serif mt-3 text-lg font-semibold text-[var(--pat-red)]">Chưa có gia phả nào trong lưu trữ</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--pat-muted)]">
              Lập gia phả đầu tiên để ghi lại cội nguồn dòng họ. Không cần đăng nhập.
            </p>
            <button type="button" className="pat-btn pat-btn-red mt-4 h-10 px-5 text-sm" onClick={onNew}>
              <Plus size={15} /> Tạo gia phả đầu tiên
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trees.map((tree) => (
            <ArchiveCard
              key={tree.id}
              tree={tree}
              onOpen={onOpen}
              onMore={onMore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {archived.length ? (
        <div className="pt-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1 px-1">
            <h3 className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-muted)]">
              <Trash2 size={13} /> Đã xóa · {archived.length}
            </h3>
            <span className="text-[0.62rem] text-[var(--pat-muted)]">Khôi phục bất cứ lúc nào</span>
          </div>
          <div className="space-y-2">
            {archived.map((entry) => (
              <article
                key={entry.tree.id}
                className="rounded-xl border border-dashed border-[var(--pat-line)] bg-[#f7efe0]/80 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eadfc9] text-[var(--pat-muted)] sm:flex">
                    <Archive size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--pat-ink)]">{entry.tree.name}</p>
                    <p className="text-[0.65rem] text-[var(--pat-muted)]">
                      {entry.tree.members.length} thành viên · đã xóa {formatDate(entry.deletedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pat-btn pat-btn-outline h-8 shrink-0 px-2.5 text-[0.68rem]"
                    onClick={() => onRestore(entry.tree.id)}
                  >
                    <RotateCcw size={13} /> Khôi phục
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--pat-line)] bg-white/60 text-[#a3271d]"
                    aria-label={`Xóa vĩnh viễn ${entry.tree.name}`}
                    onClick={() => onPurge(entry)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <p className="flex items-start gap-2 px-1 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
        <Info size={14} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
        Xóa gia phả cần xác nhận 2 bước. Dữ liệu được giữ trong mục Đã xóa để khôi phục khi cần.
      </p>
    </section>
  );
}

function ArchiveCard({
  tree,
  onOpen,
  onMore,
  onDelete,
}: {
  tree: FamilyTree;
  onOpen: (id: string, section: string) => void;
  onMore: (tree: FamilyTree) => void;
  onDelete: (tree: FamilyTree) => void;
}) {
  const stats = getStats(tree);
  return (
    <article className="pat-card relative flex overflow-hidden">
      <span
        aria-hidden
        className="w-1.5 shrink-0"
        style={{ backgroundImage: "linear-gradient(180deg, #b7791f, #8a1c15)" }}
      />
      <div className="min-w-0 flex-1 px-3.5 py-3">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => onOpen(tree.id, "trang-chu")} className="min-w-0 flex-1 text-left">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="pat-serif truncate text-base font-bold text-[var(--pat-red)]">{tree.name}</span>
              {tree.branches.length ? (
                <span className="rounded-full border border-[var(--pat-line)] bg-[#f6e9c8] px-1.5 py-0.5 text-[0.56rem] font-semibold text-[#7a5a10]">
                  {tree.branches.length} nhánh
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-[var(--pat-muted)]">
              <MapPin size={11} /> {tree.address || "Chưa cập nhật địa chỉ"}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onMore(tree)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pat-line)] bg-[#fffaf0] text-[var(--pat-muted)]"
              aria-label="Thao tác gia phả"
            >
              <MoreHorizontal size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(tree)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pat-line)] bg-[#fffaf0] text-[#a3271d]"
              aria-label={`Xóa ${tree.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.66rem] text-[var(--pat-muted)]">
          <span className="inline-flex items-center gap-1">
            <Users size={12} /> {stats.total} người
          </span>
          <span>{stats.generations} đời</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} /> {formatDate(tree.updatedAt)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            className="pat-btn pat-btn-red h-8 px-3 text-[0.7rem]"
            onClick={() => onOpen(tree.id, "trang-chu")}
          >
            Mở gia phả <ChevronRight size={13} />
          </button>
          <button
            type="button"
            className="pat-btn pat-btn-outline h-8 px-3 text-[0.7rem]"
            onClick={() => onOpen(tree.id, "danh-sach-thanh-vien")}
          >
            <Users size={13} /> Phả hệ
          </button>
          <button
            type="button"
            className="pat-btn pat-btn-outline h-8 px-3 text-[0.7rem]"
            onClick={() => onOpen(tree.id, "ve-pha-do")}
          >
            <PenTool size={13} /> Phả đồ
          </button>
        </div>
      </div>
    </article>
  );
}
