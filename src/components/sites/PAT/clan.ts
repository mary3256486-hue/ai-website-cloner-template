import type { Person, SpouseRank } from "./types";
import { UNKNOWN_GENERATION } from "./types";

/**
 * Phạm vi một dòng họ trong cây gia phả.
 *
 * - `ancestor`: các bậc tiền tổ phía trên Sơ Tổ.
 * - `clan`: người thuộc dòng họ đang soạn (nội tộc).
 * - `inLaw`: dâu/rể kết hôn vào dòng họ, hiển thị cạnh người hôn phối.
 * - `maternal`: con của con gái — thuộc dòng họ bên chồng, chỉ hiển thị một đời.
 * - `reference`: hồ sơ tham khảo (thường là cha/mẹ của dâu/rể), không lên phả đồ.
 * - `outside`: ngoài phạm vi hiển thị, không tham gia tính đời.
 */
export type ClanRole = "ancestor" | "clan" | "inLaw" | "maternal" | "reference" | "outside";

export const CLAN_ROLE_LABELS: Record<ClanRole, string> = {
  ancestor: "Tiền tổ",
  clan: "Nội tộc",
  inLaw: "Dâu/rể",
  maternal: "Ngoại tộc",
  reference: "Tham khảo",
  outside: "Ngoài phả đồ",
};

export const CLAN_ROLE_HINTS: Record<ClanRole, string> = {
  ancestor: "Bậc tiền tổ phía trên Sơ Tổ, hiển thị ở các hàng đời âm.",
  clan: "Người mang họ của dòng họ đang soạn, tính đời và chi phái theo dòng cha.",
  inLaw: "Dâu/rể kết hôn vào dòng họ; đời theo vợ/chồng, cha mẹ chỉ là thông tin tham khảo.",
  maternal: "Con của con gái, thuộc dòng họ bên chồng; chỉ nhập và hiển thị một đời.",
  reference: "Hồ sơ tham khảo, không hiện trên phả đồ và không ảnh hưởng cách tính đời.",
  outside: "Ngoài phạm vi dòng họ, không hiện trên phả đồ.",
};

export interface ClanIndex {
  roles: Map<string, ClanRole>;
  founderId?: string;
  ancestorTier: Map<string, number>;
  ancestorIds: Set<string>;
  clanIds: Set<string>;
  inLawIds: Set<string>;
  maternalIds: Set<string>;
  referenceIds: Set<string>;
  outsideIds: Set<string>;
  /** Hậu duệ của con gái từ đời thứ hai trở xuống (n+2 trở đi). */
  beyondMaternalIds: Set<string>;
  /** Vợ/chồng của dâu/rể, chỉ để đối chiếu khi hiển thị hồ sơ. */
  spouseInLawOf: Map<string, string>;
  roleOf: (id: string) => ClanRole;
  isDisplayed: (id: string) => boolean;
  /** Cha/mẹ trong dòng họ dùng để xếp cây; dâu/rể và hồ sơ tham khảo trả về undefined. */
  clanFather: (person: Person) => string | undefined;
  /** Cha/mẹ dùng để nối các hàng đời, gồm cả liên kết tiền tổ. */
  lineParent: (person: Person) => string | undefined;
  clanChildren: Map<string, Person[]>;
}

function childMaps(members: Person[]) {
  const byFather = new Map<string, Person[]>();
  const byMother = new Map<string, Person[]>();
  for (const person of members) {
    if (person.fatherId) {
      const list = byFather.get(person.fatherId) ?? [];
      list.push(person);
      byFather.set(person.fatherId, list);
    }
    if (person.motherId) {
      const list = byMother.get(person.motherId) ?? [];
      list.push(person);
      byMother.set(person.motherId, list);
    }
  }
  return { byFather, byMother };
}

