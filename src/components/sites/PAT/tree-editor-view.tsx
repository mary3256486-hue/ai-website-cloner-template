"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpLeft,
  Baby,
  ChevronRight,
  GitBranch,
  HelpCircle,
  Maximize2,
  Minus,
  Network,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Undo2,
  UserPlus,
  UserRound,
  Users,
  X,
  ZoomIn,
} from "lucide-react";
import { useGenealogy } from "./store";
import { memberPath, treePath } from "./routes";
import type { FamilyTree, Person } from "./types";
import { cardOrientationFor, generationTag, isDeceasedStatus, lifeStatusOf, UNKNOWN_GENERATION } from "./types";
import { classifyClan, CLAN_ROLE_LABELS } from "./clan";
import { cardLifeYears, computeGenerations, deathAnniversaryText, descendants, lifeSpan, sortGenerations, sortPersons } from "./utils";
import { computeLayout } from "./layout";
import { branchViewHref, computeBranchScope, parseBranchView, type BranchViewOptions } from "./branch-view";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, Field, Sheet, SheetRow } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";

type Density = "full" | "compact";
type AssignKind = "father" | "mother" | "branch";

interface ToastState {
  message: string;
  undo?: () => void;
}

interface ConfirmState {
  title: string;
  message: string;
  details?: string[];
  confirmLabel: string;
  onConfirm: () => void;
}

const MINI_WIDTH = 168;
const MINI_HEIGHT = 110;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Bỏ qua khi trình duyệt chặn localStorage.
  }
}

