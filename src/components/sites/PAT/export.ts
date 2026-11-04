import type { FamilyTree, Person, PrivacySettings } from "./types";
import {
  CALENDAR_LABELS,
  FAMILY_TREE_SCHEMA_VERSION,
  LIFE_STATUS_LABELS,
  LINK_CONFIDENCE_LABELS,
  normalizeCustomPaper,
  PAPER_MM,
  SPOUSE_RANK_LABELS,
  lifeStatusOf,
} from "./types";
import type { TreeLayout } from "./types";
import { computeLayout } from "./layout";
import { classifyClan, CLAN_ROLE_LABELS } from "./clan";
import {
  applyPrivacyToPerson,
  byId,
  computeGenerations,
  ensurePersonCodes,
  lifeSpan,
  orderedSpouses,
  splitFullName,
} from "./utils";
import { ESSENTIAL_HEADERS, MEMBER_COLUMNS, MEMBER_HEADERS, type MemberColumnKey } from "./columns";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function dateStamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function safeName(name: string) {  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "gia-pha";
}

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export interface MemberExportOptions {
  essentialOnly?: boolean;
  scope?: "all" | "clan";
  /** Chế độ riêng tư áp khi xuất; mặc định lấy theo cài đặt của gia phả. */
  privacy?: PrivacySettings;
}

export function memberRows(
  tree: FamilyTree,
  options: MemberExportOptions = {},
): Record<MemberColumnKey, string | number | undefined>[] {
  const map = byId(tree);
  const gens = computeGenerations(tree.members, tree.founderId);
  const clan = classifyClan(tree.members, tree.founderId);
  // Chế độ riêng tư: ẩn ngày sinh và liên hệ của thành viên còn sống khi xuất.
  const privacy = options.privacy ?? tree.privacy;
  const rankLabel = (person: Person, spouses: Person[]) =>
    spouses
      .map((spouse) => (person.spouseRank?.[spouse.id] ? SPOUSE_RANK_LABELS[person.spouseRank[spouse.id]] : ""))
      .join("; ");

  const values = (source: Person): Record<MemberColumnKey, string | number | undefined> => {
    const m = privacy ? applyPrivacyToPerson(source, privacy) : source;
    const branch = tree.branches.find((b) => b.id === m.branchId)?.name;
    const generation = gens.get(m.id);
    const spouses = orderedSpouses(m, tree.members);
    const nameParts = splitFullName(m.name);
    return {
      code: m.code,
      name: m.name,
      surname: nameParts.surname,
      middleName: nameParts.middle,
      givenName: nameParts.given,
      gender: m.gender === "male" ? "Nam" : "Nữ",
      lifeStatus: LIFE_STATUS_LABELS[lifeStatusOf(m)],
      birthDate: m.birthDate,
      birthCalendar: m.birthCalendar ? CALENDAR_LABELS[m.birthCalendar] : undefined,
      deathDate: m.deathDate,
      deathCalendar: m.deathCalendar ? CALENDAR_LABELS[m.deathCalendar] : undefined,
      alive: m.alive ? "Có" : "Không",
      father: m.fatherId ? map.get(m.fatherId)?.name : undefined,
      mother: m.motherId ? map.get(m.motherId)?.name : undefined,
      spouses: spouses.map((spouse) => spouse.name).join("; "),
      spouseOrder: spouses.map((spouse) => spouse.name).join("; "),
      spouseRank: rankLabel(m, spouses),
      generation: generation !== undefined && generation >= 0 ? generation : undefined,
      scope: CLAN_ROLE_LABELS[clan.roleOf(m.id)],
      ancestorOrder: m.ancestorOrder,
      founder: tree.founderId === m.id ? "Có" : undefined,
      title: m.title,
      generationNote: m.generationNote,
      tabooName: m.tabooName,
      courtesyName: m.courtesyName,
      styleName: m.styleName,
      posthumousName: m.posthumousName,
      officeTitle: m.officeTitle,
      mandarinRank: m.mandarinRank,
      honors: m.honors,
      branch,
      ancestorLink: m.ancestorLinkId ? map.get(m.ancestorLinkId)?.name : undefined,
      ancestorLinkRelation: m.ancestorLinkRelation,
      ancestorLinkGap: m.ancestorLinkGap,
      ancestorLinkConfidence: m.ancestorLinkConfidence
        ? LINK_CONFIDENCE_LABELS[m.ancestorLinkConfidence]
        : undefined,
      ancestorLinkNote: m.ancestorLinkNote,
      nameIsConventional: m.nameIsConventional ? "Có" : "Không",
      nameNote: m.nameNote,
      hometown: m.hometown,
      occupation: m.occupation,
      maritalStatus: m.maritalStatus,
      deathAnniversary: m.deathAnniversary,
      worshipPlace: m.worshipPlace,
      worshipMapUrl: m.worshipMapUrl,
      restingPlace: m.restingPlace,
      graveAddress: m.graveAddress,
      graveMapUrl: m.graveMapUrl,
      phone: m.phone,
      address: m.address,
      education: m.education,
      biography: m.biography,
      notes: m.notes,
    };
  };

  const members =
    options.scope === "clan"
      ? tree.members.filter((member) => clan.clanIds.has(member.id))
      : tree.members;
  return members.map(values);
}

