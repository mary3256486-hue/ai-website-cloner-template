import * as XLSX from "xlsx";
import type { Branch, FamilyTree, Gender, Person } from "./types";
import { DEFAULT_DESIGN } from "./types";
import { uid } from "./utils";

export interface ImportResult {
  tree: FamilyTree;
  warnings: string[];
  memberCount: number;
}

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  "họ tên": "name",
  "họ và tên": "name",
  "tên": "name",
  "họ tên thành viên": "name",
  "giới tính": "gender",
  "danh xưng": "title",
  "thế thứ": "generationNote",
  "tên húy": "tabooName",
  "húy": "tabooName",
  "tên tự": "courtesyName",
  "tự": "courtesyName",
  "tên hiệu": "styleName",
  "hiệu": "styleName",
  "thụy hiệu": "posthumousName",
  "thụy danh": "posthumousName",
  "chức tước": "officeTitle",
  "phẩm hàm": "mandarinRank",
  "khoa bảng": "honors",
  "sinh": "birthDate",
  "ngày sinh": "birthDate",
  "năm sinh": "birthDate",
  "mất": "deathDate",
  "ngày mất": "deathDate",
  "năm mất": "deathDate",
  "còn sống": "alive",
  "cha": "father",
  "họ tên cha": "father",
  "tên cha": "father",
  "mẹ": "mother",
  "họ tên mẹ": "mother",
  "tên mẹ": "mother",
  "vợ/chồng": "spouses",
  "vợ chồng": "spouses",
  "vợ / chồng": "spouses",
  "phối ngẫu": "spouses",
  "nhánh": "branch",
  "chi": "branch",
  "nguyên quán": "hometown",
  "quê quán": "hometown",
  "nghề nghiệp": "occupation",
  "hôn nhân": "maritalStatus",
  "tình trạng hôn nhân": "maritalStatus",
  "ngày giỗ": "deathAnniversary",
  "giỗ": "deathAnniversary",
  "nơi thờ tự": "worshipPlace",
  "nơi an nghỉ": "restingPlace",
  "mộ táng": "graveAddress",
  "điện thoại": "phone",
  "số điện thoại": "phone",
  "địa chỉ": "address",
  "học vấn": "education",
  "tiểu sử": "biography",
};

interface ImportRow {
  name: string;
  gender: string;
  title: string;
  generationNote: string;
  tabooName: string;
  courtesyName: string;
  styleName: string;
  posthumousName: string;
  officeTitle: string;
  mandarinRank: string;
  honors: string;
  birthDate: string;
  deathDate: string;
  alive: string;
  father: string;
  mother: string;
  spouses: string;
  branch: string;
  hometown: string;
  occupation: string;
  maritalStatus: string;
  deathAnniversary: string;
  worshipPlace: string;
  restingPlace: string;
  graveAddress: string;
  phone: string;
  address: string;
  education: string;
  biography: string;
}

