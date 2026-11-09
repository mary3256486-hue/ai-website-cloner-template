import type { FamilyTree } from "./types";
import type { ImportRowIssue } from "./import";
import { downloadBlob } from "./native";

export const IMPORT_HISTORY_KEY = "phatue.importHistory.v1";
export const IMPORT_HISTORY_LIMIT = 6;

export type ImportTool = "Excel/CSV" | "GEDCOM" | "JSON";

export interface ImportHistoryEntry {
  id: string;
  at: string;
  fileName: string;
  sheetName?: string;
  headerLine?: number;
  tool: ImportTool;
  mode: "new" | "update";
  treeId: string;
  treeName: string;
  rows: number;
  members: number;
  warnings: string[];
  rowIssues: ImportRowIssue[];
  /** Bản cây trước khi cập nhật, dùng cho “Quay lại trước lần nhập này”. */
  snapshot?: FamilyTree;
  /** Bản cũ không lưu được vì bộ nhớ thiết bị đầy. */
  snapshotSkipped?: boolean;
}

export type NewImportHistoryEntry = Omit<ImportHistoryEntry, "id" | "at"> & { at?: string };

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function readImportHistory(): ImportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IMPORT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ImportHistoryEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as ImportHistoryEntry).id === "string" &&
        typeof (entry as ImportHistoryEntry).treeId === "string" &&
        typeof (entry as ImportHistoryEntry).at === "string",
    );
  } catch {
    return [];
  }
}

function persist(entries: ImportHistoryEntry[]): ImportHistoryEntry[] {
  if (typeof window === "undefined") return entries;
  try {
    window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(entries));
    return entries;
  } catch {
    // Bộ nhớ đầy: bỏ dần bản chụp cũ, vẫn giữ nhật ký tệp/thời gian/số dòng.
    const trimmed = entries.map((entry) => ({ ...entry }));
    for (let index = trimmed.length - 1; index >= 0; index -= 1) {
      if (!trimmed[index].snapshot) continue;
      trimmed[index] = { ...trimmed[index], snapshot: undefined, snapshotSkipped: true };
      try {
        window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(trimmed));
        return trimmed;
      } catch {
        // tiếp tục bỏ bản chụp kế tiếp
      }
    }
    const slim = trimmed.map((entry) => ({
      ...entry,
      snapshot: undefined,
      snapshotSkipped: entry.snapshotSkipped || Boolean(entry.snapshot),
    }));
    try {
      window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(slim));
      return slim;
    } catch {
      return entries;
    }
  }
}

export function addImportHistory(
  entry: NewImportHistoryEntry,
): { entries: ImportHistoryEntry[]; entry: ImportHistoryEntry } {
  const next: ImportHistoryEntry = {
    ...entry,
    id: makeId(),
    at: entry.at ?? new Date().toISOString(),
    warnings: entry.warnings ?? [],
    rowIssues: entry.rowIssues ?? [],
  };
  const list = [next, ...readImportHistory()].slice(0, IMPORT_HISTORY_LIMIT);
  return { entries: persist(list), entry: next };
}

export function removeImportHistory(id: string): ImportHistoryEntry[] {
  return persist(readImportHistory().filter((entry) => entry.id !== id));
}

export function clearImportHistory(): ImportHistoryEntry[] {
  return persist([]);
}

export function downloadHistorySnapshot(entry: ImportHistoryEntry) {
  if (!entry.snapshot) return false;
  const blob = new Blob([JSON.stringify(entry.snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const name = entry.snapshot.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "gia-pha";
  downloadBlob(blob, `${name}-truoc-nhap-${entry.at.slice(0, 10)}.json`);
  return true;
}