export function TreeEditorView({ tree }: { tree: FamilyTree }) {
  const router = useRouter();
  const { deleteMember, updateMember, updateTree } = useGenealogy();
  const viewportRef = useRef<HTMLDivElement>(null);
  const fittedRef = useRef<string | null>(null);

  const [branchParams, setBranchParams] = useState<BranchViewOptions | null>(null);
  const branchScope = useMemo(
    () => (branchParams ? computeBranchScope(tree, branchParams) : null),
    [tree, branchParams],
  );
  const layout = useMemo(
    () => (branchScope ? computeLayout({ ...tree, positions: {} }, branchScope.ids) : computeLayout(tree)),
    [tree, branchScope],
  );
  const gens = useMemo(
    () => computeGenerations(tree.members, tree.founderId),
    [tree.members, tree.founderId],
  );
  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const branchColor = useMemo(
    () => new Map(tree.branches.map((branch) => [branch.id, branch.color])),
    [tree.branches],
  );

  const [view, setView] = useState({ x: 24, y: 24, scale: 0.7 });
  const [pan, setPan] = useState<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);
  const [vpSize, setVpSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchGen, setSearchGen] = useState("all");
  const [searchBranch, setSearchBranch] = useState("all");
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [childOf, setChildOf] = useState<Person | null>(null);
  const [spouseOf, setSpouseOf] = useState<Person | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [density, setDensity] = useState<Density>("full");
  const effectiveDensity: Density = branchScope
    ? branchScope.options.cardStyle === "full"
      ? "full"
      : "compact"
    : density;
  const [focusId, setFocusId] = useState<string | null>(null);
  const [relationsFor, setRelationsFor] = useState<Person | null>(null);
  const [assign, setAssign] = useState<{ person: Person; kind: AssignKind } | null>(null);
  const [assignQuery, setAssignQuery] = useState("");
  const [newParent, setNewParent] = useState<{ person: Person; gender: "male" | "female" } | null>(null);
  const [siblingOf, setSiblingOf] = useState<Person | null>(null);
  const [skipTarget, setSkipTarget] = useState<Person | null>(null);
  const [skipReason, setSkipReason] = useState("Chưa xác định được cha");
  const [skippedFather, setSkippedFather] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmState | null>(null);

  const selected = selectedId ? tree.members.find((member) => member.id === selectedId) : undefined;
  const focusPerson = focusId ? tree.members.find((member) => member.id === focusId) : undefined;

  const densityKey = `phatue.treeDensity.${tree.id}`;
  const searchKey = `phatue.treeSearch.${tree.id}`;
  const skipKey = `phatue.treeFatherSkip.${tree.id}`;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const savedDensity = readStorage(densityKey);
    if (savedDensity === "full" || savedDensity === "compact") setDensity(savedDensity);
    const savedQuery = readStorage(searchKey);
    if (savedQuery) setQuery(savedQuery);
    const savedSkips = readStorage(skipKey);
    if (savedSkips) {
      try {
        setSkippedFather(JSON.parse(savedSkips) as Record<string, string>);
      } catch {
        setSkippedFather({});
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [densityKey, searchKey, skipKey]);

  useEffect(() => {
    const parsed = parseBranchView(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (parsed) setBranchParams(parsed);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setVpSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const focusSet = useMemo(() => {
    if (!focusId) return null;
    const keep = descendants(tree.members, focusId, tree.founderId);
    keep.add(focusId);
    const byId = new Map(tree.members.map((member) => [member.id, member]));
    for (const id of [...keep]) {
      const person = byId.get(id);
      if (!person) continue;
      for (const spouseId of person.spouseIds) keep.add(spouseId);
    }
    return keep;
  }, [focusId, tree.members, tree.founderId]);

  const visibleNodes = useMemo(
    () => (focusSet ? layout.nodes.filter((node) => focusSet.has(node.id)) : layout.nodes),
    [layout.nodes, focusSet],
  );

  const visibleEdges = useMemo(() => {
    if (!focusSet) return layout.edges;
    return layout.edges.filter((edge) => {
      if (edge.fromId && edge.toId) return focusSet.has(edge.fromId) && focusSet.has(edge.toId);
      if (edge.subjectId) return focusSet.has(edge.subjectId);
      return true;
    });
  }, [layout.edges, focusSet]);

  const bounds = useMemo(() => {
    if (!visibleNodes.length) return { x: 0, y: 0, width: layout.width, height: layout.height };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of visibleNodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
    const pad = 48;
    return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
  }, [visibleNodes, layout.width, layout.height]);

  const minimapData = useMemo(() => {
    if (!visibleNodes.length) return null;
    const ms = Math.min(MINI_WIDTH / bounds.width, MINI_HEIGHT / bounds.height);
    const nodes = visibleNodes.map((node) => ({
      id: node.id,
      left: (node.x - bounds.x) * ms,
      top: (node.y - bounds.y) * ms,
      width: Math.max(2, node.width * ms),
      height: Math.max(2, node.height * ms),
      color:
        (node.person.branchId && branchColor.get(node.person.branchId)) ||
        (node.person.gender === "male" ? "#8a1c15" : "#9a4a6b"),
    }));
    return { ms, nodes };
  }, [visibleNodes, bounds, branchColor]);

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el || visibleNodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    const scale = Math.min((rect.width - 32) / bounds.width, (rect.height - 32) / bounds.height, 1);
    setView({
      scale,
      x: (rect.width - bounds.width * scale) / 2 - bounds.x * scale,
      y: (rect.height - bounds.height * scale) / 2 - bounds.y * scale,
    });
  }, [bounds, visibleNodes.length]);

  const zoomAtCenter = useCallback((factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setView((prev) => {
      const nextScale = Math.min(1.8, Math.max(0.22, prev.scale * factor));
      return {
        scale: nextScale,
        x: cx - (cx - prev.x) * (nextScale / prev.scale),
        y: cy - (cy - prev.y) * (nextScale / prev.scale),
      };
    });
  }, []);

  const centerOn = useCallback(
    (personId: string) => {
      const el = viewportRef.current;
      const node = layout.nodes.find((item) => item.id === personId);
      if (!el || !node) return;
      const rect = el.getBoundingClientRect();
      setView((prev) => ({
        scale: Math.max(prev.scale, 0.8),
        x: rect.width / 2 - (node.x + node.width / 2) * Math.max(prev.scale, 0.8),
        y: rect.height / 2 - (node.y + node.height / 2) * Math.max(prev.scale, 0.8),
      }));
    },
    [layout.nodes],
  );

  const changeDensity = (next: Density) => {
    setDensity(next);
    writeStorage(densityKey, next);
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    writeStorage(searchKey, value);
  };

  const clearSearch = () => {
    changeQuery("");
    setSearchGen("all");
    setSearchBranch("all");
  };

  useEffect(() => {
    if (fittedRef.current === tree.id || layout.nodes.length === 0) return;
    fittedRef.current = tree.id;
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (focus) {
      fit();
      window.setTimeout(() => centerOn(focus), 60);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(focus);
      return;
    }
    fit();
  }, [tree.id, layout.nodes, fit, centerOn]);

  useEffect(() => {
    if (!focusId) return;
    const timer = window.setTimeout(() => fit(), 80);
    return () => window.clearTimeout(timer);
  }, [focusId, fit]);

  useEffect(() => {
    const timer = window.setTimeout(() => fit(), 80);
    return () => window.clearTimeout(timer);
  }, [branchParams, fit]);

  useEffect(() => {
    if (!pan) return;
    const onMove = (event: PointerEvent) => {
      setView((prev) => ({
        ...prev,
        x: pan.viewX + (event.clientX - pan.startX),
        y: pan.viewY + (event.clientY - pan.startY),
      }));
    };
    const onUp = () => setPan(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pan]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      setView((prev) => {
        const nextScale = Math.min(1.8, Math.max(0.22, prev.scale * Math.exp(-event.deltaY * 0.0015)));
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        return {
          scale: nextScale,
          x: cx - (cx - prev.x) * (nextScale / prev.scale),
          y: cy - (cy - prev.y) * (nextScale / prev.scale),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomAtCenter(1.2);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomAtCenter(1 / 1.2);
      } else if (event.key === "0") {
        event.preventDefault();
        fit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fit, zoomAtCenter]);

  const centerGeneration = useMemo(() => {
    if (!pan || !vpSize.height || !layout.generations.length) return "";
    const treeY = (vpSize.height / 2 - view.y) / view.scale;
    let best = layout.generations[0];
    for (const row of layout.generations) {
      if (Math.abs(row.y - treeY) < Math.abs(best.y - treeY)) best = row;
    }
    return best.label ?? generationTag(best.generation);
  }, [pan, vpSize.height, view, layout.generations]);

  const missingFather = useMemo(
    () =>
      tree.members
        .filter((member) => {
          const role = clan.roleOf(member.id);
          if (role !== "clan" && role !== "maternal") return false;
          if (member.fatherId) return false;
          if (typeof member.generation === "number" && Number.isFinite(member.generation)) return false;
          if (skippedFather[member.id]) return false;
          return (gens.get(member.id) ?? 1) > 1;
        })
        .sort(sortPersons),
    [tree.members, gens, clan, skippedFather],
  );

  const skippedEntries = useMemo(
    () =>
      Object.entries(skippedFather)
        .map(([id, reason]) => ({ person: tree.members.find((member) => member.id === id), reason }))
        .filter((entry): entry is { person: Person; reason: string } => Boolean(entry.person))
        .sort((a, b) => sortPersons(a.person, b.person)),
    [skippedFather, tree.members],
  );

  const genOptions = useMemo(() => {
    const values = new Set<number>();
    for (const member of tree.members) {
      if (clan.isDisplayed(member.id)) values.add(gens.get(member.id) ?? UNKNOWN_GENERATION);
    }
    return [...values].sort(sortGenerations);
  }, [tree.members, gens, clan]);

  const highlightActive = query.trim().length > 0 || searchGen !== "all" || searchBranch !== "all";
  const searchMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const genFilter = searchGen === "all" ? null : searchGen === "unknown" ? "unknown" : Number(searchGen);
    return tree.members
      .filter((member) => {
        if (!clan.isDisplayed(member.id)) return false;
        if (branchScope && !branchScope.ids.has(member.id)) return false;
        const gen = gens.get(member.id) ?? UNKNOWN_GENERATION;
        if (genFilter === "unknown" && gen !== UNKNOWN_GENERATION) return false;
        if (typeof genFilter === "number" && gen !== genFilter) return false;
        if (searchBranch !== "all") {
          if (searchBranch === "none" ? Boolean(member.branchId) : member.branchId !== searchBranch) return false;
        }
        if (!needle) return true;
        return (
          member.name.toLowerCase().includes(needle) ||
          (member.birthDate ?? "").includes(needle) ||
          (member.title ?? "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => sortGenerations(gens.get(a.id) ?? 1, gens.get(b.id) ?? 1) || sortPersons(a, b));
  }, [tree.members, gens, clan, query, searchGen, searchBranch, branchScope]);
  const searchResults = searchMatches.slice(0, 30);
  const highlightIds = useMemo(
    () => new Set(highlightActive ? searchMatches.map((member) => member.id) : []),
    [highlightActive, searchMatches],
  );

  const assignOptions = useMemo(() => {
    if (!assign || assign.kind === "branch") return [];
    const excluded = descendants(tree.members, assign.person.id, tree.founderId);
    excluded.add(assign.person.id);
    const needle = assignQuery.trim().toLowerCase();
    return tree.members
      .filter(
        (person) =>
          person.gender === (assign.kind === "father" ? "male" : "female") && !excluded.has(person.id),
      )
      .filter(
        (person) =>
          !needle ||
          person.name.toLowerCase().includes(needle) ||
          (person.birthDate ?? "").includes(needle),
      )
      .sort((a, b) => sortGenerations(gens.get(a.id) ?? 1, gens.get(b.id) ?? 1) || sortPersons(a, b))
      .slice(0, 40);
  }, [assign, assignQuery, tree.members, tree.founderId, gens]);

  const removePerson = (person: Person) => {
    const children = tree.members.filter(
      (member) => member.fatherId === person.id || member.motherId === person.id,
    );
    const spouses = person.spouseIds
      .map((id) => tree.members.find((member) => member.id === id))
      .filter((member): member is Person => Boolean(member));
    setConfirmAction({
      title: `Xoá ${person.name}?`,
      message: "Hồ sơ sẽ rồi khỏi phả đồ cùng các liên kết, và nằm trong Thùng rác 30 ngày. Bạn có thể hoàn tác ngay sau khi xoá.",
      details: [
        children.length ? `Con (${children.length}): ${children.map((child) => child.name).join(", ")}` : "",
        spouses.length
          ? `Vợ/chồng (${spouses.length}): ${spouses.map((spouse) => spouse.name).join(", ")}`
          : "",
      ].filter(Boolean),
      confirmLabel: "Xoá khỏi gia phả",
      onConfirm: () => {
        const snapshot = {
          members: tree.members,
          branches: tree.branches,
          founderId: tree.founderId,
          positions: tree.positions,
        };
        deleteMember(tree.id, person.id);
        setSelectedId(null);
        setConfirmAction(null);
        setToast({
          message: `Đã xoá ${person.name}.`,
          undo: () => updateTree(tree.id, snapshot),
        });
      },
    });
  };

  const pickAssign = (candidate: Person) => {
    if (!assign) return;
    const { person, kind } = assign;
    const commit = () => {
      updateMember(
        tree.id,
        person.id,
        kind === "father" ? { fatherId: candidate.id } : { motherId: candidate.id },
      );
      setAssign(null);
      setConfirmAction(null);
      setToast({
        message:
          kind === "father"
            ? `Đã gán ${candidate.name} làm cha của ${person.name}.`
            : `Đã gán ${candidate.name} làm mẹ của ${person.name}.`,
      });
    };
    const currentId = kind === "father" ? person.fatherId : person.motherId;
    const current = currentId ? tree.members.find((member) => member.id === currentId) : undefined;
    if (current && current.id !== candidate.id) {
      setConfirmAction({
        title: kind === "father" ? "Đổi cha?" : "Đổi mẹ?",
        message: `${person.name} hiện có ${kind === "father" ? "cha" : "mẹ"} là ${current.name}. Chuyển sang ${candidate.name}?`,
        confirmLabel: kind === "father" ? "Đổi cha" : "Đổi mẹ",
        onConfirm: commit,
      });
      return;
    }
    commit();
  };

  const pickBranch = (branchId?: string, branchName?: string) => {
    if (!assign) return;
    updateMember(tree.id, assign.person.id, { branchId: branchId || undefined });
    setAssign(null);
    setToast({
      message: branchName
        ? `Đã gán ${assign.person.name} vào ${branchName}.`
        : `Đã bỏ chi phái của ${assign.person.name}.`,
    });
  };

  const confirmSkip = () => {
    if (!skipTarget) return;
    const next = {
      ...skippedFather,
      [skipTarget.id]: skipReason.trim() || "Không xác định được cha",
    };
    setSkippedFather(next);
    writeStorage(skipKey, JSON.stringify(next));
    setSkipTarget(null);
    setWarningOpen(false);
    setToast({ message: `Đã bỏ qua cảnh báo thiếu cha của ${skipTarget.name}.` });
  };

  const exitBranchView = () => {
    setBranchParams(null);
    router.replace(treePath(tree.id, "chinh-sua-voi-cay-gia-pha"));
  };

  return (
    <TreeShell
      tree={tree}
      section="chinh-sua-voi-cay-gia-pha"
      title={branchScope ? "Cây gia phả — xem theo chi" : "Cây gia phả"}
      wide
      subtitle={
        branchScope
          ? `${branchScope.title} · ${branchScope.count} thành viên nội tộc · ${branchScope.ids.size} người hiển thị`
          : `${layout.nodes.length} thành viên · ${layout.generations.filter((row) => !row.isAncestor).length} đời${
              layout.generations.some((row) => row.isAncestor)
                ? ` · ${layout.generations.filter((row) => row.isAncestor).length} bậc tiền tổ`
                : ""
            }`
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Tìm thành viên"
          >
            <Search size={17} />
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Hướng dẫn"
          >
            <HelpCircle size={17} />
          </button>
          {branchScope ? null : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
            >
              <Plus size={14} /> Thêm
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {branchScope ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0] px-3 py-2 text-xs">
            <GitBranch size={14} className="shrink-0 text-[var(--pat-red)]" />
            <span className="min-w-0 flex-1 basis-full sm:basis-auto">
              Đang xem <strong>{branchScope.title}</strong> · trưởng chi {branchScope.head.name} ·{" "}
              {branchScope.count} thành viên nội tộc · {branchScope.ids.size} người hiển thị
              {branchScope.options.ancestorGenerations
                ? ` · ${branchScope.options.ancestorGenerations} đời trên`
                : ""}
              {branchScope.options.generationLimit
                ? ` · giới hạn ${branchScope.options.generationLimit} đời`
                : ""}
              <span className="mt-0.5 block text-[0.66rem] leading-snug text-[var(--pat-muted)]">
                Chế độ này chỉ để xem; lựa chọn chi, số đời và chữ hoành phi không được lưu vào gia phả.
              </span>
            </span>
            <button
              type="button"
              onClick={() =>
                router.push(branchViewHref(treePath(tree.id, "ve-pha-do"), branchScope.options))
              }
              className="pat-btn pat-btn-outline h-8 shrink-0 text-[0.68rem]"
            >
              Xem phả đồ chi
            </button>
            <button
              type="button"
              onClick={exitBranchView}
              className="pat-btn pat-btn-red h-8 shrink-0 text-[0.68rem]"
            >
              Xem toàn bộ
            </button>
          </div>
        ) : null}
        {!branchScope && missingFather.length ? (
          <button
            type="button"
            onClick={() => setWarningOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-[#e3b95c] bg-[#fbf1d2] px-3 py-2.5 text-left text-xs text-[#7a5a10]"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">
              <strong>{missingFather.length}</strong> thành viên chưa có cha trong gia phả. Bổ sung để phả đồ xếp
              đúng đời và chi phái.
            </span>
            <ChevronRight size={14} />
          </button>
        ) : null}
        {!branchScope && !missingFather.length && skippedEntries.length ? (
          <button
            type="button"
            onClick={() => setWarningOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/70 px-3 py-2 text-left text-[0.7rem] text-[var(--pat-muted)]"
          >
            <AlertTriangle size={14} className="shrink-0 text-[var(--pat-gold)]" />
            <span className="flex-1">
              Đã bỏ qua {skippedEntries.length} cảnh báo thiếu cha. Mở danh sách để xem lý do hoặc hiện lại.
            </span>
            <ChevronRight size={14} />
          </button>
        ) : null}
        {!branchScope && focusPerson ? (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0] px-3 py-2 text-xs">
            <Network size={14} className="shrink-0 text-[var(--pat-red)]" />
            <span className="min-w-0 flex-1">
              Đang chỉ xem nhánh của <strong>{focusPerson.name}</strong> · {visibleNodes.length} thành viên.
            </span>
            <button
              type="button"
              onClick={() => {
                setFocusId(null);
                window.setTimeout(fit, 80);
              }}
              className="pat-btn pat-btn-outline h-8 shrink-0 text-[0.68rem]"
            >
              Xem toàn bộ
            </button>
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl border border-[var(--pat-line)] bg-[#fdf6e7] shadow-inner">
          <div
            ref={viewportRef}
            className="relative h-[calc(100dvh-15rem)] min-h-[440px] w-full touch-none overflow-hidden"
            style={{
              backgroundImage:
                "radial-gradient(rgba(138,108,82,0.16) 0.7px, transparent 0.8px), radial-gradient(rgba(201,162,39,0.08) 0.7px, transparent 0.8px)",
              backgroundSize: "22px 22px, 22px 22px",
              backgroundPosition: "0 0, 11px 11px",
              cursor: pan ? "grabbing" : "grab",
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              setPan({ startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y });
            }}
          >
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setView((prev) => ({ ...prev, x: 24, y: 24 }))}
              className="absolute left-3 top-3 z-10 flex h-9 items-center gap-1 rounded-full border border-[var(--pat-line)] bg-[#fffdf7]/95 px-3 text-[0.68rem] font-semibold text-[var(--pat-red)] shadow"
              aria-label="Về góc trên trái"
            >
              <ArrowUpLeft size={14} /> <span className="hidden sm:inline">Về đầu</span>
            </button>

            {pan && centerGeneration ? (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-[#2c1a12]/90 px-3 py-1 text-[0.68rem] font-semibold text-[#fff4df]">
                {centerGeneration}
              </div>
            ) : null}

            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              }}
            >
              <svg
                width={layout.width}
                height={layout.height}
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                {layout.generations.map((row) => (
                  <g key={row.generation}>
                    <line
                      x1={16}
                      x2={layout.width - 16}
                      y1={row.y - 16}
                      y2={row.y - 16}
                      stroke="#c9a227"
                      strokeOpacity="0.22"
                      strokeDasharray="4 6"
                    />
                    <text x="18" y={row.y + 4} fontSize="10" fontWeight="700" fill="#b08d5c" opacity="0.75">
                      {row.label}
                    </text>
                  </g>
                ))}
                {visibleEdges.map((edge) => (
                  <line
                    key={edge.id}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={edge.type === "spouse" ? "#8a1c15" : "#b7791f"}
                    strokeOpacity={edge.type === "spouse" ? 0.6 : 0.5}
                    strokeWidth={edge.type === "spouse" ? 1.4 : 1.2}
                    strokeDasharray={edge.type === "spouse" ? "5 3" : undefined}
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {visibleNodes.map((node) => {
                const person = node.person;
                const color =
                  (person.branchId && branchColor.get(person.branchId)) ||
                  (person.gender === "male" ? "#8a1c15" : "#9a4a6b");
                const active = selectedId === person.id;
                const matched = highlightIds.has(person.id);
                const deceased = isDeceasedStatus(lifeStatusOf(person));
                const compact = effectiveDensity === "compact";
                const vertical = cardOrientationFor(tree.design, node.generation) === "vertical";
                const anniversary = deathAnniversaryText(person);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setSelectedId(person.id)}
                    className={`pat-node absolute overflow-hidden rounded-lg border ${
                      deceased ? "bg-[#f4ecdb]" : "bg-[#fff9e4]"
                    } shadow-sm ${
                      vertical
                        ? "flex flex-col items-center justify-center px-1.5 py-1 text-center"
                        : "flex items-center justify-center px-2 text-center"
                    }`}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      borderColor: active ? "#8a1c15" : color,
                      borderStyle: node.isSpouse ? "dashed" : "solid",
                      borderWidth: active ? 2 : 1,
                      outline: active ? "3px solid rgba(138,28,21,0.14)" : undefined,
                      boxShadow: !active && matched ? "0 0 0 3px rgba(201,162,39,0.55)" : undefined,
                    }}
                  >
                    <span
                      className={vertical ? "absolute inset-x-0 top-0 h-1" : "absolute inset-y-0 left-0 w-1"}
                      style={{ background: color }}
                    />
                    <span className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-0.5">
                      <span className="line-clamp-2 block w-full text-[0.82rem] font-bold uppercase leading-tight tracking-wide text-[var(--pat-ink)]">
                        {person.name}
                      </span>
                      {deceased && !compact ? (
                        <>
                          <span className="block w-full truncate text-[0.62rem] text-[var(--pat-muted)]">
                            {cardLifeYears(person)}
                          </span>
                          {anniversary ? (
                            <span className="block w-full truncate text-[0.62rem] text-[var(--pat-muted)]">
                              Giỗ {anniversary}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--pat-line)] bg-[#fffdf7]/95 p-1 shadow-lg"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => zoomAtCenter(1 / 1.2)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-red)]"
                aria-label="Thu nhỏ"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center text-[0.68rem] font-semibold text-[var(--pat-muted)]">
                {Math.round(view.scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomAtCenter(1.2)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-red)]"
                aria-label="Phóng to"
              >
                <ZoomIn size={15} />
              </button>
              <span className="mx-0.5 h-4 w-px bg-[var(--pat-line)]" />
              <button
                type="button"
                onClick={fit}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--pat-red)]"
                aria-label="Vừa khung"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            {minimapData && visibleNodes.length > 12 ? (
              <div className="absolute bottom-3 right-3 hidden sm:block" onPointerDown={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const treeX = bounds.x + (event.clientX - rect.left) / minimapData.ms;
                    const treeY = bounds.y + (event.clientY - rect.top) / minimapData.ms;
                    const el = viewportRef.current;
                    if (!el) return;
                    setView((prev) => ({
                      scale: prev.scale,
                      x: el.clientWidth / 2 - treeX * prev.scale,
                      y: el.clientHeight / 2 - treeY * prev.scale,
                    }));
                  }}
                  className="relative block overflow-hidden rounded-lg border border-[var(--pat-line)] bg-[#fffdf7]/95 shadow"
                  style={{ width: MINI_WIDTH, height: MINI_HEIGHT }}
                  aria-label="Bản đồ thu nhỏ — chạm để di chuyển"
                >
                  {minimapData.nodes.map((item) => (
                    <span
                      key={item.id}
                      className="absolute rounded-[1px] opacity-70"
                      style={{
                        left: item.left,
                        top: item.top,
                        width: item.width,
                        height: item.height,
                        background: item.color,
                      }}
                    />
                  ))}
                  <span
                    className="pointer-events-none absolute rounded border border-[var(--pat-red)] bg-[rgba(138,28,21,0.08)]"
                    style={{
                      left: (-view.x / view.scale - bounds.x) * minimapData.ms,
                      top: (-view.y / view.scale - bounds.y) * minimapData.ms,
                      width: (vpSize.width / view.scale) * minimapData.ms,
                      height: (vpSize.height / view.scale) * minimapData.ms,
                    }}
                  />
                </button>
                <p className="mt-0.5 text-center text-[0.55rem] text-[var(--pat-muted)]">Bản đồ thu nhỏ</p>
              </div>
            ) : null}

            <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full bg-white/75 px-2 py-1 text-[0.6rem] text-[var(--pat-muted)] sm:block">
              Kéo nền để di chuyển · lăn chuột hoặc +/− để phóng to · 0 để vừa khung
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] text-[var(--pat-muted)]">
          <Badge tone="gold">{visibleNodes.length} thành viên trên phả đồ</Badge>
          <Badge tone="muted">{tree.branches.length} chi phái</Badge>
          <Badge tone="muted">
            {layout.generations.filter((row) => !row.isAncestor).length} đời
            {layout.generations.some((row) => row.isAncestor)
              ? ` · ${layout.generations.filter((row) => row.isAncestor).length} bậc tổ`
              : ""}
          </Badge>
          {branchScope ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pat-line)] bg-white/70 px-2 py-0.5 font-semibold">
              Thẻ: {effectiveDensity === "compact" ? "Gọn" : "Đầy đủ"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pat-line)] bg-white/70 p-0.5" role="group" aria-label="Mật độ thẻ">
              <button
                type="button"
                aria-pressed={density === "full"}
                onClick={() => changeDensity("full")}
                className={`rounded-full px-2 py-0.5 text-[0.66rem] font-semibold ${
                  density === "full" ? "bg-[var(--pat-red)] text-[#fff4df]" : "text-[var(--pat-muted)]"
                }`}
              >
                Đầy đủ
              </button>
              <button
                type="button"
                aria-pressed={density === "compact"}
                onClick={() => changeDensity("compact")}
                className={`rounded-full px-2 py-0.5 text-[0.66rem] font-semibold ${
                  density === "compact" ? "bg-[var(--pat-red)] text-[#fff4df]" : "text-[var(--pat-muted)]"
                }`}
              >
                Gọn
              </button>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0 w-4 border-t border-dashed border-[var(--pat-gold)]" /> dâu/rể
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0 w-4 border-t border-dotted border-[var(--pat-gold)]" /> con của con
            gái (một đời)
          </span>
          {highlightIds.size ? (
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-1 rounded-full border border-[#c9a227] bg-[#fbf1d2] px-2 py-0.5 font-semibold text-[#7a5a10]"
            >
              <Search size={12} /> Đang làm nổi {highlightIds.size} thẻ <X size={12} />
            </button>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-1">
            <Network size={12} /> Chạm vào ô để xem thao tác
          </span>
        </div>
      </div>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
        subtitle={
          selected
            ? `${generationTag(gens.get(selected.id) ?? 1)} · ${selected.gender === "male" ? "Nam" : "Nữ"} · ${lifeSpan(selected)}`
            : ""
        }
      >
        {selected ? (
          <div className="space-y-1">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5">
              <Avatar person={selected} size={44} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  {selected.name}
                  {selected.title ? <Badge tone="gold">{selected.title}</Badge> : null}
                </p>
                <p className="text-xs text-[var(--pat-muted)]">
                  {selected.spouseIds.length} vợ/chồng ·{" "}
                  {tree.members.filter((m) => m.fatherId === selected.id || m.motherId === selected.id).length} con
                </p>
              </div>
            </div>
            <SheetRow
              icon={<UserRound size={18} />}
              title="Xem hồ sơ đầy đủ"
              onClick={() => router.push(memberPath(tree.id, selected.id))}
            />
            <SheetRow
              icon={<PencilLine size={18} />}
              title="Sửa thông tin"
              subtitle="Cha mẹ, vợ/chồng, tiểu sử, chi phái"
              onClick={() => setEditPerson(selected)}
            />
            <SheetRow
              icon={<Baby size={18} />}
              title="Thêm con"
              disabled={clan.roleOf(selected.id) !== "clan"}
              subtitle={
                clan.roleOf(selected.id) === "maternal"
                  ? "Con của con gái chỉ hiển thị một đời — mở hồ sơ người con để thêm hồ sơ ngoại tộc."
                  : clan.roleOf(selected.id) === "clan"
                    ? "Tự gán cha/mẹ theo giới tính và số thứ tự con"
                    : "Chỉ thêm con từ người thuộc nội tộc"
              }
              onClick={() => {
                if (clan.roleOf(selected.id) !== "clan") return;
                setChildOf(selected);
              }}
            />
            <SheetRow icon={<Users size={18} />} title="Thêm vợ/chồng" onClick={() => setSpouseOf(selected)} />
            <SheetRow
              icon={<GitBranch size={18} />}
              title="Quan hệ & chi phái"
              subtitle="Gán cha/mẹ, thêm anh/chị/em, gán chi phái, chỉ xem nhánh này"
              onClick={() => {
                setRelationsFor(selected);
                setSelectedId(null);
              }}
            />
            <SheetRow
              icon={<Trash2 size={18} />}
              title="Xoá khỏi gia phả"
              danger
              onClick={() => removePerson(selected)}
            />
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(relationsFor)}
        onClose={() => setRelationsFor(null)}
        title="Quan hệ & chi phái"
        subtitle={
          relationsFor
            ? `${relationsFor.name} · ${generationTag(gens.get(relationsFor.id) ?? 1)}`
            : ""
        }
      >
        {relationsFor ? (
          <div className="space-y-1">
            <SheetRow
              icon={<UserRound size={18} />}
              title="Gán cha"
              subtitle={relationsFor.fatherId ? "Đang có cha trong gia phả — chọn để thay" : "Chọn người đã có trong gia phả"}
              onClick={() => {
                setAssignQuery("");
                setAssign({ person: relationsFor, kind: "father" });
                setRelationsFor(null);
              }}
            />
            <SheetRow
              icon={<UserRound size={18} />}
              title="Gán mẹ"
              subtitle={relationsFor.motherId ? "Đang có mẹ trong gia phả — chọn để thay" : "Chọn người đã có trong gia phả"}
              onClick={() => {
                setAssignQuery("");
                setAssign({ person: relationsFor, kind: "mother" });
                setRelationsFor(null);
              }}
            />
            <SheetRow
              icon={<UserPlus size={18} />}
              title="Thêm cha mới"
              subtitle="Tạo hồ sơ mới rồi tự nối làm cha"
              onClick={() => {
                setNewParent({ person: relationsFor, gender: "male" });
                setRelationsFor(null);
              }}
            />
            <SheetRow
              icon={<UserPlus size={18} />}
              title="Thêm mẹ mới"
              subtitle="Tạo hồ sơ mới rồi tự nối làm mẹ"
              onClick={() => {
                setNewParent({ person: relationsFor, gender: "female" });
                setRelationsFor(null);
              }}
            />
            <SheetRow
              icon={<Users size={18} />}
              title="Thêm anh/chị/em"
              disabled={!relationsFor.fatherId && !relationsFor.motherId}
              subtitle={
                relationsFor.fatherId || relationsFor.motherId
                  ? "Cùng cha mẹ với người này"
                  : "Chưa có cha/mẹ để xác định cùng cha mẹ"
              }
              onClick={() => {
                if (!relationsFor.fatherId && !relationsFor.motherId) return;
                setSiblingOf(relationsFor);
                setRelationsFor(null);
              }}
            />
            <SheetRow
              icon={<GitBranch size={18} />}
              title="Gán chi phái"
              disabled={clan.roleOf(relationsFor.id) !== "clan"}
              subtitle={
                clan.roleOf(relationsFor.id) === "clan"
                  ? "Chọn chi phái cho người nội tộc"
                  : "Chỉ áp dụng cho người nội tộc"
              }
              onClick={() => {
                if (clan.roleOf(relationsFor.id) !== "clan") return;
                setAssign({ person: relationsFor, kind: "branch" });
                setRelationsFor(null);
              }}
            />
            <SheetRow
              icon={<Network size={18} />}
              title="Chỉ xem nhánh này"
              subtitle="Ẩn mọi người ngoài con cháu của người này"
              onClick={() => {
                setFocusId(relationsFor.id);
                setRelationsFor(null);
                setSelectedId(null);
              }}
            />
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(assign)}
        onClose={() => setAssign(null)}
        title={assign?.kind === "branch" ? "Gán chi phái" : assign?.kind === "father" ? "Gán cha" : "Gán mẹ"}
        subtitle={
          assign ? `${assign.person.name} · ${generationTag(gens.get(assign.person.id) ?? 1)}` : ""
        }
      >
        {assign ? (
          assign.kind === "branch" ? (
            <div className="space-y-1.5">
              <p className="mb-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                Chi phái chỉ áp dụng cho nam giới nội tộc; dâu/rể và ngoại tộc đi theo người hôn phối hoặc dòng
                mẹ.
              </p>
              <button
                type="button"
                onClick={() => pickBranch(undefined)}
                className="flex w-full items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5 text-left text-sm font-semibold"
              >
                <span className="h-3 w-3 rounded-full border border-[var(--pat-line)]" /> Bỏ xếp chi phái
              </button>
              {tree.branches.map((branch) => {
                const head = tree.members.find((member) => member.id === branch.headId);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => pickBranch(branch.id, branch.name)}
                    className="flex w-full items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5 text-left"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: branch.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{branch.name}</span>
                      <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                        {head ? `Trưởng chi: ${head.name}` : "Chưa chọn trưởng chi"}
                      </span>
                    </span>
                    {assign.person.branchId === branch.id ? <Badge tone="gold">Đang ở</Badge> : null}
                  </button>
                );
              })}
              {!tree.branches.length ? (
                <p className="py-6 text-center text-sm text-[var(--pat-muted)]">
                  Gia phả chưa có chi phái. Tạo chi phái ở trang Chi phái trước.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <Field label="Tìm người có sẵn">
                <input
                  className="pat-input"
                  value={assignQuery}
                  onChange={(event) => setAssignQuery(event.target.value)}
                  placeholder="Nhập tên hoặc năm sinh"
                  autoFocus
                />
              </Field>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                Chỉ chọn được người không phải con cháu của {assign.person.name} để tránh vòng lặp. Muốn tạo hồ sơ
                mới, dùng “Thêm cha mới” hoặc “Thêm mẹ mới”.
              </p>
              <div className="pat-scroll mt-3 max-h-[45dvh] space-y-1.5 overflow-y-auto">
                {assignOptions.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => pickAssign(person)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2 text-left"
                  >
                    <Avatar person={person} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{person.name}</span>
                      <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                        {generationTag(gens.get(person.id) ?? 1)} · {lifeSpan(person)}
                      </span>
                    </span>
                    {assign.kind === "father" && assign.person.fatherId === person.id ? (
                      <Badge tone="gold">Đang là cha</Badge>
                    ) : null}
                    {assign.kind === "mother" && assign.person.motherId === person.id ? (
                      <Badge tone="gold">Đang là mẹ</Badge>
                    ) : null}
                  </button>
                ))}
                {assignOptions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[var(--pat-muted)]">Không tìm thấy người phù hợp.</p>
                ) : null}
              </div>
            </>
          )
        ) : null}
      </Sheet>

      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Hướng dẫn dựng cây" subtitle="Thao tác nhanh trên phả hệ">
        <div className="space-y-2">
          <SheetRow
            icon={<ZoomIn size={18} />}
            title="Kéo nền và phóng to"
            subtitle="Kéo nền để di chuyển; lăn chuột, nút +/− hoặc phím +, − để thu phóng; phím 0 đưa về vừa khung. Bản đồ thu nhỏ ở góc phải giúp nhảy nhanh vị trí."
          />
          <SheetRow
            icon={<UserRound size={18} />}
            title="Chạm vào thành viên"
            subtitle="Mở thao tác: xem hồ sơ, sửa, thêm con, thêm vợ/chồng, quan hệ & chi phái, xoá."
          />
          <SheetRow
            icon={<Plus size={18} />}
            title="Thêm thành viên"
            subtitle="Nút Thêm tạo hồ sơ mới trước; sau đó mở thẻ để gán cha/mẹ và chi phái. Có thể thêm nhanh cha, mẹ, anh/chị/em từ thẻ người thân."
          />
          <SheetRow
            icon={<GitBranch size={18} />}
            title="Quan hệ & chi phái"
            subtitle="Gán cha/mẹ có sẵn, tạo cha/mẹ mới, thêm anh/chị/em cùng cha mẹ, gán chi phái và chỉ xem nhánh con cháu."
          />
          <SheetRow
            icon={<Network size={18} />}
            title="Đời tự động"
            subtitle="Đời và chi phái suy ra từ liên kết cha/mẹ; ô đời nhập tay chỉ dùng khi thiếu liên kết."
          />
          <SheetRow
            icon={<Users size={18} />}
            title="Phạm vi dòng họ"
            subtitle="Dâu/rể đứng cùng đời vợ/chồng. Con của con gái chỉ hiển thị một đời (đời n+1). Người từ đời n+2 cùng vợ/chồng của họ được ẩn khỏi trang và chuyển vào ghi chú của thân nhân. Cha mẹ của dâu/rể là hồ sơ tham khảo."
          />
          <SheetRow
            icon={<Maximize2 size={18} />}
            title="Mật độ thẻ"
            subtitle="Chọn Đầy đủ (danh xưng, tên, năm sinh–mất) hoặc Gọn (tên + đời) để cây dễ nhìn; người đã mất có dấu †."
          />
          <SheetRow
            icon={<Undo2 size={18} />}
            title="Lưu & hoàn tác"
            subtitle="Thay đổi được lưu ngay trên thiết bị. Sau khi xoá có thông báo kèm Hoàn tác; khi đổi cha/mẹ sẽ hỏi xác nhận kèm tên người liên quan."
          />
        </div>
      </Sheet>

      <Sheet
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        title="Thiếu liên kết cha"
        subtitle={`${missingFather.length} thành viên cần bổ sung`}
      >
        {missingFather.length ? (
          <div className="space-y-1.5">
            {missingFather.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--pat-line)] bg-white/60 pr-1.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setWarningOpen(false);
                    setSelectedId(person.id);
                    centerOn(person.id);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
                >
                  <Avatar person={person} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{person.name}</span>
                    <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                      {generationTag(gens.get(person.id) ?? 1)} · {CLAN_ROLE_LABELS[clan.roleOf(person.id)]} ·{" "}
                      {person.gender === "male" ? "Nam" : "Nữ"}
                    </span>
                  </span>
                  <ChevronRight size={14} className="text-[var(--pat-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWarningOpen(false);
                    setAssignQuery("");
                    setAssign({ person, kind: "father" });
                  }}
                  className="pat-btn pat-btn-outline h-8 shrink-0 px-2 text-[0.66rem]"
                >
                  Gán cha
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkipTarget(person);
                    setSkipReason("Chưa xác định được cha");
                  }}
                  className="pat-btn pat-btn-ghost h-8 shrink-0 px-1.5 text-[0.66rem] text-[var(--pat-muted)]"
                >
                  Bỏ qua
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--pat-muted)]">Tất cả thành viên đã có đủ liên kết cha.</p>
        )}
        {skippedEntries.length ? (
          <div className="mt-4 space-y-1.5 border-t border-[var(--pat-line)] pt-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">
              Đã bỏ qua ({skippedEntries.length})
            </p>
            {skippedEntries.map((entry) => (
              <div
                key={entry.person.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/60 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{entry.person.name}</span>
                  <span className="block text-[0.68rem] text-[var(--pat-muted)]">Lý do: {entry.reason}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...skippedFather };
                    delete next[entry.person.id];
                    setSkippedFather(next);
                    writeStorage(skipKey, JSON.stringify(next));
                  }}
                  className="pat-btn pat-btn-outline h-8 shrink-0 text-[0.66rem]"
                >
                  Hiện lại
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(skipTarget)}
        onClose={() => setSkipTarget(null)}
        title="Bỏ qua cảnh báo thiếu cha"
        subtitle={skipTarget?.name ?? ""}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="pat-btn pat-btn-outline h-11 flex-1 text-sm"
              onClick={() => setSkipTarget(null)}
            >
              Huỷ
            </button>
            <button type="button" className="pat-btn pat-btn-red h-11 flex-[2] text-sm" onClick={confirmSkip}>
              Lưu và bỏ qua
            </button>
          </div>
        }
      >
        <p className="mb-3 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
          Người này sẽ không còn trong danh sách cảnh báo. Lý do được lưu cùng hồ sơ để lần sau rà soát lại.
        </p>
        <Field label="Lý do">
          <textarea
            className="pat-input min-h-20"
            value={skipReason}
            onChange={(event) => setSkipReason(event.target.value)}
            placeholder="Ví dụ: không rõ cha, cha ngoài dòng họ, con nuôi…"
          />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Chưa xác định được cha", "Cha ngoài dòng họ", "Con nuôi", "Thiếu tư liệu"].map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setSkipReason(reason)}
              className="rounded-full border border-[var(--pat-line)] bg-white/70 px-2.5 py-1 text-[0.66rem] font-semibold text-[var(--pat-muted)]"
            >
              {reason}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Tìm thành viên" subtitle="Đi tới vị trí trên cây và làm nổi kết quả">
        <Field label="Tên hoặc năm sinh">
          <input
            className="pat-input"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Ví dụ: Phạm, 1950"
            autoFocus
          />
        </Field>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label="Đời">
            <select className="pat-input" value={searchGen} onChange={(event) => setSearchGen(event.target.value)}>
              <option value="all">Tất cả các đời</option>
              {genOptions.map((gen) =>
                gen === UNKNOWN_GENERATION ? (
                  <option key="unknown" value="unknown">
                    Chưa xác định
                  </option>
                ) : (
                  <option key={gen} value={String(gen)}>
                    {generationTag(gen)}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Chi phái">
            <select className="pat-input" value={searchBranch} onChange={(event) => setSearchBranch(event.target.value)}>
              <option value="all">Tất cả chi phái</option>
              <option value="none">Chưa xếp chi phái</option>
              {tree.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
          {searchMatches.length} kết quả{searchResults.length < searchMatches.length ? ` · hiện ${searchResults.length}` : ""} · những thẻ khớp được viền vàng trên cây.
        </p>
        <div className="pat-scroll mt-2 max-h-[42dvh] space-y-1.5 overflow-y-auto">
          {searchResults.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSelectedId(person.id);
                centerOn(person.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2 text-left"
            >
              <Avatar person={person} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{person.name}</span>
                <span className="block text-[0.68rem] text-[var(--pat-muted)]">
                  {generationTag(gens.get(person.id) ?? 1)} · {lifeSpan(person)}
                  {person.branchId
                    ? ` · ${tree.branches.find((branch) => branch.id === person.branchId)?.name ?? ""}`
                    : ""}
                </span>
              </span>
              <ChevronRight size={14} className="text-[var(--pat-muted)]" />
            </button>
          ))}
          {searchResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--pat-muted)]">Không tìm thấy thành viên.</p>
          ) : null}
        </div>
      </Sheet>

      {editPerson ? (
        <MemberFormSheet
          key={`edit-${editPerson.id}`}
          tree={tree}
          open
          member={editPerson}
          onSaved={() => setToast({ message: "Đã lưu thay đổi thành viên." })}
          onClose={() => setEditPerson(null)}
        />
      ) : null}
      {childOf ? (
        <MemberFormSheet
          key={`child-${childOf.id}`}
          tree={tree}
          open
          defaults={{
            fatherId: childOf.gender === "male" ? childOf.id : undefined,
            motherId: childOf.gender === "female" ? childOf.id : undefined,
            branchId: childOf.gender === "male" ? childOf.branchId : undefined,
            birthOrder:
              tree.members.filter((m) => m.fatherId === childOf.id || m.motherId === childOf.id).length + 1,
          }}
          onSaved={(id) => {
            setToast({ message: `Đã thêm con cho ${childOf.name}.` });
            setSelectedId(id);
            window.setTimeout(() => centerOn(id), 120);
          }}
          onClose={() => setChildOf(null)}
        />
      ) : null}
      {spouseOf ? (
        <MemberFormSheet
          key={`spouse-${spouseOf.id}`}
          tree={tree}
          open
          defaults={{
            spouseIds: [spouseOf.id],
            gender: spouseOf.gender === "male" ? "female" : "male",
            branchId: spouseOf.branchId,
          }}
          onSaved={(id) => {
            setToast({ message: `Đã thêm vợ/chồng cho ${spouseOf.name}.` });
            setSelectedId(id);
            window.setTimeout(() => centerOn(id), 120);
          }}
          onClose={() => setSpouseOf(null)}
        />
      ) : null}
      {newParent ? (
        <MemberFormSheet
          key={`parent-${newParent.person.id}-${newParent.gender}`}
          tree={tree}
          open
          defaults={{
            gender: newParent.gender,
            branchId: newParent.gender === "male" ? newParent.person.branchId : undefined,
          }}
          onSaved={(id) => {
            updateMember(
              tree.id,
              newParent.person.id,
              newParent.gender === "male" ? { fatherId: id } : { motherId: id },
            );
            setToast({
              message:
                newParent.gender === "male"
                  ? `Đã thêm cha cho ${newParent.person.name}.`
                  : `Đã thêm mẹ cho ${newParent.person.name}.`,
            });
          }}
          onClose={() => setNewParent(null)}
        />
      ) : null}
      {siblingOf ? (
        <MemberFormSheet
          key={`sibling-${siblingOf.id}`}
          tree={tree}
          open
          defaults={{
            fatherId: siblingOf.fatherId,
            motherId: siblingOf.motherId,
            branchId: siblingOf.branchId,
            birthOrder:
              tree.members.filter(
                (m) =>
                  (siblingOf.fatherId && m.fatherId === siblingOf.fatherId) ||
                  (siblingOf.motherId && m.motherId === siblingOf.motherId),
              ).length + 1,
          }}
          onSaved={(id) => {
            setToast({ message: `Đã thêm anh/chị/em cho ${siblingOf.name}.` });
            setSelectedId(id);
            window.setTimeout(() => centerOn(id), 120);
          }}
          onClose={() => setSiblingOf(null)}
        />
      ) : null}
      {addOpen ? (
        <MemberFormSheet
          key="add-member"
          tree={tree}
          open
          onSaved={() => setToast({ message: "Đã thêm thành viên mới." })}
          onClose={() => setAddOpen(false)}
        />
      ) : null}

      <Sheet
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? ""}
        subtitle="Xác nhận trước khi thay đổi"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="pat-btn pat-btn-outline h-11 flex-1 text-sm"
              onClick={() => setConfirmAction(null)}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-11 flex-[2] text-sm"
              onClick={() => confirmAction?.onConfirm()}
            >
              {confirmAction?.confirmLabel ?? "Xác nhận"}
            </button>
          </div>
        }
      >
        {confirmAction ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-[var(--pat-ink)]">{confirmAction.message}</p>
            {confirmAction.details?.length ? (
              <ul className="space-y-1.5 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                {confirmAction.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      {toast ? (
        <div
          className="fixed inset-x-3 bottom-24 z-[80] mx-auto flex max-w-md items-center gap-2 rounded-xl border border-[#4a3527] bg-[#2c1a12] px-3 py-2.5 text-[#fff4df] shadow-xl"
          role="status"
          aria-live="polite"
        >
          <span className="min-w-0 flex-1 text-sm">{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              onClick={() => {
                const undo = toast.undo;
                setToast(null);
                undo?.();
                setToast({ message: "Đã hoàn tác thao tác xoá." });
              }}
              className="flex shrink-0 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] px-2.5 py-1 text-[0.68rem] font-semibold text-[#f3dfab]"
            >
              <Undo2 size={13} /> Hoàn tác
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#cbb593]"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
    </TreeShell>
  );
}
