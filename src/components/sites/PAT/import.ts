import * as XLSX from "xlsx";
import {
  Branch,
  CalendarKind,
  FamilyTree,
  Gender,
  LifeStatus,
  LinkConfidence,
  Person,
  SpouseRank,
} from "./types";
import { DEFAULT_DESIGN, FAMILY_TREE_SCHEMA_VERSION } from "./types";
import {
  computeGenerations,
  diagnoseGenerations,
  findRelationshipCycles,
  nextPersonCode,
  uid,
} from "./utils";
import {
  columnKeyFor,
  MEMBER_COLUMNS,
  MEMBER_HEADERS,
  normalizeHeader,
  type MemberColumnKey,
} from "./columns";
import { classifyClan, foldOutsideMembers } from "./clan";

export interface ImportResult {
  tree: FamilyTree;
  warnings: string[];
  /** Tổng số thành viên trong cây sau khi nhập. */
  memberCount: number;
  /** Số dòng dữ liệu đọc được từ tệp. */
  importedCount: number;
  matchedCount: number;
  createdCount: number;
  /** Có giá trị khi nhập vào một cây đang có. */
  baseTreeId?: string;
}

export interface ImportOptions {
  /** Cây đích; nếu có thì tệp được hiểu là bản cập nhật, không phải cây mới. */
  baseTree?: FamilyTree;
}

type RowValues = Partial<Record<MemberColumnKey, string>>;

const BRANCH_COLORS = ["#8a1c15", "#b7791f", "#2f6f5e", "#6b4c9a", "#1f6b7a", "#9a4a1f"];

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

/** Giữ nguyên chữ hoa/thường của tên khi ghi vào hồ sơ; chỉ chuẩn hoá khoảng trắng. */
function cleanName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function normCode(value: string): string {
  return value.normalize("NFC").trim().toUpperCase();
}

function parseGender(raw: string): Gender {
  const value = normalizeHeader(raw);
  if (["nữ", "nu", "female", "f", "0", "đàn bà", "phụ nữ"].includes(value)) return "female";
  return "male";
}

