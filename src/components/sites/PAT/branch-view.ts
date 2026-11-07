import type { FamilyTree, Person } from "./types";
import { classifyClan } from "./clan";

export type BranchCardStyle = "compact" | "full";

/**
 * Lựa chọn xem theo chi. Toàn bộ lựa chọn chỉ nằm trên URL, không ghi vào
 * chi phái hay hồ sơ thành viên.
 */
export interface BranchViewOptions {
  headId: string;
  /** Số đời trực hệ phía trên trưởng chi được hiển thị. */
  ancestorGenerations: number;
  /** Giới hạn số đời tính từ trưởng chi trở xuống; 0 = tất cả. */
  generationLimit: number;
  cardStyle: BranchCardStyle;
  /** Chữ hoành phi riêng cho lần xem này. */
  title: string;
}

export interface BranchScope {
  options: BranchViewOptions;
  head: Person;
  /** Mọi người được hiển thị: nội tộc, ngoại tộc một đời, dâu/rể và tiền tổ trực hệ. */
  ids: Set<string>;
  /** Người nội tộc thuộc chi, dùng để đếm thành viên. */
  memberIds: Set<string>;
  count: number;
  title: string;
  /** Số đời hậu duệ sâu nhất được hiển thị, tính trưởng chi là đời thứ nhất. */
  generationSpan: number;
}

function clampInt(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseBranchView(search: string): BranchViewOptions | null {
  const params = new URLSearchParams(search);
  const headId = params.get("chi")?.trim();
  if (!headId) return null;
  return {
    headId,
    ancestorGenerations: clampInt(params.get("tren"), 0, 12, 0),
    generationLimit: clampInt(params.get("gioihan"), 0, 30, 0),
    cardStyle: params.get("the") === "du" ? "full" : "compact",
    title: (params.get("hoanhphi") ?? "").slice(0, 160),
  };
}

export function branchViewHref(path: string, options: BranchViewOptions): string {
  const params = new URLSearchParams();
  params.set("chi", options.headId);
  if (options.ancestorGenerations > 0) params.set("tren", String(options.ancestorGenerations));
  if (options.generationLimit > 0) params.set("gioihan", String(options.generationLimit));
  params.set("the", options.cardStyle === "full" ? "du" : "gon");
  if (options.title.trim()) params.set("hoanhphi", options.title.trim());
  return `${path}?${params.toString()}`;
}

/**
 * Chi của một trưởng chi gồm toàn bộ hậu duệ nội tộc nam và nữ. Dâu/rể đi
 * cạnh người hôn phối; con của con gái hiện một đời nhưng không tính vào số
 * lượng chi. Tiền tổ phía trên chỉ thêm đúng chuỗi trực hệ, không kéo theo
 * anh chị em của các bậc đó.
 */
export function computeBranchScope(
  tree: FamilyTree,
  options: BranchViewOptions,
): BranchScope | null {
  const clan = classifyClan(tree.members, tree.founderId);
  const byId = new Map(tree.members.map((person) => [person.id, person]));
  const head = byId.get(options.headId);
  if (!head || clan.roleOf(head.id) !== "clan") return null;

  const limit = Math.max(0, Math.trunc(options.generationLimit));
  const ancestorGenerations = Math.max(0, Math.trunc(options.ancestorGenerations));
  const ids = new Set<string>();
  const memberIds = new Set<string>();
  const visited = new Set<string>();
  let maxDepth = 0;

  const queue: { id: string; depth: number }[] = [{ id: head.id, depth: 0 }];
  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const person = byId.get(id);
    if (!person) continue;
    const role = clan.roleOf(id);
    if (role === "outside" || role === "reference") continue;
    const shown = limit <= 0 || depth < limit;
    if (shown) ids.add(id);
    if (role === "clan") {
      memberIds.add(id);
      if (shown) maxDepth = Math.max(maxDepth, depth);
    }
    if (shown) {
      for (const spouseId of person.spouseIds) {
        if (!byId.has(spouseId)) continue;
        if (clan.roleOf(spouseId) === "inLaw") ids.add(spouseId);
      }
    }
    for (const child of clan.clanChildren.get(id) ?? []) {
      if (!visited.has(child.id)) queue.push({ id: child.id, depth: depth + 1 });
    }
  }

  let cursor: Person | undefined = head;
  for (let step = 0; step < ancestorGenerations; step++) {
    const parentId = clan.lineParent(cursor);
    if (!parentId) break;
    const parent = byId.get(parentId);
    if (!parent) break;
    const role = clan.roleOf(parentId);
    if (role === "outside" || role === "reference") break;
    ids.add(parentId);
    for (const spouseId of parent.spouseIds) {
      if (!byId.has(spouseId)) continue;
      const spouseRole = clan.roleOf(spouseId);
      if (spouseRole === "inLaw" || spouseRole === "ancestor") ids.add(spouseId);
    }
    cursor = parent;
  }

  const title = options.title.trim() || `Chi ${head.name}`;
  return {
    options: { ...options, title, generationLimit: limit, ancestorGenerations },
    head,
    ids,
    memberIds,
    count: memberIds.size,
    title,
    generationSpan: maxDepth + 1,
  };
}
