import type {
  Branch,
  CalendarKind,
  FamilyTree,
  LifeStatus,
  LinkConfidence,
  Person,
  SpouseRank,
} from "./types";
import {
  CALENDAR_LABELS,
  DEFAULT_DESIGN,
  FAMILY_TREE_SCHEMA_VERSION,
  LIFE_STATUS_LABELS,
  LINK_CONFIDENCE_LABELS,
  SPOUSE_RANK_LABELS,
  lifeStatusOf,
} from "./types";
import { applyPrivacyToPerson, ensurePersonCodes, splitFullName, uid } from "./utils";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function monthIndex(value: string) {
  const index = MONTHS.indexOf(value.slice(0, 3).toUpperCase());
  return index >= 0 ? index + 1 : 0;
}

/** Chuyển ngày tự do của ứng dụng sang cú pháp GEDCOM khi có thể. */
export function toGedcomDate(value: string | undefined): string {
  const text = (value ?? "").trim();
  if (!text) return "";
  let prefix = "";
  let core = text;
  const qualifier = /^(khoảng|khoang|trước|truoc|sau|ước|uoc)\s+(.+)$/i.exec(text);
  if (qualifier) {
    const key = qualifier[1].toLowerCase();
    prefix = key.startsWith("tr") ? "BEF " : key.startsWith("sa") ? "AFT " : "ABT ";
    core = qualifier[2].trim();
  }
  if (/^\d{3,4}$/.test(core)) return `${prefix}${core}`;
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{3,4})$/.exec(core);
  if (dmy) {
    const month = MONTHS[Number(dmy[2]) - 1];
    if (month) return `${prefix}${Number(dmy[1])} ${month} ${dmy[3]}`;
  }
  const my = /^(\d{1,2})[/\-.](\d{3,4})$/.exec(core);
  if (my) {
    const month = MONTHS[Number(my[1]) - 1];
    if (month) return `${prefix}${month} ${my[2]}`;
  }
  return `(${text})`;
}

/** Đọc ngày GEDCOM thành văn bản dễ đọc trong ứng dụng. */
export function fromGedcomDate(value: string | undefined): string {
  let text = (value ?? "").trim();
  if (!text) return "";
  if (text.startsWith("(") && text.endsWith(")")) return text.slice(1, -1).trim();
  let prefix = "";
  const qualifier = /^(ABT|ABOUT|EST|CAL|BEF|AFT)\s+(.+)$/i.exec(text);
  if (qualifier) {
    const key = qualifier[1].toUpperCase();
    prefix = key === "BEF" ? "Trước " : key === "AFT" ? "Sau " : key === "EST" ? "Ước " : "Khoảng ";
    text = qualifier[2].trim();
  }
  const dmy = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{3,4})$/.exec(text);
  if (dmy) {
    const month = monthIndex(dmy[2]);
    if (month) return `${prefix}${Number(dmy[1])}/${month}/${dmy[3]}`;
  }
  const my = /^([A-Za-z]{3,})\s+(\d{3,4})$/.exec(text);
  if (my) {
    const month = monthIndex(my[1]);
    if (month) return `${prefix}${month}/${my[2]}`;
  }
  return `${prefix}${text}`;
}

class GedcomWriter {
  readonly lines: string[] = [];

  tag(level: number, tag: string, value?: string) {
    if (!value) {
      this.lines.push(`${level} ${tag}`);
      return;
    }
    const parts = value.replace(/\r\n?/g, "\n").split("\n");
    parts.forEach((part, index) => {
      const chunks = part.match(/.{1,180}/gu) ?? [""];
      const head = index === 0 ? `${level} ${tag}` : `${level + 1} CONT`;
      this.lines.push(chunks[0] ? `${head} ${chunks[0]}` : head);
      for (let i = 1; i < chunks.length; i++) {
        this.lines.push(`${level + 1} CONC ${chunks[i]}`);
      }
    });
  }

  record(level: number, xref: string, tag: string) {
    this.lines.push(`${level} ${xref} ${tag}`);
  }
}

interface ExportFamily {
  key: string;
  husband?: Person;
  wife?: Person;
  children: Person[];
  rank?: SpouseRank;
  marital?: string;
  marriedYear?: string;
}