function parseNumber(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function parseTruthy(raw: string): boolean {
  return ["có", "co", "yes", "y", "1", "true", "x", "có.", "*"].includes(normalizeHeader(raw));
}

function parseConfidence(raw: string): LinkConfidence | undefined {
  const value = normalizeHeader(raw);
  if (!value) return undefined;
  if (["chắc chắn", "chac chan", "certain"].includes(value)) return "certain";
  if (["có thể", "co the", "probable"].includes(value)) return "probable";
  if (["truyền miệng", "truyen mieng", "oral"].includes(value)) return "oral";
  return "unknown";
}

function parseLifeStatus(raw: string, deathDate: string, legacyAlive: string): { alive: boolean; lifeStatus?: LifeStatus } {
  const value = normalizeHeader(raw);
  const legacy = normalizeHeader(legacyAlive);
  let lifeStatus: LifeStatus | undefined;
  if (["mất tích", "mat tich", "missing"].includes(value)) lifeStatus = "missing";
  else if (["chưa rõ", "chua ro", "không rõ", "khong ro", "unknown", "?"].includes(value)) lifeStatus = "unknown";
  else if (["đã mất", "da mat", "mất", "mat", "chết", "chet", "qua đời", "deceased"].includes(value)) lifeStatus = "deceased";
  else if (["còn sống", "con song", "sống", "song", "alive"].includes(value)) lifeStatus = "alive";
  else if (legacy) {
    const dead = ["không", "khong", "no", "n", "0", "đã mất"].includes(legacy);
    const alive = ["có", "co", "yes", "y", "1", "còn sống"].includes(legacy);
    if (dead) lifeStatus = "deceased";
    else if (alive) lifeStatus = "alive";
  }
  const alive =
    lifeStatus === "alive"
      ? true
      : lifeStatus === "deceased" || lifeStatus === "missing" || lifeStatus === "unknown"
        ? false
        : !deathDate;
  return { alive, lifeStatus };
}

function parseCalendar(raw: string): CalendarKind | undefined {
  const value = normalizeHeader(raw);
  if (!value) return undefined;
  if (["dương", "duong", "dương lịch", "duong lich", "dl", "solar"].includes(value)) return "duong";
  if (["âm", "am", "âm lịch", "am lich", "al", "lunar"].includes(value)) return "am";
  return "unknown";
}

function parseSpouseRank(raw: string): SpouseRank | undefined {
  const value = normalizeHeader(raw);
  if (!value) return undefined;
  if (["chánh thất", "chanh that", "vợ cả", "vo ca", "vợ chính", "vo chinh", "chính thất", "chinh that"].includes(value)) {
    return "chinh";
  }
  if (["kế thất", "ke that", "vợ kế", "vo ke"].includes(value)) return "ke";
  if (["thứ thất", "thu that", "vợ thứ", "vo thu", "thiếp", "thiep"].includes(value)) return "thu";
  if (["khác", "khac"].includes(value)) return "khac";
  return "khac";
}

function splitNames(raw: string): string[] {
  return raw
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitValues(raw: string): string[] {
  return raw
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function valueOf(row: RowValues, key: MemberColumnKey): string {
  return row[key] ?? "";
}

function readRows(rows: Record<string, unknown>[]): { row: RowValues; line: number }[] {
  return rows.map((source, index) => {
    const row: RowValues = {};
    for (const [header, value] of Object.entries(source)) {
      const key = columnKeyFor(header);
      if (!key) continue;
      if (row[key] === undefined || row[key] === "") row[key] = text(value);
    }
    return { row, line: index + 2 };
  });
}

function fullNameOf(row: RowValues): string {
  const direct = valueOf(row, "name");
  if (direct) return direct;
  return [valueOf(row, "surname"), valueOf(row, "middleName"), valueOf(row, "givenName")]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function createPersonFromRow(row: RowValues, seed: Person[]): Person {
  const name = cleanName(fullNameOf(row));
  return {
    id: uid("p"),
    code: normCode(valueOf(row, "code")) || nextPersonCode(seed),
    name,
    gender: parseGender(valueOf(row, "gender")),
    birthDate: valueOf(row, "birthDate") || undefined,
    deathDate: valueOf(row, "deathDate") || undefined,
    ...parseLifeStatus(valueOf(row, "lifeStatus"), valueOf(row, "deathDate"), valueOf(row, "alive")),
    birthCalendar: parseCalendar(valueOf(row, "birthCalendar")),
    deathCalendar: parseCalendar(valueOf(row, "deathCalendar")),
    generation: parseNumber(valueOf(row, "generation")),
    ancestorOrder: Math.max(0, parseNumber(valueOf(row, "ancestorOrder")) ?? 0) || undefined,
    nameIsConventional: parseTruthy(valueOf(row, "nameIsConventional")) || undefined,
    nameNote: valueOf(row, "nameNote") || undefined,
    title: valueOf(row, "title") || undefined,
    generationNote: valueOf(row, "generationNote") || undefined,
    tabooName: valueOf(row, "tabooName") || undefined,
    courtesyName: valueOf(row, "courtesyName") || undefined,
    styleName: valueOf(row, "styleName") || undefined,
    posthumousName: valueOf(row, "posthumousName") || undefined,
    officeTitle: valueOf(row, "officeTitle") || undefined,
    mandarinRank: valueOf(row, "mandarinRank") || undefined,
    honors: valueOf(row, "honors") || undefined,
    birthOrder: seed.length + 1,
    spouseIds: [],
    hometown: valueOf(row, "hometown") || undefined,
    occupation: valueOf(row, "occupation") || undefined,
    maritalStatus: valueOf(row, "maritalStatus") || undefined,
    deathAnniversary: valueOf(row, "deathAnniversary") || undefined,
    worshipPlace: valueOf(row, "worshipPlace") || undefined,
    worshipMapUrl: valueOf(row, "worshipMapUrl") || undefined,
    restingPlace: valueOf(row, "restingPlace") || undefined,
    graveAddress: valueOf(row, "graveAddress") || undefined,
    graveMapUrl: valueOf(row, "graveMapUrl") || undefined,
    phone: valueOf(row, "phone") || undefined,
    address: valueOf(row, "address") || undefined,
    education: valueOf(row, "education") || undefined,
    biography: valueOf(row, "biography") || undefined,
    notes: valueOf(row, "notes") || undefined,
  };
}

/** Cập nhật các ô có dữ liệu; ô trống giữ nguyên giá trị cũ để nhập bổ sung an toàn. */
function applyRowToPerson(person: Person, row: RowValues, usedCodes: Set<string>) {
  const name = cleanName(fullNameOf(row));
  if (name) person.name = name;
  const rawGender = valueOf(row, "gender");
  if (rawGender) person.gender = parseGender(rawGender);

  const rawLife = valueOf(row, "lifeStatus");
  const rawAlive = valueOf(row, "alive");
  const rawDeath = valueOf(row, "deathDate");
  if (rawLife || rawAlive || rawDeath) {
    const status = parseLifeStatus(rawLife, rawDeath || person.deathDate || "", rawAlive);
    person.alive = status.alive;
    person.lifeStatus = status.lifeStatus;
  }

  const assign = (key: MemberColumnKey, field: keyof Person) => {
    const value = valueOf(row, key);
    if (value) (person as unknown as Record<string, unknown>)[field] = value;
  };
  assign("birthDate", "birthDate");
  assign("deathDate", "deathDate");
  assign("title", "title");
  assign("generationNote", "generationNote");
  assign("tabooName", "tabooName");
  assign("courtesyName", "courtesyName");
  assign("styleName", "styleName");
  assign("posthumousName", "posthumousName");
  assign("officeTitle", "officeTitle");
  assign("mandarinRank", "mandarinRank");
  assign("honors", "honors");
  assign("nameNote", "nameNote");
  assign("hometown", "hometown");
  assign("occupation", "occupation");
  assign("maritalStatus", "maritalStatus");
  assign("deathAnniversary", "deathAnniversary");
  assign("worshipPlace", "worshipPlace");
  assign("worshipMapUrl", "worshipMapUrl");
  assign("restingPlace", "restingPlace");
  assign("graveAddress", "graveAddress");
  assign("graveMapUrl", "graveMapUrl");
  assign("phone", "phone");
  assign("address", "address");
  assign("education", "education");
  assign("biography", "biography");
  assign("notes", "notes");

  const birthCalendar = parseCalendar(valueOf(row, "birthCalendar"));
  if (birthCalendar) person.birthCalendar = birthCalendar;
  const deathCalendar = parseCalendar(valueOf(row, "deathCalendar"));
  if (deathCalendar) person.deathCalendar = deathCalendar;
  const nameConventional = valueOf(row, "nameIsConventional");
  if (nameConventional) person.nameIsConventional = parseTruthy(nameConventional) || undefined;

  const generation = parseNumber(valueOf(row, "generation"));
  if (generation !== undefined) person.generation = generation;
  const ancestorOrder = parseNumber(valueOf(row, "ancestorOrder"));
  if (ancestorOrder !== undefined && ancestorOrder > 0) person.ancestorOrder = ancestorOrder;

  const code = normCode(valueOf(row, "code"));
  if (code && (code === person.code || !usedCodes.has(code))) {
    person.code = code;
    usedCodes.add(code);
  }
}

function exampleRow(values: Partial<Record<MemberColumnKey, string>>): string[] {
  return MEMBER_COLUMNS.map((column) => values[column.key] ?? "");
}

const TEMPLATE_GUIDE: string[][] = [
  ["Cách dùng", ""],
  ["1.", "Mỗi dòng là một thành viên. Cột “Mã” là khóa ổn định (P0001, P0002…): giữ nguyên khi cập nhật, có thể để trống khi tạo mới."],
  ["2.", "Cột “Họ tên” bắt buộc. Có thể tách thành Họ / Đệm / Tên; nếu điền cả hai, ứng dụng đối chiếu và cảnh báo khi khác nhau."],
  ["3.", "Cột Cha, Mẹ, Vợ/chồng ghi Mã hoặc họ tên. Ưu tiên ghi Mã để không nhầm khi trùng tên."],
  ["4.", "Cột “Đời”: 0 là Khởi Tổ; các đời sau là 1, 2, 3… Để trống để tự tính từ cha/mẹ hoặc liên kết tiền tổ."],
  ["5.", "Cột “Bậc tiền tổ” chỉ dùng cho các cụ ở trên Khởi Tổ: 1 = xa nhất, tăng dần về phía Khởi Tổ."],
  ["6.", "Cột “Tình trạng”: Còn sống / Đã mất / Mất tích / Chưa rõ. Cột “Còn sống” kiểu cũ vẫn được đọc."],
  ["7.", "Cột Sinh, Mất nhận năm hoặc ngày. Cột “Lịch sinh”, “Lịch mất” ghi Dương lịch hoặc Âm lịch."],
  ["8.", "Cột “Khởi Tổ”: đánh dấu Có cho đúng một người của dòng họ đang soạn. Tổ các chi khác để trống và ghi tên chi vào cột “Chi phái”."],
  ["9.", "Nhiều vợ/chồng cách nhau bằng dấu chấm phẩy ;. “Thứ tự vợ/chồng” ghi lại danh sách theo thứ tự hiển thị; “Vai vế” ghi Chánh thất / Kế thất / Thứ thất / Khác tương ứng."],
  ["10.", "Cột “Liên kết tiền tổ”, “Quan hệ liên kết tiền tổ”, “Cách mấy bậc”, “Độ tin cậy liên kết” chỉ dùng giữa các bậc trên Khởi Tổ khi thiếu thông tin nối đời; để trống nếu không cần."],
  ["11.", "Cột “Bản đồ mộ”, “Bản đồ nơi thờ” dán liên kết Google Maps. Chỉ hai mục này có bản đồ; địa chỉ liên hệ không tự mở bản đồ."],
  ["12.", "Cha mẹ của dâu/rể chỉ là thông tin tham khảo: nhập thành người riêng và đánh dấu phạm vi “Tham khảo”. Hồ sơ tham khảo không hiện trên phả đồ và không tham gia tính đời."],
  ["13.", "Con của con gái thuộc dòng họ bên chồng: chỉ nhập một đời con (con gái đời n, con ở đời n+1). Người từ đời n+2 trở đi cùng vợ/chồng của họ không hiển thị trên trang; khi nhập, thông tin được ẩn khỏi danh sách và chuyển vào ghi chú của người thân gần nhất."],
  ["14.", "Lưu file rồi quay lại ứng dụng, chọn “Nhập file Excel đã điền”. Có thể tạo cây mới hoặc cập nhật cây hiện có; nhập cập nhật không tự xóa người vắng mặt."],
];

const TEMPLATE_EXAMPLE: string[][] = [
  exampleRow({
    code: "P0001",
    name: "Phạm Quý Công",
    gender: "Nam",
    lifeStatus: "Đã mất",
    birthDate: "1850",
    birthCalendar: "Âm lịch",
    deathDate: "1920",
    deathCalendar: "Âm lịch",
    founder: "Có",
    title: "Thủy tổ",
    generationNote: "Đích tôn chi trưởng",
    tabooName: "Phạm Quý Công",
    courtesyName: "Trung Phu",
    styleName: "Thanh Khê tiên sinh",
    honors: "Nho sinh",
    generation: "0",
    spouses: "Trịnh Thị Lan",
    spouseOrder: "Trịnh Thị Lan",
    spouseRank: "Chánh thất",
    branch: "Chi trưởng",
    hometown: "Hà Nội",
    occupation: "Nông dân",
    maritalStatus: "Đã có gia đình",
    deathAnniversary: "10/01 âm lịch",
    worshipPlace: "Từ đường chính",
    notes: "Khai cơ lập nghiệp tại Hà Nội.",
  }),
  exampleRow({
    code: "P0002",
    name: "Trịnh Thị Lan",
    gender: "Nữ",
    lifeStatus: "Đã mất",
    birthDate: "1855",
    birthCalendar: "Âm lịch",
    deathDate: "1930",
    deathCalendar: "Âm lịch",
    spouses: "Phạm Quý Công",
    spouseOrder: "Phạm Quý Công",
    spouseRank: "Chánh thất",
    maritalStatus: "Đã có gia đình",
  }),
  exampleRow({
    code: "P0003",
    name: "Phạm Văn Đức",
    gender: "Nam",
    lifeStatus: "Đã mất",
    birthDate: "1880",
    deathDate: "1955",
    father: "P0001",
    mother: "P0002",
    generation: "1",
    generationNote: "Trưởng chi",
    branch: "Chi trưởng",
  }),
];

export function downloadExcelTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([MEMBER_HEADERS, ...TEMPLATE_EXAMPLE]);
  sheet["!cols"] = MEMBER_COLUMNS.map((column) => ({
    wch: Math.max(12, column.header.length + 6),
  }));
  const guide = XLSX.utils.aoa_to_sheet(TEMPLATE_GUIDE);
  guide["!cols"] = [{ wch: 6 }, { wch: 110 }];
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

interface Index {
  code: Map<string, Person>;
  name: Map<string, Person[]>;
}

function buildIndex(persons: Person[]): Index {
  const code = new Map<string, Person>();
  const name = new Map<string, Person[]>();
  for (const person of persons) {
    if (person.code) code.set(normCode(person.code), person);
    const key = normName(person.name);
    const list = name.get(key) ?? [];
    list.push(person);
    name.set(key, list);
  }
  return { code, name };
}

/** Cập nhật lại chỉ mục sau khi tên hoặc Mã của một người thay đổi. */
function reindexPerson(index: Index, person: Person, oldName: string, oldCode: string) {
  const newName = normName(person.name);
  if (oldName && oldName !== newName) {
    const list = index.name.get(oldName);
    if (list) {
      const next = list.filter((entry) => entry.id !== person.id);
      if (next.length) index.name.set(oldName, next);
      else index.name.delete(oldName);
    }
  }
  const nameList = index.name.get(newName) ?? [];
  if (!nameList.some((entry) => entry.id === person.id)) nameList.push(person);
  index.name.set(newName, nameList);

  if (oldCode) index.code.delete(oldCode);
  if (person.code) index.code.set(normCode(person.code), person);
}

function findPerson(raw: string, index: Index): { person?: Person; ambiguous?: boolean } {
  const value = raw.trim();
  if (!value) return {};
  const byCode = index.code.get(normCode(value));
  if (byCode) return { person: byCode };
  const list = index.name.get(normName(value));
  if (!list?.length) return {};
  return { person: list[0], ambiguous: list.length > 1 };
}

function restoreOrder(listed: string[], orderRaw: string): string[] {
  const names = [...listed];
  const order = splitValues(orderRaw);
  if (!order.length) return names;
  if (order.every((entry) => /^\d+$/.test(entry))) {
    const picked = order
      .map((entry) => names[Number(entry) - 1])
      .filter((entry): entry is string => Boolean(entry));
    const rest = names.filter((entry) => !picked.includes(entry));
    return [...picked, ...rest];
  }
  const ordered = splitValues(orderRaw);
  const rest = names.filter((entry) => !ordered.some((value) => normCode(value) === normCode(entry)));
  return [...ordered, ...rest];
}

function rankForIndex(raw: string, index: number, count: number): SpouseRank | undefined {
  const values = splitValues(raw);
  if (!values.length) return undefined;
  const value = values.length === count ? values[index] : index === 0 ? values[0] : undefined;
  return value ? parseSpouseRank(value) : undefined;
}

export function buildTreeFromRows(
  rows: Record<string, unknown>[],
  treeName: string,
  options: ImportOptions = {},
): ImportResult {
  const base = options.baseTree;
  const warnings: string[] = [];
  const parsed = readRows(rows);
  const persons: Person[] = base
    ? base.members.map((person) => ({
        ...person,
        spouseIds: [...person.spouseIds],
        spouseOrder: person.spouseOrder ? [...person.spouseOrder] : undefined,
        spouseRank: person.spouseRank ? { ...person.spouseRank } : undefined,
      }))
    : [];
  const usedCodes = new Set(persons.map((person) => person.code).filter((code): code is string => Boolean(code)));
  const index = buildIndex(persons);

  let skipped = 0;
  let matchedCount = 0;
  let createdCount = 0;
  const unmatchedCodes: string[] = [];
  const rowTargets: { row: RowValues; person: Person; line: number }[] = [];

  for (const { row, line } of parsed) {
    const name = normName(fullNameOf(row));
    if (!name) {
      skipped += 1;
      continue;
    }
    const code = normCode(valueOf(row, "code"));
    // Chỉ ghép vào người đã có khi nhập cập nhật; tạo cây mới thì mỗi dòng là một người mới.
    let target = base && code ? index.code.get(code) : undefined;
    if (base && !target) {
      const byName = index.name.get(name);
      if (byName?.length === 1) target = byName[0];
      else if (byName?.length && byName.length > 1) {
        target = byName[0];
        warnings.push(
          `Dòng ${line}: tên “${row.name ?? name}” trùng ${byName.length} người; đã ghép người đầu tiên. Hãy điền cột Mã để chắc chắn.`,
        );
      }
    }
    if (code && !index.code.has(code) && base) {
      unmatchedCodes.push(`dòng ${line} (${code})`);
    }

    let person: Person;
    if (target) {
      matchedCount += 1;
      person = target;
      const oldName = normName(person.name);
      const oldCode = person.code ? normCode(person.code) : "";
      applyRowToPerson(person, row, usedCodes);
      reindexPerson(index, person, oldName, oldCode);
    } else {
      createdCount += 1;
      const requestedCode = normCode(valueOf(row, "code"));
      person = createPersonFromRow(row, persons);
      if (person.code && usedCodes.has(person.code)) {
        if (requestedCode) {
          warnings.push(`Dòng ${line}: Mã “${requestedCode}” đã có người dùng; đã cấp Mã mới ${nextPersonCode(persons)}.`);
        }
        person.code = nextPersonCode(persons);
      }
      if (person.code) usedCodes.add(person.code);
      persons.push(person);
      const key = normName(person.name);
      const list = index.name.get(key) ?? [];
      list.push(person);
      index.name.set(key, list);
      if (person.code) index.code.set(normCode(person.code), person);
    }
    rowTargets.push({ row, person, line });
  }

  if (!parsed.length) {
    throw new Error("Tệp không có dòng dữ liệu nào.");
  }
  if (!persons.length) {
    throw new Error("Không tìm thấy dòng nào có cột “Họ tên”. Kiểm tra lại dòng tiêu đề của tệp.");
  }
  if (skipped) warnings.push(`${skipped} dòng bị bỏ qua vì thiếu họ tên.`);
  if (unmatchedCodes.length) {
    warnings.push(
      `Mã chưa có trong gia phả hiện tại: ${unmatchedCodes.join("; ")}. Các dòng này được ghép theo tên hoặc thêm mới.`,
    );
  }

  const importedNames = new Set(rowTargets.map((target) => normName(target.person.name)));
  const ambiguous = [...index.name.entries()]
    .filter(([key, list]) => list.length > 1 && importedNames.has(key))
    .map(([, list]) => list[0].name);
  if (ambiguous.length) {
    warnings.push(
      `Tên trùng nhau (${ambiguous.join(", ")}) — nên dùng cột Mã khi nối cha/mẹ/vợ/chồng để tránh nhầm.`,
    );
  }

  const missingParents: string[] = [];
  const missingSpouses: string[] = [];
  const missingAncestorLinks: string[] = [];
  const founderFlags: Person[] = [];
  const branchIds = new Map<string, string>();
  const branches: Branch[] = (base?.branches ?? []).map((branch) => ({ ...branch }));
  for (const branch of branches) branchIds.set(normName(branch.name), branch.id);

  const ensureBranch = (name: string): string => {
    const key = normName(name);
    const existing = branchIds.get(key);
    if (existing) return existing;
    const branchId = uid("b");
    branchIds.set(key, branchId);
    branches.push({
      id: branchId,
      name: name.trim(),
      color: BRANCH_COLORS[branches.length % BRANCH_COLORS.length],
    });
    return branchId;
  };

  for (const { row, person } of rowTargets) {
    const father = valueOf(row, "father");
    if (father) {
      const found = findPerson(father, index);
      if (found.person && found.person.id !== person.id) person.fatherId = found.person.id;
      else if (!found.person) missingParents.push(`${person.name} → cha “${father}”`);
    }
    const mother = valueOf(row, "mother");
    if (mother) {
      const found = findPerson(mother, index);
      if (found.person && found.person.id !== person.id) person.motherId = found.person.id;
      else if (!found.person) missingParents.push(`${person.name} → mẹ “${mother}”`);
    }

    const spouseNames = splitNames(valueOf(row, "spouses"));
    const orderRaw = valueOf(row, "spouseOrder");
    if (spouseNames.length || orderRaw) {
      const ordered = restoreOrder(spouseNames.length ? spouseNames : splitNames(orderRaw), orderRaw);
      const resolved: Person[] = [];
      for (const spouseName of ordered) {
        const found = findPerson(spouseName, index);
        if (!found.person || found.person.id === person.id) {
          if (!found.person) missingSpouses.push(`${person.name} → vợ/chồng “${spouseName}”`);
          continue;
        }
        if (!resolved.some((spouse) => spouse.id === found.person!.id)) resolved.push(found.person);
      }
      if (resolved.length) {
        const extras = person.spouseIds
          .filter((id) => !resolved.some((spouse) => spouse.id === id))
          .map((id) => persons.find((candidate) => candidate.id === id))
          .filter((candidate): candidate is Person => Boolean(candidate));
        const nextSpouses = [...resolved, ...extras];
        person.spouseIds = nextSpouses.map((spouse) => spouse.id);
        const rankRaw = valueOf(row, "spouseRank");
        const ranks: Record<string, SpouseRank> = { ...(person.spouseRank ?? {}) };
        resolved.forEach((spouse, position) => {
          const rank = rankForIndex(rankRaw, position, resolved.length);
          if (rank) ranks[spouse.id] = rank;
        });
        if (Object.keys(ranks).length) person.spouseRank = ranks;
        person.spouseOrder = nextSpouses.map((spouse) => spouse.id);
        for (const spouse of resolved) {
          if (!spouse.spouseIds.includes(person.id)) spouse.spouseIds.push(person.id);
          if (!spouse.spouseOrder?.includes(person.id)) {
            spouse.spouseOrder = [...(spouse.spouseOrder ?? spouse.spouseIds), person.id];
          }
        }
      }
    }

    const branchName = valueOf(row, "branch");
    if (branchName) person.branchId = ensureBranch(branchName);

    const scope = normName(valueOf(row, "scope"));
    if (scope === "tham khảo" || scope === "reference") person.reference = true;

    const ancestorLink = valueOf(row, "ancestorLink");
    if (ancestorLink) {
      const found = findPerson(ancestorLink, index);
      if (!found.person || found.person.id === person.id) {
        if (!found.person) missingAncestorLinks.push(`${person.name} → liên kết tiền tổ “${ancestorLink}”`);
      } else {
        person.ancestorLinkId = found.person.id;
        person.ancestorLinkGap = Math.max(1, parseNumber(valueOf(row, "ancestorLinkGap")) ?? 1);
        person.ancestorLinkRelation =
          valueOf(row, "ancestorLinkRelation") || person.ancestorLinkRelation;
        person.ancestorLinkConfidence =
          parseConfidence(valueOf(row, "ancestorLinkConfidence")) ?? person.ancestorLinkConfidence;
        person.ancestorLinkNote = valueOf(row, "ancestorLinkNote") || person.ancestorLinkNote;
      }
    }

    if (parseTruthy(valueOf(row, "founder"))) founderFlags.push(person);
  }

  if (missingParents.length) warnings.push(`Không tìm thấy cha/mẹ: ${missingParents.join("; ")}.`);
  if (missingSpouses.length) warnings.push(`Không tìm thấy vợ/chồng: ${missingSpouses.join("; ")}.`);
  if (missingAncestorLinks.length) {
    warnings.push(`Không tìm thấy người để nối liên kết tiền tổ: ${missingAncestorLinks.join("; ")}.`);
  }

  let founderId = base?.founderId;
  if (founderFlags.length > 1) {
    founderId = founderFlags[0].id;
    warnings.push(
      `Có ${founderFlags.length} người được đánh dấu Khởi Tổ (${founderFlags.map((person) => person.name).join(", ")}). Chỉ giữ ${founderFlags[0].name} làm Khởi Tổ; các vị còn lại nên nối bằng liên kết tiền tổ.`,
    );
  } else if (founderFlags.length === 1) {
    founderId = founderFlags[0].id;
  } else if (!founderId) {
    const clan = classifyClan(persons);
    const gens = computeGenerations(persons, clan.founderId);
    const roots = persons.filter(
      (person) => clan.clanIds.has(person.id) && gens.get(person.id) === 0,
    );
    if (roots.length === 1) {
      founderId = roots[0].id;
      warnings.push(`Chưa đánh dấu Khởi Tổ; tạm chọn ${roots[0].name} vì đây là người duy nhất ở Đời 0.`);
    } else if (roots.length > 1) {
      warnings.push(
        `Có ${roots.length} người ở Đời 0 nhưng chưa đánh dấu Khởi Tổ. Hãy chọn Khởi Tổ trong phần cài đặt gia phả; các vị còn lại nên nối bằng liên kết tiền tổ.`,
      );
    }
  }

  const fold = foldOutsideMembers(persons, founderId);
  const keptPersons = fold.members;
  if (founderId && fold.removedIds.has(founderId)) founderId = undefined;
  if (fold.folded.length) {
    const names = fold.folded.slice(0, 3).map((item) => item.person.name).join(", ");
    warnings.push(
      `${fold.folded.length} hồ sơ ngoài phả đồ đã được ẩn khỏi trang và chuyển thông tin vào ghi chú của thân nhân gần nhất (${names}${fold.folded.length > 3 ? "…" : ""}).`,
    );
  }
  if (fold.orphans.length) {
    const names = fold.orphans.slice(0, 3).map((person) => person.name).join(", ");
    warnings.push(
      `${fold.orphans.length} hồ sơ ngoài phả đồ chưa gộp được vào ghi chú nên vẫn hiển thị để rà soát liên kết (${names}${fold.orphans.length > 3 ? "…" : ""}).`,
    );
  }

  const cycles = findRelationshipCycles(keptPersons).cycles;
  for (const cycle of cycles.slice(0, 3)) {
    const names = cycle.map((id) => keptPersons.find((person) => person.id === id)?.name ?? id);
    warnings.push(`Vòng lặp quan hệ: ${[...names, names[0]].join(" → ")}. Hãy gỡ một liên kết trước khi dùng phả đồ.`);
  }

  const issues = diagnoseGenerations(keptPersons, founderId);
  const unknown = issues.filter((issue) => issue.kind === "unknown");
  const conflicts = issues.filter((issue) => issue.kind === "conflict");
  if (unknown.length) {
    warnings.push(
      `${unknown.length} người chưa xác định được đời (${unknown
        .slice(0, 4)
        .map((issue) => issue.name)
        .join(", ")}${unknown.length > 4 ? "…" : ""}). Bổ sung cha/mẹ hoặc cột “Đời”; ứng dụng không tự gán Đời 1.`,
    );
  }
  if (conflicts.length) {
    warnings.push(
      `${conflicts.length} điểm xung đột đời: ${conflicts
        .slice(0, 3)
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  if (base) {
    const absent = base.members.filter((member) => !rowTargets.some((target) => target.person.id === member.id));
    if (absent.length) {
      warnings.push(
        `${absent.length} thành viên cũ không có trong tệp được giữ nguyên vì nhập cập nhật không tự xóa.`,
      );
    }
  }

  const now = new Date().toISOString();
  const tree: FamilyTree = {
    id: base?.id ?? uid("g"),
    name: (base ? base.name : treeName.trim()) || "Gia phả nhập từ Excel",
    address: base?.address,
    description: base?.description,
    ownerName: base?.ownerName,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    members: keptPersons,
    branches,
    history: base?.history ?? "",
    design: base?.design ?? { ...DEFAULT_DESIGN },
    positions: base?.positions ?? {},
    decorations: base?.decorations ?? [],
    schemaVersion: FAMILY_TREE_SCHEMA_VERSION,
    founderId,
    documents: base?.documents ?? [],
    sample: base?.sample ?? false,
  };

  return {
    tree,
    warnings,
    memberCount: keptPersons.length,
    importedCount: rowTargets.length,
    matchedCount,
    createdCount,
    baseTreeId: base?.id,
  };
}

export async function importSpreadsheet(file: File, options: ImportOptions = {}): Promise<ImportResult> {
  const rows = await parseSpreadsheet(file);
  const treeName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return buildTreeFromRows(rows, treeName, options);
}
