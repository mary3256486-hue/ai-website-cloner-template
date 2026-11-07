"use client";

/** Tư liệu dòng họ: metadata trong localStorage, tệp gốc trong IndexedDB. */

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const META_KEY = "phatue.treeDocuments.v1";
const DB_NAME = "phatue-documents";
const STORE_NAME = "files";

export type DocumentKind = "image" | "pdf" | "word" | "sheet" | "other";

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  image: "Hình ảnh",
  pdf: "PDF",
  word: "Word",
  sheet: "Excel",
  other: "Tệp khác",
};

export interface TreeDocument {
  id: string;
  title: string;
  fileName: string;
  mime: string;
  size: number;
  kind: DocumentKind;
  note?: string;
  addedAt: string;
}

type DocumentMetaMap = Record<string, TreeDocument[]>;

export class DocumentStoreError extends Error {}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

function readMeta(): DocumentMetaMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DocumentMetaMap) : {};
  } catch {
    return {};
  }
}

function writeMeta(map: DocumentMetaMap) {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function kindOfFile(file: { name: string; type: string }): DocumentKind {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("word") || mime === "application/msword") return "word";
  if (mime.includes("excel") || mime.includes("spreadsheet") || mime === "application/vnd.ms-excel") return "sheet";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "avif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "word";
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  return "other";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
}

export function listTreeDocuments(treeId: string): TreeDocument[] {
  return [...(readMeta()[treeId] ?? [])].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new DocumentStoreError("Trình duyệt không hỗ trợ lưu tệp."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new DocumentStoreError("Không mở được kho tư liệu trong trình duyệt."));
    });
  }
  return dbPromise;
}

async function putBlob(key: string, blob: Blob) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new DocumentStoreError("Không ghi được tệp."));
  });
}

async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new DocumentStoreError("Không đọc được tệp."));
  });
}

async function deleteKeys(keys: string[]) {
  if (!keys.length) return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const key of keys) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new DocumentStoreError("Không xoá được tệp."));
  });
}

async function deleteByPrefix(prefix: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openKeyCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (String(cursor.key).startsWith(prefix)) store.delete(cursor.key);
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new DocumentStoreError("Không dọn được tệp."));
  });
}

function fileKey(treeId: string, documentId: string) {
  return `${treeId}:${documentId}`;
}

function thumbKey(treeId: string, documentId: string) {
  return `${treeId}:${documentId}:thumb`;
}

async function createThumbnail(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fffdf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch {
    return null;
  }
}

export async function addTreeDocument(treeId: string, file: File): Promise<TreeDocument> {
  if (!file.size) throw new DocumentStoreError("Tệp rỗng, không có nội dung.");
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new DocumentStoreError(`Tệp vượt quá ${formatFileSize(MAX_DOCUMENT_BYTES)}.`);
  }
  const document: TreeDocument = {
    id: uid(),
    title: file.name.replace(/\.[^.]+$/, "").trim() || file.name,
    fileName: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    kind: kindOfFile(file),
    addedAt: new Date().toISOString(),
  };
  const mainKey = fileKey(treeId, document.id);
  const previewKey = thumbKey(treeId, document.id);
  const thumbnail = document.kind === "image" ? await createThumbnail(file) : null;
  await putBlob(mainKey, file);
  if (thumbnail) await putBlob(previewKey, thumbnail).catch(() => undefined);
  const map = readMeta();
  const next = { ...map, [treeId]: [document, ...(map[treeId] ?? [])] };
  if (!writeMeta(next)) {
    await deleteKeys([mainKey, previewKey]).catch(() => undefined);
    throw new DocumentStoreError("Bộ nhớ trình duyệt đã đầy, không lưu được danh mục tư liệu.");
  }
  return document;
}

export function updateTreeDocument(
  treeId: string,
  documentId: string,
  patch: { title?: string; note?: string },
) {
  const map = readMeta();
  const list = map[treeId] ?? [];
  const next = list.map((item) => (item.id === documentId ? { ...item, ...patch } : item));
  return writeMeta({ ...map, [treeId]: next });
}

export async function removeTreeDocument(treeId: string, documentId: string) {
  const map = readMeta();
  const list = map[treeId] ?? [];
  writeMeta({ ...map, [treeId]: list.filter((item) => item.id !== documentId) });
  await deleteKeys([fileKey(treeId, documentId), thumbKey(treeId, documentId)]).catch(() => undefined);
}

export async function deleteTreeDocuments(treeId: string) {
  const map = readMeta();
  if (map[treeId]) {
    const next = { ...map };
    delete next[treeId];
    writeMeta(next);
  }
  await deleteByPrefix(`${treeId}:`).catch(() => undefined);
}

export function readTreeDocumentBlob(treeId: string, documentId: string) {
  return getBlob(fileKey(treeId, documentId));
}

export function readTreeDocumentThumb(treeId: string, documentId: string) {
  return getBlob(thumbKey(treeId, documentId));
}