function resolveFounder(
  members: Person[],
  byId: Map<string, Person>,
  byFather: Map<string, Person[]>,
  byMother: Map<string, Person[]>,
  founderId?: string,
): Person | undefined {
  if (founderId) {
    const explicit = byId.get(founderId);
    if (explicit && !explicit.reference) return explicit;
  }
  const eligible = members.filter(
    (person) => !person.reference && !(person.ancestorOrder && person.ancestorOrder > 0),
  );
  if (!eligible.length) return undefined;
  const zero = eligible.filter((person) => person.generation === 0);
  const roots = eligible.filter(
    (person) => !person.fatherId && !person.motherId && !person.ancestorLinkId,
  );
  const pool = zero.length ? zero : roots.length ? roots : eligible;
  const score = (person: Person) =>
    (byFather.get(person.id)?.length ?? 0) + (byMother.get(person.id)?.length ?? 0);
  return [...pool].sort(
    (a, b) =>
      score(b) - score(a) ||
      (a.birthOrder ?? 0) - (b.birthOrder ?? 0) ||
      a.name.localeCompare(b.name, "vi"),
  )[0];
}

export function classifyClan(members: Person[], founderId?: string): ClanIndex {
  const byId = new Map(members.map((person) => [person.id, person]));
  const { byFather, byMother } = childMaps(members);
  const founder = resolveFounder(members, byId, byFather, byMother, founderId);

  /* ------------------------------ tiền tổ ------------------------------ */
  const chain: string[] = [];
  let cursor = founder;
  const guard = new Set<string>(founder ? [founder.id] : []);
  while (cursor?.ancestorLinkId) {
    const target = byId.get(cursor.ancestorLinkId);
    if (!target || guard.has(target.id)) break;
    guard.add(target.id);
    chain.push(target.id);
    cursor = target;
  }
  const ancestorTier = new Map<string, number>();
  const depth = chain.length;
  chain.forEach((id, index) => ancestorTier.set(id, depth - index));
  // Bậc tiền tổ nhập tay được ưu tiên hơn suy ra từ chuỗi liên kết.
  for (const person of members) {
    if (person.ancestorOrder && person.ancestorOrder > 0) {
      ancestorTier.set(person.id, Math.trunc(person.ancestorOrder));
    }
  }
  // Vợ/chồng của tiền tổ cùng hàng tiền tổ để hiển thị cạnh nhau.
  for (const [id, tier] of [...ancestorTier]) {
    const person = byId.get(id);
    if (!person) continue;
    for (const spouseId of person.spouseIds) {
      if (!byId.has(spouseId) || ancestorTier.has(spouseId)) continue;
      ancestorTier.set(spouseId, tier);
    }
  }
  const ancestorIds = new Set(ancestorTier.keys());

  /* ------------------------------ nội tộc ------------------------------ */
  const clanIds = new Set<string>();
  const maternalIds = new Set<string>();
  if (founder && !ancestorIds.has(founder.id)) {
    clanIds.add(founder.id);
    const queue = [founder.id];
    while (queue.length) {
      const id = queue.shift()!;
      const person = byId.get(id);
      if (!person) continue;
      const isFounder = person.id === founder.id;
      const children =
        person.gender === "male"
          ? byFather.get(person.id) ?? []
          : byMother.get(person.id) ?? [];
      for (const child of children) {
        if (child.id === id) continue;
        if (ancestorIds.has(child.id) || child.reference) continue;
        if (clanIds.has(child.id) || maternalIds.has(child.id)) continue;
        // Con trai nối dòng họ; con gái vẫn thuộc dòng họ nhưng con của cô ấy thì không.
        // Nếu chính Sơ Tổ là nữ, con của bà được tính là đời kế tiếp của dòng họ.
        if (person.gender === "male" || (isFounder && person.gender === "female")) {
          clanIds.add(child.id);
          queue.push(child.id);
        } else {
          maternalIds.add(child.id);
        }
      }
    }
  }

  /* ------------------------------ dâu/rể ------------------------------- */
  const inLawIds = new Set<string>();
  const spouseInLawOf = new Map<string, string>();
  for (const id of [...ancestorIds, ...clanIds]) {
    const person = byId.get(id);
    if (!person) continue;
    for (const spouseId of person.spouseIds) {
      if (!byId.has(spouseId)) continue;
      if (ancestorIds.has(spouseId) || clanIds.has(spouseId) || maternalIds.has(spouseId)) continue;
      inLawIds.add(spouseId);
      if (!spouseInLawOf.has(spouseId)) spouseInLawOf.set(spouseId, id);
    }
  }

  /* ---------------------- hồ sơ tham khảo của dâu/rể --------------------- */
  const referenceIds = new Set<string>();
  const pending: string[] = [];
  for (const id of inLawIds) {
    const person = byId.get(id);
    if (!person) continue;
    if (person.fatherId) pending.push(person.fatherId);
    if (person.motherId) pending.push(person.motherId);
  }
  while (pending.length) {
    const id = pending.pop()!;
    const person = byId.get(id);
    if (!person) continue;
    if (
      ancestorIds.has(id) ||
      clanIds.has(id) ||
      maternalIds.has(id) ||
      inLawIds.has(id) ||
      referenceIds.has(id)
    ) {
      continue;
    }
    referenceIds.add(id);
    if (person.fatherId) pending.push(person.fatherId);
    if (person.motherId) pending.push(person.motherId);
    if (person.ancestorLinkId) pending.push(person.ancestorLinkId);
  }
  for (const person of members) {
    if (!person.reference) continue;
    if (ancestorIds.has(person.id) || clanIds.has(person.id) || maternalIds.has(person.id)) continue;
    if (inLawIds.has(person.id)) continue;
    referenceIds.add(person.id);
  }

  /* --------------------- ngoại tộc vượt quá n+1 ---------------------- */
  const beyondMaternalIds = new Set<string>();
  const beyondQueue = [...maternalIds];
  while (beyondQueue.length) {
    const id = beyondQueue.shift()!;
    const children = [...(byFather.get(id) ?? []), ...(byMother.get(id) ?? [])];
    for (const child of children) {
      if (beyondMaternalIds.has(child.id)) continue;
      if (ancestorIds.has(child.id) || clanIds.has(child.id) || maternalIds.has(child.id)) continue;
      if (inLawIds.has(child.id) || referenceIds.has(child.id)) continue;
      beyondMaternalIds.add(child.id);
      beyondQueue.push(child.id);
    }
  }

  const roles = new Map<string, ClanRole>();
  const outsideIds = new Set<string>();
  for (const person of members) {
    const id = person.id;
    const role: ClanRole = ancestorIds.has(id)
      ? "ancestor"
      : clanIds.has(id)
        ? "clan"
        : inLawIds.has(id)
          ? "inLaw"
          : maternalIds.has(id)
            ? "maternal"
            : referenceIds.has(id)
              ? "reference"
              : "outside";
    roles.set(id, role);
    if (role === "outside") outsideIds.add(id);
  }

  const roleOf = (id: string): ClanRole => roles.get(id) ?? "outside";
  const isDisplayed = (id: string) =>
    roleOf(id) === "ancestor" ||
    roleOf(id) === "clan" ||
    roleOf(id) === "inLaw" ||
    roleOf(id) === "maternal";

  const clanFather = (person: Person): string | undefined => {
    const role = roleOf(person.id);
    if (role === "clan") {
      if (person.fatherId && clanIds.has(person.fatherId)) return person.fatherId;
      if (person.motherId && clanIds.has(person.motherId)) return person.motherId;
      return undefined;
    }
    if (role === "maternal") {
      if (person.motherId && clanIds.has(person.motherId)) return person.motherId;
      return undefined;
    }
    return undefined;
  };

  const lineParent = (person: Person): string | undefined => {
    const role = roleOf(person.id);
    if (role === "ancestor") {
      return person.ancestorLinkId && ancestorIds.has(person.ancestorLinkId)
        ? person.ancestorLinkId
        : undefined;
    }
    const parent = clanFather(person);
    if (parent) return parent;
    if (role === "clan" && person.ancestorLinkId && ancestorIds.has(person.ancestorLinkId)) {
      return person.ancestorLinkId;
    }
    return undefined;
  };

  const clanChildren = new Map<string, Person[]>();
  for (const person of members) {
    const role = roleOf(person.id);
    if (role !== "ancestor" && role !== "clan" && role !== "maternal") continue;
    const parent = lineParent(person);
    if (!parent) continue;
    const list = clanChildren.get(parent) ?? [];
    list.push(person);
    clanChildren.set(parent, list);
  }

  return {
    roles,
    founderId: founder?.id,
    ancestorTier,
    ancestorIds,
    clanIds,
    inLawIds,
    maternalIds,
    referenceIds,
    outsideIds,
    beyondMaternalIds,
    spouseInLawOf,
    roleOf,
    isDisplayed,
    clanFather,
    lineParent,
    clanChildren,
  };
}