function buildExportFamilies(tree: FamilyTree) {
  const byId = new Map(tree.members.map((person) => [person.id, person]));
  const families: ExportFamily[] = [];
  const byKey = new Map<string, ExportFamily>();

  const addCouple = (a: Person, b: Person) => {
    const key = `s:${[a.id, b.id].sort().join("|")}`;
    if (byKey.has(key)) return;
    const husband = a.gender === "male" ? a : b.gender === "male" ? b : a;
    const wife = a.gender === "female" ? a : b.gender === "female" ? b : b;
    const family: ExportFamily = {
      key,
      husband,
      wife: wife.id === husband.id ? undefined : wife,
      children: [],
      rank: husband.spouseRank?.[wife.id] ?? wife.spouseRank?.[husband.id],
      marital: husband.maritalStatus || wife.maritalStatus,
    };
    families.push(family);
    byKey.set(key, family);
  };

  for (const person of tree.members) {
    for (const spouseId of person.spouseIds) {
      const spouse = byId.get(spouseId);
      if (spouse) addCouple(person, spouse);
    }
  }

  const findCouple = (fatherId?: string, motherId?: string) =>
    families.find(
      (family) =>
        (family.husband?.id === fatherId && family.wife?.id === motherId) ||
        (family.husband?.id === motherId && family.wife?.id === fatherId),
    );

  for (const child of tree.members) {
    const father = child.fatherId ? byId.get(child.fatherId) : undefined;
    const mother = child.motherId ? byId.get(child.motherId) : undefined;
    if (!father && !mother) continue;
    let family = father && mother ? findCouple(father.id, mother.id) : undefined;
    if (!family) {
      const key = `p:${father?.id ?? "-"}|${mother?.id ?? "-"}`;
      family = byKey.get(key);
      if (!family) {
        const husband = father ?? mother;
        family = {
          key,
          husband: husband?.gender === "male" ? husband : undefined,
          wife: husband?.gender === "female" ? husband : undefined,
          children: [],
          marital: husband?.maritalStatus,
        };
        families.push(family);
        byKey.set(key, family);
      }
    }
    if (!family.children.some((item) => item.id === child.id)) family.children.push(child);
  }

  return { families, byId };
}

