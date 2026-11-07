"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Info,
  Loader2,
  PencilLine,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TreeShell } from "./app-shell";
import {
  addTreeDocument,
  DOCUMENT_KIND_LABELS,
  formatFileSize,
  listTreeDocuments,
  MAX_DOCUMENT_BYTES,
  readTreeDocumentBlob,
  readTreeDocumentThumb,
  removeTreeDocument,
  updateTreeDocument,
  type DocumentKind,
  type TreeDocument,
} from "./document-store";
import { EmptyState, Field, Sheet } from "./ui";
import type { FamilyTree } from "./types";

const KIND_STYLES: Record<DocumentKind, { icon: typeof File; className: string }> = {
  image: { icon: ImageIcon, className: "bg-[#f3e6cd] text-[#8a6a52]" },
  pdf: { icon: FileText, className: "bg-[#f9e3df] text-[#9c251c]" },
  word: { icon: FileText, className: "bg-[#e6edf9] text-[#2c4c7a]" },
  sheet: { icon: FileSpreadsheet, className: "bg-[#e2f1e8] text-[#1f6b4a]" },
  other: { icon: File, className: "bg-[#f3ece0] text-[#8a6a52]" },
};

const FILTERS: { value: "all" | DocumentKind; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "image", label: "Hình ảnh" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "sheet", label: "Excel" },
  { value: "other", label: "Khác" },
];

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Có lỗi khi xử lý tệp.";
}

function DocumentThumb({ treeId, document }: { treeId: string; document: TreeDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  const style = KIND_STYLES[document.kind];
  const Icon = style.icon;

  useEffect(() => {
    if (document.kind !== "image") return;
    let active = true;
    let objectUrl: string | null = null;
    const load = async () => {
      const blob =
        (await readTreeDocumentThumb(treeId, document.id)) ??
        (await readTreeDocumentBlob(treeId, document.id));
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    };
    load().catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [treeId, document.id, document.kind]);

  if (document.kind === "image" && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={document.title} className="h-full w-full object-cover" />;
  }

  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-1.5", style.className)}>
      <Icon size={34} strokeWidth={1.5} />
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em]">
        {DOCUMENT_KIND_LABELS[document.kind]}
      </span>
    </div>
  );
}

