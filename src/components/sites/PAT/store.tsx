"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Branch, Decoration, DesignSettings, FamilyTree, LinkConfidence, Person } from "./types";
import { DEFAULT_DESIGN, FAMILY_TREE_SCHEMA_VERSION } from "./types";
import { ensurePersonCodes, nextPersonCode, uid } from "./utils";
import { foldOutsideMembers } from "./clan";
import { createDemoTree } from "./seed";

export const STORAGE_KEY = "phatue.familyTrees.v1";
const TRASH_KEY = "phatue.familyTrees.trash.v1";
const SEED_VERSION_KEY = "phatue.seedVersion.v1";
// Bump it whenever the demo tree changes so browsers stop showing the cached older sample.
const SEED_VERSION = "2026-11-03c";

interface LegacyPerson extends Person {
  linkToId?: string;
  linkRelation?: string;
  linkGap?: number;
  linkConfidence?: LinkConfidence;
  linkNote?: string;
  extraParents?: unknown;
  photos?: string[];
}

export interface ArchivedTree {
  tree: FamilyTree;
  deletedAt: string;
}

interface CreateTreeInput {
  name: string;
  address?: string;
  ownerName?: string;
  description?: string;
  founderName: string;
  founderGender: "male" | "female";
  founderBirth?: string;
  founderDetails?: Partial<Person>;
}

interface MemberInput extends Partial<Person> {
  name: string;
  gender: "male" | "female";
}

interface StoreValue {
  trees: FamilyTree[];
  archived: ArchivedTree[];
  hydrated: boolean;
  getTree: (id: string) => FamilyTree | undefined;
  createTree: (input: CreateTreeInput) => string;
  updateTree: (id: string, patch: Partial<FamilyTree>) => void;
  archiveTree: (id: string) => boolean;
  restoreTree: (id: string) => boolean;
  purgeTree: (id: string) => void;
  addMember: (treeId: string, input: MemberInput) => string;
  updateMember: (treeId: string, memberId: string, patch: Partial<Person>) => void;
  deleteMember: (treeId: string, memberId: string) => void;
  addBranch: (treeId: string, input: { name: string; description?: string; headId?: string; color?: string; code?: string }) => string;
  updateBranch: (treeId: string, branchId: string, patch: Partial<Branch>) => void;
  deleteBranch: (treeId: string, branchId: string) => void;
  setDesign: (treeId: string, patch: Partial<DesignSettings>) => void;
  setPositions: (treeId: string, positions: Record<string, { x: number; y: number }>) => void;
  setDecoration: (treeId: string, decoration: Decoration) => void;
  removeDecoration: (treeId: string, decorationId: string) => void;
  importTree: (tree: FamilyTree, opts?: { suffix?: boolean }) => FamilyTree;
  /** Ghi đè nội dung một cây đang mở, dùng cho chế độ nhập cập nhật. */
  replaceTree: (treeId: string, tree: FamilyTree) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

/**
 * Nâng cấp dữ liệu đã lưu:
 * - v4 gỡ cha mẹ nuôi/dượng/kế, ảnh tư liệu và “nối không trực hệ”.
 * - Liên kết giữa các bậc tiền tổ được chuyển sang `ancestorLink*` để không mất chuỗi Đại Tổ → Thủy Tổ → Khởi Tổ.
 * - v5 ẩn hồ sơ ngoài phả đồ khỏi trang và chuyển thông tin vào ghi chú của thân nhân gần nhất.
 */
function normalizeTree(tree: FamilyTree): FamilyTree {
  const version = tree.schemaVersion ?? 1;
  const source = ensurePersonCodes(tree.members ?? []);
  const byId = new Map(source.map((person) => [person.id, person]));
  const members = source.map((person) => {
    const legacy = person as LegacyPerson;
    const next: Person & Partial<LegacyPerson> = { ...person };
    if (version < 4 && legacy.linkToId) {
      const target = byId.get(legacy.linkToId);
      const isAncestorTier =
        (person.ancestorOrder ?? 0) > 0 || (target?.ancestorOrder ?? 0) > 0;
      if (isAncestorTier && !next.ancestorLinkId) {
        next.ancestorLinkId = legacy.linkToId;
        next.ancestorLinkRelation = legacy.linkRelation;
        next.ancestorLinkGap = legacy.linkGap;
        next.ancestorLinkConfidence = legacy.linkConfidence;
        next.ancestorLinkNote = legacy.linkNote;
      }
    }
    delete next.linkToId;
    delete next.linkRelation;
    delete next.linkGap;
    delete next.linkConfidence;
    delete next.linkNote;
    delete next.extraParents;
    delete next.photos;
    return next as Person;
  });
  const design = tree.design ?? DEFAULT_DESIGN;
  const folded = foldOutsideMembers(members, tree.founderId);
  const positions = { ...(tree.positions ?? {}) };
  for (const id of folded.removedIds) delete positions[id];
  const branches = (tree.branches ?? []).map((branch) =>
    branch.headId && folded.removedIds.has(branch.headId)
      ? { ...branch, headId: undefined }
      : branch,
  );
  const founderId =
    tree.founderId && !folded.removedIds.has(tree.founderId) ? tree.founderId : undefined;
  return {
    ...tree,
    schemaVersion: FAMILY_TREE_SCHEMA_VERSION,
    members: folded.members,
    branches,
    design:
      version < 3 && design.tuning
        ? { ...design, tuning: { ...design.tuning, showLinkGap: false } }
        : design,
    positions,
    decorations: tree.decorations ?? [],
    history: tree.history ?? "",
    documents: tree.documents ?? [],
    founderId,
  };
}

function loadTrees(): FamilyTree[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return (parsed as FamilyTree[]).map(normalizeTree);
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return [createDemoTree()];
}

function persist(trees: FamilyTree[]) {
  try {
    // Bản mẫu chỉ sống trong phiên hiện tại: chỉnh sửa trên mẫu không ghi xuống localStorage.
    const owned = trees.filter((tree) => !tree.sample);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(owned));
  } catch {
    // storage might be full with photo data; ignore
  }
}