export function buildGedcom(input: FamilyTree): string {
  const tree: FamilyTree = input.privacy
    ? { ...input, members: input.members.map((p) => applyPrivacyToPerson(p, input.privacy)) }
    : input;
  const writer = new GedcomWriter();
  const { families } = buildExportFamilies(tree);
  const personXref = new Map<string, string>();
  const familyXref = new Map<string, string>();

  tree.members.forEach((person, index) => personXref.set(person.id, `@I${index + 1}@`));
  families.forEach((family, index) => familyXref.set(family.key, `@F${index + 1}@`));

  const famsOf = new Map<string, string[]>();
  const famcOf = new Map<string, string[]>();
  for (const family of families) {
    const xref = familyXref.get(family.key)!;
    for (const spouse of [family.husband, family.wife]) {
      if (!spouse) continue;
      const list = famsOf.get(spouse.id) ?? [];
      list.push(xref);
      famsOf.set(spouse.id, list);
    }
    for (const child of family.children) {
      const list = famcOf.get(child.id) ?? [];
      list.push(xref);
      famcOf.set(child.id, list);
    }
  }

  const now = new Date();
  writer.tag(0, "HEAD");
  writer.tag(1, "SOUR", "PAT");
  writer.tag(2, "NAME", "Tiểu Phạm — Gia Phả");
  writer.tag(2, "VERS", "1.0");
  writer.tag(1, "DEST", "ANY");
  writer.tag(1, "DATE", `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`);
  writer.tag(1, "CHAR", "UTF-8");
  writer.tag(1, "GEDC");
  writer.tag(2, "VERS", "5.5.1");
  writer.tag(2, "FORM", "LINEAGE-LINKED");
  if (tree.address) writer.tag(1, "_PAT_TREE_ADDRESS", tree.address);
  if (tree.ownerName) writer.tag(1, "_PAT_TREE_OWNER", tree.ownerName);
  if (tree.description) writer.tag(1, "_PAT_TREE_DESC", tree.description);

  for (const person of tree.members) {
    const xref = personXref.get(person.id)!;
    writer.record(0, xref, "INDI");
    const parts = splitFullName(person.name);
    const given = [parts.middle, parts.given].filter(Boolean).join(" ");
    if (parts.surname && given) writer.tag(1, "NAME", `${given} /${parts.surname}/`);
    else writer.tag(1, "NAME", person.name);
    if (given) writer.tag(2, "GIVN", given);
    if (parts.surname) writer.tag(2, "SURN", parts.surname);
    writer.tag(1, "SEX", person.gender === "male" ? "M" : "F");
    if (person.code) writer.tag(1, "REFN", person.code);

    if (person.title) writer.tag(1, "_PAT_TITLE", person.title);
    if (person.generationNote) writer.tag(1, "_PAT_GEN_NOTE", person.generationNote);
    if (person.tabooName) writer.tag(1, "_PAT_TABOO", person.tabooName);
    if (person.courtesyName) writer.tag(1, "_PAT_COURTESY", person.courtesyName);
    if (person.styleName) writer.tag(1, "_PAT_STYLE", person.styleName);
    if (person.posthumousName) writer.tag(1, "_PAT_POSTHUMOUS", person.posthumousName);
    if (person.officeTitle) writer.tag(1, "OCCU", person.officeTitle);
    if (person.mandarinRank) writer.tag(1, "_PAT_MANDARIN", person.mandarinRank);
    if (person.honors) writer.tag(1, "_PAT_HONORS", person.honors);
    if (person.birthOrder && person.birthOrder !== 1) writer.tag(1, "_PAT_BIRTH_ORDER", String(person.birthOrder));
    if (typeof person.generation === "number") writer.tag(1, "_PAT_GEN", String(person.generation));
    if (person.ancestorOrder) writer.tag(1, "_PAT_ANCESTOR", String(person.ancestorOrder));
    if (tree.founderId === person.id) writer.tag(1, "_PAT_FOUNDER", "Y");
    if (person.nameIsConventional) writer.tag(1, "_PAT_NAME_CONV", "Y");
    if (person.nameNote) writer.tag(1, "_PAT_NAME_NOTE", person.nameNote);
    writer.tag(1, "_PAT_LIFE", lifeStatusOf(person));
    if (person.birthCalendar) writer.tag(1, "_PAT_BIRTH_CAL", person.birthCalendar);
    if (person.deathCalendar) writer.tag(1, "_PAT_DEATH_CAL", person.deathCalendar);

    if (person.birthDate) {
      writer.tag(1, "BIRT");
      writer.tag(2, "DATE", toGedcomDate(person.birthDate));
      writer.tag(2, "_PAT_TEXT", person.birthDate);
    }
    if (!person.alive || person.deathDate) {
      writer.tag(1, "DEAT");
      if (person.deathDate) {
        writer.tag(2, "DATE", toGedcomDate(person.deathDate));
        writer.tag(2, "_PAT_TEXT", person.deathDate);
      }
    }

    if (person.hometown) writer.tag(1, "_PAT_HOMETOWN", person.hometown);
    if (person.occupation) writer.tag(1, "_PAT_OCCUPATION", person.occupation);
    if (person.maritalStatus) writer.tag(1, "_PAT_MARITAL", person.maritalStatus);
    if (person.deathAnniversary) writer.tag(1, "_PAT_DEATH_ANNIV", person.deathAnniversary);
    if (person.restingPlace) writer.tag(1, "_PAT_REST", person.restingPlace);
    if (person.graveAddress) writer.tag(1, "_PAT_GRAVE", person.graveAddress);
    if (person.graveMapUrl) writer.tag(1, "_PAT_GRAVE_MAP", person.graveMapUrl);
    if (person.worshipPlace) writer.tag(1, "_PAT_WORSHIP", person.worshipPlace);
    if (person.worshipMapUrl) writer.tag(1, "_PAT_WORSHIP_MAP", person.worshipMapUrl);
    if (person.restingPlace || person.graveAddress) {
      writer.tag(1, "BURI");
      writer.tag(2, "PLAC", person.restingPlace || person.graveAddress);
    }
    if (person.phone) writer.tag(1, "PHON", person.phone);
    if (person.address) writer.tag(1, "RESI");
    if (person.address) writer.tag(2, "ADDR", person.address);
    if (person.education) writer.tag(1, "EDUC", person.education);
    if (person.biography) writer.tag(1, "NOTE", person.biography);
    if (person.notes) writer.tag(1, "_PAT_NOTES", person.notes);
    if (person.avatar && !person.avatar.startsWith("data:")) writer.tag(1, "_PAT_AVATAR", person.avatar);
    if (person.reference) writer.tag(1, "_PAT_REFERENCE", "Y");
    if (person.ancestorLinkId && personXref.has(person.ancestorLinkId)) {
      writer.tag(1, "_PAT_ANCESTOR_LINK", personXref.get(person.ancestorLinkId)!);
      if (person.ancestorLinkRelation) {
        writer.tag(1, "_PAT_ANCESTOR_LINK_REL", person.ancestorLinkRelation);
      }
      if (person.ancestorLinkGap) {
        writer.tag(1, "_PAT_ANCESTOR_LINK_GAP", String(person.ancestorLinkGap));
      }
      if (person.ancestorLinkConfidence) {
        writer.tag(1, "_PAT_ANCESTOR_LINK_CONF", person.ancestorLinkConfidence);
      }
      if (person.ancestorLinkNote) writer.tag(1, "_PAT_ANCESTOR_LINK_NOTE", person.ancestorLinkNote);
    }

    const branch = tree.branches.find((item) => item.id === person.branchId);
    if (branch) {
      writer.tag(1, "_PAT_BRANCH", branch.name);
      if (branch.headId === person.id) writer.tag(1, "_PAT_BRANCH_HEAD", "Y");
    }

    for (const fam of famcOf.get(person.id) ?? []) writer.tag(1, "FAMC", fam);
    for (const fam of famsOf.get(person.id) ?? []) writer.tag(1, "FAMS", fam);
  }

  for (const family of families) {
    writer.record(0, familyXref.get(family.key)!, "FAM");
    if (family.husband) writer.tag(1, "HUSB", personXref.get(family.husband.id)!);
    if (family.wife) writer.tag(1, "WIFE", personXref.get(family.wife.id)!);
    for (const child of family.children) writer.tag(1, "CHIL", personXref.get(child.id)!);
    if (family.rank) writer.tag(1, "_PAT_RANK", family.rank);
    if (family.marital) writer.tag(1, "_PAT_MARITAL", family.marital);
  }

  writer.tag(0, "TRLR");
  return `${writer.lines.join("\r\n")}\r\n`;
}