export function exportMembersCsv(tree: FamilyTree, options: MemberExportOptions = {}) {
  const headers = options.essentialOnly ? ESSENTIAL_HEADERS : MEMBER_HEADERS;
  const columns = MEMBER_COLUMNS.filter((column) =>
    options.essentialOnly ? headers.includes(column.header) : true,
  );
  const rows = memberRows(tree, options);
  const lines = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(","));
  const content = `\uFEFF${headers.map(csvCell).join(",")}\n${lines.join("\n")}`;
  const scope = options.scope === "clan" ? "-trong-dong-ho" : "";
  downloadBlob(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
    `${safeName(tree.name)}-thanh-vien${scope}-${dateStamp()}.csv`,
  );
}

export const LAST_BACKUP_KEY = "phatue.lastBackupAt.v1";

/** Ghi nhận thời điểm sao lưu gần nhất để nhắc sao lưu định kỳ. */
export function markBackupExported() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // ignore storage failures
  }
}

export function exportBackup(tree: FamilyTree) {
  const content = JSON.stringify(tree, null, 2);
  downloadBlob(new Blob([content], { type: "application/json;charset=utf-8" }), `${safeName(tree.name)}-backup-${dateStamp()}.json`);
  markBackupExported();
}

/** Tải tất cả gia phả trong một tệp JSON để chuyển máy hoặc cất giữ một lần. */
export function exportAllBackup(trees: FamilyTree[]) {
  const payload = {
    app: "phatue-gia-pha",
    kind: "full-backup",
    exportedAt: new Date().toISOString(),
    count: trees.length,
    trees,
  };
  const content = JSON.stringify(payload, null, 2);
  downloadBlob(new Blob([content], { type: "application/json;charset=utf-8" }), `gia-pha-tat-ca-${dateStamp()}.json`);
  markBackupExported();
}

export interface BackupReadResult {
  tree: FamilyTree;
  warnings: string[];
  fileName: string;
  schemaVersion: number;
}

export interface FullBackupReadResult {
  trees: FamilyTree[];
  warnings: string[];
  fileName: string;
}

