import type { FamilyTree, Person, PrivacySettings, SpouseRank } from "./types";
import { generationTag, lifeStatusOf, UNKNOWN_GENERATION } from "./types";
import { classifyClan, computeClanGenerations, findClanCycles, type ClanIndex } from "./clan";

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function byId(tree: FamilyTree): Map<string, Person> {
  return new Map(tree.members.map((m) => [m.id, m]));
}

function formatPersonCode(sequence: number): string {
  return `P${String(sequence).padStart(4, "0")}`;
}

/** Mã kế tiếp chưa dùng, ví dụ P0007. */
export function nextPersonCode(members: Person[]): string {
  const used = new Set(members.map((m) => m.code).filter((code): code is string => Boolean(code)));
  let sequence = 1;
  while (used.has(formatPersonCode(sequence))) sequence += 1;
  return formatPersonCode(sequence);
}

/** Gán Mã ổn định cho thành viên cũ chưa có Mã, giữ nguyên Mã đã có. */
export function ensurePersonCodes(members: Person[]): Person[] {
  const used = new Set(members.map((m) => m.code).filter((code): code is string => Boolean(code)));
  let sequence = 1;
  return members.map((member) => {
    if (member.code) return member;
    while (used.has(formatPersonCode(sequence))) sequence += 1;
    const code = formatPersonCode(sequence);
    used.add(code);
    sequence += 1;
    return { ...member, code };
  });
}

/** Tìm các vòng lặp cha/mẹ/liên kết tiền tổ để không lan truyền đời sai vô hạn. */
export function findRelationshipCycles(members: Person[]): { edges: Set<string>; cycles: string[][] } {
  return findClanCycles(members);
}

/** Đời của từng người, chỉ tính theo phạm vi dòng họ (bỏ qua hồ sơ tham khảo). */
export function computeGenerations(members: Person[], founderId?: string): Map<string, number> {
  return computeClanGenerations(members, founderId);
}

export type GenerationIssueKind = "conflict" | "unknown" | "cycle";

export interface GenerationIssue {
  kind: GenerationIssueKind;
  personId?: string;
  name?: string;
  message: string;
}

/**
 * Rà soát các nguồn xác định đời để người dùng tự quyết thay vì lấy đời lớn nhất.
 *
 * Chỉ cảnh báo trong phạm vi dòng họ: dâu/rể lấy đời theo vợ/chồng, cha mẹ của
 * dâu/rể là hồ sơ tham khảo nên không bao giờ bị nhắc thiếu đời hay lệch đời.
 */
