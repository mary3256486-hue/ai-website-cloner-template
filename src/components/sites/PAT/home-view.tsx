"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileWarning,
  GitBranch,
  HelpCircle,
  History,
  Info,
  ListChecks,
  MapPin,
  MoreHorizontal,
  PenLine,
  PenTool,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGenealogy, type ArchivedTree } from "./store";
import type { FamilyTree, Person } from "./types";
import { ANCESTOR_TITLES, HONORS, MANDARIN_RANKS, NOBLE_TITLES } from "./types";
import { getStats } from "./utils";
import { createDemoTree } from "./seed";
import {
  buildTreeFromRows,
  downloadExcelTemplate,
  downloadImportIssuesCsv,
  downloadImportReport,
  groupImportWarnings,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  ImportFileError,
  parseSpreadsheetFile,
  type ImportResult,
  type SpreadsheetInfo,
} from "./import";
import { exportBackup, exportMembersCsv, readBackup } from "./export";
import { exportGedcom, parseGedcom, type GedcomParseResult } from "./gedcom";
import { MEMBER_COLUMN_COUNT, TEMPLATE_VERSION } from "./columns";
import {
  addImportHistory,
  clearImportHistory,
  downloadHistorySnapshot,
  readImportHistory,
  removeImportHistory,
  type ImportHistoryEntry,
} from "./import-history";
import { Field, Sheet, SheetRow } from "./ui";

type HomeTab = "mau" | "tao" | "luu";

const TOUR_KEY = "phatue.tour.v1";
const TOUR_STEPS = [
  {
    title: "Tạo gia phả",
    body: "Mở tab “Tạo gia phả” để nhập tay, nhập Excel/CSV/GEDCOM hoặc bắt đầu từ bản mẫu.",
  },
  {
    title: "Thêm thành viên",
    body: "Trong gia phả, dùng nút “Thêm” ở góc trên hoặc thẻ “Phả hệ” để ghi thành viên và chi phái.",
  },
  {
    title: "In phả đồ",
    body: "Vào “Vẽ phả đồ” để sắp bố cục, rồi “Thiết kế bản in” để chọn khổ giấy và in.",
  },
];

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
  description: "",
  founderName: "",
  founderGender: "male" as "male" | "female",
  founderBirth: "",
  founderBiography: "",
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

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function delimiterLabel(value?: string) {
  if (!value) return "";
  if (value === "\t") return "Tab";
  return value;
}

