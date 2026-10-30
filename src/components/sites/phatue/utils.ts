import type { FamilyTree, Person } from "./types";

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function byId(tree: FamilyTree): Map<string, Person> {
  return new Map(tree.members.map((m) => [m.id, m]));
}

export function computeGenerations(members: Person[]): Map<string, number> {
  const ids = new Set(members.map((m) => m.id));
  const gen = new Map<string, number>();
  for (const p of members) {
    const hasFather = p.fatherId && ids.has(p.fatherId);
    const hasMother = p.motherId && ids.has(p.motherId);
    if (!hasFather && !hasMother) gen.set(p.id, 1);
  }
  for (let pass = 0; pass < 30; pass++) {
    let changed = false;
    for (const p of members) {
      let next = gen.get(p.id) ?? 0;
      if (p.fatherId && ids.has(p.fatherId)) next = Math.max(next, (gen.get(p.fatherId) ?? 0) + 1);
      if (p.motherId && ids.has(p.motherId)) next = Math.max(next, (gen.get(p.motherId) ?? 0) + 1);
      for (const sid of p.spouseIds) {
        if (ids.has(sid)) next = Math.max(next, gen.get(sid) ?? 0);
      }
      if (next > 0 && next !== gen.get(p.id)) {
        gen.set(p.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const p of members) if (!gen.get(p.id)) gen.set(p.id, 1);
  return gen;
}

export interface FamilyIndex {
  ids: Set<string>;
  bloodline: Set<string>;
  lineParent: (p: Person) => string | undefined;
  childrenOf: Map<string, Person[]>;
  childrenAny: Map<string, Person[]>;
}

export function buildFamilyIndex(members: Person[]): FamilyIndex {
  const ids = new Set(members.map((m) => m.id));
  const byIdMap = new Map(members.map((m) => [m.id, m]));
  const bloodline = new Set<string>();
  for (const p of members) {
    if ((p.fatherId && ids.has(p.fatherId)) || (p.motherId && ids.has(p.motherId))) bloodline.add(p.id);
  }
  const anchor = new Set<string>();
  for (const p of members) {
    if (p.fatherId && ids.has(p.fatherId)) anchor.add(p.fatherId);
    else if (p.motherId && ids.has(p.motherId)) anchor.add(p.motherId);
  }
  for (const p of members) {
    if (p.fatherId || p.motherId) continue;
    if (!anchor.has(p.id)) continue;
    const spouseIsBlood = p.spouseIds.some((sid) => bloodline.has(sid));
    if (!spouseIsBlood) bloodline.add(p.id);
  }
  const lineParent = (p: Person): string | undefined => {
    if (p.fatherId && ids.has(p.fatherId) && bloodline.has(p.fatherId)) return p.fatherId;
    if (p.motherId && ids.has(p.motherId) && bloodline.has(p.motherId)) return p.motherId;
    if (p.fatherId && ids.has(p.fatherId)) return p.fatherId;
    if (p.motherId && ids.has(p.motherId)) return p.motherId;
    return undefined;
  };
  const childrenOf = new Map<string, Person[]>();
  const childrenAny = new Map<string, Person[]>();
  for (const p of members) {
    const parent = lineParent(p);
    if (parent) {
      const list = childrenOf.get(parent) ?? [];
      list.push(p);
      childrenOf.set(parent, list);
    }
    if (p.fatherId && ids.has(p.fatherId)) {
      const list = childrenAny.get(p.fatherId) ?? [];
      list.push(p);
      childrenAny.set(p.fatherId, list);
    }
    if (p.motherId && ids.has(p.motherId)) {
      const list = childrenAny.get(p.motherId) ?? [];
      list.push(p);
      childrenAny.set(p.motherId, list);
    }
  }
  for (const list of childrenOf.values()) list.sort(sortPersons);
  for (const list of childrenAny.values()) list.sort(sortPersons);
  void byIdMap;
  return { ids, bloodline, lineParent, childrenOf, childrenAny };
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

export function descendants(members: Person[], id: string): Set<string> {
  const byIdMap = new Map(members.map((m) => [m.id, m]));
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    for (const m of members) {
      if (out.has(m.id)) continue;
      if (m.fatherId === current || m.motherId === current) {
        out.add(m.id);
        stack.push(m.id);
      }
    }
    void byIdMap;
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
  const total = tree.members.length;
  const male = tree.members.filter((m) => m.gender === "male").length;
  const female = total - male;
  const alive = tree.members.filter((m) => m.alive).length;
  const generations = computeGenerations(tree.members);
  const maxGen = Math.max(1, ...Array.from(generations.values()));
  return { total, male, female, alive, deceased: total - alive, generations: maxGen };
}

export function getGenerationStats(tree: FamilyTree) {
  const gens = computeGenerations(tree.members);
  const rows = new Map<number, { generation: number; male: number; female: number; total: number }>();
  for (const m of tree.members) {
    const g = gens.get(m.id) ?? 1;
    const row = rows.get(g) ?? { generation: g, male: 0, female: 0, total: 0 };
    row.total += 1;
    if (m.gender === "male") row.male += 1;
    else row.female += 1;
    rows.set(g, row);
  }
  return Array.from(rows.values()).sort((a, b) => a.generation - b.generation);
}

export function lifeSpan(person: Person): string {
  const birth = person.birthDate?.trim() || "?";
  const death = person.alive ? "" : person.deathDate?.trim() || "?";
  return person.alive ? `${birth} —` : `${birth} — ${death}`;
}

export function birthYear(person: Person): string {
  return person.birthDate?.trim() || "?";
}

export function ageText(person: Person): string {
  const birth = parseInt(person.birthDate ?? "", 10);
  if (Number.isNaN(birth)) return "";
  const endRaw = person.alive ? new Date().getFullYear() : parseInt(person.deathDate ?? "", 10);
  if (Number.isNaN(endRaw)) return "";
  return `${endRaw - birth} tuổi`;
}

export function generationOf(tree: FamilyTree, personId: string): number {
  return computeGenerations(tree.members).get(personId) ?? 1;
}

export function spouseNames(tree: FamilyTree, person: Person): Person[] {
  const map = byId(tree);
  return person.spouseIds.map((id) => map.get(id)).filter((p): p is Person => Boolean(p));
}

export function childrenOf(tree: FamilyTree, person: Person): Person[] {
  const index = buildFamilyIndex(tree.members);
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