export function diagnoseGenerations(members: Person[], founderId?: string): GenerationIssue[] {
  const clan = classifyClan(members, founderId);
  const byIdMap = new Map(members.map((m) => [m.id, m]));
  const { cycles, edges: cycleEdges } = findRelationshipCycles(members);
  const gen = computeGenerations(members, founderId);
  const issues: GenerationIssue[] = [];

  for (const cycle of cycles) {
    if (!cycle.every((id) => clan.isDisplayed(id))) continue;
    const names = cycle.map((id) => byIdMap.get(id)?.name ?? id);
    issues.push({
      kind: "cycle",
      personId: cycle[0],
      name: names[0],
      message: `Vòng lặp quan hệ: ${[...names, names[0]].join(" → ")}. Hãy gỡ một liên kết cha/mẹ hoặc liên kết tiền tổ.`,
    });
  }

  for (const person of members) {
    const role = clan.roleOf(person.id);
    if (role === "reference" || role === "outside") continue;

    const own = gen.get(person.id);
    if (own === UNKNOWN_GENERATION) {
      issues.push({
        kind: "unknown",
        personId: person.id,
        name: person.name,
        message:
          role === "inLaw"
            ? `${person.name} (dâu/rể) chưa xác định được đời vì chưa nối vợ/chồng với người trong dòng họ.`
            : `${person.name} chưa có đủ dữ kiện để xác định đời (thiếu cha/mẹ, liên kết tiền tổ hoặc đời nhập tay).`,
      });
    }

    if (role !== "clan" && role !== "maternal") continue;
    const explicit =
      typeof person.generation === "number" && Number.isFinite(person.generation)
        ? Math.trunc(person.generation)
        : undefined;
    if (explicit === undefined) continue;

    const parentId = clan.lineParent(person);
    if (parentId && !cycleEdges.has(`${parentId}>${person.id}`)) {
      const parentGen = gen.get(parentId);
      if (parentGen !== undefined && parentGen !== UNKNOWN_GENERATION) {
        // Liên kết tiền tổ có thể nhảy nhiều bậc (ông–cháu…), cha/mẹ trong họ luôn cách một đời.
        const gap =
          person.ancestorLinkId === parentId ? Math.max(1, Math.trunc(person.ancestorLinkGap ?? 1)) : 1;
        const expected = parentGen + gap;
        if (expected !== explicit) {
          issues.push({
            kind: "conflict",
            personId: person.id,
            name: person.name,
            message: `${person.name}: đời nhập tay là ${generationTag(explicit)} nhưng quan hệ cha/mẹ trong dòng họ cho ra ${generationTag(expected)}.`,
          });
        }
      }
    }

    for (const spouseId of person.spouseIds) {
      const spouse = byIdMap.get(spouseId);
      if (!spouse || clan.roleOf(spouseId) !== "clan") continue;
      const spouseExplicit =
        typeof spouse.generation === "number" && Number.isFinite(spouse.generation)
          ? Math.trunc(spouse.generation)
          : undefined;
      if (spouseExplicit !== undefined && spouseExplicit !== explicit) {
        issues.push({
          kind: "conflict",
          personId: person.id,
          name: person.name,
          message: `${person.name} (${generationTag(explicit)}) và ${spouse.name} (${generationTag(spouseExplicit)}) đang được nhập khác đời nhưng lại là vợ/chồng.`,
        });
        break;
      }
    }
  }
  return issues;
}

export function generationFor(gens: Map<string, number>, personId: string): number {
  return gens.get(personId) ?? UNKNOWN_GENERATION;
}

/** Liên kết tiền tổ: nối xuống bậc kế tiếp khi thiếu cha/mẹ ruột. */
export function isIndirectLink(p: Person): boolean {
  return Boolean(
    p.ancestorLinkId &&
      p.ancestorLinkId !== p.fatherId &&
      p.ancestorLinkId !== p.motherId,
  );
}

export function linkLabel(p: Person): string {
  if (!isIndirectLink(p)) return "";
  const gap = Math.trunc(p.ancestorLinkGap ?? 1);
  if (gap > 1) return `cách ${gap} đời`;
  return p.ancestorLinkRelation?.trim() || "liên kết tiền tổ";
}

export interface FamilyIndex {
  ids: Set<string>;
  clan: ClanIndex;
  /** Người thuộc nội tộc hoặc tiền tổ, dùng cho các phép đếm theo dòng họ. */
  bloodline: Set<string>;
  lineParent: (p: Person) => string | undefined;
  childrenOf: Map<string, Person[]>;
  childrenAny: Map<string, Person[]>;
}

export function buildFamilyIndex(members: Person[], founderId?: string): FamilyIndex {
  const clan = classifyClan(members, founderId);
  const ids = new Set(members.map((m) => m.id));
  const bloodline = new Set<string>([...clan.clanIds, ...clan.ancestorIds]);
  const childrenOf = new Map<string, Person[]>();
  const childrenAny = new Map<string, Person[]>();
  for (const person of members) {
    if (!clan.isDisplayed(person.id)) continue;
    const parent = clan.lineParent(person);
    if (parent) {
      const list = childrenOf.get(parent) ?? [];
      list.push(person);
      childrenOf.set(parent, list);
    }
    if (person.fatherId && ids.has(person.fatherId)) {
      const list = childrenAny.get(person.fatherId) ?? [];
      list.push(person);
      childrenAny.set(person.fatherId, list);
    }
    if (person.motherId && ids.has(person.motherId)) {
      const list = childrenAny.get(person.motherId) ?? [];
      list.push(person);
      childrenAny.set(person.motherId, list);
    }
  }
  for (const list of childrenOf.values()) list.sort(sortPersons);
  for (const list of childrenAny.values()) list.sort(sortPersons);
  return { ids, clan, bloodline, lineParent: clan.lineParent, childrenOf, childrenAny };
}