interface ImportReportState {
  entry: ImportHistoryEntry;
  result?: ImportResult;
  info?: SpreadsheetInfo;
  gedcom?: GedcomParseResult;
}

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
    replaceTree,
  } = useGenealogy();
  const router = useRouter();

  const [tab, setTab] = useState<HomeTab>("mau");
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
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
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [createdTree, setCreatedTree] = useState<{ id: string; name: string } | null>(null);
  const [importErrorInfo, setImportErrorInfo] = useState<{
    message: string;
    hint?: string;
    fileName?: string;
    file?: File;
    tool?: "Excel/CSV" | "GEDCOM" | "JSON";
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<ImportResult | null>(null);
  const [pendingInfo, setPendingInfo] = useState<SpreadsheetInfo | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [pendingTool, setPendingTool] = useState<"Excel/CSV" | "GEDCOM">("Excel/CSV");
  const [pendingGedcom, setPendingGedcom] = useState<GedcomParseResult | null>(null);
  const [importBusy, setImportBusy] = useState("");
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTreeId, setTemplateTreeId] = useState("blank");
  const [downloadTree, setDownloadTree] = useState<FamilyTree | null>(null);
  const [backupPickerOpen, setBackupPickerOpen] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    tree: FamilyTree;
    warnings: string[];
    fileName: string;
  } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [rollbackTarget, setRollbackTarget] = useState<ImportHistoryEntry | null>(null);
  const [report, setReport] = useState<ImportReportState | null>(null);
  const parseRun = useRef(0);
  const spreadsheetRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const gedcomRef = useRef<HTMLInputElement>(null);

  const sample = useMemo(() => trees.find((tree) => tree.sample), [trees]);
  const ownTrees = useMemo(
    () => trees.filter((tree) => !tree.sample).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [trees],
  );

  const initialTabDone = useRef(false);
  useEffect(() => {
    if (!hydrated || initialTabDone.current) return;
    initialTabDone.current = true;
    const hash = window.location.hash.replace("#", "");
    if (hash === "tao" || hash === "luu" || hash === "mau") {
      // The hash is only known in the browser, so the tab is restored after mount.
      setTab(hash);
      return;
    }
    if (trees.some((tree) => !tree.sample)) {
      setTab("luu");
    }
  }, [hydrated, trees]);

  useEffect(() => {
    if (!hydrated) return;
    if (window.localStorage.getItem(TOUR_KEY)) return;
    const timer = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    // Nhật ký nhập nằm trong localStorage nên chỉ đọc được sau khi vào trình duyệt.
    setHistory(readImportHistory());
  }, [hydrated]);

  const closeTour = () => {
    window.localStorage.setItem(TOUR_KEY, "1");
    setTourOpen(false);
    setTourStep(0);
  };

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
    const { id } = importTree(createDemoTree(), { suffix: false });
    updateTree(id, { sample: true });
    selectTab("mau");
  };

  const advanceCreate = () => {
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên gia phả trước khi tiếp tục.");
      return;
    }
    setError("");
    setCreateStep(2);
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
    setIfFilled("biography", form.founderBiography);

    const id = createTree({
      name: form.name,
      address: form.address,
      ownerName: form.ownerName,
      description: form.description,
      founderName: form.founderName,
      founderGender: form.founderGender,
      founderBirth: form.founderBirth,
      founderDetails,
    });
    setCreatedTree({ id, name: form.name.trim() });
    setCreateOpen(false);
    setForm(EMPTY_CREATE_FORM);
    setError("");
    setCreateStep(1);
    setAdvancedOpen(false);
  };

  const buildPreview = (
    rows: Record<string, unknown>[],
    name: string,
    target: string,
    info?: SpreadsheetInfo | null,
  ) => {
    const base = target === "new" ? undefined : trees.find((tree) => tree.id === target);
    try {
      const result = buildTreeFromRows(rows, name, {
        baseTree: base,
        headerLine: info?.headerLine,
      });
      setPendingImport({
        ...result,
        fileName: info?.fileName,
        sheetName: info?.sheetName,
        headerLine: info?.headerLine,
        unmappedHeaders: info?.unmappedHeaders,
      });
      setImportErrorInfo(null);
    } catch (cause) {
      setPendingImport(null);
      setImportErrorInfo({
        message: cause instanceof Error ? cause.message : "Không đọc được tệp Excel.",
        fileName: info?.fileName,
      });
    }
  };

  const resetImport = () => {
    setPendingImport(null);
    setPendingInfo(null);
    setPendingFile(null);
    setPendingGedcom(null);
    setUpdateConfirmOpen(false);
  };

  const runSpreadsheet = async (file: File, sheet?: string) => {
    const runId = parseRun.current + 1;
    parseRun.current = runId;
    setImportBusy("Đang đọc tệp…");
    setImportErrorInfo(null);
    try {
      const info = await parseSpreadsheetFile(file, {
        sheet,
        onStage: (label) => {
          if (parseRun.current === runId) setImportBusy(label);
        },
        isCancelled: () => parseRun.current !== runId,
      });
      if (parseRun.current !== runId) return;
      setPendingInfo(info);
      setPendingFile(file);
      setPendingTool("Excel/CSV");
      setPendingGedcom(null);
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      setPendingName(name);
      buildPreview(info.rows, name, "new", info);
    } catch (cause) {
      if (parseRun.current !== runId) return;
      if (cause instanceof ImportFileError && cause.kind === "cancelled") return;
      setPendingImport(null);
      setImportErrorInfo({
        message: cause instanceof Error ? cause.message : "Không đọc được tệp Excel.",
        hint: cause instanceof ImportFileError ? cause.hint : undefined,
        fileName: file.name,
        file,
        tool: "Excel/CSV",
      });
    } finally {
      if (parseRun.current === runId) setImportBusy("");
    }
  };

  const onSpreadsheetPicked = async (file: File | undefined) => {
    if (!file) return;
    await runSpreadsheet(file);
  };

  const chooseImportTarget = (target: string) => {
    if (pendingInfo) buildPreview(pendingInfo.rows, pendingName, target, pendingInfo);
  };

  const closeImport = () => {
    parseRun.current += 1;
    setImportBusy("");
    resetImport();
  };

  const cancelImportRead = () => {
    parseRun.current += 1;
    setImportBusy("");
    setImportErrorInfo({ message: "Đã huỷ đọc tệp. Chọn tệp khác khi sẵn sàng." });
  };

  const retryImport = () => {
    const file = importErrorInfo?.file;
    if (!file) {
      spreadsheetRef.current?.click();
      return;
    }
    if (importErrorInfo?.tool === "GEDCOM") void onGedcomPicked(file);
    else if (importErrorInfo?.tool === "JSON") void onBackupPicked(file);
    else void runSpreadsheet(file);
  };

  const renamePending = (value: string) => {
    setPendingName(value);
    if (pendingInfo) buildPreview(pendingInfo.rows, value, pendingImport?.baseTreeId ?? "new", pendingInfo);
  };

  const openTemplate = () => {
    setTemplateTreeId("blank");
    setTemplateOpen(true);
  };

  const downloadTemplate = () => {
    const tree = templateTreeId === "blank" ? undefined : trees.find((item) => item.id === templateTreeId);
    downloadExcelTemplate(tree);
    setTemplateOpen(false);
    setToast({
      message: tree
        ? `Đã tải mẫu ${MEMBER_COLUMN_COUNT} cột kèm dữ liệu “${tree.name}”.`
        : `Đã tải mẫu Excel ${MEMBER_COLUMN_COUNT} cột (bản ${TEMPLATE_VERSION}).`,
    });
  };

  const downloadTreeData = (tree: FamilyTree, format: "csv" | "excel" | "gedcom" | "json") => {
    if (format === "csv") exportMembersCsv(tree);
    else if (format === "excel") downloadExcelTemplate(tree);
    else if (format === "gedcom") exportGedcom(tree);
    else exportBackup(tree);
    setDownloadTree(null);
    const label = {
      csv: `CSV ${MEMBER_COLUMN_COUNT} cột`,
      excel: `Excel mẫu ${MEMBER_COLUMN_COUNT} cột`,
      gedcom: "GEDCOM",
      json: "bản sao lưu JSON",
    }[format];
    setToast({ message: `Đã tải ${label} của “${tree.name}”.` });
  };

  const confirmRestore = () => {
    if (!restorePreview) return;
    const restored = restorePreview;
    const imported = importTree(restored.tree, { suffix: true });
    setRestorePreview(null);
    setCreatedTree({ id: imported.id, name: imported.name });
    setToast({ message: `Đã phục hồi “${imported.name}” thành một gia phả mới.` });
  };

  const openMemberSearch = (treeId: string, query?: string) => {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
    router.push(`/gia-pha/${treeId}/danh-sach-thanh-vien${suffix}`);
  };

  const reportInput = (state: ImportReportState) => ({
    fileName: state.info?.fileName ?? state.entry.fileName,
    tool: state.entry.tool,
    treeName: state.entry.treeName,
    sheetName: state.info?.sheetName ?? state.entry.sheetName,
    headerLine: state.info?.headerLine ?? state.entry.headerLine,
    rows: state.result?.importedCount ?? state.entry.rows,
    warnings: state.result?.warnings ?? state.entry.warnings,
    rowIssues: state.result?.rowIssues ?? state.entry.rowIssues,
    unmappedHeaders: state.info?.unmappedHeaders,
  });

  const onBackupPicked = async (file: File | undefined) => {
    if (!file) return;
    setImportErrorInfo(null);
    setBackupPickerOpen(false);
    try {
      const result = await readBackup(file);
      setRestorePreview({
        tree: result.tree,
        warnings: result.warnings,
        fileName: result.fileName,
      });
    } catch (cause) {
      setImportErrorInfo({
        message: cause instanceof Error ? cause.message : "Không đọc được tệp sao lưu.",
        fileName: file.name,
        file,
        tool: "JSON",
      });
    }
  };

  const onGedcomPicked = async (file: File | undefined) => {
    if (!file) return;
    setImportErrorInfo(null);
    try {
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const result = parseGedcom(await file.text(), name);
      setPendingInfo(null);
      setPendingFile(file);
      setPendingTool("GEDCOM");
      setPendingGedcom(result);
      setPendingName(name);
      setPendingImport({
        tree: result.tree,
        warnings: result.warnings,
        rowIssues: [],
        memberCount: result.tree.members.length,
        importedCount: result.tree.members.length,
        matchedCount: 0,
        changedCount: 0,
        createdCount: result.tree.members.length,
        fileName: file.name,
      });
    } catch (cause) {
      setPendingImport(null);
      setImportErrorInfo({
        message: cause instanceof Error ? cause.message : "Không đọc được tệp GEDCOM.",
        fileName: file.name,
        file,
        tool: "GEDCOM",
      });
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    if (pendingImport.baseTreeId) {
      setUpdateConfirmOpen(true);
      return;
    }
    commitImport();
  };

  const commitImport = () => {
    const result = pendingImport;
    if (!result) return;
    const base = result.baseTreeId ? trees.find((tree) => tree.id === result.baseTreeId) : undefined;
    let id: string;
    let historyEntry: ImportHistoryEntry | undefined;
    if (base) {
      id = base.id;
      const stored = addImportHistory({
        fileName: pendingInfo?.fileName ?? pendingFile?.name ?? result.fileName ?? "Tệp không tên",
        sheetName: pendingInfo?.sheetName,
        headerLine: pendingInfo?.headerLine,
        tool: pendingTool,
        mode: "update",
        treeId: id,
        treeName: base.name,
        rows: result.importedCount,
        members: result.memberCount,
        warnings: result.warnings,
        rowIssues: result.rowIssues,
        snapshot: base,
      });
      historyEntry = stored.entry;
      if (stored.entry.snapshotSkipped) {
        setToast({
          message: `Đã cập nhật “${base.name}”. Bộ nhớ thiết bị đầy nên chưa lưu được bản chụp trước khi nhập.`,
        });
      }
      replaceTree(id, result.tree);
      setHistory(stored.entries);
    } else {
      const imported = importTree(result.tree, { suffix: false });
      id = imported.id;
      const stored = addImportHistory({
        fileName: pendingInfo?.fileName ?? pendingFile?.name ?? result.fileName ?? "Tệp không tên",
        sheetName: pendingInfo?.sheetName,
        headerLine: pendingInfo?.headerLine,
        tool: pendingTool,
        mode: "new",
        treeId: id,
        treeName: imported.name,
        rows: result.importedCount,
        members: result.memberCount,
        warnings: result.warnings,
        rowIssues: result.rowIssues,
      });
      historyEntry = stored.entry;
      setHistory(stored.entries);
    }
    if (historyEntry) {
      setReport({
        entry: historyEntry,
        result,
        info: pendingInfo ?? undefined,
        gedcom: pendingGedcom ?? undefined,
      });
    }
    setUpdateConfirmOpen(false);
    resetImport();
  };

  const startRollback = (entry: ImportHistoryEntry) => {
    setRollbackTarget(entry);
  };

  const confirmRollback = () => {
    if (!rollbackTarget) return;
    const entry = rollbackTarget;
    if (entry.snapshot) {
      if (!trees.some((tree) => tree.id === entry.treeId)) {
        setToast({ message: "Gia phả của lần nhập này không còn trong lưu trữ nên không thể quay lại." });
        setRollbackTarget(null);
        return;
      }
      replaceTree(entry.treeId, entry.snapshot);
      setToast({ message: `Đã quay lại trạng thái trước khi nhập “${entry.fileName}”.` });
    } else {
      const archived = archiveTree(entry.treeId);
      if (!archived) {
        setToast({ message: "Không tìm thấy gia phả đã tạo từ lần nhập này để hoàn tác." });
        setRollbackTarget(null);
        return;
      }
      setToast({ message: `Đã chuyển gia phả tạo từ “${entry.fileName}” vào mục Đã xóa.`, treeId: entry.treeId });
    }
    setHistory(removeImportHistory(entry.id));
    setRollbackTarget(null);
  };

  const openHistoryReport = (entry: ImportHistoryEntry) => {
    setHistoryOpen(false);
    setReport({ entry });
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

      <section className="relative">
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
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-4 pt-12 text-center">
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Image
                src="/sites/PAT/images/han-watermark.png"
                alt=""
                width={1141}
                height={1311}
                className="h-auto w-[220px] max-w-none object-contain opacity-20 blur-[2px]"
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
        </div>
      </section>

      <main className="mx-auto w-full max-w-3xl px-3 pt-5">
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
              onDuplicate={() => {
                if (!sample) return;
                const name = sample.name.replace(/\s*\(MẪU\)\s*$/i, "") + " (bản sao)";
                const { id } = importTree({ ...sample, name }, { suffix: false });
                router.push(`/gia-pha/${id}/trang-chu`);
              }}
              onDownload={setDownloadTree}
              onRestoreSample={restoreSample}
            />
          ) : null}

          {tab === "tao" ? (
            <CreateTab
              importError={importErrorInfo}
              importBusy={importBusy}
              historyCount={history.length}
              hasTrees={ownTrees.length > 0}
              onRetry={retryImport}
              onCancelRead={cancelImportRead}
              onCreate={() => {
                setError("");
                setCreateStep(1);
                setCreateOpen(true);
              }}
              onSpreadsheet={() => spreadsheetRef.current?.click()}
              onGedcom={() => gedcomRef.current?.click()}
              onTemplate={openTemplate}
              onBackup={() => backupRef.current?.click()}
              onBackupNow={() => setBackupPickerOpen(true)}
              onHistory={() => setHistoryOpen(true)}
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
              onDownload={setDownloadTree}
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
      <input
        ref={gedcomRef}
        type="file"
        accept=".ged,.gedcom,text/plain"
        className="hidden"
        onChange={(event) => {
          void onGedcomPicked(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <Sheet
        open={Boolean(pendingImport)}
        onClose={closeImport}
        wide
        title={
          pendingImport?.baseTreeId
            ? "Cập nhật gia phả từ tệp"
            : pendingTool === "GEDCOM"
              ? "Xem trước tệp GEDCOM"
              : "Xem trước & xác nhận nhập"
        }
        subtitle={
          pendingImport?.baseTreeId
            ? (trees.find((tree) => tree.id === pendingImport.baseTreeId)?.name ?? "")
            : pendingImport?.tree.name ?? ""
        }
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="pat-btn h-11 text-sm sm:flex-1" onClick={closeImport}>
              Huỷ
            </button>
            {pendingInfo ? (
              <button
                type="button"
                className="pat-btn h-11 text-sm sm:flex-1"
                onClick={() =>
                  downloadImportIssuesCsv(pendingInfo, pendingImport?.rowIssues ?? [], pendingImport?.warnings ?? [])
                }
              >
                <Download size={14} /> Tải danh sách lỗi
              </button>
            ) : null}
            <button type="button" className="pat-btn pat-btn-red h-11 text-sm sm:flex-[1.4]" onClick={confirmImport}>
              {pendingImport?.baseTreeId
                ? "Xem lại & ghi cập nhật"
                : `Nhập ${pendingImport?.memberCount ?? 0} thành viên`}
            </button>
          </div>
        }
      >
        {pendingImport ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 text-[0.66rem]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 font-semibold text-[var(--pat-ink)]">
                <FileSpreadsheet size={11} className="text-[var(--pat-gold)]" />
                {pendingInfo?.fileName ?? pendingFile?.name ?? pendingImport.fileName ?? "Tệp đã chọn"}
              </span>
              {pendingFile ? (
                <span className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[var(--pat-muted)]">
                  {formatBytes(pendingFile.size)}
                </span>
              ) : null}
              {pendingInfo ? (
                <>
                  <span className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[var(--pat-muted)]">
                    Trang “{pendingInfo.sheetName}”
                  </span>
                  <span className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[var(--pat-muted)]">
                    Tiêu đề dòng {pendingInfo.headerLine}
                  </span>
                  {pendingInfo.format === "csv" ? (
                    <span className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[var(--pat-muted)]">
                      Dấu phân cách: {delimiterLabel(pendingInfo.delimiter) || "phẩy"}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[var(--pat-muted)]">
                    {pendingInfo.mappedHeaders.length} cột khớp mẫu
                  </span>
                </>
              ) : null}
              {pendingTool === "GEDCOM" ? (
                <span className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 text-[var(--pat-muted)]">
                  GEDCOM · tạo gia phả mới
                </span>
              ) : null}
            </div>

            {pendingInfo && pendingInfo.unmappedHeaders.length ? (
              <details className="rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf]/50 px-3 py-2 text-[0.7rem] text-[#7a5a10]">
                <summary className="cursor-pointer font-semibold">
                  <FileWarning size={12} className="mr-1 inline" />
                  {pendingInfo.unmappedHeaders.length} cột không có trong mẫu sẽ bị bỏ qua
                </summary>
                <p className="mt-1 leading-relaxed">{pendingInfo.unmappedHeaders.join(" · ")}</p>
              </details>
            ) : null}

            {pendingGedcom ? (
              <div className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { value: pendingGedcom.stats.individuals, label: "Cá nhân" },
                    { value: pendingGedcom.stats.families, label: "Gia đình" },
                    { value: pendingGedcom.stats.unsupported.length, label: "Trường bị bỏ" },
                  ].map((cell) => (
                    <div key={cell.label}>
                      <p className="text-base font-bold text-[var(--pat-red)]">{cell.value}</p>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">
                        {cell.label}
                      </p>
                    </div>
                  ))}
                </div>
                {pendingGedcom.stats.unsupported.length ? (
                  <p className="mt-2 border-t border-[var(--pat-line)] pt-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                    Ngoài mô hình:{" "}
                    {pendingGedcom.stats.unsupported
                      .slice(0, 8)
                      .map((item) => `${item.label} (${item.count})`)
                      .join(" · ")}
                    {pendingGedcom.stats.unsupported.length > 8 ? "…" : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!pendingImport.baseTreeId ? (
              <Field label="Tên gia phả *" hint="Có thể sửa tên ngay tại đây trước khi nhập.">
                <input
                  className="pat-input"
                  value={pendingName}
                  onChange={(event) => renamePending(event.target.value)}
                  placeholder="Ví dụ: Gia phả dòng họ Phạm"
                />
              </Field>
            ) : null}

            {pendingInfo && ownTrees.length ? (
              <Field label="Nhập vào" hint="Cập nhật ghép theo Mã trước, sau đó theo tên; người vắng mặt được giữ nguyên.">
                <select
                  className="pat-input"
                  value={pendingImport.baseTreeId ?? "new"}
                  onChange={(event) => chooseImportTarget(event.target.value)}
                >
                  <option value="new">Tạo gia phả mới từ tệp</option>
                  {ownTrees.map((tree) => (
                    <option key={tree.id} value={tree.id}>
                      Cập nhật: {tree.name} ({tree.members.length} người)
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {pendingImport.baseTreeId ? (
              <p className="flex items-start gap-2 rounded-xl border border-[#e3cd92] bg-[#f9edcf]/70 px-3 py-2 text-[0.72rem] leading-relaxed text-[#7a5a10]">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Bạn đang cập nhật <strong>{trees.find((tree) => tree.id === pendingImport.baseTreeId)?.name}</strong>.
                  Bản trước khi ghi sẽ được lưu vào Lịch sử nhập để có thể quay lại.
                </span>
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: pendingImport.importedCount, label: "Dòng đọc được" },
                { value: pendingImport.baseTreeId ? pendingImport.matchedCount : pendingImport.createdCount, label: pendingImport.baseTreeId ? "Hồ sơ khớp" : "Hồ sơ mới" },
                { value: pendingImport.baseTreeId ? pendingImport.changedCount : pendingImport.memberCount, label: pendingImport.baseTreeId ? "Có thay đổi" : "Thành viên" },
                { value: pendingImport.baseTreeId ? (pendingImport.absentCount ?? 0) : pendingImport.tree.branches.length, label: pendingImport.baseTreeId ? "Giữ nguyên" : "Chi phái" },
              ].map((cell) => (
                <div key={cell.label} className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-2 py-2 text-center">
                  <p className="text-base font-bold text-[var(--pat-red)]">{cell.value}</p>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">
                    {cell.label}
                  </p>
                </div>
              ))}
            </div>

            {pendingImport.baseTreeId ? (
              <p className="text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                Sau khi ghi, cây có <strong>{pendingImport.memberCount}</strong> thành viên: cập nhật{" "}
                <strong>{pendingImport.matchedCount}</strong>, thêm mới <strong>{pendingImport.createdCount}</strong>.
              </p>
            ) : null}

            {pendingInfo?.preview.length ? (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-red)]">
                  <ListChecks size={13} /> Xem trước {Math.min(10, pendingInfo.preview.length)} dòng đầu
                </p>
                <div className="pat-scroll overflow-x-auto rounded-xl border border-[var(--pat-line)] bg-white/70">
                  <table className="w-full min-w-[620px] border-collapse text-left text-[0.7rem]">
                    <thead>
                      <tr className="border-b border-[var(--pat-line)] bg-[#f6e9c8]/60 text-[0.62rem] uppercase tracking-[0.08em] text-[#7a5a10]">
                        <th className="px-2 py-1.5">Dòng</th>
                        <th className="px-2 py-1.5">Mã</th>
                        <th className="px-2 py-1.5">Họ tên</th>
                        <th className="px-2 py-1.5">Giới tính</th>
                        <th className="px-2 py-1.5">Năm sinh</th>
                        <th className="px-2 py-1.5">Đời</th>
                        <th className="px-2 py-1.5">Cha</th>
                        <th className="px-2 py-1.5">Mẹ</th>
                        <th className="px-2 py-1.5">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInfo.preview.slice(0, 10).map((row) => (
                        <tr
                          key={row.line}
                          className={cn(
                            "border-b border-[var(--pat-line)]/60 last:border-0",
                            row.issues.length && "bg-[#f9e3df]/70",
                          )}
                        >
                          <td className="px-2 py-1.5 tabular-nums text-[var(--pat-muted)]">{row.line}</td>
                          <td className="px-2 py-1.5 font-mono text-[0.66rem]">{row.code || "—"}</td>
                          <td className="px-2 py-1.5 font-semibold text-[var(--pat-ink)]">{row.name || "—"}</td>
                          <td className="px-2 py-1.5">{row.gender || "—"}</td>
                          <td className="px-2 py-1.5">{row.birthDate || "—"}</td>
                          <td className="px-2 py-1.5">{row.generation || "—"}</td>
                          <td className="max-w-[7rem] truncate px-2 py-1.5">{row.father || "—"}</td>
                          <td className="max-w-[7rem] truncate px-2 py-1.5">{row.mother || "—"}</td>
                          <td className="px-2 py-1.5 text-[0.64rem] leading-snug text-[#a3271d]">
                            {row.issues.join(" ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pendingInfo.preview.length > 10 ? (
                  <p className="mt-1 text-[0.66rem] text-[var(--pat-muted)]">
                    Còn {pendingInfo.preview.length - 10} dòng khác — báo cáo đầy đủ sau khi nhập.
                  </p>
                ) : null}
              </div>
            ) : null}

            {pendingImport.rowIssues.length ? (
              <div className="rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/60 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[0.72rem] font-bold text-[#a3271d]">
                    <AlertTriangle size={13} />
                    {pendingImport.rowIssues.filter((issue) => issue.severity === "error").length} lỗi dòng ·{" "}
                    {pendingImport.rowIssues.filter((issue) => issue.severity === "warning").length} lưu ý
                  </p>
                  {pendingInfo ? (
                    <button
                      type="button"
                      className="text-[0.68rem] font-semibold text-[#a3271d] underline decoration-dotted"
                      onClick={() =>
                        downloadImportIssuesCsv(pendingInfo, pendingImport.rowIssues, pendingImport.warnings)
                      }
                    >
                      Tải CSV
                    </button>
                  ) : null}
                </div>
                <ul className="pat-scroll mt-1.5 max-h-28 space-y-1 overflow-y-auto text-[0.68rem] leading-relaxed text-[#7a2a22]">
                  {pendingImport.rowIssues.slice(0, 8).map((issue, index) => (
                    <li key={`${issue.line}-${index}`}>
                      • Dòng {issue.line}
                      {issue.column ? ` · ${issue.column}` : ""}
                      {issue.value ? ` “${issue.value}”` : ""}: {issue.message}
                    </li>
                  ))}
                </ul>
                {pendingImport.rowIssues.length > 8 ? (
                  <p className="mt-1 text-[0.66rem] text-[#a3271d]">
                    Còn {pendingImport.rowIssues.length - 8} mục — tải CSV để xem đủ.
                  </p>
                ) : null}
                <p className="mt-1.5 text-[0.66rem] leading-relaxed text-[#7a2a22]">
                  Dòng thiếu họ tên bị bỏ qua; dòng trùng Mã được cấp mã mới. Vẫn có thể nhập và sửa sau.
                </p>
              </div>
            ) : null}

            {pendingImport.warnings.length ? (
              <div className="space-y-2">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#7a5a10]">
                  Cảnh báo theo nhóm
                </p>
                <div className="pat-scroll max-h-44 space-y-2 overflow-y-auto">
                  {groupImportWarnings(pendingImport.warnings).map((group) => (
                    <div
                      key={group.key}
                      className="rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf]/60 px-3 py-2"
                    >
                      <p className="text-[0.68rem] font-bold text-[#7a5a10]">
                        {group.label} · {group.items.length}
                      </p>
                      <ul className="mt-0.5 space-y-0.5 text-[0.66rem] leading-relaxed text-[#7a5a10]">
                        {group.items.map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-[var(--pat-muted)]">
                <CheckCircle2 size={14} className="text-[#1f6b4a]" /> Không có cảnh báo — mọi quan hệ đều khớp.
              </p>
            )}

            <p className="text-[0.66rem] leading-relaxed text-[var(--pat-muted)]">
              Giới hạn mỗi tệp: {formatBytes(IMPORT_MAX_BYTES)} và {IMPORT_MAX_ROWS.toLocaleString("vi-VN")} dòng dữ
              liệu. Tệp lớn nên chia nhỏ hoặc dùng CSV.
            </p>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={updateConfirmOpen && Boolean(pendingImport?.baseTreeId)}
        onClose={() => setUpdateConfirmOpen(false)}
        title="Ghi cập nhật vào gia phả hiện có?"
        subtitle={trees.find((tree) => tree.id === pendingImport?.baseTreeId)?.name ?? ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setUpdateConfirmOpen(false)}>
              Xem lại
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-1 text-sm" onClick={commitImport}>
              Ghi cập nhật
            </button>
          </div>
        }
      >
        {pendingImport?.baseTreeId ? (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-[#e3cd92] bg-[#f9edcf]/70 px-3 py-3 text-sm text-[#7a5a10]">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Thay đổi được ghi ngay vào gia phả. Bản trước khi nhập được lưu vào Lịch sử nhập để quay lại nếu cần.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { value: pendingImport.matchedCount, label: "Hồ sơ khớp" },
                { value: pendingImport.changedCount, label: "Có thay đổi" },
                { value: pendingImport.createdCount, label: "Thêm mới" },
                { value: pendingImport.absentCount ?? 0, label: "Giữ nguyên" },
              ].map((cell) => (
                <div key={cell.label} className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-2 py-2">
                  <p className="text-base font-bold text-[var(--pat-red)]">{cell.value}</p>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">
                    {cell.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-[var(--pat-muted)]">
              Người có trong gia phả nhưng vắng mặt trong tệp không bị xóa. Sau khi ghi, cây có{" "}
              <strong>{pendingImport.memberCount}</strong> thành viên.
            </p>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(restorePreview)}
        onClose={() => setRestorePreview(null)}
        title="Phục hồi từ tệp sao lưu"
        subtitle={restorePreview?.fileName ?? ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setRestorePreview(null)}>
              Huỷ
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-1 text-sm" onClick={confirmRestore}>
              Tạo gia phả từ tệp
            </button>
          </div>
        }
      >
        {restorePreview ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-3">
              <p className="pat-serif text-base font-semibold text-[var(--pat-red)]">{restorePreview.tree.name}</p>
              <p className="mt-0.5 text-xs text-[var(--pat-muted)]">
                {restorePreview.tree.members.length} thành viên · {restorePreview.tree.branches.length} chi phái
                {restorePreview.tree.address ? ` · ${restorePreview.tree.address}` : ""}
              </p>
            </div>
            {restorePreview.warnings.length ? (
              <ul className="space-y-1 rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf]/60 px-3 py-2 text-[0.7rem] leading-relaxed text-[#7a5a10]">
                {restorePreview.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-[var(--pat-muted)]">
                <CheckCircle2 size={14} className="text-[#1f6b4a]" /> Tệp hợp lệ và đúng phiên bản mô hình.
              </p>
            )}
            <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/80 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
              Tệp được phục hồi thành một gia phả mới, không ghi đè gia phả đang có. Nếu tên trùng, hệ thống tự thêm hậu
              tố.
            </p>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        wide
        title="Lịch sử nhập"
        subtitle={`${history.length} lần gần nhất · lưu trên thiết bị này`}
        footer={
          history.length ? (
            <button
              type="button"
              className="pat-btn h-10 w-full text-xs"
              onClick={() => {
                setHistory(clearImportHistory());
                setToast({ message: "Đã xoá lịch sử nhập. Gia phả vẫn giữ nguyên." });
              }}
            >
              <Trash2 size={13} /> Xoá lịch sử nhập
            </button>
          ) : undefined
        }
      >
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <History size={28} className="mx-auto text-[var(--pat-gold)]" />
            <p className="pat-serif mt-2 text-base font-semibold text-[var(--pat-red)]">Chưa có lần nhập nào</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[var(--pat-muted)]">
              Mỗi lần nhập Excel/CSV, GEDCOM hoặc sao lưu sẽ được ghi lại kèm báo cáo và bản chụp để quay lại.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-[var(--pat-line)] bg-[#f6e9c8] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#7a5a10]">
                    {entry.tool}
                  </span>
                  <span className="rounded-full border border-[var(--pat-line)] bg-white px-2 py-0.5 text-[0.6rem] font-semibold text-[var(--pat-muted)]">
                    {entry.mode === "update" ? "Cập nhật" : "Tạo mới"}
                  </span>
                  <span className="text-[0.66rem] text-[var(--pat-muted)]">{formatDateTime(entry.at)}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--pat-ink)]">{entry.fileName}</p>
                <p className="text-[0.7rem] text-[var(--pat-muted)]">
                  {entry.treeName} · {entry.rows} dòng · {entry.members} thành viên
                  {entry.warnings.length ? ` · ${entry.warnings.length} cảnh báo` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="pat-btn h-8 px-2.5 text-[0.66rem]"
                    onClick={() => openHistoryReport(entry)}
                  >
                    <ListChecks size={12} /> Báo cáo
                  </button>
                  <button
                    type="button"
                    className="pat-btn h-8 px-2.5 text-[0.66rem]"
                    onClick={() => startRollback(entry)}
                    disabled={entry.mode === "update" && !entry.snapshot}
                  >
                    <RotateCcw size={12} /> Quay lại
                  </button>
                  {entry.snapshot ? (
                    <button
                      type="button"
                      className="pat-btn h-8 px-2.5 text-[0.66rem]"
                      onClick={() => {
                        if (downloadHistorySnapshot(entry)) {
                          setToast({ message: "Đã tải bản chụp trước lần nhập." });
                        }
                      }}
                    >
                      <Download size={12} /> Bản chụp
                    </button>
                  ) : null}
                </div>
                {entry.mode === "update" && !entry.snapshot ? (
                  <p className="mt-1 text-[0.64rem] text-[var(--pat-muted)]">
                    Không có bản chụp (bộ nhớ thiết bị đầy) nên không thể quay lại lần nhập này.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(rollbackTarget)}
        onClose={() => setRollbackTarget(null)}
        title="Quay lại trước lần nhập này?"
        subtitle={rollbackTarget?.fileName ?? ""}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setRollbackTarget(null)}>
              Giữ nguyên
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-1 text-sm" onClick={confirmRollback}>
              Quay lại
            </button>
          </div>
        }
      >
        {rollbackTarget ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">
              {rollbackTarget.mode === "update"
                ? `Gia phả “${rollbackTarget.treeName}” sẽ trở về trạng thái trước khi nhập tệp này.`
                : `Gia phả tạo từ tệp này sẽ được chuyển vào mục Đã xóa và có thể khôi phục.`}
            </p>
            <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/80 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
              Mục lịch sử của lần nhập này sẽ được gỡ sau khi quay lại. Các thay đổi nhập sau đó vẫn giữ nguyên.
            </p>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(report)}
        onClose={() => setReport(null)}
        wide
        title="Báo cáo nhập dữ liệu"
        subtitle={report ? `${report.entry.fileName} · ${formatDateTime(report.entry.at)}` : ""}
        footer={
          report ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="pat-btn h-10 text-xs sm:flex-1" onClick={() => setReport(null)}>
                Đóng
              </button>
              <button
                type="button"
                className="pat-btn h-10 text-xs sm:flex-1"
                onClick={() => downloadImportReport(reportInput(report))}
              >
                <Download size={13} /> Tải báo cáo CSV
              </button>
              <button
                type="button"
                className="pat-btn pat-btn-red h-10 text-xs sm:flex-1"
                onClick={() => {
                  const id = report.entry.treeId;
                  setReport(null);
                  openMemberSearch(id);
                }}
              >
                Mở danh sách thành viên
              </button>
            </div>
          ) : undefined
        }
      >
        {report ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: report.result?.importedCount ?? report.entry.rows, label: "Dòng đọc" },
                {
                  value: report.result
                    ? report.entry.mode === "update"
                      ? report.result.matchedCount
                      : report.result.createdCount
                    : report.entry.members,
                  label: report.entry.mode === "update" ? "Hồ sơ khớp" : "Hồ sơ mới",
                },
                {
                  value: report.result ? report.result.createdCount : 0,
                  label: "Thêm mới",
                },
                {
                  value: (report.result?.rowIssues ?? report.entry.rowIssues).filter(
                    (issue) => issue.severity === "error",
                  ).length,
                  label: "Lỗi dòng",
                },
              ].map((cell) => (
                <div key={cell.label} className="rounded-xl border border-[var(--pat-line)] bg-white/60 px-2 py-2 text-center">
                  <p className="text-base font-bold text-[var(--pat-red)]">{cell.value}</p>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">
                    {cell.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[0.72rem] text-[var(--pat-muted)]">
              {report.entry.tool} · {report.entry.mode === "update" ? "cập nhật" : "tạo mới"} · {report.entry.treeName}
              {report.info?.sheetName ? ` · trang “${report.info.sheetName}”` : ""}
            </p>

            {(report.result?.rowIssues ?? report.entry.rowIssues).length ? (
              <div>
                <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#a3271d]">
                  Lỗi và lưu ý theo dòng
                </p>
                <ul className="pat-scroll max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[#e6b7ad] bg-[#f9e3df]/50 px-3 py-2 text-[0.68rem] leading-relaxed text-[#7a2a22]">
                  {(report.result?.rowIssues ?? report.entry.rowIssues).map((issue, index) => (
                    <li key={`${issue.line}-${index}`} className="flex flex-wrap items-baseline gap-1">
                      <span className="font-semibold">
                        {issue.severity === "error" ? "Lỗi" : "Lưu ý"} · dòng {issue.line}
                      </span>
                      {issue.column ? <span>· {issue.column}</span> : null}
                      {issue.value ? <span>“{issue.value}”</span> : null}
                      <span>— {issue.message}</span>
                      {issue.personName ? (
                        <button
                          type="button"
                          className="font-semibold text-[#a3271d] underline decoration-dotted"
                          onClick={() => {
                            const id = report.entry.treeId;
                            setReport(null);
                            openMemberSearch(id, issue.personName);
                          }}
                        >
                          Tìm hồ sơ
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(report.result?.warnings ?? report.entry.warnings).length ? (
              <div>
                <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#7a5a10]">
                  Cảnh báo theo nhóm
                </p>
                <div className="pat-scroll max-h-52 space-y-2 overflow-y-auto">
                  {groupImportWarnings(report.result?.warnings ?? report.entry.warnings).map((group) => (
                    <div key={group.key} className="rounded-xl border border-[var(--pat-gold)]/50 bg-[#f9edcf]/60 px-3 py-2">
                      <p className="text-[0.68rem] font-bold text-[#7a5a10]">
                        {group.label} · {group.items.length}
                      </p>
                      <ul className="mt-0.5 space-y-0.5 text-[0.66rem] leading-relaxed text-[#7a5a10]">
                        {group.items.map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-[var(--pat-muted)]">
                <CheckCircle2 size={14} className="text-[#1f6b4a]" /> Không có cảnh báo.
              </p>
            )}
            <p className="text-[0.66rem] text-[var(--pat-muted)]">
              Báo cáo vẫn xem lại được trong Lịch sử nhập sau khi đóng.
            </p>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(createdTree)}
        onClose={() => setCreatedTree(null)}
        title="Đã tạo gia phả"
        subtitle={createdTree?.name ?? ""}
        footer={
          <button type="button" className="pat-btn h-10 w-full text-sm" onClick={() => setCreatedTree(null)}>
            Để sau
          </button>
        }
      >
        {createdTree ? (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-[#b9dcc9] bg-[#e2f1e8]/70 px-3 py-3 text-sm text-[#1f6b4a]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Gia phả đã sẵn sàng trên thiết bị này. Thêm thành viên đầu tiên hoặc mở tổng quan để bắt đầu.
              </p>
            </div>
            {(() => {
              const tree = trees.find((item) => item.id === createdTree.id);
              return (
                <>
                  {tree ? (
                    <p className="text-xs text-[var(--pat-muted)]">
                      {tree.members.length} thành viên · {tree.branches.length} chi phái · cập nhật{" "}
                      {formatDate(tree.updatedAt)}
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="pat-btn pat-btn-red h-10 text-sm"
                      onClick={() => {
                        const id = createdTree.id;
                        setCreatedTree(null);
                        router.push(`/gia-pha/${id}/danh-sach-thanh-vien?add=1`);
                      }}
                    >
                      <Plus size={14} /> Thêm thành viên đầu tiên
                    </button>
                    <button
                      type="button"
                      className="pat-btn h-10 text-sm"
                      onClick={() => {
                        const id = createdTree.id;
                        setCreatedTree(null);
                        openTree(id);
                      }}
                    >
                      Mở tổng quan <ArrowRight size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="pat-btn h-10 w-full text-xs"
                    disabled={!tree}
                    onClick={() => {
                      if (!tree) return;
                      exportBackup(tree);
                      setToast({ message: `Đã tải bản sao lưu “${tree.name}”.` });
                    }}
                  >
                    <Download size={13} /> Tải bản sao lưu JSON
                  </button>
                </>
              );
            })()}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title="Tải Excel mẫu"
        subtitle={`${MEMBER_COLUMN_COUNT} cột · bản mẫu ${TEMPLATE_VERSION}`}
        footer={
          <div className="flex gap-2">
            <button type="button" className="pat-btn h-11 flex-1 text-sm" onClick={() => setTemplateOpen(false)}>
              Huỷ
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-1 text-sm" onClick={downloadTemplate}>
              <Download size={14} /> Tải tệp mẫu
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-[var(--pat-muted)]">
            Tệp có trang “Gia phả” {MEMBER_COLUMN_COUNT} cột với bộ lọc ở dòng tiêu đề và trang “Hướng dẫn” từng bước.
          </p>
          <button
            type="button"
            onClick={() => setTemplateTreeId("blank")}
            className={cn(
              "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition",
              templateTreeId === "blank"
                ? "border-[var(--pat-red)] bg-[#f9e3df]/60"
                : "border-[var(--pat-line)] bg-white/60 hover:border-[var(--pat-gold)]",
            )}
          >
            <FileSpreadsheet size={17} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            <span>
              <span className="block text-sm font-semibold text-[var(--pat-ink)]">Mẫu trống</span>
              <span className="block text-[0.7rem] leading-snug text-[var(--pat-muted)]">
                Có 3 dòng ví dụ để đối chiếu cách điền.
              </span>
            </span>
          </button>
          {ownTrees.map((tree) => (
            <button
              key={tree.id}
              type="button"
              onClick={() => setTemplateTreeId(tree.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition",
                templateTreeId === tree.id
                  ? "border-[var(--pat-red)] bg-[#f9e3df]/60"
                  : "border-[var(--pat-line)] bg-white/60 hover:border-[var(--pat-gold)]",
              )}
            >
              <FileText size={17} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--pat-ink)]">{tree.name}</span>
                <span className="block text-[0.7rem] leading-snug text-[var(--pat-muted)]">
                  Kèm {tree.members.length} thành viên hiện tại để đối chiếu trước khi cập nhật.
                </span>
              </span>
            </button>
          ))}
          <p className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            <Info size={13} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            {templateTreeId === "blank"
              ? "Mẫu trống có 3 dòng ví dụ — xoá các dòng này trước khi nhập dữ liệu thật."
              : "Tải mẫu kèm dữ liệu hiện tại, sửa trên tệp rồi nhập lại dưới dạng cập nhật để tránh nhập trùng."}
          </p>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(downloadTree)}
        onClose={() => setDownloadTree(null)}
        title="Tải dữ liệu gia phả"
        subtitle={
          downloadTree ? `${downloadTree.name} · ${downloadTree.members.length} hồ sơ` : ""
        }
      >
        {downloadTree ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-[var(--pat-muted)]">
              Tệp tải trực tiếp về máy, không cần đăng nhập. CSV/Excel/GEDCOM xuất tất cả hồ sơ (kể cả người
              tham khảo hoặc đã ẩn khỏi phả đồ) và chỉ chứa dữ liệu thành viên, quan hệ; JSON là bản sao lưu đầy
              đủ để phục hồi hoặc chuyển máy.
            </p>
            <SheetRow
              icon={<FileSpreadsheet size={18} />}
              title={`CSV · ${MEMBER_COLUMN_COUNT} cột`}
              subtitle="Tất cả hồ sơ · UTF-8 BOM để Excel mở đúng tiếng Việt"
              onClick={() => downloadTreeData(downloadTree, "csv")}
            />
            <SheetRow
              icon={<FileDown size={18} />}
              title={`Excel mẫu ${MEMBER_COLUMN_COUNT} cột kèm dữ liệu`}
              subtitle="Có trang “Gia phả” và “Hướng dẫn”, nhập lại được dưới dạng cập nhật"
              onClick={() => downloadTreeData(downloadTree, "excel")}
            />
            <SheetRow
              icon={<FileText size={18} />}
              title="GEDCOM (.ged)"
              subtitle="Tệp chuẩn 5.5.1 để trao đổi với phần mềm gia phả khác"
              onClick={() => downloadTreeData(downloadTree, "gedcom")}
            />
            <SheetRow
              icon={<ShieldCheck size={18} />}
              title="JSON · sao lưu đầy đủ"
              subtitle="Gồm thiết kế phả đồ, trang trí, vị trí, tài liệu và phả ký"
              onClick={() => downloadTreeData(downloadTree, "json")}
            />
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={backupPickerOpen}
        onClose={() => setBackupPickerOpen(false)}
        title="Sao lưu ngay"
        subtitle="Tải tệp JSON về máy hoặc Google Drive"
      >
        {ownTrees.length === 0 ? (
          <div className="py-6 text-center">
            <ShieldCheck size={26} className="mx-auto text-[var(--pat-gold)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--pat-ink)]">Chưa có gia phả để sao lưu</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[var(--pat-muted)]">
              Tạo gia phả trước, sau đó quay lại đây để tải bản sao lưu.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="rounded-xl border border-[#e3cd92] bg-[#f9edcf]/60 px-3 py-2 text-[0.7rem] leading-relaxed text-[#7a5a10]">
              <ShieldCheck size={13} className="mr-1 inline" />
              Dữ liệu chỉ nằm trong trình duyệt trên thiết bị này. Tải bản sao lưu định kỳ để giữ an toàn khi đổi máy hoặc
              xóa dữ liệu trình duyệt.
            </p>
            {ownTrees.map((tree) => (
              <div
                key={tree.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--pat-ink)]">{tree.name}</p>
                  <p className="text-[0.7rem] text-[var(--pat-muted)]">
                    {tree.members.length} thành viên · cập nhật {formatDate(tree.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="pat-btn h-8 shrink-0 px-2.5 text-[0.68rem]"
                  onClick={() => {
                    exportBackup(tree);
                    setBackupPickerOpen(false);
                    setToast({ message: `Đã tải bản sao lưu “${tree.name}”.` });
                  }}
                >
                  <Download size={12} /> JSON
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setError("");
          setCreateStep(1);
          setAdvancedOpen(false);
        }}
        title={createStep === 1 ? "Lập gia phả · Thông tin dòng họ" : "Lập gia phả · Khởi tổ"}
        subtitle={createStep === 1 ? "Bước 1/2 · thông tin chung" : "Bước 2/2 · vị tổ khai sáng"}
        footer={
          createStep === 1 ? (
            <button type="button" className="pat-btn pat-btn-red h-11 w-full text-sm" onClick={advanceCreate}>
              Tiếp tục <ArrowRight size={15} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="pat-btn h-11 flex-1 text-sm"
                onClick={() => {
                  setError("");
                  setCreateStep(1);
                }}
              >
                <ArrowLeft size={15} /> Quay lại
              </button>
              <button type="button" className="pat-btn pat-btn-red h-11 flex-[1.4] text-sm" onClick={submit}>
                Tạo gia phả
              </button>
            </div>
          )
        }
      >
        {createStep === 1 ? (
          <div className="space-y-3">
            <Field label="Tên gia phả *" hint="Tên hiển thị trên trang chủ và bản in.">
              <input
                className="pat-input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ví dụ: Gia phả dòng họ Phạm"
                autoFocus
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
            <Field label="Người tạo" hint="Họ tên người lập gia phả, có thể bổ sung sau.">
              <input
                className="pat-input"
                value={form.ownerName}
                onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
                placeholder="Họ tên người lập gia phả"
              />
            </Field>
            <Field label="Mô tả dòng họ" hint="Đôi dòng về nguồn gốc, nơi cư trú hoặc truyền thống.">
              <textarea
                className="pat-input min-h-20 resize-y"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Ví dụ: Dòng họ Phạm tại Hà Nội, gốc từ làng…"
              />
            </Field>
            {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
            <p className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
              <Info size={13} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
              Chưa cần nhập thành viên ở bước này. Sau khi tạo, bạn có thể thêm vị tổ, con cháu và chi phái.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Họ tên vị tổ *" hint="Tên thường dùng, hiển thị trên phả đồ.">
              <input
                className="pat-input"
                value={form.founderName}
                onChange={(event) => setForm({ ...form, founderName: event.target.value })}
                placeholder="Họ tên vị tổ đầu tiên"
                autoFocus
              />
            </Field>
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
            <Field label="Tiểu sử vị tổ" hint="Công đức, quê quán, sự nghiệp — phần quan trọng nhất để con cháu nhớ.">
              <textarea
                className="pat-input min-h-24 resize-y"
                value={form.founderBiography}
                onChange={(event) => setForm({ ...form, founderBiography: event.target.value })}
                placeholder="Đôi dòng về thân thế và công đức của vị tổ…"
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

            <button
              type="button"
              onClick={() => setAdvancedOpen((open) => !open)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-left"
            >
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-red)]">
                Thông tin nâng cao · có thể bỏ qua
              </span>
              <ChevronDown
                size={16}
                className={cn("shrink-0 text-[var(--pat-gold)] transition", advancedOpen && "rotate-180")}
              />
            </button>

            {advancedOpen ? (
              <div className="space-y-3">
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
              </div>
            ) : null}

            {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}
            <p className="text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
              Gia phả xưa chép đủ “húy – tự – hiệu – thụy” và chức tước, phẩm hàm để con cháu nhớ cội nguồn. Mục nào chưa
              rõ có thể để trống và bổ sung sau. Không có bước đăng nhập.
            </p>
          </div>
        )}
      </Sheet>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Bắt đầu với gia phả" subtitle="Ba khu vực trên trang chủ">
        <div className="space-y-2">
          <SheetRow
            icon={<BookOpen size={18} />}
            title="Gia phả mẫu"
            subtitle="Xem bản dựng sẵn đủ bậc tiền tổ và các đời để học cách trình bày"
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
                  {deleteTarget.members.length} thành viên · {deleteTarget.branches.length} chi phái · cập nhật{" "}
                  {formatDate(deleteTarget.updatedAt) || "chưa rõ"}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">
              Gia phả sẽ được chuyển vào mục <strong>Đã xóa</strong> trong Lưu trữ. Thành viên, chi phái, phả đồ và phả ký
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
              title="Vẽ phả đồ"
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

      <Sheet
        open={tourOpen && !helpOpen && !createOpen && !manageTree}
        onClose={closeTour}
        title="Bắt đầu trong 3 bước"
        subtitle={`Bước ${tourStep + 1}/3 · ${TOUR_STEPS[tourStep].title}`}
        footer={
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={closeTour} className="text-xs font-semibold text-[var(--pat-muted)]">
              Bỏ qua
            </button>
            {tourStep < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setTourStep((step) => step + 1)}
                className="pat-btn pat-btn-red h-10 px-4 text-sm"
              >
                Tiếp tục
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeTour();
                  selectTab("tao");
                }}
                className="pat-btn pat-btn-red h-10 px-4 text-sm"
              >
                Tạo gia phả
              </button>
            )}
          </div>
        }
      >
        <div className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0] px-4 py-5">
          <p className="text-base font-semibold text-[var(--pat-red)]">{TOUR_STEPS[tourStep].title}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--pat-ink)]">{TOUR_STEPS[tourStep].body}</p>
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {TOUR_STEPS.map((step, index) => (
            <span
              key={step.title}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === tourStep ? "w-6 bg-[var(--pat-red)]" : "w-1.5 bg-[var(--pat-line)]",
              )}
            />
          ))}
        </div>
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
  onDuplicate,
  onDownload,
}: {
  sample?: FamilyTree;
  ready: boolean;
  onOpen: (section: string) => void;
  onRestoreSample: () => void;
  onDuplicate: () => void;
  onDownload: (tree: FamilyTree) => void;
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
            Khôi phục bản mẫu đầy đủ để xem cách ghi chép thành viên, bậc tiền tổ, chi phái và trình bày phả đồ.
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
    {
      icon: Users,
      label: `${stats.total} thành viên`,
      hint: `${stats.generations} đời${stats.ancestorTiers ? ` và ${stats.ancestorTiers} bậc tiền tổ` : ""}, có vợ/chồng và con cái`,
    },
    { icon: GitBranch, label: `${sample.branches.length} chi phái`, hint: "Chi phái tách rõ, có trưởng chi phái" },
    { icon: PenTool, label: "Phả đồ in sẵn", hint: "Khung ngang/dọc, xuất PDF và PNG" },
    { icon: BookOpen, label: "Phả ký mẫu", hint: "Bài viết mẫu về lịch sử dòng họ" },
    { icon: Info, label: "Cách tính đời", hint: "Đời 0 là Khởi Tổ, tiền tổ ở bậc âm" },
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
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#e7ce8b]/20 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#ffe9bd]">
              <Sparkles size={11} /> Bản mẫu
            </span>
          </div>
          <h2 className="pat-serif mt-2 text-2xl font-bold leading-tight text-[#fff7e8]">{sample.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#f0d9bd]">
            <MapPin size={13} /> {sample.address || "Chưa cập nhật địa chỉ"}
          </p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-xl border border-[rgba(231,206,139,0.35)] bg-black/10 py-2.5 text-center">
            {[
              {
                value: `${stats.generations} đời`,
                label: stats.ancestorTiers ? `+${stats.ancestorTiers} bậc tổ` : "Đời 0 · Khởi Tổ",
                title: `Đời 0 là Khởi Tổ${stats.ancestorTiers ? `; ${stats.ancestorTiers} bậc tiền tổ nằm phía trên` : ""}.`,
              },
              { value: stats.total, label: "Thành viên", title: `${stats.total} thành viên` },
              { value: sample.branches.length, label: "Chi phái", title: `${sample.branches.length} chi phái` },
            ].map((cell) => (
              <div key={String(cell.label)} className="px-1" title={cell.title}>
                <p className="text-base font-bold text-[#ffe9bd]">{cell.value}</p>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[#efd7b7]/90">{cell.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#f0d9bd]/90">
            {(sample.description ?? "").split(/(?<=\.)\s/)[0]}
          </p>

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
              onClick={() => onOpen("giao-dien")}
            >
              <PenTool size={14} /> Xem trước bản in mẫu
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--pat-line)] bg-[#fffaf0] px-4 py-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
          <strong className="text-[var(--pat-ink)]">Bản mẫu tách khỏi gia phả của bạn.</strong> Mọi chỉnh sửa chỉ lưu
          trong phiên này; đóng tab sẽ trở về dữ liệu mẫu. Tạo bản sao nếu muốn giữ thay đổi.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={onDuplicate} className="pat-btn pat-btn-outline h-10 px-3 text-xs">
            <History size={14} /> Tạo bản sao từ mẫu
          </button>
          <button
            type="button"
            onClick={() => onDownload(sample)}
            className="pat-btn pat-btn-outline h-10 px-3 text-xs"
          >
            <Download size={14} /> Tải dữ liệu mẫu
          </button>
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
                  <p className="mt-0.5 text-[0.72rem] leading-snug text-[var(--pat-muted)]">{item.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CreateTab({
  importError,
  importBusy,
  historyCount,
  hasTrees,
  onCreate,
  onSpreadsheet,
  onGedcom,
  onTemplate,
  onBackup,
  onBackupNow,
  onHistory,
  onRetry,
  onCancelRead,
}: {
  importError: { message: string; hint?: string; fileName?: string; file?: File } | null;
  importBusy: string;
  historyCount: number;
  hasTrees: boolean;
  onCreate: () => void;
  onSpreadsheet: () => void;
  onGedcom: () => void;
  onTemplate: () => void;
  onBackup: () => void;
  onBackupNow: () => void;
  onHistory: () => void;
  onRetry: () => void;
  onCancelRead: () => void;
}) {
  const createModes = [
    { key: "manual", icon: PenLine, title: "Nhập tay", hint: "Lập gia phả rồi ghi từng thành viên.", onClick: onCreate },
    {
      key: "excel",
      icon: FileSpreadsheet,
      title: "Nhập Excel / CSV",
      hint: "Đưa dữ liệu từ tệp vào cây mới hoặc cây có sẵn.",
      onClick: onSpreadsheet,
    },
    {
      key: "gedcom",
      icon: FileText,
      title: "Nhập GEDCOM",
      hint: "Mở tệp .ged từ phần mềm gia phả khác.",
      onClick: onGedcom,
    },
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
          Chọn cách đưa dữ liệu vào. Có thể bổ sung thành viên, chi phái và phả ký sau.
        </p>
        <button
          type="button"
          onClick={onTemplate}
          className="mt-1.5 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-[var(--pat-red)] underline decoration-dotted underline-offset-2"
        >
          <FileDown size={12} /> Tải Excel mẫu {MEMBER_COLUMN_COUNT} cột · bản {TEMPLATE_VERSION}
        </button>

        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#e3cd92] bg-[#f9edcf]/70 px-3 py-2.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#7a5a10]" />
            <p className="text-[0.7rem] leading-relaxed text-[#7a5a10]">
              <strong>Dữ liệu chỉ lưu trong trình duyệt này.</strong> Hãy sao lưu JSON định kỳ để giữ gia phả khi đổi máy
              hoặc xóa dữ liệu trình duyệt.
            </p>
          </div>
          <button type="button" onClick={onBackupNow} className="pat-btn h-9 shrink-0 px-3 text-xs">
            <Download size={13} /> Sao lưu ngay
          </button>
        </div>

        {importBusy ? (
          <div className="mt-3 rounded-xl border border-[var(--pat-line)] bg-white/70 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--pat-ink)]">{importBusy}</p>
              <button
                type="button"
                onClick={onCancelRead}
                className="text-[0.68rem] font-semibold text-[#a3271d]"
              >
                Huỷ
              </button>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadfc9]">
              <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--pat-red)]" />
            </div>
          </div>
        ) : null}

        {importError ? (
          <div className="mt-3 rounded-xl border border-[#e6b7ad] bg-[#f9e3df] px-3 py-2.5">
            <p className="flex items-start gap-2 text-xs font-semibold leading-snug text-[#a3271d]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{importError.message}</span>
            </p>
            {importError.fileName ? (
              <p className="mt-1 truncate text-[0.68rem] text-[#7a2a22]">Tệp: {importError.fileName}</p>
            ) : null}
            {importError.hint ? (
              <p className="mt-1 text-[0.68rem] leading-relaxed text-[#7a2a22]">{importError.hint}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {importError.file ? (
                <button type="button" onClick={onRetry} className="pat-btn h-8 px-2.5 text-[0.66rem]">
                  <RotateCcw size={12} /> Thử lại
                </button>
              ) : null}
              <button type="button" onClick={onSpreadsheet} className="pat-btn h-8 px-2.5 text-[0.66rem]">
                <FileSpreadsheet size={12} /> Chọn tệp khác
              </button>
              <button type="button" onClick={onTemplate} className="pat-btn h-8 px-2.5 text-[0.66rem]">
                <FileDown size={12} /> Tải tệp mẫu
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-red)]">Tạo mới</p>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          {createModes.map((mode) => {
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
                  <span className="mt-0.5 block text-[0.72rem] leading-snug text-[var(--pat-muted)]">{mode.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--pat-muted)]">Công cụ</p>
        <div className="mt-1 grid gap-0.5">
          <SheetRow
            icon={<FileDown size={17} />}
            title={`Excel mẫu ${MEMBER_COLUMN_COUNT} cột`}
            subtitle={`Bản ${TEMPLATE_VERSION} · mẫu trống hoặc kèm dữ liệu hiện tại`}
            onClick={onTemplate}
          />
          <SheetRow
            icon={<Upload size={17} />}
            title="Phục hồi sao lưu JSON"
            subtitle="Xem lại nội dung tệp trước khi tạo gia phả mới"
            onClick={onBackup}
          />
          <SheetRow
            icon={<History size={17} />}
            title="Lịch sử nhập"
            subtitle={historyCount ? `${historyCount} lần gần nhất · báo cáo & quay lại` : "Chưa có lần nhập nào"}
            onClick={onHistory}
          />
        </div>

        <p className="mt-3 flex items-start gap-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
          <Info size={14} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          Tệp Excel/CSV tối đa {formatBytes(IMPORT_MAX_BYTES)} và {IMPORT_MAX_ROWS.toLocaleString("vi-VN")} dòng; cho chọn
          trang tính, dò dòng tiêu đề và xem trước trước khi nhập. Không cần đăng nhập hay mua xu.
        </p>
        {!hasTrees ? (
          <p className="mt-1 text-[0.66rem] text-[var(--pat-muted)]">
            Chưa có gia phả nào — “Sao lưu ngay” sẽ khả dụng sau khi bạn tạo gia phả đầu tiên.
          </p>
        ) : null}
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
  onDownload,
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
  onDownload: (tree: FamilyTree) => void;
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
              onDownload={onDownload}
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
            <span className="text-[0.68rem] text-[var(--pat-muted)]">Khôi phục bất cứ lúc nào</span>
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
                    <p className="text-[0.72rem] text-[var(--pat-muted)]">
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
  onDownload,
}: {
  tree: FamilyTree;
  onOpen: (id: string, section: string) => void;
  onMore: (tree: FamilyTree) => void;
  onDelete: (tree: FamilyTree) => void;
  onDownload: (tree: FamilyTree) => void;
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
                  {tree.branches.length} chi phái
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

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-[var(--pat-muted)]">
          <span className="inline-flex items-center gap-1">
            <Users size={12} /> {stats.total} người
          </span>
          <span>
            {stats.generations} đời{stats.ancestorTiers ? ` · ${stats.ancestorTiers} bậc tổ` : ""}
          </span>
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
          <button
            type="button"
            className="pat-btn pat-btn-outline h-8 px-2.5 text-[0.66rem]"
            title="Tải dữ liệu CSV, Excel, GEDCOM hoặc JSON"
            aria-label={`Tải dữ liệu ${tree.name}`}
            onClick={() => onDownload(tree)}
          >
            <Download size={12} /> Dữ liệu
          </button>
        </div>
      </div>
    </article>
  );
}