/* ----------------------------- tính đời ----------------------------- */

interface RelationEdge {
  from: string;
  to: string;
  key: string;
}

/** Tìm vòng lặp cha/mẹ/liên kết tiền tổ để không lan truyền đời sai vô hạn. */
export function findClanCycles(members: Person[]): { edges: Set<string>; cycles: string[][] } {
  const ids = new Set(members.map((person) => person.id));
  const edges: RelationEdge[] = [];
  const push = (from: string | undefined, to: string) => {
    if (!from || from === to || !ids.has(from)) return;
    edges.push({ from, to, key: `${from}>${to}` });
  };
  for (const person of members) {
    push(person.fatherId, person.id);
    push(person.motherId, person.id);
    push(person.ancestorLinkId, person.id);
  }
  const outgoing = new Map<string, RelationEdge[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }
  const state = new Map<string, 0 | 1 | 2>();
  const bad = new Set<string>();
  const cycles: string[][] = [];
  const seenCycles = new Set<string>();
  const stack: string[] = [];
  const stackEdges: RelationEdge[] = [];

  const visit = (id: string) => {
    state.set(id, 1);
    stack.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const childState = state.get(edge.to) ?? 0;
      if (childState === 0) {
        stackEdges.push(edge);
        visit(edge.to);
        stackEdges.pop();
      } else if (childState === 1) {
        const start = stack.indexOf(edge.to);
        if (start !== -1) {
          const path = stack.slice(start);
          const signature = [...path].sort().join("|");
          if (!seenCycles.has(signature)) {
            seenCycles.add(signature);
            cycles.push(path);
          }
          for (let i = start; i < stackEdges.length; i++) bad.add(stackEdges[i].key);
          bad.add(edge.key);
        }
      }
    }
    stack.pop();
    state.set(id, 2);
  };

  for (const person of members) if (!state.get(person.id)) visit(person.id);
  return { edges: bad, cycles };
}