/**
 * Nam giới để đếm đinh của các chi phái: chỉ con cháu nội tộc, không tính
 * dâu/rể kết hôn vào và không tính tổ tiên phía trên các trưởng chi phái.
 */
export function branchHeadcounts(tree: FamilyTree): {
  men: Person[];
  byBranch: Map<string, Person[]>;
} {
  const clan = classifyClan(tree.members, tree.founderId);
  const memberById = new Map(tree.members.map((member) => [member.id, member]));
  const headIds = new Set(tree.branches.map((branch) => branch.headId).filter((id): id is string => Boolean(id)));
  const ancestorIds = new Set<string>();
  const stack = [...headIds];
  while (stack.length) {
    const person = memberById.get(stack.pop() ?? "");
    if (!person) continue;
    for (const parentId of [person.fatherId, person.motherId, person.ancestorLinkId]) {
      if (parentId && !ancestorIds.has(parentId)) {
        ancestorIds.add(parentId);
        stack.push(parentId);
      }
    }
  }
  const men = tree.members.filter(
    (member) =>
      member.gender === "male" &&
      clan.clanIds.has(member.id) &&
      !ancestorIds.has(member.id),
  );
  const byBranch = new Map<string, Person[]>();
  for (const branch of tree.branches) {
    byBranch.set(
      branch.id,
      men.filter((member) => member.branchId === branch.id),
    );
  }
  return { men, byBranch };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function sortPersons(a: Person, b: Person): number {
  const ay = parseInt(a.birthDate ?? "", 10);
  const by = parseInt(b.birthDate ?? "", 10);
  if (!Number.isNaN(ay) && !Number.isNaN(by) && ay !== by) return ay - by;
  if (a.birthOrder !== b.birthOrder) return a.birthOrder - b.birthOrder;
  return a.name.localeCompare(b.name, "vi");
}

/** Hậu duệ trong phạm vi hiển thị; con của con gái chỉ tính một đời. */
export function descendants(members: Person[], id: string, founderId?: string): Set<string> {
  const clan = classifyClan(members, founderId);
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    for (const person of members) {
      if (out.has(person.id)) continue;
      if (
        person.fatherId !== current &&
        person.motherId !== current &&
        person.ancestorLinkId !== current
      ) {
        continue;
      }
      const role = clan.roleOf(person.id);
      if (role !== "clan" && role !== "maternal" && role !== "ancestor") continue;
      out.add(person.id);
      if (role !== "maternal") stack.push(person.id);
    }
  }
  return out;
}

export function ancestorsOf(members: Person[], id: string): Map<string, number> {
  const byIdMap = new Map(members.map((m) => [m.id, m]));
  const result = new Map<string, number>();
  const queue: { id: string; d: number }[] = [{ id, d: 0 }];
  while (queue.length) {
    const { id: current, d } = queue.shift()!;
    if (result.has(current)) continue;
    result.set(current, d);
    const p = byIdMap.get(current);
    if (!p) continue;
    if (p.fatherId) queue.push({ id: p.fatherId, d: d + 1 });
    if (p.motherId) queue.push({ id: p.motherId, d: d + 1 });
    if (p.ancestorLinkId) {
      queue.push({ id: p.ancestorLinkId, d: d + Math.max(1, Math.trunc(p.ancestorLinkGap ?? 1)) });
    }
  }
  return result;
}

export function commonAncestor(members: Person[], aId: string, bId: string) {
  const aAnc = ancestorsOf(members, aId);
  const bAnc = ancestorsOf(members, bId);
  let best: { id: string; dA: number; dB: number; score: number } | null = null;
  for (const [id, dA] of aAnc) {
    const dB = bAnc.get(id);
    if (dB === undefined) continue;
    const score = dA + dB;
    if (!best || score < best.score) best = { id, dA, dB, score };
  }
  return best;
}

