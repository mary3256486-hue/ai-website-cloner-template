import type { FamilyTree } from "./types";
import { PAPER_MM } from "./types";
import type { TreeLayout } from "./types";
import { computeLayout } from "./layout";
import { byId, computeGenerations, lifeSpan } from "./utils";

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

export function exportMembersCsv(tree: FamilyTree) {
  const map = byId(tree);
  const gens = computeGenerations(tree.members);
  const header = [
    "Họ tên",
    "Giới tính",
    "Đời",
    "Danh xưng",
    "Thế thứ",
    "Tên húy",
    "Tên tự",
    "Tên hiệu",
    "Thụy hiệu",
    "Chức tước",
    "Phẩm hàm",
    "Khoa bảng",
    "Sinh",
    "Mất",
    "Còn sống",
    "Cha",
    "Mẹ",
    "Vợ/chồng",
    "Nhánh",
    "Nguyên quán",
    "Nghề nghiệp",
    "Hôn nhân",
    "Ngày giỗ",
    "Nơi thờ tự",
    "Nơi an nghỉ",
    "Mộ táng",
    "Điện thoại",
    "Địa chỉ",
    "Học vấn",
    "Tiểu sử",
  ];
  const lines = tree.members.map((m) => {
    const branch = tree.branches.find((b) => b.id === m.branchId)?.name;
    return [
      m.name,
      m.gender === "male" ? "Nam" : "Nữ",
      gens.get(m.id) ?? 1,
      m.title,
      m.generationNote,
      m.tabooName,
      m.courtesyName,
      m.styleName,
      m.posthumousName,
      m.officeTitle,
      m.mandarinRank,
      m.honors,
      m.birthDate,
      m.deathDate,
      m.alive ? "Có" : "Không",
      m.fatherId ? map.get(m.fatherId)?.name : "",
      m.motherId ? map.get(m.motherId)?.name : "",
      m.spouseIds.map((id) => map.get(id)?.name).filter(Boolean).join("; "),
      branch,
      m.hometown,
      m.occupation,
      m.maritalStatus,
      m.deathAnniversary,
      m.worshipPlace,
      m.restingPlace,
      m.graveAddress,
      m.phone,
      m.address,
      m.education,
      m.biography,
    ]
      .map(csvCell)
      .join(",");
  });
  const content = `\uFEFF${header.map(csvCell).join(",")}\n${lines.join("\n")}`;
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
    positions: parsed.positions ?? {},
    decorations: parsed.decorations ?? [],
    branches: parsed.branches ?? [],
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
  const [w, h] = PAPER_MM[tree.design.paper];
  return resolveOrientation(tree, layout) === "portrait"
    ? { widthMm: w, heightMm: h }
    : { widthMm: h, heightMm: w };
}

export function printDiagram(tree: FamilyTree) {
  const { widthMm, heightMm } = paperDimensions(tree);
  const style = document.createElement("style");
  style.id = "phatue-print-size";
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