function readSeedVersion() {
  try {
    return localStorage.getItem(SEED_VERSION_KEY);
  } catch {
    return null;
  }
}

function refreshSample(trees: FamilyTree[]): FamilyTree[] {
  if (readSeedVersion() === SEED_VERSION) return trees;
  const refreshed = trees.map((tree) =>
    tree.sample ? normalizeTree({ ...createDemoTree(), id: tree.id }) : tree,
  );
  try {
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  } catch {
    // ignore storage failures; the sample still refreshes for this session
  }
  return refreshed;
}

function loadArchived(): ArchivedTree[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is ArchivedTree => Boolean(item?.tree?.id && item?.deletedAt),
        );
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return [];
}

function persistArchived(items: ArchivedTree[]): boolean {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function GenealogyProvider({ children }: { children: ReactNode }) {
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [archived, setArchived] = useState<ArchivedTree[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadTrees();
    // Bản mẫu không được lưu xuống máy: nạp lại bản mới mỗi phiên để chỉnh sửa tự hoàn nguyên.
    const loaded = stored.some((tree) => tree.sample)
      ? refreshSample(stored)
      : [createDemoTree(), ...stored];
    const loadedArchived = loadArchived();
    // Persisted trees only exist in the browser, so hydration happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrees(loaded);
    setArchived(loadedArchived);
    persist(loaded);
    persistArchived(loadedArchived);
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (prev: FamilyTree[]) => FamilyTree[]) => {
    setTrees((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const updateTreeIn = useCallback(
    (treeId: string, updater: (tree: FamilyTree) => FamilyTree) => {
      commit((prev) =>
        prev.map((tree) => (tree.id === treeId ? { ...updater(tree), updatedAt: nowIso() } : tree)),
      );
    },
    [commit],
  );

  const createTree = useCallback(
    (input: CreateTreeInput) => {
      const treeId = uid("g");
      const founderId = uid("p");
      const founder: Person = {
        ...input.founderDetails,
        id: founderId,
        code: "P0001",
        name: input.founderName.trim() || "Thủy tổ",
        gender: input.founderGender,
        birthDate: input.founderBirth?.trim() || undefined,
        alive: true,
        title: input.founderDetails?.title?.trim() || "Thủy tổ",
        generation: 0,
        birthOrder: 1,
        spouseIds: [],
      };
      const tree: FamilyTree = {
        id: treeId,
        name: input.name.trim() || "Gia phả mới",
        address: input.address?.trim(),
        description: input.description?.trim(),
        ownerName: input.ownerName?.trim() || "Chủ gia phả",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        members: [founder],
        branches: [],
        history: "",
        design: { ...DEFAULT_DESIGN },
        positions: {},
        decorations: [],
        schemaVersion: FAMILY_TREE_SCHEMA_VERSION,
        founderId,
        documents: [],
      };
      commit((prev) => [...prev, tree]);
      return treeId;
    },
    [commit],
  );

  const updateTree = useCallback(
    (id: string, patch: Partial<FamilyTree>) => {
      updateTreeIn(id, (tree) => ({ ...tree, ...patch }));
    },
    [updateTreeIn],
  );

  const archiveTree = useCallback(
    (id: string) => {
      const target = trees.find((tree) => tree.id === id);
      if (!target || target.sample) return false;
      const nextArchived: ArchivedTree[] = [
        { tree: target, deletedAt: nowIso() },
        ...archived.filter((item) => item.tree.id !== id),
      ];
      if (!persistArchived(nextArchived)) return false;
      setArchived(nextArchived);
      commit((prev) => prev.filter((tree) => tree.id !== id));
      return true;
    },
    [archived, commit, trees],
  );

  const restoreTree = useCallback(
    (id: string) => {
      const entry = archived.find((item) => item.tree.id === id);
      if (!entry) return false;
      const restored = trees.some((tree) => tree.id === id)
        ? { ...entry.tree, id: uid("g") }
        : entry.tree;
      commit((prev) => [...prev, { ...restored, updatedAt: nowIso() }]);
      const nextArchived = archived.filter((item) => item.tree.id !== id);
      persistArchived(nextArchived);
      setArchived(nextArchived);
      return true;
    },
    [archived, commit, trees],
  );

  const purgeTree = useCallback((id: string) => {
    setArchived((prev) => {
      const next = prev.filter((item) => item.tree.id !== id);
      persistArchived(next);
      return next;
    });
  }, []);

  const addMember = useCallback(
    (treeId: string, input: MemberInput) => {
      const memberId = uid("p");
      updateTreeIn(treeId, (tree) => {
        const member: Person = {
          id: memberId,
          code: input.code?.trim() || nextPersonCode(tree.members),
          name: input.name.trim(),
          gender: input.gender,
          birthDate: input.birthDate?.trim() || undefined,
          deathDate: input.deathDate?.trim() || undefined,
          alive: input.alive ?? !input.deathDate,
          lifeStatus: input.lifeStatus,
          birthCalendar: input.birthCalendar,
          deathCalendar: input.deathCalendar,
          title: input.title?.trim() || undefined,
          generation: input.generation,
          ancestorOrder: input.ancestorOrder,
          ancestorLinkId: input.ancestorLinkId || undefined,
          ancestorLinkRelation: input.ancestorLinkRelation?.trim() || undefined,
          ancestorLinkGap: input.ancestorLinkGap,
          ancestorLinkConfidence: input.ancestorLinkConfidence,
          ancestorLinkNote: input.ancestorLinkNote?.trim() || undefined,
          reference: input.reference || undefined,
          nameIsConventional: input.nameIsConventional,
          nameNote: input.nameNote?.trim() || undefined,
          spouseRank: input.spouseRank,
          spouseOrder: input.spouseOrder,
          birthOrder: input.birthOrder ?? tree.members.length + 1,
          fatherId: input.fatherId || undefined,
          motherId: input.motherId || undefined,
          spouseIds: [],
          branchId: input.branchId || undefined,
          hometown: input.hometown?.trim() || undefined,
          occupation: input.occupation?.trim() || undefined,
          maritalStatus: input.maritalStatus?.trim() || undefined,
          biography: input.biography?.trim() || undefined,
          deathAnniversary: input.deathAnniversary?.trim() || undefined,
          restingPlace: input.restingPlace?.trim() || undefined,
          graveAddress: input.graveAddress?.trim() || undefined,
          graveMapUrl: input.graveMapUrl?.trim() || undefined,
          worshipMapUrl: input.worshipMapUrl?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          address: input.address?.trim() || undefined,
          education: input.education?.trim() || undefined,
          avatar: input.avatar,
          notes: input.notes?.trim() || undefined,
        };
        const spouses = (input.spouseIds ?? []).filter((id) => id && id !== memberId);
        const members = tree.members.map((p) => {
          if (!spouses.includes(p.id)) return p;
          if (p.spouseIds.includes(memberId)) return p;
          return { ...p, spouseIds: [...p.spouseIds, memberId] };
        });
        member.spouseIds = spouses;
        return { ...tree, members: [...members, member] };
      });
      return memberId;
    },
    [updateTreeIn],
  );

  const updateMember = useCallback(
    (treeId: string, memberId: string, patch: Partial<Person>) => {
      updateTreeIn(treeId, (tree) => {
        const current = tree.members.find((m) => m.id === memberId);
        if (!current) return tree;
        const nextSpouses = patch.spouseIds
          ? Array.from(new Set(patch.spouseIds.filter((id) => id !== memberId)))
          : current.spouseIds;
        const added = nextSpouses.filter((id) => !current.spouseIds.includes(id));
        const removed = current.spouseIds.filter((id) => !nextSpouses.includes(id));
        const members = tree.members.map((p) => {
          if (p.id === memberId) return { ...p, ...patch, spouseIds: nextSpouses };
          let spouseIds = p.spouseIds;
          if (removed.includes(p.id)) spouseIds = spouseIds.filter((id) => id !== memberId);
          if (added.includes(p.id) && !spouseIds.includes(memberId)) spouseIds = [...spouseIds, memberId];
          return spouseIds === p.spouseIds ? p : { ...p, spouseIds };
        });
        return { ...tree, members };
      });
    },
    [updateTreeIn],
  );

  const deleteMember = useCallback(
    (treeId: string, memberId: string) => {
      updateTreeIn(treeId, (tree) => {
        const members = tree.members
          .filter((m) => m.id !== memberId)
          .map((m) => {
            let next = m;
            if (next.spouseIds.includes(memberId)) {
              next = { ...next, spouseIds: next.spouseIds.filter((id) => id !== memberId) };
            }
            if (next.fatherId === memberId) next = { ...next, fatherId: undefined };
            if (next.motherId === memberId) next = { ...next, motherId: undefined };
            if (next.ancestorLinkId === memberId) next = { ...next, ancestorLinkId: undefined };
            if (next.spouseRank && memberId in next.spouseRank) {
              const spouseRank = { ...next.spouseRank };
              delete spouseRank[memberId];
              next = { ...next, spouseRank };
            }
            if (next.spouseOrder?.includes(memberId)) {
              next = { ...next, spouseOrder: next.spouseOrder.filter((id) => id !== memberId) };
            }
            return next;
          });
        const founder = tree.founderId === memberId;
        const branches = tree.branches.map((b) =>
          b.headId === memberId ? { ...b, headId: undefined } : b,
        );
        const positions = { ...tree.positions };
        delete positions[memberId];
        return {
          ...tree,
          members,
          branches,
          positions,
          founderId: founder ? undefined : tree.founderId,
        };
      });
    },
    [updateTreeIn],
  );

  const addBranch = useCallback(
    (treeId: string, input: { name: string; description?: string; headId?: string; color?: string; code?: string }) => {
      const branchId = uid("b");
      const colors = ["#8a1c15", "#b7791f", "#2f6f5e", "#6b4c9a", "#1f6b7a", "#9a4a1f"];
      updateTreeIn(treeId, (tree) => {
        const usedCodes = new Set(tree.branches.map((item) => item.code).filter(Boolean));
        let nextCode = "";
        for (let index = 1; index <= 99; index += 1) {
          if (!usedCodes.has(`C${index}`)) {
            nextCode = `C${index}`;
            break;
          }
        }
        const branch: Branch = {
          id: branchId,
          name: input.name.trim(),
          description: input.description?.trim(),
          headId: input.headId || undefined,
          color: input.color || colors[tree.branches.length % colors.length],
          code: input.code?.trim() || nextCode || undefined,
        };
        return { ...tree, branches: [...tree.branches, branch] };
      });
      return branchId;
    },
    [updateTreeIn],
  );

  const updateBranch = useCallback(
    (treeId: string, branchId: string, patch: Partial<Branch>) => {
      updateTreeIn(treeId, (tree) => ({
        ...tree,
        branches: tree.branches.map((b) => (b.id === branchId ? { ...b, ...patch } : b)),
      }));
    },
    [updateTreeIn],
  );

  const deleteBranch = useCallback(
    (treeId: string, branchId: string) => {
      updateTreeIn(treeId, (tree) => ({
        ...tree,
        branches: tree.branches.filter((b) => b.id !== branchId),
        members: tree.members.map((m) => (m.branchId === branchId ? { ...m, branchId: undefined } : m)),
      }));
    },
    [updateTreeIn],
  );

  const setDesign = useCallback(
    (treeId: string, patch: Partial<DesignSettings>) => {
      updateTreeIn(treeId, (tree) => ({ ...tree, design: { ...tree.design, ...patch } }));
    },
    [updateTreeIn],
  );

  const setPositions = useCallback(
    (treeId: string, positions: Record<string, { x: number; y: number }>) => {
      updateTreeIn(treeId, (tree) => ({ ...tree, positions }));
    },
    [updateTreeIn],
  );

  const setDecoration = useCallback(
    (treeId: string, decoration: Decoration) => {
      updateTreeIn(treeId, (tree) => {
        const exists = tree.decorations.some((d) => d.id === decoration.id);
        return {
          ...tree,
          decorations: exists
            ? tree.decorations.map((d) => (d.id === decoration.id ? decoration : d))
            : [...tree.decorations, decoration],
        };
      });
    },
    [updateTreeIn],
  );

  const removeDecoration = useCallback(
    (treeId: string, decorationId: string) => {
      updateTreeIn(treeId, (tree) => ({
        ...tree,
        decorations: tree.decorations.filter((d) => d.id !== decorationId),
      }));
    },
    [updateTreeIn],
  );

  const importTree = useCallback(
    (tree: FamilyTree, opts?: { suffix?: boolean }) => {
      const id = tree.id && !trees.some((t) => t.id === tree.id) ? tree.id : uid("g");
      const baseName = tree.name.trim() || "Gia phả";
      let name = baseName;
      if (opts?.suffix !== false) {
        const taken = new Set(trees.map((item) => item.name.trim().toLocaleLowerCase("vi")));
        if (taken.has(name.toLocaleLowerCase("vi"))) {
          let index = 2;
          while (taken.has(`${baseName} (${index})`.toLocaleLowerCase("vi"))) index += 1;
          name = `${baseName} (${index})`;
        }
      }
      const imported: FamilyTree = normalizeTree({
        ...tree,
        id,
        name,
        sample: false,
        updatedAt: nowIso(),
      });
      commit((prev) => [...prev, imported]);
      return imported;
    },
    [commit, trees],
  );

  const replaceTree = useCallback(
    (treeId: string, tree: FamilyTree) => {
      updateTreeIn(treeId, (current) =>
        normalizeTree({
          ...tree,
          id: treeId,
          name: tree.name || current.name,
          createdAt: current.createdAt,
          sample: current.sample,
          updatedAt: nowIso(),
        }),
      );
    },
    [updateTreeIn],
  );

  const getTree = useCallback((id: string) => trees.find((tree) => tree.id === id), [trees]);

  const value = useMemo<StoreValue>(
    () => ({
      trees,
      archived,
      hydrated,
      getTree,
      createTree,
      updateTree,
      archiveTree,
      restoreTree,
      purgeTree,
      addMember,
      updateMember,
      deleteMember,
      addBranch,
      updateBranch,
      deleteBranch,
      setDesign,
      setPositions,
      setDecoration,
      removeDecoration,
      importTree,
      replaceTree,
    }),
    [
      trees,
      archived,
      hydrated,
      getTree,
      createTree,
      updateTree,
      archiveTree,
      restoreTree,
      purgeTree,
      addMember,
      updateMember,
      deleteMember,
      addBranch,
      updateBranch,
      deleteBranch,
      setDesign,
      setPositions,
      setDecoration,
      removeDecoration,
      importTree,
      replaceTree,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useGenealogy() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useGenealogy must be used inside GenealogyProvider");
  return ctx;
}