/** Tệp sao lưu có thể chứa một gia phả hoặc nhiều gia phả (exportAllBackup). */
export async function readAnyBackup(file: File): Promise<BackupReadResult | FullBackupReadResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error(
      `Tệp “${file.name}” không phải JSON hợp lệ. Hãy chọn đúng tệp sao lưu có đuôi .json đã xuất từ ứng dụng.`,
    );
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    (parsed as { kind?: unknown }).kind === "full-backup" &&
    Array.isArray((parsed as { trees?: unknown }).trees)
  ) {
    const list = (parsed as { trees: unknown[] }).trees;
    const warnings: string[] = [];
    const trees: FamilyTree[] = [];
    for (const [index, item] of list.entries()) {
      if (!item || typeof item !== "object" || !Array.isArray((item as FamilyTree).members)) {
        warnings.push(`Bản ghi ${index + 1} không đúng định dạng gia phả nên bị bỏ qua.`);
        continue;
      }
      const record = item as Partial<FamilyTree>;
      const version = typeof record.schemaVersion === "number" ? record.schemaVersion : 1;
      if (version > FAMILY_TREE_SCHEMA_VERSION) {
        warnings.push(
          `“${record.name ?? `Bản ghi ${index + 1}`}” có schema ${version}, cao hơn phiên bản ứng dụng đang hỗ trợ (${FAMILY_TREE_SCHEMA_VERSION}) nên bị bỏ qua.`,
        );
        continue;
      }
      trees.push({ ...(record as FamilyTree), schemaVersion: version });
    }
    if (!trees.length) {
      throw new Error("Tệp sao lưu tổng không có gia phả nào hợp lệ để phục hồi.");
    }
    return { trees, warnings, fileName: file.name };
  }
  const single = await readBackupShape(parsed, file.name);
  return single;
}

async function readBackupShape(parsed: unknown, fileName: string): Promise<BackupReadResult> {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Tệp sao lưu trống hoặc không đúng định dạng gia phả.");
  }
  const value = parsed as Partial<FamilyTree>;
  if (typeof value.name !== "string" || !value.name.trim() || !Array.isArray(value.members)) {
    throw new Error("Tệp không đúng định dạng gia phả: thiếu tên gia phả hoặc danh sách thành viên.");
  }
  const invalidMember = value.members.find(
    (member) => !member || typeof member !== "object" || typeof member.id !== "string" || typeof member.name !== "string",
  );
  if (invalidMember) {
    throw new Error("Tệp có thành viên thiếu “id” hoặc “họ tên”. Hãy kiểm tra lại bản sao lưu.");
  }

  const warnings: string[] = [];
  const schemaVersion = typeof value.schemaVersion === "number" ? value.schemaVersion : 1;
  if (schemaVersion > FAMILY_TREE_SCHEMA_VERSION) {
    // Chặn rõ ràng tệp từ phiên bản mới hơn thay vì đoán dữ liệu.
    throw new Error(
      `Tệp “${fileName}” được tạo bởi phiên bản mới hơn (schema ${schemaVersion}) trong khi ứng dụng đang hỗ trợ tới schema ${FAMILY_TREE_SCHEMA_VERSION}. Hãy cập nhật ứng dụng rồi mở lại tệp để tránh mất hoặc sai dữ liệu.`,
    );
  } else if (schemaVersion < FAMILY_TREE_SCHEMA_VERSION) {
    warnings.push(
      `Tệp được tạo bởi phiên bản cũ (schema ${schemaVersion}); dữ liệu sẽ được chuẩn hoá sang schema ${FAMILY_TREE_SCHEMA_VERSION} và một bản sao tự động được giữ lại trước khi nâng cấp.`,
    );
  }
  if (!value.members.length) {
    warnings.push("Gia phả trong tệp không có thành viên nào.");
  }
  if (value.founderId && !value.members.some((member) => member.id === value.founderId)) {
    warnings.push("Khởi Tổ ghi trong tệp không còn trong danh sách thành viên; sẽ cần chọn lại sau khi phục hồi.");
  }

  const members = ensurePersonCodes(value.members as Person[]);
  const tree: FamilyTree = {
    ...(value as FamilyTree),
    schemaVersion: FAMILY_TREE_SCHEMA_VERSION,
    members,
    positions: value.positions ?? {},
    decorations: value.decorations ?? [],
    branches: value.branches ?? [],
    documents: value.documents ?? [],
    history: value.history ?? "",
    founderId: value.founderId && members.some((member) => member.id === value.founderId)
      ? value.founderId
      : undefined,
  };
  return { tree, warnings, fileName, schemaVersion };
}