export const TEMPLATE_HEADERS = [
  "Họ tên",
  "Giới tính",
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

const TEMPLATE_GUIDE = [
  ["Cách dùng", ""],
  ["1.", "Mỗi dòng là một thành viên; cột “Họ tên” bắt buộc, điền đúng như trong gia phả."],
  ["2.", "Cột Cha, Mẹ, Vợ/chồng ghi đúng họ tên đã có trong cột “Họ tên” của một dòng khác."],
  ["3.", "Nhiều vợ/chồng cách nhau bằng dấu chấm phẩy ;"],
  ["4.", "Không xoá dòng tiêu đề. Có thể xoá các dòng ví dụ ở dưới."],
  ["5.", "Lưu file rồi quay lại ứng dụng, chọn “Nhập file Excel đã điền”."],
];

const TEMPLATE_EXAMPLE: string[][] = [
  [
    "Phạm Quý Công 1",
    "Nam",
    "Thủy tổ",
    "Đích tôn chi trưởng",
    "Phạm Quý Công 1",
    "Trung Phu",
    "Thanh Khê tiên sinh",
    "",
    "",
    "",
    "Nho sinh",
    "1850",
    "1920",
    "Không",
    "",
    "",
    "Trịnh Phu Nhân 1",
    "Chi trưởng",
    "Thổ Khối, Gia Lâm, Bắc Ninh",
    "Nông dân",
    "Đã có gia đình",
    "10/01 âm lịch",
    "Từ đường chính",
    "",
    "",
    "",
    "",
    "",
    "",
    "Khai cơ lập nghiệp tại Thổ Khối.",
  ],
  [
    "Trịnh Phu Nhân 1",
    "Nữ",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "1855",
    "1930",
    "Không",
    "",
    "",
    "Phạm Quý Công 1",
    "",
    "",
    "",
    "Đã có gia đình",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
  [
    "Phạm Quý Công 2",
    "Nam",
    "",
    "Trưởng chi",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "1880",
    "1955",
    "Không",
    "Phạm Quý Công 1",
    "Trịnh Phu Nhân 1",
    "",
    "Chi trưởng",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
];

const BRANCH_COLORS = ["#8a1c15", "#b7791f", "#2f6f5e", "#6b4c9a", "#1f6b7a", "#9a4a1f"];

function normHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function parseGender(raw: string): Gender {
  const value = normHeader(raw);
  if (["nữ", "nu", "female", "f", "0", "đàn bà", "phụ nữ"].includes(value)) return "female";
  return "male";
}

function parseAlive(raw: string, deathDate: string): boolean {
  const value = normHeader(raw);
  if (["không", "khong", "no", "n", "0", "đã mất"].includes(value)) return false;
  if (["có", "co", "yes", "y", "1", "còn sống"].includes(value)) return true;
  return !deathDate;
}

function splitNames(raw: string): string[] {
  return raw
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function downloadExcelTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE]);
  sheet["!cols"] = TEMPLATE_HEADERS.map((header) => ({ wch: Math.max(12, header.length + 6) }));
  const guide = XLSX.utils.aoa_to_sheet(TEMPLATE_GUIDE);
  guide["!cols"] = [{ wch: 6 }, { wch: 90 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Gia phả");
  XLSX.utils.book_append_sheet(workbook, guide, "Hướng dẫn");
  XLSX.writeFile(workbook, "mau-gia-pha.xlsx");
}

export function parseSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Tệp không có trang tính nào.");
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
    if (!rows.length) throw new Error("Trang tính đầu tiên không có dữ liệu.");
    return rows;
  });
}