/**
 * Đời của từng người, chỉ tính trong phạm vi dòng họ:
 * tiền tổ nhận hàng âm, nội tộc và ngoại tộc suy từ cha/mẹ trong họ,
 * dâu/rể luôn đứng cùng hàng với vợ/chồng, hồ sơ tham khảo suy ngược từ con.
 */
export function computeClanGenerations(members: Person[], founderId?: string): Map<string, number> {
  const clan = classifyClan(members, founderId);
  const ids = new Set(members.map((person) => person.id));
  const byIdMap = new Map(members.map((person) => [person.id, person]));
  const { edges: cycleEdges } = findClanCycles(members);
  const gen = new Map<string, number>();
  const locked = new Set<string>();

  for (const person of members) {
    const role = clan.roleOf(person.id);
    if (role === "ancestor") {
      const tier = clan.ancestorTier.get(person.id);
      if (tier) {
        gen.set(person.id, -tier);
        locked.add(person.id);
      }
      continue;
    }
    if (
      (role === "clan" || role === "maternal" || role === "reference") &&
      typeof person.generation === "number" &&
      Number.isFinite(person.generation)
    ) {
      gen.set(person.id, Math.trunc(person.generation));
      locked.add(person.id);
    }
  }

  const founder = clan.founderId ? byIdMap.get(clan.founderId) : undefined;
  if (founder && !gen.has(founder.id)) {
    gen.set(founder.id, 0);
    locked.add(founder.id);
  }

  const settle = (to: string, candidate: number) => {
    if (locked.has(to) || candidate === UNKNOWN_GENERATION) return false;
    const current = gen.get(to);
    const next = current === undefined ? candidate : Math.max(current, candidate);
    if (next === current) return false;
    gen.set(to, next);
    return true;
  };

  for (let pass = 0; pass < 80; pass++) {
    let changed = false;
    for (const person of members) {
      if (!ids.has(person.id)) continue;
      const role = clan.roleOf(person.id);
      if (role === "clan" || role === "maternal") {
        const parent = clan.lineParent(person);
        if (!parent || cycleEdges.has(`${parent}>${person.id}`)) continue;
        const parentGen = gen.get(parent);
        if (parentGen === undefined || parentGen === UNKNOWN_GENERATION) continue;
        if (settle(person.id, parentGen + 1)) changed = true;
      } else if (role === "inLaw") {
        for (const spouseId of person.spouseIds) {
          if (!ids.has(spouseId)) continue;
          const spouseGen = gen.get(spouseId);
          if (spouseGen === undefined || spouseGen === UNKNOWN_GENERATION) continue;
          if (settle(person.id, spouseGen)) changed = true;
        }
      } else if (role === "reference") {
        // Cha/mẹ của dâu/rể đứng trên con một đời, chỉ để hiển thị trong hồ sơ.
        for (const child of members) {
          if (child.fatherId !== person.id && child.motherId !== person.id) continue;
          const childGen = gen.get(child.id);
          if (childGen === undefined || childGen === UNKNOWN_GENERATION) continue;
          if (settle(person.id, childGen - 1)) changed = true;
        }
      }
    }
    if (!changed) break;
  }

  for (const person of members) {
    if (gen.get(person.id) === undefined) gen.set(person.id, UNKNOWN_GENERATION);
  }
  return gen;
}