export function exportGedcom(tree: FamilyTree) {
  const content = buildGedcom(tree);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug(tree.name)}.ged`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "gia-pha"
  );
}

/* --------------------------------- parse --------------------------------- */

interface GNode {
  level: number;
  xref?: string;
  tag: string;
  value: string;
  children: GNode[];
}

function parseNodes(text: string): GNode[] {
  const roots: GNode[] = [];
  const stack: GNode[] = [];
  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const match = /^\s*(\d+)\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?:\s?(.*))?$/.exec(rawLine);
    if (!match) continue;
    const tag = match[3].toUpperCase();
    if (tag === "CONT" || tag === "CONC") {
      const parent = stack[stack.length - 1];
      if (parent) parent.value += tag === "CONT" ? `\n${(match[4] ?? "").trim()}` : (match[4] ?? "").trim();
      continue;
    }
    const node: GNode = {
      level: Number(match[1]),
      xref: match[2],
      tag,
      value: (match[4] ?? "").trim(),
      children: [],
    };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

function kids(node: GNode, tag: string): GNode[] {
  const wanted = tag.toUpperCase();
  return node.children.filter((child) => child.tag === wanted);
}

function kid(node: GNode, tag: string): GNode | undefined {
  return node.children.find((child) => child.tag === tag.toUpperCase());
}

function text(node: GNode | undefined, tag: string): string {
  return kid(node ?? { level: 0, tag: "", value: "", children: [] }, tag)?.value.trim() ?? "";
}

function readName(indi: GNode): { name: string; conventional: boolean } {
  const nameNode = kid(indi, "NAME");
  const conventional = Boolean(kid(indi, "_PAT_NAME_CONV")?.value);
  if (!nameNode) return { name: "", conventional };
  const givn = text(nameNode, "GIVN");
  const surn = text(nameNode, "SURN");
  if (givn || surn) return { name: [surn, givn].filter(Boolean).join(" ").trim(), conventional };
  const raw = nameNode.value;
  const slashed = /^(.*?)\/(.*?)\/(.*)$/.exec(raw);
  if (slashed) {
    const given = [slashed[1].trim(), slashed[3].trim()].filter(Boolean).join(" ");
    return { name: [slashed[2].trim(), given].filter(Boolean).join(" ").trim(), conventional };
  }
  return { name: raw.trim(), conventional };
}

function invert<T extends string>(labels: Record<T, string>) {
  return new Map(Object.entries(labels).map(([key, label]) => [String(label).toLowerCase(), key as T]));
}

const LIFE_BY_LABEL = invert(LIFE_STATUS_LABELS);
const CALENDAR_BY_LABEL = invert(CALENDAR_LABELS);
const CONFIDENCE_BY_LABEL = invert(LINK_CONFIDENCE_LABELS);

function readLifeStatus(indi: GNode, hasDeath: boolean): LifeStatus {
  const raw = text(indi, "_PAT_LIFE").toLowerCase();
  if (raw === "alive" || raw === "deceased" || raw === "missing" || raw === "unknown") {
    return raw as LifeStatus;
  }
  const mapped = LIFE_BY_LABEL.get(raw);
  if (mapped) return mapped;
  return hasDeath ? "deceased" : "alive";
}

function readCalendar(indi: GNode, topTag: string, nested?: GNode): CalendarKind | undefined {
  const raw = (text(indi, topTag) || text(nested, "_PAT_CAL")).toLowerCase();
  if (raw === "duong" || raw === "am" || raw === "unknown") return raw as CalendarKind;
  return CALENDAR_BY_LABEL.get(raw);
}

function readConfidence(raw: string): LinkConfidence | undefined {
  const value = raw.toLowerCase();
  if (value === "certain" || value === "probable" || value === "oral" || value === "unknown") {
    return value as LinkConfidence;
  }
  return CONFIDENCE_BY_LABEL.get(value);
}

function number(raw: string): number | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

export interface GedcomUnsupportedTag {
  tag: string;
  label: string;
  count: number;
}

export interface GedcomParseResult {
  tree: FamilyTree;
  warnings: string[];
  stats: {
    individuals: number;
    families: number;
    unsupported: GedcomUnsupportedTag[];
  };
}

const UNSUPPORTED_LABELS: Record<string, string> = {
  OBJE: "ảnh/tệp đính kèm",
  SOUR: "nguồn trích dẫn",
  ALIA: "bí danh",
  ANCI: "liên kết tổ tiên",
  DESI: "dòng dõi",
  ASSO: "liên kết người",
  _UID: "mã định danh",
  RIN: "mã nội bộ",
  CHAN: "lịch sử sửa đổi",
  EMAIL: "email",
  WWW: "trang web",
  DIV: "ly hôn",
  DIVF: "ly hôn (đệ trình)",
  ENGA: "hứa hôn",
  MARB: "đăng ký kết hôn",
  MARC: "kết hôn dân sự",
  MARL: "giấy phép kết hôn",
  MARS: "hôn ước",
  CENS: "điều tra dân số",
  PROB: "di chúc (xác nhận)",
  WILL: "di chúc",
  GRAD: "tốt nghiệp",
  RETI: "nghỉ hưu",
  EMIG: "di cư",
  IMMI: "nhập cư",
  NATU: "nhập tịch",
  ADOP: "nhận nuôi",
  BAPM: "rửa tội",
  CONF: "thêm sức",
};

function collectUnsupported(nodes: GNode[]): GedcomUnsupportedTag[] {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const child of node.children) {
      if (!UNSUPPORTED_LABELS[child.tag]) continue;
      counts.set(child.tag, (counts.get(child.tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, label: UNSUPPORTED_LABELS[tag], count }))
    .sort((a, b) => b.count - a.count);
}

export function parseGedcom(textValue: string, fallbackName = ""): GedcomParseResult {
  const roots = parseNodes(textValue);
  const indiNodes = roots.filter((node) => node.tag === "INDI");
  if (!indiNodes.length) {
    throw new Error("Tệp GEDCOM không có bản ghi cá nhân (INDI). Hãy kiểm tra lại tệp .ged.");
  }
  const warnings: string[] = [];
  const head = roots.find((node) => node.tag === "HEAD");
  const persons: Person[] = [];
  const byXref = new Map<string, Person>();
  const meta = new Map<
    string,
    {
      ancestorLink?: string;
      founder: boolean;
      branchName?: string;
      branchHead: boolean;
    }
  >();
  const usedCodes = new Set<string>();
  let missingNames = 0;

  for (const indi of indiNodes) {
    const { name, conventional } = readName(indi);
    if (!name) missingNames += 1;
    const birt = kid(indi, "BIRT");
    const deat = kid(indi, "DEAT");
    const lifeStatus = readLifeStatus(indi, Boolean(deat));
    const sex = text(indi, "SEX").toUpperCase();
    if (sex !== "M" && sex !== "F") {
      warnings.push(`“${name || indi.xref || "?"}” không ghi giới tính; tạm để Nam.`);
    }
    const codeRaw = text(indi, "REFN");
    const code = codeRaw && !usedCodes.has(codeRaw) ? codeRaw : undefined;
    if (code) usedCodes.add(code);

    const person: Person = {
      id: uid("p"),
      name: name || "Không rõ tên",
      gender: sex === "F" ? "female" : "male",
      alive: lifeStatus === "alive",
      lifeStatus,
      birthOrder: Math.max(1, Math.round(number(text(indi, "_PAT_BIRTH_ORDER")) ?? 1)),
      spouseIds: [],
      code,
      title: text(indi, "_PAT_TITLE") || undefined,
      generationNote: text(indi, "_PAT_GEN_NOTE") || undefined,
      tabooName: text(indi, "_PAT_TABOO") || undefined,
      courtesyName: text(indi, "_PAT_COURTESY") || undefined,
      styleName: text(indi, "_PAT_STYLE") || undefined,
      posthumousName: text(indi, "_PAT_POSTHUMOUS") || undefined,
      officeTitle: text(indi, "OCCU") || undefined,
      mandarinRank: text(indi, "_PAT_MANDARIN") || undefined,
      honors: text(indi, "_PAT_HONORS") || undefined,
      generation: number(text(indi, "_PAT_GEN")),
      ancestorOrder: number(text(indi, "_PAT_ANCESTOR")) ?? undefined,
      nameIsConventional: conventional,
      nameNote: text(indi, "_PAT_NAME_NOTE") || undefined,
      birthDate: text(indi, "_PAT_TEXT") || (birt ? fromGedcomDate(text(birt, "DATE")) : "") || undefined,
      deathDate: deat ? text(deat, "_PAT_TEXT") || fromGedcomDate(text(deat, "DATE")) || undefined : undefined,
      birthCalendar: readCalendar(indi, "_PAT_BIRTH_CAL", birt),
      deathCalendar: readCalendar(indi, "_PAT_DEATH_CAL", deat),
      hometown: text(indi, "_PAT_HOMETOWN") || undefined,
      occupation: text(indi, "_PAT_OCCUPATION") || undefined,
      maritalStatus: text(indi, "_PAT_MARITAL") || undefined,
      deathAnniversary: text(indi, "_PAT_DEATH_ANNIV") || undefined,
      restingPlace: text(indi, "_PAT_REST") || text(kid(indi, "BURI"), "PLAC") || undefined,
      graveAddress: text(indi, "_PAT_GRAVE") || undefined,
      graveMapUrl: text(indi, "_PAT_GRAVE_MAP") || undefined,
      worshipPlace: text(indi, "_PAT_WORSHIP") || undefined,
      worshipMapUrl: text(indi, "_PAT_WORSHIP_MAP") || undefined,
      phone: text(indi, "PHON") || undefined,
      address: text(indi, "_PAT_ADDRESS") || text(kid(indi, "RESI"), "ADDR") || undefined,
      education: text(indi, "EDUC") || undefined,
      biography: text(indi, "NOTE") || text(indi, "_PAT_BIOGRAPHY") || undefined,
      notes: text(indi, "_PAT_NOTES") || undefined,
      avatar: text(indi, "_PAT_AVATAR") || undefined,
      reference: text(indi, "_PAT_REFERENCE") === "Y" || undefined,
    };

    const ancestorLinkConfidence = readConfidence(text(indi, "_PAT_ANCESTOR_LINK_CONF"));
    if (ancestorLinkConfidence) person.ancestorLinkConfidence = ancestorLinkConfidence;
    person.ancestorLinkRelation = text(indi, "_PAT_ANCESTOR_LINK_REL") || undefined;
    person.ancestorLinkGap = number(text(indi, "_PAT_ANCESTOR_LINK_GAP")) ?? undefined;
    person.ancestorLinkNote = text(indi, "_PAT_ANCESTOR_LINK_NOTE") || undefined;

    const ancestorLink = text(indi, "_PAT_ANCESTOR_LINK") || undefined;
    const founder = Boolean(text(indi, "_PAT_FOUNDER"));
    const branchName = text(indi, "_PAT_BRANCH") || undefined;
    const branchHead = Boolean(text(indi, "_PAT_BRANCH_HEAD"));
    if (indi.xref) byXref.set(indi.xref, person);
    meta.set(person.id, { ancestorLink, founder, branchName, branchHead });
    persons.push(person);
  }

  if (missingNames) warnings.push(`${missingNames} bản ghi thiếu tên; đã tạm ghi “Không rõ tên”.`);

  const famNodes = roots.filter((node) => node.tag === "FAM");
  const fatherOf = new Map<string, string>();
  const motherOf = new Map<string, string>();

  for (const fam of famNodes) {
    const husband = byXref.get(text(fam, "HUSB"));
    const wife = byXref.get(text(fam, "WIFE"));
    const rankRaw = text(fam, "_PAT_RANK").toLowerCase();
    const rank: SpouseRank | undefined =
      rankRaw === "chinh" || rankRaw === "ke" || rankRaw === "thu" || rankRaw === "khac"
        ? (rankRaw as SpouseRank)
        : (Object.entries(SPOUSE_RANK_LABELS).find(([, label]) => label.toLowerCase() === rankRaw)?.[0] as
            | SpouseRank
            | undefined);
    const marital = text(fam, "_PAT_MARITAL") || text(kid(fam, "MARR"), "NOTE");

    if (husband && wife) {
      if (!husband.spouseIds.includes(wife.id)) husband.spouseIds.push(wife.id);
      if (!wife.spouseIds.includes(husband.id)) wife.spouseIds.push(husband.id);
      if (!husband.spouseOrder?.includes(wife.id)) {
        husband.spouseOrder = [...(husband.spouseOrder ?? []), wife.id];
      }
      if (!wife.spouseOrder?.includes(husband.id)) {
        wife.spouseOrder = [...(wife.spouseOrder ?? []), husband.id];
      }
      if (rank) {
        husband.spouseRank = { ...(husband.spouseRank ?? {}), [wife.id]: rank };
        wife.spouseRank = { ...(wife.spouseRank ?? {}), [husband.id]: rank };
      }
      if (marital) {
        if (!husband.maritalStatus) husband.maritalStatus = marital;
        if (!wife.maritalStatus) wife.maritalStatus = marital;
      }
    }

    for (const childNode of kids(fam, "CHIL")) {
      const child = byXref.get(childNode.value);
      if (!child) {
        warnings.push(`Một bản ghi con trỏ tới ${childNode.value} nhưng không tìm thấy người tương ứng.`);
        continue;
      }
      if (husband) {
        const previous = fatherOf.get(child.id);
        if (previous && previous !== husband.id) {
          warnings.push(`“${child.name}” xuất hiện ở nhiều gia đình với cha khác nhau; giữ cha đầu tiên.`);
        } else {
          fatherOf.set(child.id, husband.id);
        }
      }
      if (wife) {
        const previous = motherOf.get(child.id);
        if (previous && previous !== wife.id) {
          warnings.push(`“${child.name}” xuất hiện ở nhiều gia đình với mẹ khác nhau; giữ mẹ đầu tiên.`);
        } else {
          motherOf.set(child.id, wife.id);
        }
      }
    }
  }

  for (const person of persons) {
    const fatherId = fatherOf.get(person.id);
    const motherId = motherOf.get(person.id);
    if (fatherId) person.fatherId = fatherId;
    if (motherId) person.motherId = motherId;
    const info = meta.get(person.id);
    if (!info) continue;
    if (info.ancestorLink) {
      const target = byXref.get(info.ancestorLink);
      if (target) person.ancestorLinkId = target.id;
      else warnings.push(`“${person.name}” có liên kết tiền tổ tới ${info.ancestorLink} không tồn tại.`);
    }
  }

  const branchNames = new Map<string, string>();
  const branchColors = ["#8a1c15", "#b7791f", "#2f6f5e", "#6b4c9a", "#1f6b7a", "#9a4a1f"];
  for (const person of persons) {
    const info = meta.get(person.id);
    if (!info?.branchName) continue;
    const branchId = branchNames.get(info.branchName) ?? uid("b");
    branchNames.set(info.branchName, branchId);
    person.branchId = branchId;
  }
  const branches: Branch[] = [...branchNames.entries()].map(([name, id], index) => ({
    id,
    name,
    color: branchColors[index % branchColors.length],
  }));
  for (const person of persons) {
    const info = meta.get(person.id);
    if (!info?.branchHead || !person.branchId) continue;
    const branch = branches.find((item) => item.id === person.branchId);
    if (branch) branch.headId = person.id;
  }

  // Chỉ gán Đời 0 cho người đứng đầu một chi gốc. Người kết hôn vào dòng họ
  // không có cha/mẹ trong tệp sẽ nhận đời theo vợ/chồng, không bị khóa ở Đời 0.
  const byId = new Map(persons.map((person) => [person.id, person]));
  const anchored = (person: Person) =>
    Boolean(
      person.fatherId ||
        person.motherId ||
        person.ancestorLinkId ||
        typeof person.generation === "number" ||
        (person.ancestorOrder && person.ancestorOrder > 0) ||
        person.reference,
    );
  for (const person of persons) {
    if (anchored(person)) continue;
    const marriedInto = person.spouseIds.some((id) => {
      const spouse = byId.get(id);
      return spouse ? anchored(spouse) : false;
    });
    if (marriedInto) continue;
    person.generation = 0;
  }

  let founderId: string | undefined;
  const flagged = persons.filter((person) => meta.get(person.id)?.founder);
  if (flagged.length > 1) {
    founderId = flagged[0].id;
    warnings.push(
      `Có ${flagged.length} người được đánh dấu Khởi Tổ; chỉ giữ “${flagged[0].name}”, các vị còn lại nên nối bằng liên kết tiền tổ.`,
    );
  } else if (flagged.length === 1) {
    founderId = flagged[0].id;
  } else {
    const roots = persons.filter((person) => person.generation === 0);
    founderId = (roots.find((person) => person.gender === "male") ?? roots[0])?.id;
    if (roots.length > 2) {
      warnings.push(
        `Tệp có ${roots.length} người ở Đời 0; tạm chọn “${
          persons.find((person) => person.id === founderId)?.name ?? "?"
        }” làm Khởi Tổ. Hãy kiểm tra lại trong phần cài đặt gia phả.`,
      );
    }
  }

  const unsupported = collectUnsupported([...indiNodes, ...famNodes]);
  if (unsupported.length) {
    const total = unsupported.reduce((sum, item) => sum + item.count, 0);
    const detail = unsupported
      .slice(0, 6)
      .map((item) => `${item.tag} (${item.label}) ×${item.count}`)
      .join(", ");
    warnings.push(
      `Bỏ qua ${total} trường ngoài mô hình: ${detail}${unsupported.length > 6 ? "…" : ""}. Ghi chú, ảnh đính kèm và nguồn trích dẫn không được chuyển vào gia phả.`,
    );
  }

  const members = ensurePersonCodes(persons);
  const now = new Date().toISOString();
  const tree: FamilyTree = {
    id: uid("g"),
    name: fallbackName.trim() || "Gia phả nhập từ GEDCOM",
    address: head ? text(head, "_PAT_TREE_ADDRESS") || undefined : undefined,
    ownerName: head ? text(head, "_PAT_TREE_OWNER") || undefined : undefined,
    description: head ? text(head, "_PAT_TREE_DESC") || undefined : undefined,
    createdAt: now,
    updatedAt: now,
    members,
    branches,
    history: "",
    design: { ...DEFAULT_DESIGN },
    positions: {},
    decorations: [],
    schemaVersion: FAMILY_TREE_SCHEMA_VERSION,
    founderId,
    documents: [],
    sample: false,
  };

  return {
    tree,
    warnings,
    stats: {
      individuals: indiNodes.length,
      families: famNodes.length,
      unsupported,
    },
  };
}