export function buildTreeFromRows(rows: Record<string, unknown>[], treeName: string): ImportResult {
  const warnings: string[] = [];
  const mapped = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [header, value] of Object.entries(row)) {
      const key = COLUMN_MAP[normHeader(header)];
      if (key && out[key] === undefined) out[key] = text(value);
    }
    return out as unknown as ImportRow;
  });

  const nameIndex = new Map<string, number[]>();
  const personRow = new Map<string, ImportRow>();
  const persons: Person[] = [];
  let skipped = 0;

  mapped.forEach((row) => {
    const key = normName(row.name);
    if (!key) {
      skipped += 1;
      return;
    }
    if (!personRow.has(key)) personRow.set(key, row);
    const person: Person = {
      id: uid("p"),
      name: key,
      gender: parseGender(row.gender),
      birthDate: row.birthDate || undefined,
      deathDate: row.deathDate || undefined,
      alive: parseAlive(row.alive, row.deathDate),
      title: row.title || undefined,
      generationNote: row.generationNote || undefined,
      tabooName: row.tabooName || undefined,
      courtesyName: row.courtesyName || undefined,
      styleName: row.styleName || undefined,
      posthumousName: row.posthumousName || undefined,
      officeTitle: row.officeTitle || undefined,
      mandarinRank: row.mandarinRank || undefined,
      honors: row.honors || undefined,
      birthOrder: persons.length + 1,
      spouseIds: [],
      hometown: row.hometown || undefined,
      occupation: row.occupation || undefined,
      maritalStatus: row.maritalStatus || undefined,
      deathAnniversary: row.deathAnniversary || undefined,
      worshipPlace: row.worshipPlace || undefined,
      restingPlace: row.restingPlace || undefined,
      graveAddress: row.graveAddress || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      education: row.education || undefined,
      biography: row.biography || undefined,
    };
    const list = nameIndex.get(key) ?? [];
    list.push(persons.length);
    nameIndex.set(key, list);
    persons.push(person);
  });

  if (!persons.length) {
    throw new Error("Không tìm thấy dòng nào có cột “Họ tên”. Kiểm tra lại dòng tiêu đề của tệp.");
  }
  if (skipped) warnings.push(`${skipped} dòng bị bỏ qua vì thiếu họ tên.`);

  const ambiguous = [...nameIndex.entries()].filter(([, list]) => list.length > 1).map(([name]) => name);
  if (ambiguous.length) {
    warnings.push(`Tên trùng nhau (${ambiguous.join(", ")}) — quan hệ sẽ nối tới người xuất hiện sớm nhất trong danh sách.`);
  }

  // Dòng trên thường là đời trước, nên ưu tiên khớp người xuất hiện sớm hơn khi trùng tên.
  const findByName = (raw: string): Person | undefined => {
    const list = nameIndex.get(normName(raw));
    if (!list || !list.length) return undefined;
    return persons[list[0]];
  };

  const linkSpouse = (a: Person, b: Person) => {
    if (!a.spouseIds.includes(b.id)) a.spouseIds.push(b.id);
    if (!b.spouseIds.includes(a.id)) b.spouseIds.push(a.id);
  };

  const missingParents: string[] = [];
  const missingSpouses: string[] = [];
  const branchIds = new Map<string, string>();
  const branches: Branch[] = [];

  persons.forEach((person) => {
    const row = personRow.get(normName(person.name));
    if (!row) return;

    if (row.father) {
      const father = findByName(row.father);
      if (father && father.id !== person.id) person.fatherId = father.id;
      else missingParents.push(`${person.name} → cha “${row.father}”`);
    }
    if (row.mother) {
      const mother = findByName(row.mother);
      if (mother && mother.id !== person.id) person.motherId = mother.id;
      else missingParents.push(`${person.name} → mẹ “${row.mother}”`);
    }
    for (const spouseName of splitNames(row.spouses)) {
      const spouse = findByName(spouseName);
      if (spouse && spouse.id !== person.id) linkSpouse(person, spouse);
      else missingSpouses.push(`${person.name} → vợ/chồng “${spouseName}”`);
    }
    if (row.branch) {
      const key = normName(row.branch);
      let branchId = branchIds.get(key);
      if (!branchId) {
        branchId = uid("b");
        branchIds.set(key, branchId);
        branches.push({ id: branchId, name: key, color: BRANCH_COLORS[branches.length % BRANCH_COLORS.length] });
      }
      person.branchId = branchId;
    }
  });

  if (missingParents.length) warnings.push(`Không tìm thấy cha/mẹ: ${missingParents.join("; ")}.`);
  if (missingSpouses.length) warnings.push(`Không tìm thấy vợ/chồng: ${missingSpouses.join("; ")}.`);

  const now = new Date().toISOString();
  const tree: FamilyTree = {
    id: uid("g"),
    name: treeName.trim() || "Gia phả nhập từ Excel",
    createdAt: now,
    updatedAt: now,
    members: persons,
    branches,
    history: "",
    design: { ...DEFAULT_DESIGN },
    positions: {},
    decorations: [],
  };
  return { tree, warnings, memberCount: persons.length };
}

export async function importSpreadsheet(file: File): Promise<ImportResult> {
  const rows = await parseSpreadsheet(file);
  const treeName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return buildTreeFromRows(rows, treeName);
}