/* ------------------ ẩn hồ sơ ngoài phả đồ vào ghi chú ------------------ */

export const OUTSIDE_NOTE_PREFIX = "Ngoài phả đồ: ";

export interface FoldedOutsideMember {
  person: Person;
  anchorId: string;
  anchorName: string;
}

export interface OutsideFoldResult {
  members: Person[];
  /** Hồ sơ đã ẩn khỏi trang; thông tin được chuyển vào ghi chú của thân nhân gần nhất. */
  folded: FoldedOutsideMember[];
  /** Hồ sơ ngoài phả đồ không gộp được vào ghi chú, vẫn hiển thị để rà soát. */
  orphans: Person[];
  removedIds: Set<string>;
}

function compact(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function outsideSpan(person: Person) {
  const birth = compact(person.birthDate);
  const death = compact(person.deathDate);
  if (birth && death) return ` (${birth}–${death})`;
  if (birth) return ` (sinh ${birth})`;
  if (death) return ` (mất ${death})`;
  return "";
}

function outsideNote(person: Person, relation: string) {
  const personNote = compact(person.notes);
  const details = [
    person.hometown ? `quê ${compact(person.hometown)}` : "",
    compact(person.occupation),
    personNote.length > 120 ? `${personNote.slice(0, 117)}…` : personNote,
  ].filter(Boolean);

  return `${OUTSIDE_NOTE_PREFIX}${relation} ${person.name}${outsideSpan(person)}${
    details.length ? ` — ${details.join(", ")}` : ""
  }.`;
}

function childIndex(members: Person[]) {
  const map = new Map<string, Person[]>();
  for (const person of members) {
    for (const parentId of [person.fatherId, person.motherId]) {
      if (!parentId) continue;
      const list = map.get(parentId) ?? [];
      list.push(person);
      map.set(parentId, list);
    }
  }
  return map;
}

/**
 * Ẩn các hồ sơ nằm ngoài phạm vi dòng họ (vợ/chồng và hậu duệ từ đời n+2 của con gái)
 * rồi chuyển thông tin của họ vào ghi chú của người thân gần nhất còn hiển thị.
 * Người ngoài phả đồ không nối được với ai thì giữ nguyên để người dùng bổ sung liên kết.
 */
export function foldOutsideMembers(members: Person[], founderId?: string): OutsideFoldResult {
  const clan = classifyClan(members, founderId);
  const outside = members.filter((person) => clan.roleOf(person.id) === "outside");
  if (!outside.length) {
    return { members, folded: [], orphans: [], removedIds: new Set() };
  }

  const byId = new Map(members.map((person) => [person.id, person]));
  const children = childIndex(members);

  const candidates = new Set<string>();
  const queue = [...clan.maternalIds];
  const addSpouses = (person: Person) => {
    for (const spouseId of person.spouseIds) {
      if (clan.roleOf(spouseId) === "outside") candidates.add(spouseId);
    }
  };
  while (queue.length) {
    const id = queue.shift()!;
    const person = byId.get(id);
    if (!person) continue;
    addSpouses(person);
    for (const child of children.get(id) ?? []) {
      if (clan.roleOf(child.id) !== "outside" || candidates.has(child.id)) continue;
      candidates.add(child.id);
      addSpouses(child);
      queue.push(child.id);
    }
  }

  const neighbours = (id: string) => {
    const person = byId.get(id);
    if (!person) return [];
    return [
      person.fatherId,
      person.motherId,
      ...person.spouseIds,
      person.ancestorLinkId,
      ...(children.get(id) ?? []).map((child) => child.id),
    ].filter((value): value is string => Boolean(value) && value !== id);
  };

  const findAnchor = (person: Person) => {
    const seen = new Set<string>([person.id]);
    let frontier = neighbours(person.id);
    let depth = 1;
    while (frontier.length && depth <= 8) {
      const next: string[] = [];
      for (const id of frontier) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (clan.isDisplayed(id)) return { id, depth };
        next.push(...neighbours(id));
      }
      frontier = next;
      depth += 1;
    }
    return null;
  };

  const anchorFor = new Map<string, { id: string; depth: number }>();
  for (const person of outside) {
    if (!candidates.has(person.id)) continue;
    const anchor = findAnchor(person);
    if (anchor) anchorFor.set(person.id, anchor);
  }
  const orphans = outside.filter((person) => !anchorFor.has(person.id));

  const descendsFrom = (id: string, ancestorId: string) => {
    const stack = [id];
    const seen = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (!current || seen.has(current)) continue;
      seen.add(current);
      const person = byId.get(current);
      if (!person) continue;
      for (const parentId of [person.fatherId, person.motherId]) {
        if (!parentId) continue;
        if (parentId === ancestorId) return true;
        stack.push(parentId);
      }
    }
    return false;
  };

  const relationFor = (anchor: Person, person: Person, depth: number) => {
    if (person.fatherId === anchor.id || person.motherId === anchor.id) return "con";
    if (person.spouseIds.includes(anchor.id)) return person.gender === "male" ? "chồng" : "vợ";
    if (anchor.fatherId === person.id || anchor.motherId === person.id) return "cha/mẹ";
    if (person.spouseIds.some((spouseId) => descendsFrom(spouseId, anchor.id))) return "dâu/rể";
    return depth <= 1 ? "thân nhân" : "cháu";
  };

  const noteLines = new Map<string, string[]>();
  for (const [personId, anchor] of anchorFor) {
    const person = byId.get(personId);
    const anchorPerson = byId.get(anchor.id);
    if (!person || !anchorPerson) continue;
    const text = outsideNote(person, relationFor(anchorPerson, person, anchor.depth));
    const lines = noteLines.get(anchor.id) ?? [];
    if (!lines.includes(text)) lines.push(text);
    noteLines.set(anchor.id, lines);
  }

  const removedIds = new Set(anchorFor.keys());
  const nextMembers = members
    .filter((person) => !removedIds.has(person.id))
    .map((person) => {
      const spouseIds = person.spouseIds.filter((id) => !removedIds.has(id));
      const spouseOrder = person.spouseOrder?.filter((id) => !removedIds.has(id));
      const spouseRank = person.spouseRank
        ? Object.fromEntries(
            Object.entries(person.spouseRank).filter(([id]) => !removedIds.has(id)),
          ) as Record<string, SpouseRank>
        : undefined;

      let notes = person.notes;
      const lines = noteLines.get(person.id);
      if (lines?.length) {
        const base = notes ?? "";
        const additions = lines.filter((line) => !base.includes(line));
        notes = [base, ...additions].filter(Boolean).join("\n");
      }

      const changed =
        spouseIds.length !== person.spouseIds.length ||
        (spouseOrder?.length ?? 0) !== (person.spouseOrder?.length ?? 0) ||
        Object.keys(spouseRank ?? {}).length !== Object.keys(person.spouseRank ?? {}).length ||
        notes !== person.notes;
      if (!changed) return person;
      return {
        ...person,
        spouseIds,
        spouseOrder: spouseOrder?.length ? spouseOrder : undefined,
        spouseRank,
        notes,
      };
    });

  const folded: FoldedOutsideMember[] = [...anchorFor.entries()].map(([personId, anchor]) => {
    const person = byId.get(personId)!;
    return { person, anchorId: anchor.id, anchorName: byId.get(anchor.id)?.name ?? "" };
  });

  return { members: nextMembers, folded, orphans, removedIds };
}