export function getStats(tree: FamilyTree) {
  const clan = classifyClan(tree.members, tree.founderId);
  const displayed = tree.members.filter((person) => clan.isDisplayed(person.id));
  const total = displayed.length;
  const male = displayed.filter((m) => m.gender === "male").length;
  const female = total - male;
  const alive = displayed.filter((m) => m.alive).length;
  const generations = computeGenerations(tree.members, tree.founderId);
  const values = displayed.map((person) => generations.get(person.id) ?? UNKNOWN_GENERATION);
  const known = values.filter((value) => value !== UNKNOWN_GENERATION);
  const ancestorTiers = new Set(known.filter((value) => value < 0).map((value) => -value)).size;
  return {
    total,
    male,
    female,
    alive,
    deceased: total - alive,
    generations: new Set(known.filter((value) => value >= 0)).size,
    ancestorTiers,
    ancestors: known.filter((value) => value < 0).length,
    unknownGeneration: values.filter((value) => value === UNKNOWN_GENERATION).length,
    clan: clan.clanIds.size,
    inLaw: clan.inLawIds.size,
    maternal: clan.maternalIds.size,
    reference: clan.referenceIds.size,
    outside: clan.outsideIds.size,
    all: tree.members.length,
  };
}

export function getGenerationStats(tree: FamilyTree) {
  const clan = classifyClan(tree.members, tree.founderId);
  const gens = computeGenerations(tree.members, tree.founderId);
  const rows = new Map<
    number,
    { generation: number; male: number; female: number; total: number; label: string; isAncestor: boolean }
  >();
  for (const m of tree.members) {
    if (!clan.isDisplayed(m.id)) continue;
    const g = gens.get(m.id) ?? 1;
    const row =
      rows.get(g) ??
      {
        generation: g,
        male: 0,
        female: 0,
        total: 0,
        label: generationTag(g),
        isAncestor: g < 0 && g !== UNKNOWN_GENERATION,
      };
    row.total += 1;
    if (m.gender === "male") row.male += 1;
    else row.female += 1;
    rows.set(g, row);
  }
  return Array.from(rows.values()).sort((a, b) => sortGenerations(a.generation, b.generation));
}

export function sortGenerations(a: number, b: number) {
  if (a === UNKNOWN_GENERATION && b === UNKNOWN_GENERATION) return 0;
  if (a === UNKNOWN_GENERATION) return -1;
  if (b === UNKNOWN_GENERATION) return 1;
  if (a < 0 && b < 0) return b - a;
  return a - b;
}

export function lifeSpan(person: Person): string {
  const birth = person.birthDate?.trim() || "?";
  if (person.alive) return `${birth} —`;
  if (person.lifeStatus === "missing") return `${birth} — mất tích`;
  if (person.lifeStatus === "unknown") return `${birth} — ?`;
  const death = person.deathDate?.trim() || "?";
  return `${birth} — ${death}`;
}

/** Dòng thời gian kiểu phả đồ/phả ký sau khi áp chế độ riêng tư: ẩn ngày sinh của thành viên còn sống, chỉ ghi năm mất nếu chọn. */
export function displayLifeSpan(person: Person, privacy?: PrivacySettings): string {
  if (!privacy?.hideLivingDetails) return lifeSpan(person);
  if (lifeStatusOf(person) === "alive") return "Còn sống";
  if (privacy.deathYearOnly) {
    const year = (person.deathDate ?? "").trim().match(/\d{4}/)?.[0];
    return year ? `Mất ${year}` : "Đã khuất";
  }
  return lifeSpan(person);
}

/** Bản sao thành viên đã ẩn thông tin nhạy cảm theo chế độ riêng tư, dùng khi xuất CSV/Excel/GEDCOM. */
export function applyPrivacyToPerson(person: Person, privacy?: PrivacySettings): Person {
  if (!privacy?.hideLivingDetails && !privacy?.deathYearOnly) return person;
  if (privacy.hideLivingDetails && lifeStatusOf(person) === "alive") {
    return {
      ...person,
      birthDate: undefined,
      birthCalendar: undefined,
      birthLeap: undefined,
      phone: undefined,
      address: undefined,
    };
  }
  if (privacy.deathYearOnly && lifeStatusOf(person) !== "alive") {
    const year = (person.deathDate ?? "").trim().match(/\d{4}/)?.[0];
    return { ...person, birthDate: undefined, deathDate: year ?? undefined, deathLeap: undefined };
  }
  return person;
}