export const AUTO_ROTATE_MIN_MEMBERS = 25;

export function isLargeTree(tree: FamilyTree) {
  return tree.members.length >= AUTO_ROTATE_MIN_MEMBERS;
}

export function resolveOrientation(tree: FamilyTree, layout?: TreeLayout) {
  if (tree.design.autoRotate === false || !isLargeTree(tree)) return tree.design.orientation;
  const dims = layout ?? computeLayout(tree);
  return dims.width > dims.height ? "landscape" : "portrait";
}

export function paperDimensions(tree: FamilyTree, layout?: TreeLayout): { widthMm: number; heightMm: number } {
  const custom = normalizeCustomPaper(tree.design.customPaper);
  if (custom) return { widthMm: custom.widthMm, heightMm: custom.heightMm };
  const [w, h] = PAPER_MM[tree.design.paper];
  return resolveOrientation(tree, layout) === "portrait"
    ? { widthMm: w, heightMm: h }
    : { widthMm: h, heightMm: w };
}

export function paperAspectFor(tree: FamilyTree, layout?: TreeLayout) {
  const { widthMm, heightMm } = paperDimensions(tree, layout);
  return widthMm / heightMm;
}

export function printDiagram(tree: FamilyTree) {
  const { widthMm, heightMm } = paperDimensions(tree);
  const style = document.createElement("style");
  style.id = "pat-print-size";
  style.textContent = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
  document.head.appendChild(style);
  window.print();
  window.setTimeout(() => style.remove(), 1500);
}

const XLINK_NS = "http://www.w3.org/1999/xlink";

function blobToDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh trang trí"));
    reader.readAsDataURL(blob);
  });
}

async function inlineDecorationImages(clone: SVGSVGElement) {
  const nodes = Array.from(clone.querySelectorAll("image"));
  await Promise.all(
    nodes.map(async (node) => {
      const href = node.getAttribute("href") ?? node.getAttributeNS(XLINK_NS, "href") ?? "";
      if (!href || href.startsWith("data:")) return;
      try {
        const response = await fetch(href);
        if (!response.ok) return;
        node.setAttribute("href", await blobToDataUri(await response.blob()));
        node.removeAttributeNS(XLINK_NS, "href");
      } catch {
        // Ảnh ngoài miền bị CORS chặn thì bỏ qua, không làm hỏng cả bản in
      }
    }),
  );
}

export interface DiagramPrintOptions {
  /** true: vừa khổ giấy đã chọn; false: in đúng kích thước thật (mm) ở tỉ lệ 100%. */
  fitToPage?: boolean;
  /** Chuyển bản in sang đen trắng để tiết kiệm mực hoặc in thử. */
  grayscale?: boolean;
  /** Vẽ dấu cắt góc để tiện cắt giấy sau in. */
  cropMarks?: boolean;
  /** Dùng font serif hệ thống (Times New Roman) thay font tải từ mạng — an toàn khi in offline. */
  systemSerif?: boolean;
}

const CROP_MARK_CSS = `
  .crop-mark { position: fixed; width: 14mm; height: 14mm; pointer-events: none; z-index: 9; }
  .crop-mark::before, .crop-mark::after { content: ""; position: absolute; background: #000; }
  .crop-mark::before { width: 100%; height: 0.2mm; }
  .crop-mark::after { width: 0.2mm; height: 100%; }
  .crop-tl { top: 2mm; left: 2mm; }
  .crop-tl::before { top: 0; left: 0; } .crop-tl::after { top: 0; left: 0; }
  .crop-tr { top: 2mm; right: 2mm; }
  .crop-tr::before { top: 0; right: 0; } .crop-tr::after { top: 0; right: 0; }
  .crop-bl { bottom: 2mm; left: 2mm; }
  .crop-bl::before { bottom: 0; left: 0; } .crop-bl::after { bottom: 0; left: 0; }
  .crop-br { bottom: 2mm; right: 2mm; }
  .crop-br::before { bottom: 0; right: 0; } .crop-br::after { bottom: 0; right: 0; }
`;