export function DocumentsView({ tree }: { tree: FamilyTree }) {
  const [documents, setDocuments] = useState<TreeDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | DocumentKind>("all");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<TreeDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<TreeDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState("");
  const [deleting, setDeleting] = useState<TreeDocument | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocuments(listTreeDocuments(tree.id));
    setLoaded(true);
  }, [tree.id]);

  useEffect(() => {
    if (!preview) {
      setPreviewUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setPreviewUrl(null);
    readTreeDocumentBlob(tree.id, preview.id)
      .then((blob) => {
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => setError("Không đọc được tệp tư liệu."));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [preview, tree.id]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: documents.length };
    for (const item of documents) result[item.kind] = (result[item.kind] ?? 0) + 1;
    return result;
  }, [documents]);

  const totalSize = useMemo(
    () => documents.reduce((sum, item) => sum + item.size, 0),
    [documents],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (!needle) return true;
      return `${item.title} ${item.fileName} ${item.note ?? ""}`.toLowerCase().includes(needle);
    });
  }, [documents, kind, query]);

  const pickFiles = () => inputRef.current?.click();

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploading) return;
    setError("");
    setUploading({ done: 0, total: files.length });
    const rejected: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const saved = await addTreeDocument(tree.id, file);
        setDocuments((prev) => [saved, ...prev]);
      } catch (uploadError) {
        rejected.push(`${file.name}: ${messageOf(uploadError)}`);
      }
      setUploading({ done: index + 1, total: files.length });
    }
    setUploading(null);
    if (rejected.length) setError(`Không lưu được ${rejected.length} tệp — ${rejected.join(" · ")}`);
  };

  const downloadDocument = async (doc: TreeDocument) => {
    try {
      const blob = await readTreeDocumentBlob(tree.id, doc.id);
      if (!blob) throw new Error("Không tìm thấy tệp trong kho.");
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = doc.fileName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (downloadError) {
      setError(messageOf(downloadError));
    }
  };

  const openEdit = (document: TreeDocument) => {
    setEditing(document);
    setEditTitle(document.title);
    setEditNote(document.note ?? "");
    setEditError("");
  };

  const saveEdit = () => {
    if (!editing) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Tên tư liệu không được để trống.");
      return;
    }
    const ok = updateTreeDocument(tree.id, editing.id, { title, note: editNote.trim() || undefined });
    if (!ok) {
      setEditError("Bộ nhớ trình duyệt đã đầy, chưa lưu được thay đổi.");
      return;
    }
    setDocuments((prev) =>
      prev.map((item) =>
        item.id === editing.id ? { ...item, title, note: editNote.trim() || undefined } : item,
      ),
    );
    if (preview?.id === editing.id) setPreview({ ...preview, title, note: editNote.trim() || undefined });
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    const ok = await removeTreeDocument(tree.id, target.id);
    if (!ok) {
      setError("Bộ nhớ trình duyệt đã đầy, chưa xoá được tư liệu.");
      setDeleting(null);
      return;
    }
    setDocuments((prev) => prev.filter((item) => item.id !== target.id));
    if (preview?.id === target.id) setPreview(null);
    setDeleting(null);
  };

  const drop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) void uploadFiles(files);
  };

  const previewStyle = preview ? KIND_STYLES[preview.kind] : null;
  const PreviewIcon = previewStyle?.icon;
  const activeFilter = FILTERS.find((item) => item.value === kind) ?? FILTERS[0];

  return (
    <TreeShell
      tree={tree}
      section="tu-lieu"
      title="Tư liệu"
      subtitle={`${documents.length} tệp · ${formatFileSize(totalSize)}`}
      actions={
        <button
          type="button"
          onClick={pickFiles}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
          aria-label="Tải tư liệu lên"
        >
          <Upload size={17} />
        </button>
      }
    >
      <div className="space-y-4">
        <section className="pat-card px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3e6cd] text-[var(--pat-red)]">
                <FolderOpen size={20} />
              </span>
              <div className="min-w-0">
                <h2 className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Kho tư liệu dòng họ</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--pat-muted)]">
                  Lưu ảnh bia ký, sắc phong, giấy tờ và bản gia phả cũ để cả dòng họ cùng tra cứu.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[var(--pat-line)] bg-[#fffaf0] px-3 py-1 text-[0.7rem] font-semibold text-[var(--pat-muted)]">
              {documents.length} tư liệu · {formatFileSize(totalSize)}
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={pickFiles}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                pickFiles();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
            className={cn(
              "mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition",
              dragging
                ? "border-[var(--pat-gold)] bg-[#fdf4e0]"
                : "border-[#e0cba6] bg-[#fffaf0] hover:border-[var(--pat-gold)] hover:bg-[#fdf4e0]",
            )}
          >
            {uploading ? (
              <>
                <Loader2 size={26} className="animate-spin text-[var(--pat-red)]" />
                <p className="text-sm font-semibold text-[var(--pat-ink)]">
                  Đang lưu {uploading.done}/{uploading.total} tệp…
                </p>
                <p className="text-[0.7rem] text-[var(--pat-muted)]">Vui lòng giữ trang mở đến khi lưu xong.</p>
              </>
            ) : (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e6cd] text-[var(--pat-red)]">
                  <Upload size={22} />
                </span>
                <p className="text-sm font-semibold text-[var(--pat-ink)]">
                  Kéo thả tư liệu vào đây, hoặc bấm để chọn tệp
                </p>
                <p className="text-[0.7rem] text-[var(--pat-muted)]">
                  Ảnh, PDF, Word, Excel · tối đa {formatFileSize(MAX_DOCUMENT_BYTES)} mỗi tệp
                </p>
                <span className="pat-btn pat-btn-red mt-1 h-10 px-5 text-sm">
                  <Upload size={15} /> Chọn tệp từ máy
                </span>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.odt,.rtf,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.txt"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) void uploadFiles(files);
            }}
          />

          <p className="mt-3 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            <Info size={13} className="mt-0.5 shrink-0" />
            Tư liệu được lưu trong trình duyệt này và không nằm trong tệp sao lưu JSON. Hãy tải từng tệp về máy
            để lưu trữ lâu dài.
          </p>
        </section>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-[#e6b7ad] bg-[#f9e3df] px-3 py-2.5 text-xs text-[#8a1c15]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p className="flex-1 leading-relaxed">{error}</p>
            <button type="button" onClick={() => setError("")} aria-label="Đóng thông báo">
              <X size={14} />
            </button>
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pat-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên, tệp hoặc ghi chú"
                className="pat-input h-10 pl-9 text-sm"
                aria-label="Tìm tư liệu"
              />
            </div>
            <div className="pat-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setKind(item.value)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-[0.72rem] font-semibold transition",
                    kind === item.value
                      ? "border-[var(--pat-red)] bg-[#f9e3df] text-[var(--pat-red)]"
                      : "border-[var(--pat-line)] bg-[#fffaf0] text-[var(--pat-muted)] hover:text-[var(--pat-red)]",
                  )}
                >
                  {item.label}
                  <span className="rounded-full bg-white/70 px-1.5 text-[0.65rem]">{counts[item.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {!loaded ? null : documents.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={40} />}
              title="Chưa có tư liệu nào"
              description="Tải lên ảnh bia ký, sắc phong, giấy tờ hoặc bản gia phả cũ để lưu giữ và chia sẻ trong dòng họ."
              action={
                <button type="button" className="pat-btn pat-btn-red h-10 px-5 text-sm" onClick={pickFiles}>
                  <Upload size={15} /> Tải tư liệu đầu tiên
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={34} />}
              title={`Không có tư liệu ${activeFilter.value === "all" ? "" : `loại “${activeFilter.label}” `}khớp tìm kiếm`}
              description="Thử từ khoá khác hoặc chọn lại bộ lọc."
              action={
                <button
                  type="button"
                  className="pat-btn pat-btn-outline h-10 px-5 text-sm"
                  onClick={() => {
                    setQuery("");
                    setKind("all");
                  }}
                >
                  <X size={15} /> Xoá bộ lọc
                </button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((document) => (
                <article key={document.id} className="pat-card flex flex-col overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreview(document)}
                    className="relative block h-36 w-full overflow-hidden bg-[#f7efe0]"
                    aria-label={`Xem ${document.title}`}
                  >
                    <DocumentThumb treeId={tree.id} document={document} />
                    <span className="absolute left-2 top-2 rounded-full bg-[#3b1d12]/70 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white">
                      {DOCUMENT_KIND_LABELS[document.kind]}
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col gap-1.5 px-3 py-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--pat-ink)]">
                      {document.title}
                    </h3>
                    <p className="truncate text-[0.68rem] text-[var(--pat-muted)]">
                      {document.fileName} · {formatFileSize(document.size)}
                    </p>
                    <p className="text-[0.65rem] text-[var(--pat-muted)]">
                      {new Date(document.addedAt).toLocaleDateString("vi-VN")}
                    </p>
                    {document.note ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-[var(--pat-muted)]">{document.note}</p>
                    ) : null}
                    <div className="mt-auto flex items-center gap-1 pt-2">
                      <button
                        type="button"
                        onClick={() => setPreview(document)}
                        className="pat-btn pat-btn-outline h-8 px-2.5 text-[0.7rem]"
                      >
                        <Eye size={13} /> Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadDocument(document)}
                        className="pat-btn pat-btn-outline h-8 px-2.5 text-[0.7rem]"
                      >
                        <Download size={13} /> Tải
                      </button>
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => openEdit(document)}
                        aria-label={`Sửa ${document.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-muted)] transition hover:bg-[#fdf4e0] hover:text-[var(--pat-red)]"
                      >
                        <PencilLine size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(document)}
                        aria-label={`Xoá ${document.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-muted)] transition hover:bg-[#f9e3df] hover:text-[var(--pat-red)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Sheet
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title ?? "Tư liệu"}
        subtitle={preview ? `${preview.fileName} · ${formatFileSize(preview.size)}` : undefined}
        wide
        footer={
          preview ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[0.7rem] text-[var(--pat-muted)]">
                {DOCUMENT_KIND_LABELS[preview.kind]} · Thêm ngày{" "}
                {new Date(preview.addedAt).toLocaleDateString("vi-VN")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="pat-btn pat-btn-outline h-10 px-4 text-sm"
                  onClick={() => {
                    openEdit(preview);
                    setPreview(null);
                  }}
                >
                  <PencilLine size={15} /> Sửa thông tin
                </button>
                <button
                  type="button"
                  className="pat-btn pat-btn-red h-10 px-4 text-sm"
                  onClick={() => void downloadDocument(preview)}
                >
                  <Download size={15} /> Tải về máy
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {!preview ? null : !previewUrl ? (
          <div className="flex h-56 items-center justify-center gap-2 text-sm text-[var(--pat-muted)]">
            <Loader2 size={18} className="animate-spin" /> Đang tải tư liệu…
          </div>
        ) : preview.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={preview.title}
            className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-xl border border-[var(--pat-line)] object-contain"
          />
        ) : preview.kind === "pdf" ? (
          <iframe
            src={previewUrl}
            title={preview.title}
            className="h-[70dvh] w-full rounded-xl border border-[var(--pat-line)] bg-white"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0] px-5 py-10 text-center">
            <span className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", previewStyle?.className)}>
              {PreviewIcon ? <PreviewIcon size={30} strokeWidth={1.5} /> : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--pat-ink)]">{preview.fileName}</p>
              <p className="mt-1 text-xs text-[var(--pat-muted)]">
                Trình duyệt không xem trước được loại tệp này. Bấm “Tải về máy” để mở bằng ứng dụng phù hợp.
              </p>
            </div>
          </div>
        )}
        {preview?.note ? (
          <p className="mt-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0] px-3 py-2 text-xs leading-relaxed text-[var(--pat-muted)]">
            {preview.note}
          </p>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Sửa thông tin tư liệu"
        subtitle={editing?.fileName}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="pat-btn pat-btn-outline h-10 px-4 text-sm" onClick={() => setEditing(null)}>
              Hủy
            </button>
            <button type="button" className="pat-btn pat-btn-red h-10 px-4 text-sm" onClick={saveEdit}>
              Lưu thay đổi
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Tên tư liệu">
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="pat-input text-sm"
              placeholder="Ví dụ: Sắc phong làng Đông, bản chụp 1952"
            />
          </Field>
          <Field label="Ghi chú" hint="Nguồn tư liệu, người cung cấp, bản dịch hoặc thông tin liên quan.">
            <textarea
              value={editNote}
              onChange={(event) => setEditNote(event.target.value)}
              className="pat-input min-h-24 resize-y text-sm"
              placeholder="Thông tin thêm về tư liệu này…"
            />
          </Field>
          {editError ? (
            <p className="flex items-center gap-1.5 text-xs text-[#8a1c15]">
              <AlertCircle size={14} /> {editError}
            </p>
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Xoá tư liệu?"
        subtitle={deleting?.fileName}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="pat-btn pat-btn-outline h-10 px-4 text-sm" onClick={() => setDeleting(null)}>
              Giữ lại
            </button>
            <button type="button" className="pat-btn pat-btn-red h-10 px-4 text-sm" onClick={() => void confirmDelete()}>
              <Trash2 size={15} /> Xoá tư liệu
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--pat-muted)]">
          Tệp sẽ bị xoá khỏi kho tư liệu trong trình duyệt này và không thể hoàn tác. Nếu chưa lưu bản nào trên
          máy, hãy bấm “Tải” trước khi xoá.
        </p>
      </Sheet>
    </TreeShell>
  );
}