export function birthYear(person: Person): string {
  return person.birthDate?.trim() || "?";
}

export function ageText(person: Person): string {
  const birth = parseInt(person.birthDate ?? "", 10);
  if (Number.isNaN(birth)) return "";
  const endRaw =
    person.alive || person.lifeStatus === "missing" || person.lifeStatus === "unknown"
      ? person.alive
        ? new Date().getFullYear()
        : NaN
      : parseInt(person.deathDate ?? "", 10);
  if (Number.isNaN(endRaw)) return "";
  return `${endRaw - birth} tuổi`;
}

export interface VietnameseNameParts {
  surname: string;
  middle: string;
  given: string;
}

/** Tách họ, đệm và tên gọi theo thói quen ba chữ của người Việt. */
export function splitFullName(name: string): VietnameseNameParts {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { surname: "", middle: "", given: "" };
  if (parts.length === 1) return { surname: parts[0], middle: "", given: "" };
  return {
    surname: parts[0],
    middle: parts.slice(1, -1).join(" "),
    given: parts[parts.length - 1],
  };
}

export function sortByGivenName(a: Person, b: Person): number {
  const ga = splitFullName(a.name);
  const gb = splitFullName(b.name);
  return (
    ga.given.localeCompare(gb.given, "vi") ||
    ga.surname.localeCompare(gb.surname, "vi") ||
    a.name.localeCompare(b.name, "vi")
  );
}

export const SPOUSE_RANK_ORDER: Record<SpouseRank, number> = {
  chinh: 0,
  ke: 1,
  thu: 2,
  khac: 3,
};

