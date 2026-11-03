import type { FamilyTree, Person } from "./types";
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
import { byId, computeGenerations, ensurePersonCodes, lifeSpan, orderedSpouses, splitFullName } from "./utils";
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

export function safeName(name: string) {
  return name
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

export function exportMembersCsv(tree: FamilyTree, options: { essentialOnly?: boolean } = {}) {
  const map = byId(tree);
  const gens = computeGenerations(tree.members, tree.founderId);
  const clan = classifyClan(tree.members, tree.founderId);
  const headers = options.essentialOnly ? ESSENTIAL_HEADERS : MEMBER_HEADERS;
  const columns = MEMBER_COLUMNS.filter((column) =>
    options.essentialOnly ? headers.includes(column.header) : true,
  );
  const rankLabel = (person: Person, spouses: Person[]) =>
    spouses
      .map((spouse) => (person.spouseRank?.[spouse.id] ? SPOUSE_RANK_LABELS[person.spouseRank[spouse.id]] : ""))
      .join("; ");

  const values = (m: Person): Record<MemberColumnKey, string | number | undefined> => {
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

  const lines = tree.members.map((member) => {
    const row = values(member);
    return columns.map((column) => csvCell(row[column.key])).join(",");
  });
  const content = `\uFEFF${headers.map(csvCell).join(",")}\n${lines.join("\n")}`;
  downloadBlob(new Blob([content], { type: "text/csv;charset=utf-8" }), `${safeName(tree.name)}-thanh-vien.csv`);
}

export function exportBackup(tree: FamilyTree) {
  const content = JSON.stringify(tree, null, 2);
  downloadBlob(new Blob([content], { type: "application/json;charset=utf-8" }), `${safeName(tree.name)}-backup.json`);
}

export async function readBackup(file: File): Promise<FamilyTree> {
  const text = await file.text();
  const parsed = JSON.parse(text) as FamilyTree;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.members) || !parsed.name) {
    throw new Error("Tệp không đúng định dạng gia phả");
  }
  return {
    ...parsed,
    schemaVersion: parsed.schemaVersion ?? FAMILY_TREE_SCHEMA_VERSION,
    members: ensurePersonCodes(parsed.members),
    positions: parsed.positions ?? {},
    decorations: parsed.decorations ?? [],
    branches: parsed.branches ?? [],
    documents: parsed.documents ?? [],
    history: parsed.history ?? "",
  };
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

export async function printSvgDiagram(svg: SVGSVGElement, tree: FamilyTree) {
  const { widthMm, heightMm } = paperDimensions(tree);
  const win = window.open("", "_blank", "width=1280,height=960");
  if (!win) {
    printDiagram(tree);
    return;
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  await inlineDecorationImages(clone);
  const markup = new XMLSerializer().serializeToString(clone);
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
  svg { display: block; width: 100%; height: 100%; }
  .hint { position: fixed; inset: auto 0 12px 0; text-align: center; font: 12px sans-serif; color: #8a6a52; }
  @media print { .hint { display: none; } }
</style></head>
<body>${markup}<p class="hint">Hộp thoại in sẽ mở. Chọn “Lưu thành PDF” nếu muốn tệp PDF.</p></body></html>`);
  win.document.close();
  win.setTimeout(() => {
    win.focus();
    win.print();
  }, 900);
}

export async function exportDiagramPng(svgId: string, filename: string, background = "#fdf6e7") {
  const source = document.getElementById(svgId);
  if (!source || !(source instanceof SVGSVGElement)) throw new Error("Không tìm thấy phả đồ");
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const width = Number(source.getAttribute("width")) || source.viewBox.baseVal.width || 1600;
  const height = Number(source.getAttribute("height")) || source.viewBox.baseVal.height || 1000;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  await inlineDecorationImages(clone);
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Không dựng được ảnh phả đồ"));
    image.src = url;
  });
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Không tạo được tệp PNG");
  downloadBlob(blob, filename);
}

export function lifeText(tree: FamilyTree, memberId: string) {
  const person = byId(tree).get(memberId);
  return person ? lifeSpan(person) : "";
}
