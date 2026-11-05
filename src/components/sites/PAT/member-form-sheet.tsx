"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ImagePlus,
  Info,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { STORAGE_KEY, useGenealogy } from "./store";
import type {
  CalendarKind,
  FamilyTree,
  Gender,
  LifeStatus,
  LinkConfidence,
  Person,
  SpouseRank,
} from "./types";
import {
  ANCESTOR_TITLES,
  CALENDAR_LABELS,
  generationTag,
  HONORS,
  LIFE_STATUS_LABELS,
  lifeStatusOf,
  LINK_CONFIDENCE_LABELS,
  MANDARIN_RANKS,
  NOBLE_TITLES,
  SPOUSE_RANK_LABELS,
} from "./types";
import { classifyClan, CLAN_ROLE_LABELS } from "./clan";
import { computeGenerations, descendants, sortPersons, splitFullName } from "./utils";
import { Avatar, Field, Sheet } from "./ui";
import { LunarConverterSheet } from "./lunar-converter";
import { formatStoredLunarDate } from "./lunar";

interface FormDefaults {
  fatherId?: string;
  motherId?: string;
  spouseIds?: string[];
  branchId?: string;
  title?: string;
  birthOrder?: number;
  gender?: Gender;
}

export type FormTab = "basic" | "relations" | "rites";

const FORM_TABS: { key: FormTab; label: string }[] = [
  { key: "basic", label: "Cơ bản" },
  { key: "relations", label: "Quan hệ" },
  { key: "rites", label: "Thờ tự & tiểu sử" },
];

const DRAFT_PREFIX = "phatue.memberDraft.v1";
const DRAFT_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

function initialValues(member?: Person, defaults?: FormDefaults) {
  return {
    code: member?.code ?? "",
    name: member?.name ?? "",
    gender: (member?.gender ?? defaults?.gender ?? "male") as Gender,
    lifeStatus: (member ? lifeStatusOf(member) : "alive") as LifeStatus,
    title: member?.title ?? defaults?.title ?? "",
    generationNote: member?.generationNote ?? "",
    tabooName: member?.tabooName ?? "",
    courtesyName: member?.courtesyName ?? "",
    styleName: member?.styleName ?? "",
    posthumousName: member?.posthumousName ?? "",
    officeTitle: member?.officeTitle ?? "",
    mandarinRank: member?.mandarinRank ?? "",
    honors: member?.honors ?? "",
    birthDate: member?.birthDate ?? "",
    birthCalendar: (member?.birthCalendar ?? "") as CalendarKind | "",
    birthLeap: member?.birthLeap ?? false,
    deathDate: member?.deathDate ?? "",
    deathCalendar: (member?.deathCalendar ?? "") as CalendarKind | "",
    deathLeap: member?.deathLeap ?? false,
    alive: member?.alive ?? true,
    birthOrder: String(member?.birthOrder ?? defaults?.birthOrder ?? 1),
    fatherId: member?.fatherId ?? defaults?.fatherId ?? "",
    motherId: member?.motherId ?? defaults?.motherId ?? "",
    spouseIds: member?.spouseIds ?? defaults?.spouseIds ?? [],
    spouseOrder: (member?.spouseOrder?.filter((id) => (member?.spouseIds ?? []).includes(id)) ??
      member?.spouseIds ??
      defaults?.spouseIds ??
      []) as string[],
    spouseRank: ({ ...(member?.spouseRank ?? {}) } as Record<string, SpouseRank>),
    reference: member?.reference ?? false,
    branchId: member?.branchId ?? defaults?.branchId ?? "",
    hometown: member?.hometown ?? "",
    occupation: member?.occupation ?? "",
    maritalStatus: member?.maritalStatus ?? "",
    deathAnniversary: member?.deathAnniversary ?? "",
    restingPlace: member?.restingPlace ?? "",
    graveAddress: member?.graveAddress ?? "",
    graveMapUrl: member?.graveMapUrl ?? "",
    worshipPlace: member?.worshipPlace ?? "",
    worshipMapUrl: member?.worshipMapUrl ?? "",
    phone: member?.phone ?? "",
    address: member?.address ?? "",
    education: member?.education ?? "",
    biography: member?.biography ?? "",
    notes: member?.notes ?? "",
    avatar: member?.avatar ?? "",
    generation: member?.generation !== undefined ? String(member.generation) : "",
    ancestorOrder: member?.ancestorOrder ? String(member.ancestorOrder) : "",
    ancestorLinkId: member?.ancestorLinkId ?? "",
    ancestorLinkRelation: member?.ancestorLinkRelation ?? "",
    ancestorLinkGap: String(member?.ancestorLinkGap ?? 2),
    ancestorLinkConfidence: (member?.ancestorLinkConfidence ?? "oral") as LinkConfidence,
    ancestorLinkNote: member?.ancestorLinkNote ?? "",
    nameIsConventional: member?.nameIsConventional ?? false,
    nameNote: member?.nameNote ?? "",
  };
}

type FormValues = ReturnType<typeof initialValues>;

interface FormDraft {
  savedAt: string;
  values: Partial<FormValues>;
}

function draftKeyFor(treeId: string, member?: Person, defaults?: FormDefaults) {
  const scope = member
    ? `edit-${member.id}`
    : `new-${defaults?.fatherId ?? ""}-${defaults?.motherId ?? ""}-${defaults?.spouseIds?.[0] ?? ""}-${defaults?.title ?? ""}`;
  return `${DRAFT_PREFIX}.${treeId}.${scope}`;
}

function readDraft(key: string): FormDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormDraft;
    if (!parsed?.savedAt || !parsed.values) return null;
    if (Date.now() - Date.parse(parsed.savedAt) > DRAFT_MAX_AGE) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(key: string, values: FormValues) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), values }));
  } catch {
    // Bộ nhớ trình duyệt đầy: bỏ qua bản nháp, dữ liệu chính vẫn được lưu khi bấm nút.
  }
}

function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Không cần xử lý.
  }
}

const pad2 = (value: number) => String(value).padStart(2, "0");

export function normalizeDateText(raw: string) {
  const text = raw.trim();
  if (!text) return "";
  if (/^(không rõ|khong ro|k rõ|\?)$/i.test(text)) return "Không rõ";
  if (/^\d{4}$/.test(text)) return text;
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return `${pad2(Number(match[3]))}/${pad2(Number(match[2]))}/${match[1]}`;
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return `${pad2(Number(match[1]))}/${pad2(Number(match[2]))}/${match[3]}`;
  return text;
}

function yearOf(value?: string) {
  const found = value?.match(/\d{4}/g);
  return found?.length ? Number(found[found.length - 1]) : NaN;
}

function foldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function MemberFormSheet({
  tree,
  open,
  onClose,
  member,
  defaults,
  onSaved,
  initialTab,
}: {
  tree: FamilyTree;
  open: boolean;
  onClose: () => void;
  member?: Person;
  defaults?: FormDefaults;
  onSaved?: (id: string) => void;
  initialTab?: FormTab;
}) {
  const { addMember, updateMember } = useGenealogy();
  const fileRef = useRef<HTMLInputElement>(null);
  const draftKey = draftKeyFor(tree.id, member, defaults);
  const [initial] = useState<FormValues>(() => initialValues(member, defaults));
  const [draft] = useState<FormDraft | null>(() => readDraft(draftKey));
  const [values, setValues] = useState<FormValues>(() => ({ ...initial, ...(draft?.values ?? {}) }));
  const [draftBanner, setDraftBanner] = useState(Boolean(draft));
  const [confirmClose, setConfirmClose] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<FormTab>(initialTab ?? "basic");
  const [lunarTarget, setLunarTarget] = useState<"birth" | "death" | null>(null);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const setLifeStatus = (status: LifeStatus) =>
    setValues((prev) => ({ ...prev, lifeStatus: status, alive: status === "alive" }));

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);

  useEffect(() => {
    if (!dirty || savedAt) return;
    const timer = window.setTimeout(() => writeDraft(draftKey, values), 600);
    return () => window.clearTimeout(timer);
  }, [values, dirty, draftKey, savedAt]);

  useEffect(() => {
    if (!savedAt) return;
    const timer = window.setTimeout(onClose, 1200);
    return () => window.clearTimeout(timer);
  }, [savedAt, onClose]);

  const nameParts = useMemo(() => splitFullName(values.name), [values.name]);

  const birthLunarPreview =
    values.birthCalendar === "am"
      ? formatStoredLunarDate(values.birthDate, values.birthLeap)
      : null;
  const deathLunarPreview =
    values.deathCalendar === "am" && values.lifeStatus !== "alive"
      ? formatStoredLunarDate(values.deathDate, values.deathLeap)
      : null;

  const orderedSpousePeople = useMemo(() => {
    const map = new Map(tree.members.map((person) => [person.id, person]));
    const order = values.spouseOrder.filter((id) => values.spouseIds.includes(id));
    const rest = values.spouseIds.filter((id) => !order.includes(id));
    return [...order, ...rest]
      .map((id) => map.get(id))
      .filter((person): person is Person => Boolean(person));
  }, [values.spouseOrder, values.spouseIds, tree.members]);

  const toggleSpouse = (id: string) =>
    setValues((prev) => {
      if (prev.spouseIds.includes(id)) {
        const spouseRank = { ...prev.spouseRank };
        delete spouseRank[id];
        return {
          ...prev,
          spouseIds: prev.spouseIds.filter((value) => value !== id),
          spouseOrder: prev.spouseOrder.filter((value) => value !== id),
          spouseRank,
        };
      }
      return {
        ...prev,
        spouseIds: [...prev.spouseIds, id],
        spouseOrder: [...prev.spouseOrder.filter((value) => value !== id), id],
      };
    });

  const moveSpouse = (id: string, delta: number) =>
    setValues((prev) => {
      const order = [...prev.spouseOrder];
      const current = order.indexOf(id);
      const next = current + delta;
      if (current < 0 || next < 0 || next >= order.length) return prev;
      [order[current], order[next]] = [order[next], order[current]];
      return { ...prev, spouseOrder: order };
    });

  const setSpouseRank = (id: string, rank: string) =>
    setValues((prev) => {
      const spouseRank = { ...prev.spouseRank };
      if (rank) spouseRank[id] = rank as SpouseRank;
      else delete spouseRank[id];
      return { ...prev, spouseRank };
    });

  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const role = member ? clan.roleOf(member.id) : undefined;
  const isInLaw = role === "inLaw";
  const isMaternal = role === "maternal";
  const isReference = values.reference || role === "reference";
  const isAncestor = role === "ancestor" || values.ancestorOrder.trim() !== "";
  const showAncestorLink = isAncestor || values.generation.trim() === "0";
  const roleHint: Record<string, string> = {
    clan: "Đời và chi phái của người trong nội tộc được tính theo dòng cha.",
    inLaw: "Dâu/rể không tự xác định đời: đời luôn theo vợ/chồng. Cha mẹ của dâu/rể chỉ nên ghi thành hồ sơ tham khảo.",
    maternal: "Con của con gái thuộc dòng họ bên chồng: chỉ nhập và hiển thị một đời, không nhập tiếp các đời sau.",
    reference: "Hồ sơ tham khảo không hiện trên phả đồ và không tham gia tính đời của dòng họ.",
    ancestor: "Bậc tiền tổ được xác định bằng ô Bậc tiền tổ và liên kết tiền tổ bên dưới.",
    outside: "Người này nằm ngoài phạm vi hiển thị của dòng họ nên không lên phả đồ.",
  };

  const blocked = useMemo(() => {
    if (!member) return new Set<string>();
    const set = descendants(tree.members, member.id, tree.founderId);
    set.add(member.id);
    return set;
  }, [member, tree.members, tree.founderId]);

  const fatherOptions = useMemo(
    () => tree.members.filter((p) => p.gender === "male" && !blocked.has(p.id)).sort(sortPersons),
    [tree.members, blocked],
  );
  const motherOptions = useMemo(
    () => tree.members.filter((p) => p.gender === "female" && !blocked.has(p.id)).sort(sortPersons),
    [tree.members, blocked],
  );
  const spouseOptions = useMemo(
    () =>
      tree.members
        .filter(
          (p) =>
            p.id !== member?.id && (p.gender !== values.gender || values.spouseIds.includes(p.id)),
        )
        .sort(sortPersons),
    [tree.members, member?.id, values.gender, values.spouseIds],
  );
  const gens = useMemo(
    () => computeGenerations(tree.members, tree.founderId),
    [tree.members, tree.founderId],
  );
  const ancestorLinkOptions = useMemo(
    () =>
      tree.members
        .filter((p) => !blocked.has(p.id) && (p.ancestorOrder ?? 0) > 0)
        .sort((a, b) => sortPersons(a, b)),
    [tree.members, blocked],
  );

  const isAddingChild = !member && Boolean(defaults?.fatherId || defaults?.motherId);
  const newChildParent = isAddingChild
    ? tree.members.find((p) => p.id === (defaults?.fatherId ?? defaults?.motherId))
    : undefined;
  const newChildParentRole = newChildParent ? clan.roleOf(newChildParent.id) : undefined;

  const duplicateMatches = useMemo(() => {
    const needle = foldName(values.name);
    if (!needle) return [];
    return tree.members
      .filter((person) => person.id !== member?.id && foldName(person.name) === needle)
      .slice(0, 3);
  }, [values.name, tree.members, member?.id]);

  const currentYear = new Date().getFullYear();
  const birthYear = yearOf(values.birthDate);
  const deathYear = yearOf(values.deathDate);
  const dateWarnings: string[] = [];
  if (!Number.isNaN(birthYear) && birthYear > currentYear) {
    dateWarnings.push("Năm sinh đang ở tương lai.");
  }
  if (values.lifeStatus !== "alive" && !Number.isNaN(birthYear) && !Number.isNaN(deathYear)) {
    if (deathYear < birthYear) dateWarnings.push("Năm mất trước năm sinh — kiểm tra lại.");
    else if (deathYear - birthYear > 120) dateWarnings.push("Tuổi thọ hơn 120 năm — kiểm tra lại năm.");
  }
  if (values.lifeStatus !== "alive" && !Number.isNaN(deathYear) && deathYear > currentYear) {
    dateWarnings.push("Năm mất đang ở tương lai.");
  }

  const avatarKb = values.avatar
    ? Math.max(1, Math.round((values.avatar.length * 3) / 4 / 1024))
    : 0;
  const storageMb = useMemo(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
      if (!raw) return 0;
      return Math.round((new TextEncoder().encode(raw).length / 1024 / 1024) * 10) / 10;
    } catch {
      return 0;
    }
  }, []);

  const upload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result ?? "");
      const image = new window.Image();
      image.onload = () => {
        const limit = 512;
        const scale = Math.min(1, limit / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          set("avatar", source);
          return;
        }
        context.fillStyle = "#fffdf7";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        set("avatar", canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = () => set("avatar", source);
      image.src = source;
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (savedAt) return;
    if (!values.name.trim()) {
      setError("Vui lòng nhập họ tên thành viên — tên không được chỉ gồm khoảng trắng.");
      setTab("basic");
      return;
    }
    setError("");
    const payload = {
      code: values.code.trim() || undefined,
      name: values.name.trim(),
      gender: values.gender,
      lifeStatus: values.lifeStatus,
      birthCalendar: values.birthCalendar || undefined,
      deathCalendar: values.deathCalendar || undefined,
      birthLeap: values.birthCalendar === "am" && values.birthLeap ? true : undefined,
      deathLeap:
        values.lifeStatus !== "alive" && values.deathCalendar === "am" && values.deathLeap
          ? true
          : undefined,
      title: values.title,
      generationNote: values.generationNote,
      tabooName: values.tabooName,
      courtesyName: values.courtesyName,
      styleName: values.styleName,
      posthumousName: values.posthumousName,
      officeTitle: values.officeTitle,
      mandarinRank: values.mandarinRank,
      honors: values.honors,
      birthDate: values.birthDate,
      deathDate: values.lifeStatus === "alive" ? "" : values.deathDate,
      alive: values.lifeStatus === "alive",
      birthOrder: Number(values.birthOrder) || 1,
      fatherId: values.fatherId || undefined,
      motherId: values.motherId || undefined,
      spouseIds: orderedSpousePeople.map((person) => person.id),
      spouseOrder: orderedSpousePeople.map((person) => person.id),
      spouseRank: Object.fromEntries(
        orderedSpousePeople
          .filter((person) => values.spouseRank[person.id])
          .map((person) => [person.id, values.spouseRank[person.id]]),
      ) as Record<string, SpouseRank>,
      reference: values.reference,
      branchId: values.branchId || undefined,
      hometown: values.hometown,
      occupation: values.occupation,
      maritalStatus: values.maritalStatus,
      deathAnniversary: values.deathAnniversary,
      restingPlace: values.restingPlace,
      graveAddress: values.graveAddress,
      graveMapUrl: values.graveMapUrl,
      worshipPlace: values.worshipPlace,
      worshipMapUrl: values.worshipMapUrl,
      phone: values.phone,
      address: values.address,
      education: values.education,
      biography: values.biography,
      notes: values.notes,
      avatar: values.avatar || undefined,
      generation:
        isInLaw || values.generation.trim() === "" ? undefined : Number(values.generation),
      ancestorOrder: values.ancestorOrder.trim() === "" ? undefined : Number(values.ancestorOrder),
      ancestorLinkId: showAncestorLink && values.ancestorLinkId ? values.ancestorLinkId : undefined,
      ancestorLinkRelation:
        showAncestorLink && values.ancestorLinkRelation.trim()
          ? values.ancestorLinkRelation.trim()
          : undefined,
      ancestorLinkGap:
        showAncestorLink && values.ancestorLinkId
          ? Math.max(1, Number(values.ancestorLinkGap) || 1)
          : undefined,
      ancestorLinkConfidence:
        showAncestorLink && values.ancestorLinkId ? values.ancestorLinkConfidence : undefined,
      ancestorLinkNote:
        showAncestorLink && values.ancestorLinkNote.trim() ? values.ancestorLinkNote.trim() : undefined,
      nameIsConventional: values.nameIsConventional,
      nameNote: values.nameNote,
    };
    if (member) {
      updateMember(tree.id, member.id, payload);
      onSaved?.(member.id);
    } else {
      const id = addMember(tree.id, payload);
      onSaved?.(id);
    }
    clearDraft(draftKey);
    setDraftBanner(false);
    setSavedAt(new Date().toISOString());
  };

  const requestClose = () => {
    if (savedAt) {
      onClose();
      return;
    }
    if (!dirty) {
      clearDraft(draftKey);
      onClose();
      return;
    }
    setConfirmClose(true);
  };

  const saveDraftAndClose = () => {
    writeDraft(draftKey, values);
    onClose();
  };

  const discardAndClose = () => {
    clearDraft(draftKey);
    onClose();
  };

  const discardDraft = () => {
    clearDraft(draftKey);
    setValues(initial);
    setDraftBanner(false);
    setError("");
  };

  const savedLabel = savedAt
    ? new Date(savedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <>
    <Sheet
      open={open}
      onClose={requestClose}
      title={member ? "Sửa thành viên" : "Thêm thành viên"}
      subtitle={member ? member.name : tree.name}
      wide
      footer={
        confirmClose ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--pat-red)]">Bỏ thay đổi chưa lưu?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="pat-btn pat-btn-outline h-10 text-xs"
                onClick={() => setConfirmClose(false)}
              >
                Tiếp tục sửa
              </button>
              <button
                type="button"
                className="pat-btn pat-btn-outline h-10 text-xs"
                onClick={saveDraftAndClose}
              >
                Lưu nháp & đóng
              </button>
              <button
                type="button"
                className="pat-btn pat-btn-ghost col-span-2 h-9 text-xs text-[#a3271d]"
                onClick={discardAndClose}
              >
                Bỏ thay đổi và đóng
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <button type="button" className="pat-btn pat-btn-outline h-11 flex-1 text-sm" onClick={requestClose}>
                Huỷ
              </button>
              <button type="button" className="pat-btn pat-btn-red h-11 flex-[2] text-sm" onClick={submit}>
                {savedAt ? <Check size={15} /> : <Save size={15} />}
                {savedAt ? "Đã lưu" : member ? "Lưu thay đổi" : "Thêm thành viên"}
              </button>
            </div>
            <p className="mt-1 text-center text-[0.62rem] text-[var(--pat-muted)]">
              {savedAt
                ? `Đã lưu lúc ${savedLabel}`
                : dirty
                  ? "Có thay đổi chưa lưu · bản nháp được giữ tạm trên thiết bị"
                  : "Chỉ họ tên là bắt buộc; các mục khác có thể bổ sung sau"}
            </p>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-full border border-[var(--pat-line)] bg-white/70 p-1">
          {FORM_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className="rounded-full px-2 py-1.5 text-[0.7rem] font-semibold transition"
              data-active={tab === item.key}
              style={
                tab === item.key
                  ? { background: "var(--pat-red)", color: "#fff4df" }
                  : { color: "var(--pat-muted)" }
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {draftBanner ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#e3cd92] bg-[#fdf4e0] px-3 py-2 text-[0.7rem] text-[#7a5a10]">
            <Info size={14} className="mt-0.5 shrink-0" />
            <p className="flex-1">
              Đã khôi phục bản nháp lưu tạm
              {draft ? ` lúc ${new Date(draft.savedAt).toLocaleString("vi-VN")}` : ""}. Kiểm tra lại trước khi lưu.
            </p>
            <button type="button" className="font-semibold underline" onClick={discardDraft}>
              Bỏ nháp
            </button>
          </div>
        ) : null}

        {tab === "basic" ? (
          <>
            {isAddingChild ? (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/80 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                <Users size={14} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
                <p>
                  Đang thêm con cho <strong className="text-[var(--pat-ink)]">{newChildParent?.name ?? "thành viên đã chọn"}</strong>.
                  Chọn rõ con trai hoặc con gái bên dưới. Con gái vẫn thuộc dòng họ nhưng chỉ hiển thị một đời; con của
                  con gái thuộc dòng họ bên chồng nên không nhập tiếp các đời sau.
                  {newChildParentRole && newChildParentRole !== "clan"
                    ? " Người đang chọn không thuộc nội tộc nên không thể mở thêm đời mới."
                    : ""}
                </p>
              </div>
            ) : null}

            <section className="flex items-center gap-4 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-4 py-3">
              <Avatar
                person={{ name: values.name || "?", gender: values.gender, avatar: values.avatar, alive: values.alive }}
                size={62}
              />
              <div className="min-w-0 flex-1">
                <p className="pat-serif text-base font-semibold text-[var(--pat-red)]">
                  {values.name || "Thành viên mới"}
                </p>
                <p className="text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                  Ảnh vuông, khuyến nghị từ 512×512 px. Ảnh lớn sẽ tự thu nhỏ về 512 px để tiết kiệm bộ nhớ.
                  {avatarKb ? ` Ảnh hiện tại ~${avatarKb} KB.` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="pat-btn pat-btn-outline h-8 text-xs"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus size={13} /> {values.avatar ? "Thay ảnh" : "Chọn ảnh"}
                </button>
                {values.avatar ? (
                  <button
                    type="button"
                    className="pat-btn pat-btn-ghost h-7 text-[0.68rem] text-[#a3271d]"
                    onClick={() => set("avatar", "")}
                  >
                    <Trash2 size={12} /> Bỏ ảnh
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </section>

            {storageMb >= 1 ? (
              <p
                className={
                  storageMb >= 4
                    ? "flex items-start gap-2 rounded-xl border border-[#e6b7ad] bg-[#f9e3df] px-3 py-2 text-[0.7rem] font-semibold text-[#8a1c15]"
                    : "flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2 text-[0.7rem] text-[var(--pat-muted)]"
                }
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Dung lượng dữ liệu đã lưu trên trình duyệt: {storageMb} MB
                {storageMb >= 4 ? " — gần đầy, hãy giảm ảnh hoặc xuất sao lưu rồi dọn bớt." : "."}
              </p>
            ) : null}

            <section className="space-y-3">
              <p className="pat-form-section">Thông tin cơ bản</p>
              {member?.code ? (
                <p className="text-[0.7rem] text-[var(--pat-muted)]">
                  Mã nội bộ: <strong className="text-[var(--pat-ink)]">{member.code}</strong> — dùng cột này khi nhập
                  Excel để cập nhật đúng người; mã không hiện trên hồ sơ công khai.
                </p>
              ) : null}
              <Field
                label="Họ và tên *"
                hint="Bắt buộc. Tên hiển thị trên phả đồ và sổ gia phả; các mục khác có thể bổ sung sau."
              >
                <input
                  className="pat-input"
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Họ tên đầy đủ"
                />
                {values.name.trim() ? (
                  <p className="mt-1 text-[0.68rem] text-[var(--pat-muted)]">
                    Tách tên: Họ <strong>{nameParts.surname || "—"}</strong> · Đệm{" "}
                    <strong>{nameParts.middle || "—"}</strong> · Tên <strong>{nameParts.given || "—"}</strong>
                  </p>
                ) : null}
              </Field>

              {duplicateMatches.length ? (
                <div className="rounded-xl border border-[#e3cd92] bg-[#fdf4e0] px-3 py-2 text-[0.7rem] leading-relaxed text-[#7a5a10]">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle size={13} /> Đã có {duplicateMatches.length} người cùng họ tên trong gia phả
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {duplicateMatches.map((person) => {
                      const sameYear =
                        !Number.isNaN(birthYear) && !Number.isNaN(yearOf(person.birthDate))
                          ? yearOf(person.birthDate) === birthYear
                          : false;
                      const sameParent =
                        Boolean(values.fatherId) && person.fatherId === values.fatherId;
                      return (
                        <li key={person.id}>
                          <a
                            href={`/gia-pha/${tree.id}/thanh-vien/${person.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold underline"
                          >
                            {person.name}
                          </a>
                          {person.birthDate ? ` · sinh ${person.birthDate}` : ""}
                          {sameYear ? " · trùng năm sinh" : ""}
                          {sameParent ? " · trùng cha" : ""}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-1">Có thể vẫn lưu nếu đây là hai người khác nhau; nên ghi rõ năm sinh hoặc cha/mẹ để phân biệt.</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Danh xưng / thế thứ" hint="Vị trí của người ấy trong dòng họ qua các đời.">
                  <input
                    className="pat-input"
                    list="member-ancestor-titles"
                    value={values.title}
                    onChange={(event) => set("title", event.target.value)}
                    placeholder="Thủy tổ, Sơ tổ, Cao tổ…"
                  />
                </Field>
                <Field label="Ghi chú thế thứ" hint="Đích tôn, trưởng nam, con thứ, chi trưởng…">
                  <input
                    className="pat-input"
                    value={values.generationNote}
                    onChange={(event) => set("generationNote", event.target.value)}
                    placeholder="Đích tôn chi trưởng"
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Giới tính" hint={isAddingChild ? "Chọn rõ con trai hoặc con gái để tính đời đúng." : undefined}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="pat-chip flex-1 justify-center"
                      data-active={values.gender === "male"}
                      onClick={() => set("gender", "male")}
                    >
                      Nam
                    </button>
                    <button
                      type="button"
                      className="pat-chip flex-1 justify-center"
                      data-active={values.gender === "female"}
                      onClick={() => set("gender", "female")}
                    >
                      Nữ
                    </button>
                  </div>
                </Field>
                <Field label="Thứ tự sinh">
                  <input
                    className="pat-input"
                    type="number"
                    min={1}
                    value={values.birthOrder}
                    onChange={(event) => set("birthOrder", event.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Tình trạng"
                hint="Mất tích và Chưa rõ không bị coi là đã mất; giới tính vẫn giữ nguyên."
              >
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {(Object.keys(LIFE_STATUS_LABELS) as LifeStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="pat-chip justify-center"
                      data-active={values.lifeStatus === status}
                      onClick={() => setLifeStatus(status)}
                    >
                      {LIFE_STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Sinh"
                  hint="Tự chuẩn hóa về dd/mm/yyyy khi rời ô. Chỉ nhập năm cũng được; ghi “Không rõ” nếu chưa chắc."
                >
                  <div className="flex gap-2">
                    <input
                      className="pat-input min-w-0 flex-1"
                      value={values.birthDate}
                      onChange={(event) => set("birthDate", event.target.value)}
                      onBlur={() => set("birthDate", normalizeDateText(values.birthDate))}
                      placeholder="1850 hoặc 12/03/1950"
                    />
                    <select
                      className="pat-input shrink-0"
                      style={{ width: "8.5rem" }}
                      value={values.birthCalendar}
                      onChange={(event) => {
                        const next = event.target.value as CalendarKind | "";
                        set("birthCalendar", next);
                        if (next !== "am") set("birthLeap", false);
                      }}
                      aria-label="Lịch sinh"
                    >
                      <option value="">Chưa ghi lịch</option>
                      {(Object.keys(CALENDAR_LABELS) as CalendarKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {CALENDAR_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {values.birthCalendar === "am" ? (
                    <label className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-[var(--pat-ink)]">
                      <input
                        type="checkbox"
                        checked={values.birthLeap}
                        onChange={(event) => set("birthLeap", event.target.checked)}
                        className="h-3.5 w-3.5 accent-[var(--pat-red)]"
                      />
                      Tháng nhuận
                    </label>
                  ) : null}
                  {birthLunarPreview ? (
                    <span className="mt-1 block text-[0.68rem] font-medium text-[#7a5a10]">
                      {birthLunarPreview}
                    </span>
                  ) : null}
                </Field>
                <Field
                  label="Mất"
                  hint="Chỉ dùng khi đã mất; chọn loại lịch nếu là âm lịch. Ngày được chuẩn hóa giống ô Sinh."
                >
                  <div className="flex gap-2">
                    <input
                      className="pat-input min-w-0 flex-1"
                      value={values.deathDate}
                      disabled={values.lifeStatus === "alive"}
                      onChange={(event) => set("deathDate", event.target.value)}
                      onBlur={() => set("deathDate", normalizeDateText(values.deathDate))}
                      placeholder="12/03/1990"
                    />
                    <select
                      className="pat-input shrink-0"
                      style={{ width: "8.5rem" }}
                      value={values.deathCalendar}
                      disabled={values.lifeStatus === "alive"}
                      onChange={(event) => {
                        const next = event.target.value as CalendarKind | "";
                        set("deathCalendar", next);
                        if (next !== "am") set("deathLeap", false);
                      }}
                      aria-label="Lịch mất"
                    >
                      <option value="">Chưa ghi lịch</option>
                      {(Object.keys(CALENDAR_LABELS) as CalendarKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {CALENDAR_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {values.deathCalendar === "am" && values.lifeStatus !== "alive" ? (
                    <label className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-[var(--pat-ink)]">
                      <input
                        type="checkbox"
                        checked={values.deathLeap}
                        onChange={(event) => set("deathLeap", event.target.checked)}
                        className="h-3.5 w-3.5 accent-[var(--pat-red)]"
                      />
                      Tháng nhuận
                    </label>
                  ) : null}
                  {deathLunarPreview ? (
                    <span className="mt-1 block text-[0.68rem] font-medium text-[#7a5a10]">
                      {deathLunarPreview}
                    </span>
                  ) : null}
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="pat-btn h-8 px-2.5 text-[0.68rem]"
                  onClick={() => setLunarTarget("birth")}
                >
                  <CalendarDays size={12} /> Đổi ngày Sinh Âm – Dương
                </button>
                <button
                  type="button"
                  className="pat-btn h-8 px-2.5 text-[0.68rem]"
                  onClick={() => setLunarTarget("death")}
                  disabled={values.lifeStatus === "alive"}
                >
                  <CalendarDays size={12} /> Đổi ngày Mất Âm – Dương
                </button>
              </div>
              {dateWarnings.length ? (
                <ul className="space-y-1 rounded-xl border border-[#e3cd92] bg-[#fdf4e0] px-3 py-2 text-[0.7rem] text-[#7a5a10]">
                  {dateWarnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-1.5">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {warning}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <details className="rounded-xl border border-[var(--pat-line)] bg-white/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--pat-red)]">
                Nâng cao: tên húy, tự, hiệu, thụy
                <ChevronDown size={14} />
              </summary>
              <div className="space-y-3 border-t border-[var(--pat-line)] px-3 py-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tên húy" hint="Tên thật, con cháu kiêng gọi khi cúng tế.">
                    <input
                      className="pat-input"
                      value={values.tabooName}
                      onChange={(event) => set("tabooName", event.target.value)}
                      placeholder="Tên kiêng"
                    />
                  </Field>
                  <Field label="Tên tự" hint="Tên chữ do cha mẹ hoặc thầy đặt.">
                    <input
                      className="pat-input"
                      value={values.courtesyName}
                      onChange={(event) => set("courtesyName", event.target.value)}
                      placeholder="Tên tự"
                    />
                  </Field>
                  <Field label="Tên hiệu" hint="Biệt hiệu người ấy tự đặt khi trưởng thành.">
                    <input
                      className="pat-input"
                      value={values.styleName}
                      onChange={(event) => set("styleName", event.target.value)}
                      placeholder="Hiệu, biệt hiệu"
                    />
                  </Field>
                  <Field label="Thụy hiệu" hint="Tên đặt sau khi mất, ghi trên thần chủ, bia mộ.">
                    <input
                      className="pat-input"
                      value={values.posthumousName}
                      onChange={(event) => set("posthumousName", event.target.value)}
                      placeholder="Thụy hiệu"
                    />
                  </Field>
                </div>
                <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                  <strong className="text-[var(--pat-ink)]">Húy</strong> là tên thật, con cháu kiêng gọi;{" "}
                  <strong className="text-[var(--pat-ink)]">tự</strong> là tên chữ dùng khi giao tiếp;{" "}
                  <strong className="text-[var(--pat-ink)]">hiệu</strong> là biệt hiệu tự đặt;{" "}
                  <strong className="text-[var(--pat-ink)]">thụy</strong> là tên đặt sau khi mất. Họ tên đầy đủ ở trên
                  vẫn là tên dùng để tách Họ · Đệm · Tên, nên không cần nhập trùng lại.
                </p>
              </div>
            </details>

            <section className="space-y-3">
              <p className="pat-form-section">Thân thế & công danh</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Chức tước" hint="Tước vị, chức quan thời trước.">
                  <input
                    className="pat-input"
                    list="member-noble-titles"
                    value={values.officeTitle}
                    onChange={(event) => set("officeTitle", event.target.value)}
                    placeholder="Quận công, Tri huyện, Huấn đạo…"
                  />
                </Field>
                <Field label="Phẩm hàm" hint="Phẩm cấp được phong, từ chánh nhất đến tòng cửu phẩm.">
                  <input
                    className="pat-input"
                    list="member-mandarin-ranks"
                    value={values.mandarinRank}
                    onChange={(event) => set("mandarinRank", event.target.value)}
                    placeholder="Chánh tam phẩm…"
                  />
                </Field>
                <Field label="Khoa bảng / danh hiệu" hint="Thi cử, đỗ đạt hoặc danh hiệu được ban.">
                  <input
                    className="pat-input"
                    list="member-honors"
                    value={values.honors}
                    onChange={(event) => set("honors", event.target.value)}
                    placeholder="Tiến sĩ, Cử nhân, Tú tài…"
                  />
                </Field>
                <Field label="Nghề nghiệp">
                  <input
                    className="pat-input"
                    value={values.occupation}
                    onChange={(event) => set("occupation", event.target.value)}
                    placeholder="Nông nghiệp, giáo viên…"
                  />
                </Field>
                <Field label="Quê quán" hint="Nguyên quán của gia đình.">
                  <input
                    className="pat-input"
                    value={values.hometown}
                    onChange={(event) => set("hometown", event.target.value)}
                    placeholder="Xã, huyện, tỉnh"
                  />
                </Field>
                <Field label="Học vấn" hint="Học vấn hiện đại, khác với khoa bảng thời trước.">
                  <input
                    className="pat-input"
                    value={values.education}
                    onChange={(event) => set("education", event.target.value)}
                    placeholder="Cao đẳng, đại học…"
                  />
                </Field>
              </div>
            </section>
          </>
        ) : null}

        {tab === "relations" ? (
          <>
            <section className="space-y-3">
              {role ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2">
                  <span className="rounded-full bg-[var(--pat-red)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-white">
                    {CLAN_ROLE_LABELS[role]}
                  </span>
                  <p className="min-w-0 flex-1 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                    {roleHint[role]}
                  </p>
                </div>
              ) : null}
              <p className="pat-form-section">Cha, mẹ & vợ/chồng</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cha" hint="Danh sách chỉ gồm nam giới và đã loại chính mình cùng con cháu để tránh vòng lặp.">
                  <select
                    className="pat-input"
                    value={values.fatherId}
                    onChange={(event) => set("fatherId", event.target.value)}
                  >
                    <option value="">— Chưa rõ —</option>
                    {fatherOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.birthDate ? ` (${p.birthDate})` : ""} · {generationTag(gens.get(p.id) ?? 1)}
                        {clan.roleOf(p.id) === "reference" ? " · tham khảo" : ""}
                      </option>
                    ))}
                  </select>
                  {values.fatherId ? (
                    <p className="mt-1 text-[0.68rem] text-[var(--pat-muted)]">
                      Cha đang chọn ở {generationTag(gens.get(values.fatherId) ?? 1)}; đời của thành viên được tính lại
                      tự động sau khi lưu.
                    </p>
                  ) : null}
                </Field>
                <Field label="Mẹ" hint="Danh sách chỉ gồm nữ giới và đã loại chính mình cùng con cháu để tránh vòng lặp.">
                  <select
                    className="pat-input"
                    value={values.motherId}
                    onChange={(event) => set("motherId", event.target.value)}
                  >
                    <option value="">— Chưa rõ —</option>
                    {motherOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.birthDate ? ` (${p.birthDate})` : ""} · {generationTag(gens.get(p.id) ?? 1)}
                        {clan.roleOf(p.id) === "reference" ? " · tham khảo" : ""}
                      </option>
                    ))}
                  </select>
                  {values.motherId ? (
                    <p className="mt-1 text-[0.68rem] text-[var(--pat-muted)]">
                      Mẹ đang chọn ở {generationTag(gens.get(values.motherId) ?? 1)}; đời của thành viên được tính lại
                      tự động sau khi lưu.
                    </p>
                  ) : null}
                </Field>
              </div>
              <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                Với dâu/rể, cha mẹ chỉ là thông tin tham khảo nên hãy tạo hồ sơ “Hồ sơ tham khảo” rồi chọn ở đây.
                Người được chọn làm cha/mẹ của dâu/rể sẽ tự động nằm ngoài phả đồ.
              </p>
              <Field
                label="Vợ / chồng"
                hint="Danh sách gợi ý người khác giới; người đã chọn luôn hiển thị. Liên kết được tạo cả hai chiều."
              >
                <div className="pat-scroll max-h-36 space-y-1 overflow-y-auto rounded-xl border border-[var(--pat-line)] bg-white/60 p-2">
                  {spouseOptions.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-[var(--pat-muted)]">Chưa có người phù hợp để chọn.</p>
                  ) : (
                    spouseOptions.map((p) => {
                      const checked = values.spouseIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#f6e9c8]/60"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSpouse(p.id)}
                            className="h-4 w-4 accent-[var(--pat-red)]"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {p.code ? <span className="mr-1 text-[0.68rem] text-[var(--pat-muted)]">{p.code}</span> : null}
                            {p.name}
                          </span>
                          <span className="text-[0.72rem] text-[var(--pat-muted)]">
                            {p.gender === "male" ? "Nam" : "Nữ"} · {generationTag(gens.get(p.id) ?? 1)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </Field>
              {orderedSpousePeople.length ? (
                <div className="space-y-1.5 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 p-2.5">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-red)]">
                    Thứ tự & vai vế vợ/chồng
                  </p>
                  <p className="text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
                    Dùng mũi tên để đổi thứ tự hiển thị; chọn Chánh thất, Kế thất, Thứ thất hoặc Khác.
                  </p>
                  {orderedSpousePeople.map((spouse, index) => (
                    <div
                      key={spouse.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--pat-line)] bg-white/70 px-2 py-1.5"
                    >
                      <span className="w-5 shrink-0 text-center text-[0.68rem] font-bold text-[var(--pat-muted)]">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{spouse.name}</span>
                      <button
                        type="button"
                        onClick={() => moveSpouse(spouse.id, -1)}
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--pat-line)] text-[var(--pat-muted)] transition enabled:hover:text-[var(--pat-red)] disabled:opacity-30"
                        aria-label={`Đưa ${spouse.name} lên trước`}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSpouse(spouse.id, 1)}
                        disabled={index === orderedSpousePeople.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--pat-line)] text-[var(--pat-muted)] transition enabled:hover:text-[var(--pat-red)] disabled:opacity-30"
                        aria-label={`Đưa ${spouse.name} xuống sau`}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <select
                        className="pat-input h-8 w-[7.5rem] shrink-0 px-2 text-[0.68rem]"
                        value={values.spouseRank[spouse.id] ?? ""}
                        onChange={(event) => setSpouseRank(spouse.id, event.target.value)}
                        aria-label={`Vai vế của ${spouse.name}`}
                      >
                        <option value="">Chưa rõ vai vế</option>
                        {(Object.keys(SPOUSE_RANK_LABELS) as SpouseRank[]).map((rank) => (
                          <option key={rank} value={rank}>
                            {SPOUSE_RANK_LABELS[rank]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Chi phái"
                  hint={
                    values.gender === "female"
                      ? "Con gái vẫn thuộc dòng họ nhưng không mở chi phái; con của con gái là ngoại tộc."
                      : "Chi phái tính theo dòng cha, chỉ áp dụng cho nam giới thuộc nội tộc."
                  }
                >
                  <select
                    className="pat-input"
                    value={values.branchId}
                    disabled={isInLaw || isMaternal || isReference}
                    onChange={(event) => set("branchId", event.target.value)}
                  >
                    <option value="">— Chưa xếp chi phái —</option>
                    {tree.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                        {branch.code ? ` · ${branch.code}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Hôn nhân" hint="Năm kết hôn hoặc ghi chú hôn nhân.">
                  <input
                    className="pat-input"
                    value={values.maritalStatus}
                    onChange={(event) => set("maritalStatus", event.target.value)}
                    placeholder="Kết hôn năm…"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <p className="pat-form-section">Vị trí & liên kết phả hệ</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Đời nội bộ"
                  hint={
                    isInLaw
                      ? "Dâu/rể tự động theo đời của vợ/chồng."
                      : isMaternal
                        ? "Con của con gái tự động ở đời kế tiếp con gái."
                        : isReference
                          ? "Hồ sơ tham khảo không có đời trong dòng họ."
                          : "0 = Sơ Tổ, 1.. là các đời sau. Bậc trước Sơ Tổ dùng ô Bậc tiền tổ bên cạnh."
                  }
                >
                  <input
                    className="pat-input"
                    type="number"
                    min={0}
                    disabled={isInLaw || isMaternal || isReference || isAncestor}
                    value={values.generation}
                    onChange={(event) => set("generation", event.target.value)}
                    placeholder="Tự động"
                  />
                </Field>
                <Field label="Bậc tiền tổ" hint="1 = xa nhất, tăng dần về phía Sơ Tổ. Ưu tiên hơn ô Đời.">
                  <input
                    className="pat-input"
                    type="number"
                    min={1}
                    value={values.ancestorOrder}
                    onChange={(event) => set("ancestorOrder", event.target.value)}
                    placeholder="Chỉ dùng cho bậc trên Sơ Tổ"
                  />
                </Field>
              </div>
              {showAncestorLink ? (
                <>
                  <Field
                    label="Liên kết tiền tổ"
                    hint="Chỉ nối giữa các bậc trên Sơ Tổ khi gia phả thiếu thông tin các đời nối tiếp."
                  >
                    <select
                      className="pat-input"
                      value={values.ancestorLinkId}
                      onChange={(event) => set("ancestorLinkId", event.target.value)}
                    >
                      <option value="">— Không có —</option>
                      {ancestorLinkOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · Bậc {p.ancestorOrder} · {generationTag(gens.get(p.id) ?? 1)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {values.ancestorLinkId ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Quan hệ / căn cứ" hint="Hậu duệ, cháu đời thứ 2, truyền miệng…">
                        <input
                          className="pat-input"
                          value={values.ancestorLinkRelation}
                          onChange={(event) => set("ancestorLinkRelation", event.target.value)}
                          placeholder="Hậu duệ của cụ…"
                        />
                      </Field>
                      <Field label="Cách mấy bậc" hint="2 = thiếu một bậc ở giữa.">
                        <input
                          className="pat-input"
                          type="number"
                          min={1}
                          value={values.ancestorLinkGap}
                          onChange={(event) => set("ancestorLinkGap", event.target.value)}
                        />
                      </Field>
                      <Field label="Độ tin cậy">
                        <select
                          className="pat-input"
                          value={values.ancestorLinkConfidence}
                          onChange={(event) =>
                            set("ancestorLinkConfidence", event.target.value as LinkConfidence)
                          }
                        >
                          {(Object.keys(LINK_CONFIDENCE_LABELS) as LinkConfidence[]).map((key) => (
                            <option key={key} value={key}>
                              {LINK_CONFIDENCE_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Ghi chú liên kết">
                        <input
                          className="pat-input"
                          value={values.ancestorLinkNote}
                          onChange={(event) => set("ancestorLinkNote", event.target.value)}
                          placeholder="Tư liệu, người kể, mức độ chắc chắn…"
                        />
                      </Field>
                    </div>
                  ) : null}
                </>
              ) : null}
              <label className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--pat-red)]"
                  checked={isReference}
                  disabled={role === "reference" && !member?.reference}
                  onChange={() => set("reference", !isReference)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[var(--pat-ink)]">Hồ sơ tham khảo</span>
                  <span className="block text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                    Dùng cho cha/mẹ của dâu/rể hoặc người chỉ cần tra cứu. Hồ sơ này không hiện trên phả đồ và không ảnh
                    hưởng cách tính đời.
                  </span>
                </span>
              </label>
              <button
                type="button"
                className="pat-chip"
                data-active={values.nameIsConventional}
                onClick={() => set("nameIsConventional", !values.nameIsConventional)}
              >
                Tên đang dùng là tên quy ước
              </button>
              {values.nameIsConventional ? (
                <Field
                  label="Nguồn hoặc lý do dùng tên quy ước"
                  hint="Ví dụ: chưa tìm được tên thật, tài liệu chỉ chép thứ tự, tên do họ hàng gọi…"
                >
                  <input
                    className="pat-input"
                    value={values.nameNote}
                    onChange={(event) => set("nameNote", event.target.value)}
                    placeholder="Nguồn tên, người cung cấp, lý do tạm gọi"
                  />
                </Field>
              ) : null}
              <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
                Bậc tiền tổ dành cho các cụ ở trên Sơ Tổ; mỗi bậc có thể đặt danh xưng riêng như Đại Tổ, Thượng Tổ,
                Thủy Tổ. Liên kết tiền tổ chỉ nối các bậc trên Sơ Tổ và được vẽ bằng nét đứt trên phả đồ.
              </p>
            </section>
          </>
        ) : null}

        {tab === "rites" ? (
          <>
            <section className="space-y-3">
              <p className="pat-form-section">Thờ tự & an táng</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ngày giỗ (âm lịch)" hint="Ghi theo âm lịch, ví dụ 12 tháng 3; có thể ghi thêm ghi chú.">
                  <input
                    className="pat-input"
                    value={values.deathAnniversary}
                    onChange={(event) => set("deathAnniversary", event.target.value)}
                    placeholder="12 tháng 3"
                  />
                </Field>
                <Field label="Nơi thờ tự" hint="Từ đường, nhà thờ họ hoặc nơi thờ riêng.">
                  <input
                    className="pat-input"
                    value={values.worshipPlace}
                    onChange={(event) => set("worshipPlace", event.target.value)}
                    placeholder="Từ đường dòng họ"
                  />
                </Field>
                <Field
                  label="Bản đồ nơi thờ"
                  hint="Dán liên kết Google Maps (https://maps.google.com/… hoặc https://maps.app.goo.gl/…)."
                >
                  <input
                    className="pat-input"
                    value={values.worshipMapUrl}
                    onChange={(event) => set("worshipMapUrl", event.target.value)}
                    placeholder="https://maps.google.com/…"
                  />
                </Field>
                <Field label="Nơi an nghỉ">
                  <input
                    className="pat-input"
                    value={values.restingPlace}
                    onChange={(event) => set("restingPlace", event.target.value)}
                    placeholder="Nghĩa trang dòng họ"
                  />
                </Field>
                <Field label="Vị trí mộ">
                  <input
                    className="pat-input"
                    value={values.graveAddress}
                    onChange={(event) => set("graveAddress", event.target.value)}
                    placeholder="Lô, khu, thôn…"
                  />
                </Field>
                <Field
                  label="Bản đồ phần mộ"
                  hint="Dán liên kết Google Maps tới mộ; liên kết sai dạng sẽ được cảnh báo khi xem hồ sơ."
                >
                  <input
                    className="pat-input"
                    value={values.graveMapUrl}
                    onChange={(event) => set("graveMapUrl", event.target.value)}
                    placeholder="https://maps.google.com/…"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <p className="pat-form-section">Liên hệ</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Điện thoại">
                  <input
                    className="pat-input"
                    value={values.phone}
                    onChange={(event) => set("phone", event.target.value)}
                  />
                </Field>
                <Field label="Địa chỉ hiện tại">
                  <input
                    className="pat-input"
                    value={values.address}
                    onChange={(event) => set("address", event.target.value)}
                  />
                </Field>
              </div>
              <p className="text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                Thông tin liên hệ của người còn sống được ẩn tự động trong bản in và khi chia sẻ hồ sơ.
              </p>
            </section>

            <section className="space-y-3">
              <p className="pat-form-section">Tiểu sử & tư liệu</p>
              <Field
                label="Tiểu sử"
                hint="Tiểu sử dài được đọc trong màn hình riêng, mở từ nút ở đầu hồ sơ."
              >
                <textarea
                  className="pat-input min-h-24"
                  value={values.biography}
                  onChange={(event) => set("biography", event.target.value)}
                  placeholder="Ghi chép về cuộc đời, công đức với dòng họ…"
                />
              </Field>
              <Field label="Ghi chú">
                <textarea
                  className="pat-input min-h-16"
                  value={values.notes}
                  onChange={(event) => set("notes", event.target.value)}
                />
              </Field>
            </section>
          </>
        ) : null}

        <datalist id="member-ancestor-titles">
          {ANCESTOR_TITLES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="member-noble-titles">
          {NOBLE_TITLES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="member-mandarin-ranks">
          {MANDARIN_RANKS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="member-honors">
          {HONORS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        {error ? <p className="text-xs font-semibold text-[#a3271d]">{error}</p> : null}

        <p className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] text-[var(--pat-muted)]">
          <Users size={14} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          Chọn cha/mẹ và vợ/chồng để phả đồ tự sắp xếp đời và chi phái. Con của con gái chỉ hiển thị một đời; cha mẹ
          của dâu/rể nên ghi thành hồ sơ tham khảo. Chỉ khai báo “Bậc tiền tổ” hoặc “Liên kết tiền tổ” khi gia phả
          thiếu thông tin các đời trước.
        </p>
      </div>
    </Sheet>
    <LunarConverterSheet
      open={lunarTarget !== null}
      onClose={() => setLunarTarget(null)}
      apply={
        lunarTarget
          ? {
              label: lunarTarget === "birth" ? "Sinh" : "Mất",
              date: lunarTarget === "birth" ? values.birthDate : values.deathDate,
              calendar: (lunarTarget === "birth" ? values.birthCalendar : values.deathCalendar) || undefined,
              leap: lunarTarget === "birth" ? values.birthLeap : values.deathLeap,
              onApply: (date, calendar, leap) => {
                if (lunarTarget === "birth") {
                  set("birthDate", date);
                  set("birthCalendar", calendar);
                  set("birthLeap", calendar === "am" && leap);
                } else {
                  set("deathDate", date);
                  set("deathCalendar", calendar);
                  set("deathLeap", calendar === "am" && leap);
                }
              },
            }
          : undefined
      }
    />
    </>
  );
}