/** Vợ/chồng theo thứ tự người dùng đặt, sau đó theo thứ bậc chánh/kế/thứ. */
export function orderedSpouses(person: Person, members: Person[]): Person[] {
  const map = new Map(members.map((m) => [m.id, m]));
  const base = person.spouseOrder?.length ? person.spouseOrder : person.spouseIds;
  const seen = new Set<string>();
  const list: Person[] = [];
  for (const id of [...base, ...person.spouseIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const spouse = map.get(id);
    if (spouse) list.push(spouse);
  }
  return list.sort((a, b) => {
    const ra = spouseRankFor(person, a.id);
    const rb = spouseRankFor(person, b.id);
    if (ra && rb && ra !== rb) return SPOUSE_RANK_ORDER[ra] - SPOUSE_RANK_ORDER[rb];
    if (ra && !rb) return -1;
    if (!ra && rb) return 1;
    return 0;
  });
}

/** Thứ bậc lưu trên người chồng; khi xem từ phía người vợ vẫn đọc được. */
export function spouseRankFor(person: Person, spouseId: string): SpouseRank | undefined {
  return person.spouseRank?.[spouseId];
}

export function spouseRankLabel(rank?: SpouseRank): string {
  if (!rank) return "";
  return rank === "chinh" ? "Chánh thất" : rank === "ke" ? "Kế thất" : rank === "thu" ? "Thứ thất" : "Khác";
}

export function nameAliases(person: Person): string {
  return [
    person.tabooName ? `Húy ${person.tabooName}` : "",
    person.courtesyName ? `Tự ${person.courtesyName}` : "",
    person.styleName ? `Hiệu ${person.styleName}` : "",
    person.posthumousName ? `Thụy ${person.posthumousName}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function careerSummary(person: Person): string {
  return [person.officeTitle, person.mandarinRank, person.honors].filter(Boolean).join(" · ");
}

export function generationOf(tree: FamilyTree, personId: string): number {
  return computeGenerations(tree.members, tree.founderId).get(personId) ?? 1;
}

export function spouseNames(tree: FamilyTree, person: Person): Person[] {
  return orderedSpouses(person, tree.members);
}

export function childrenOf(tree: FamilyTree, person: Person): Person[] {
  const index = buildFamilyIndex(tree.members, tree.founderId);
  return index.childrenAny.get(person.id) ?? [];
}

export function grandchildrenCount(tree: FamilyTree, person: Person): number {
  const children = childrenOf(tree, person);
  const set = new Set<string>();
  for (const child of children) for (const g of childrenOf(tree, child)) set.add(g.id);
  return set.size;
}

export function descentCount(tree: FamilyTree, person: Person): number {
  return descendants(tree.members, person.id).size;
}

/* ------------------------------- kinship ------------------------------- */

type Side = "paternal" | "maternal" | "unknown";

interface KinTerms {
  north: string;
  south: string;
}

function terms(north: string, south?: string): KinTerms {
  return { north, south: south ?? north };
}

function genderTerm(base: "anh" | "chị" | "em", gender: "male" | "female") {
  if (base === "anh") return gender === "male" ? "anh" : "chị";
  return base;
}

function olderSiblingTerm(gender: "male" | "female") {
  return gender === "male" ? "anh" : "chị";
}

function parentTerm(gender: "male" | "female"): KinTerms {
  return gender === "male" ? terms("bố", "ba") : terms("mẹ", "má");
}

function ancestorTerm(steps: number, side: Side, gender: "male" | "female"): KinTerms {
  if (steps === 1) return parentTerm(gender);
  if (steps === 2) {
    const n = side === "maternal" ? (gender === "male" ? "ông ngoại" : "bà ngoại") : gender === "male" ? "ông nội" : "bà nội";
    return terms(n);
  }
  if (steps === 3) return terms(gender === "male" ? "cụ ông" : "cụ bà");
  if (steps === 4) return terms(gender === "male" ? "kỵ ông" : "kỵ bà");
  return terms(gender === "male" ? "tổ ông" : "tổ bà");
}

function descendantTerm(steps: number, gender: "male" | "female"): KinTerms {
  if (steps === 1) return terms(gender === "male" ? "con trai" : "con gái", gender === "male" ? "con trai" : "con gái");
  if (steps === 2) return terms(gender === "male" ? "cháu trai" : "cháu gái");
  if (steps === 3) return terms(gender === "male" ? "chắt trai" : "chắt gái");
  if (steps === 4) return terms(gender === "male" ? "chít trai" : "chít gái");
  return terms(gender === "male" ? "cháu chắt" : "cháu chắt");
}

function uncleTerm(side: Side, parentGender: "male" | "female", olderThanParent: boolean, gender: "male" | "female"): KinTerms {
  if (parentGender === "male") {
    if (gender === "male") return terms(olderThanParent ? "bác" : "chú");
    return terms("cô");
  }
  if (gender === "male") return terms("cậu");
  return terms("dì");
}

export interface KinshipResult {
  aToB: KinTerms;
  bToA: KinTerms;
  explanation: string;
}

function parentOnPathToLca(members: Person[], childId: string, lcaId: string): Person | undefined {
  const byIdMap = new Map(members.map((m) => [m.id, m]));
  const child = byIdMap.get(childId);
  if (!child) return undefined;
  const candidates = [child.fatherId, child.motherId].filter(Boolean) as string[];
  if (child.ancestorLinkId && !candidates.includes(child.ancestorLinkId)) {
    candidates.push(child.ancestorLinkId);
  }
  for (const pid of candidates) {
    const parent = byIdMap.get(pid);
    if (!parent) continue;
    if (parent.id === lcaId || ancestorsOf(members, parent.id).has(lcaId)) return parent;
  }
  return candidates.length ? byIdMap.get(candidates[0]) : undefined;
}

function sideOfParent(parent: Person | undefined, child: Person | undefined): Side {
  if (!parent || !child) return "unknown";
  if (child.fatherId === parent.id) return "paternal";
  if (child.motherId === parent.id) return "maternal";
  return "unknown";
}

export function kinship(members: Person[], aId: string, bId: string): KinshipResult | null {
  const map = new Map(members.map((m) => [m.id, m]));
  const a = map.get(aId);
  const b = map.get(bId);
  if (!a || !b) return null;
  if (a.id === b.id) {
    return { aToB: terms("chính mình"), bToA: terms("chính mình"), explanation: "Hai người được chọn là cùng một thành viên." };
  }

  const common = commonAncestor(members, a.id, b.id);
  if (common) {
    const lca = map.get(common.id);
    const { dA, dB } = common;
    if (dA === 0 && dB === 0) return null;
    if (dA === 0) {
      const direct = ancestryRelation(members, a, b, dB);
      if (direct) return direct;
    }
    if (dB === 0) {
      const direct = ancestryRelation(members, b, a, dA);
      if (direct) return { aToB: direct.bToA, bToA: direct.aToB, explanation: direct.explanation };
    }
    if (dA === 1 && dB === 1) {
      const older = compareSiblings(a, b) <= 0 ? a : b;
      const younger = older.id === a.id ? b : a;
      const olderTerm = olderSiblingTerm(older.gender);
      const youngerTerm = genderTerm("em", younger.gender);
      const aOlder = older.id === a.id;
      return {
        aToB: terms(aOlder ? youngerTerm : olderTerm),
        bToA: terms(aOlder ? olderTerm : youngerTerm),
        explanation: `Cùng cha mẹ (hoặc cùng một đời), ${older.name} là ${olderTerm} và ${younger.name} là em. Người Việt tính vai vế theo thứ tự sinh, không theo tuổi tác bên ngoài.`,
      };
    }
    if (dA === 1 || dB === 1) {
      const relative = dA === 1 ? a : b;
      const other = dA === 1 ? b : a;
      const otherSteps = dA === 1 ? dB : dA;
      const childOnPath = parentOnPathToLca(members, other.id, common.id);
      const parent = childOnPath;
      const side = sideOfParent(parent, other);
      const olderThanParent = parent ? compareSiblings(relative, parent) <= 0 : false;
      const relativeTerm = uncleTerm(side, parent?.gender ?? "male", olderThanParent, relative.gender);
      const otherTerm = otherSteps === 2 ? descendantTerm(2, other.gender) : descendantTerm(otherSteps - 0, other.gender);
      const aIsRelative = relative.id === a.id;
      return {
        aToB: aIsRelative ? otherTerm : relativeTerm,
        bToA: aIsRelative ? relativeTerm : otherTerm,
        explanation: `${relative.name} cùng đời với ${parent?.name ?? "cha/mẹ"} của ${other.name}, nên ${relative.name} là ${relativeTerm.north} của ${other.name}.`,
      };
    }
    const sameGeneration = dA === dB;
    if (sameGeneration) {
      const older = compareCousinLineage(members, a, b, common.id) <= 0 ? a : b;
      const aOlder = older.id === a.id;
      const olderTerm = `${olderSiblingTerm(older.gender)} họ`;
      const youngerTerm = `em họ`;
      return {
        aToB: terms(aOlder ? youngerTerm : olderTerm),
        bToA: terms(aOlder ? olderTerm : youngerTerm),
        explanation: `${a.name} và ${b.name} là anh chị em họ, cùng đời thứ ${dA + 1} tính từ ${lca?.name ?? "tổ tiên chung"}. Vai vế tính theo ngành của cha/mẹ, không theo tuổi.`,
      };
    }
    const upper = dA < dB ? a : b;
    const lower = dA < dB ? b : a;
    const upperSide: Side = dA < dB ? "unknown" : "unknown";
    void upperSide;
    const upperTerm = terms(upper.gender === "male" ? "bác họ" : "cô họ");
    const lowerTerm = terms(lower.gender === "male" ? "cháu họ trai" : "cháu họ gái");
    const aUpper = upper.id === a.id;
    return {
      aToB: aUpper ? lowerTerm : upperTerm,
      bToA: aUpper ? upperTerm : lowerTerm,
      explanation: `${a.name} và ${b.name} có tổ tiên chung là ${lca?.name ?? "một cụ"}; ${upper.name} ở đời trên ${lower.name} nên được gọi bằng vai bác/cô/chú họ.`,
    };
  }

  return inLawKinship(members, a, b);
}

function compareSiblings(a: Person, b: Person): number {
  if (a.fatherId && a.fatherId === b.fatherId) {
    if (a.birthOrder !== b.birthOrder) return a.birthOrder - b.birthOrder;
  }
  const ay = parseInt(a.birthDate ?? "", 10);
  const by = parseInt(b.birthDate ?? "", 10);
  if (!Number.isNaN(ay) && !Number.isNaN(by) && ay !== by) return ay - by;
  return a.name.localeCompare(b.name, "vi");
}

function compareCousinLineage(members: Person[], a: Person, b: Person, lcaId: string): number {
  const parentA = parentOnPathToLca(members, a.id, lcaId);
  const parentB = parentOnPathToLca(members, b.id, lcaId);
  if (parentA && parentB) return compareSiblings(parentA, parentB);
  return 0;
}

function ancestryRelation(members: Person[], ancestor: Person, descendant: Person, steps: number): KinshipResult | null {
  if (steps <= 0) return null;
  let side: Side = "unknown";
  const childOnPath = parentOnPathToLca(members, descendant.id, ancestor.id);
  if (childOnPath) side = childOnPath.gender === "male" ? "paternal" : "maternal";
  const up = ancestorTerm(steps, side, ancestor.gender);
  const down = descendantTerm(steps, descendant.gender);
  return {
    aToB: down,
    bToA: up,
    explanation: `${ancestor.name} là ${up.north} của ${descendant.name} qua ${steps} đời.`,
  };
}

function inLawKinship(members: Person[], a: Person, b: Person): KinshipResult | null {
  const map = new Map(members.map((m) => [m.id, m]));
  const spouse = a.spouseIds.map((id) => map.get(id)).find((p) => p?.id === b.id);
  if (spouse) {
    const aTerm = a.gender === "male" ? terms("vợ") : terms("chồng");
    const bTerm = b.gender === "male" ? terms("vợ") : terms("chồng");
    return { aToB: bTerm, bToA: aTerm, explanation: `${a.name} và ${b.name} là vợ chồng.` };
  }
  const aSpouse = a.spouseIds.map((id) => map.get(id)).find(Boolean) as Person | undefined;
  const bSpouse = b.spouseIds.map((id) => map.get(id)).find(Boolean) as Person | undefined;
  const isParent = (parent?: Person, child?: Person) =>
    Boolean(parent && child && (child.fatherId === parent.id || child.motherId === parent.id));

  if (aSpouse && isParent(aSpouse, b)) {
    return {
      aToB: descendantTerm(1, b.gender),
      bToA: a.gender === "male" ? terms("bố kế", "ba kế") : terms("mẹ kế", "má kế"),
      explanation: `${b.name} là con của ${aSpouse.name}, vợ/chồng của ${a.name}.`,
    };
  }
  if (bSpouse && isParent(bSpouse, a)) {
    return {
      aToB: b.gender === "male" ? terms("bố kế", "ba kế") : terms("mẹ kế", "má kế"),
      bToA: descendantTerm(1, a.gender),
      explanation: `${a.name} là con của ${bSpouse.name}, vợ/chồng của ${b.name}.`,
    };
  }
  if (aSpouse && isParent(a, bSpouse)) {
    const term = bSpouse?.gender === "male" ? terms("con rể") : terms("con dâu");
    return {
      aToB: term,
      bToA: bSpouse?.gender === "male" ? terms("bố vợ", "ba vợ") : terms("mẹ chồng", "má chồng"),
      explanation: `${b.name} kết hôn với con của ${a.name}.`,
    };
  }
  if (bSpouse && isParent(b, aSpouse)) {
    const term = aSpouse?.gender === "male" ? terms("con rể") : terms("con dâu");
    return {
      aToB: aSpouse?.gender === "male" ? terms("bố vợ", "ba vợ") : terms("mẹ chồng", "má chồng"),
      bToA: term,
      explanation: `${a.name} kết hôn với con của ${b.name}.`,
    };
  }
  if (aSpouse && bSpouse) {
    const aParent = a.fatherId ?? a.motherId;
    const bParent = b.fatherId ?? b.motherId;
    if (aParent && aParent === bParent) {
      const term = a.gender === "male" ? terms("anh/chị/em dâu") : terms("anh/chị/em rể");
      return {
        aToB: term,
        bToA: term,
        explanation: `${a.name} và ${b.name} là vợ/chồng của hai anh chị em ruột.`,
      };
    }
  }
  return null;
}

export function kinshipText(result: KinshipResult, region: "north" | "south") {
  return result.aToB[region];
}