export async function printSvgDiagram(
  svg: SVGSVGElement,
  tree: FamilyTree,
  options: DiagramPrintOptions = {},
) {
  const { widthMm, heightMm } = paperDimensions(tree);
  const fit = options.fitToPage !== false;
  const win = window.open("", "_blank", "width=1280,height=960");
  if (!win) {
    printDiagram(tree);
    return;
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  await inlineDecorationImages(clone);
  const markup = new XMLSerializer().serializeToString(clone);
  const svgCss = fit
    ? "svg { display: block; width: 100%; height: 100%; }"
    : `svg { display: block; width: ${widthMm}mm; height: ${heightMm}mm; }`;
  const grayscaleCss = options.grayscale ? "svg { filter: grayscale(1) contrast(1.05); }" : "";
  const serifCss = options.systemSerif
    ? "text { font-family: \"Times New Roman\", \"Liberation Serif\", serif !important; }"
    : "";
  const cropHtml = options.cropMarks
    ? `<span class="crop-mark crop-tl"></span><span class="crop-mark crop-tr"></span><span class="crop-mark crop-bl"></span><span class="crop-mark crop-br"></span>`
    : "";
  win.document.open();
  win.document.write(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<title>${safeName(tree.name)} — phả đồ</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; overflow: hidden; }
  ${svgCss}
  ${grayscaleCss}
  ${serifCss}
  ${options.cropMarks ? CROP_MARK_CSS : ""}
  .hint { position: fixed; inset: auto 0 12px 0; text-align: center; font: 12px sans-serif; color: #8a6a52; }
  @media print { .hint { display: none; } }
</style></head>
<body>${markup}${cropHtml}<p class="hint">Hộp thoại in sẽ mở. Để lưu PDF: chọn máy in “Lưu thành PDF”/“Save as PDF”, bỏ tick “Vừa khổ trang” và giữ nguyên khổ ${widthMm}×${heightMm} mm.</p></body></html>`);
  win.document.close();
  win.setTimeout(() => {
    win.focus();
    win.print();
  }, 900);
}

export async function exportDiagramPng(
  svgId: string,
  filename: string,
  background = "#fdf6e7",
  options: { scale?: number; onProgress?: (step: number, label: string) => void } = {},
) {
  const report = options.onProgress ?? (() => {});
  report(0.08, "Đang chuẩn bị phả đồ");
  const source = document.getElementById(svgId);
  if (!source || !(source instanceof SVGSVGElement)) throw new Error("Không tìm thấy phả đồ");
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const width = Number(source.getAttribute("width")) || source.viewBox.baseVal.width || 1600;
  const height = Number(source.getAttribute("height")) || source.viewBox.baseVal.height || 1000;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  report(0.2, "Đang nạp ảnh trang trí");
  await inlineDecorationImages(clone);
  report(0.4, "Đang dựng ảnh");
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Không dựng được ảnh phả đồ"));
    image.src = url;
  });
  const scale = Math.min(4, Math.max(0.5, options.scale ?? 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  report(0.65, `Đang vẽ ${canvas.width} × ${canvas.height} px`);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  report(0.85, "Đang mã hoá PNG");
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Không tạo được tệp PNG");
  downloadBlob(blob, filename);
  report(1, "Đã tạo tệp PNG");
}

export function lifeText(tree: FamilyTree, memberId: string) {
  const person = byId(tree).get(memberId);
  return person ? lifeSpan(person) : "";
}
