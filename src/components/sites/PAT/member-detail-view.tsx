"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  Baby,
  Ban,
  BookOpen,
  ChevronRight,
  Copy,
  ExternalLink,
  FileDown,
  Flower2,
  HeartHandshake,
  Info,
  Link2Off,
  MapPin,
  MoreHorizontal,
  Network,
  PencilLine,
  Phone,
  Printer,
  ScrollText,
  Trash2,
  UserRound,
  Users,
  UsersRound,
  ZoomIn,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree, Person } from "./types";
import {
  CALENDAR_LABELS,
  generationTag,
  LIFE_STATUS_LABELS,
  lifeStatusOf,
  LINK_CONFIDENCE_LABELS,
  SPOUSE_RANK_LABELS,
  UNKNOWN_GENERATION,
} from "./types";
import { classifyClan, CLAN_ROLE_LABELS, CLAN_ROLE_HINTS } from "./clan";
import {
  ageText,
  buildFamilyIndex,
  computeGenerations,
  lifeSpan,
  nameAliases,
  sortPersons,
  spouseNames,
} from "./utils";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, SectionTitle, Sheet, SheetRow, Stat } from "./ui";
import { MemberFormSheet, type FormTab } from "./member-form-sheet";
import { KinshipSheet } from "./kinship-sheet";

const TERM_HINTS: Record<string, string> = {
  "Thế thứ": "Thứ tự đời và vai vế trong dòng họ, ví dụ đích tôn, trưởng nam, con thứ.",
  "Tên húy": "Tên thật của người đã khuất; con cháu kiêng gọi khi cúng tế.",
  "Tên tự": "Tên chữ do cha mẹ hoặc thầy đặt, dùng khi giao tiếp trang trọng.",
  "Tên hiệu": "Biệt hiệu người ấy tự đặt khi trưởng thành.",
  "Thụy hiệu": "Tên được đặt sau khi mất, ghi trên thần chủ và bia mộ.",
  "Chức tước": "Tước vị hoặc chức quan thời trước.",
  "Phẩm hàm": "Phẩm cấp được phong, từ chánh nhất đến tòng cửu phẩm.",
  "Khoa bảng": "Kết quả thi cử hoặc danh hiệu được ban như Tiến sĩ, Cử nhân.",
  "Danh xưng": "Cách gọi theo vai vế trong họ, ví dụ Thủy tổ, Khởi tổ, Cao tổ.",
  "Tuổi": "Tuổi tính bằng năm mất (hoặc năm hiện tại) trừ năm sinh, chưa xét ngày sinh nhật.",
};

const MAPS_HINT = "Dán liên kết Google Maps dạng https://maps.google.com/… hoặc https://maps.app.goo.gl/…";

function TermInfo({ hint }: { hint: string }) {
  return (
    <span
      className="pat-tip pat-tip-wrap inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-[var(--pat-muted)] align-middle"
      data-tip={hint}
      title={hint}
      tabIndex={0}
      aria-label={hint}
    >
      <Info size={11} />
    </span>
  );
}

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value?: React.ReactNode;
  hint?: string;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-dashed border-[var(--pat-line)] py-1.5 text-sm last:border-b-0">
      <span className="flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">
        {label}
        {hint ? <TermInfo hint={hint} /> : null}
      </span>
      <span className="min-w-0 break-words text-[var(--pat-ink)]">{value}</span>
    </div>
  );
}

function PersonChip({
  person,
  onClick,
  tone = "gold",
  rank,
  note,
}: {
  person: Person;
  onClick: () => void;
  tone?: "gold" | "red" | "muted";
  rank?: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-2.5 py-2 text-left transition hover:border-[var(--pat-gold)] hover:bg-[#fdf4e0]"
    >
      <Avatar person={person} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{person.name}</span>
        <span className="block truncate text-[0.68rem] text-[var(--pat-muted)]">
          {lifeSpan(person)} · {person.gender === "male" ? "Nam" : "Nữ"}
          {rank ? ` · ${rank}` : ""}
          {note ? ` · ${note}` : ""}
        </span>
      </span>
      {tone === "red" ? <Ban size={13} className="text-[var(--pat-muted)]" /> : null}
      <ChevronRight size={13} className="shrink-0 text-[var(--pat-muted)]" />
    </button>
  );
}

function mapStatus(url?: string): "empty" | "google" | "other" | "invalid" {
  const text = url?.trim();
  if (!text) return "empty";
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
    const host = parsed.hostname.toLowerCase();
    const googleMaps =
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com" ||
      ((host === "google.com" || host.endsWith(".google.com")) && parsed.pathname.startsWith("/maps"));
    return googleMaps ? "google" : "other";
  } catch {
    return "invalid";
  }
}

function MapLink({ url, label }: { url?: string; label: string }) {
  if (!url?.trim()) return null;
  const status = mapStatus(url);
  if (status === "invalid") {
    return <span className="text-[0.72rem] font-semibold text-[#a3271d]">Liên kết không hợp lệ</span>;
  }
  return (
    <span className="inline-flex flex-col gap-0.5">
      <a
        className="inline-flex items-center gap-1 text-[var(--pat-red)] underline underline-offset-2"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        {label} <ExternalLink size={11} />
      </a>
      {status === "other" ? (
        <span className="text-[0.65rem] font-semibold text-[#a3271d]">Không phải Google Maps — kiểm tra lại trước khi in.</span>
      ) : (
        <span className="text-[0.65rem] text-[var(--pat-muted)]">{MAPS_HINT}</span>
      )}
    </span>
  );
}

async function writeClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Rơi xuống cách sao chép dự phòng.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function MemberDetailView({ tree, member }: { tree: FamilyTree; member: Person }) {
  const router = useRouter();
  const { deleteMember, updateMember } = useGenealogy();
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<FormTab>("basic");
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [addSpouseOpen, setAddSpouseOpen] = useState(false);
  const [kinOpen, setKinOpen] = useState(false);
  const [biographyOpen, setBiographyOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);
  const [showAllChildren, setShowAllChildren] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3500);
  };

  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const role = clan.roleOf(member.id);
  const canAddChild = role === "clan";
  const index = useMemo(
    () => buildFamilyIndex(tree.members, tree.founderId),
    [tree.members, tree.founderId],
  );
  const gens = useMemo(
    () => computeGenerations(tree.members, tree.founderId),
    [tree.members, tree.founderId],
  );
  const generation = gens.get(member.id) ?? 1;
  const lifeStatus = lifeStatusOf(member);
  const statusTone = lifeStatus === "alive" ? "green" : lifeStatus === "deceased" ? "muted" : "gold";
  const generationKnown = generation !== UNKNOWN_GENERATION;
  const birthText = member.birthDate
    ? `${member.birthDate}${member.birthCalendar ? ` (${CALENDAR_LABELS[member.birthCalendar]})` : ""}`
    : undefined;
  const deathText = member.deathDate
    ? `${member.deathDate}${member.deathCalendar ? ` (${CALENDAR_LABELS[member.deathCalendar]})` : ""}`
    : undefined;
  const branch = tree.branches.find((b) => b.id === member.branchId);
  const father = tree.members.find((m) => m.id === member.fatherId);
  const mother = tree.members.find((m) => m.id === member.motherId);
  const ancestorLinkTarget = member.ancestorLinkId
    ? tree.members.find((m) => m.id === member.ancestorLinkId)
    : undefined;
  const spouses = spouseNames(tree, member);
  const children = [...(index.childrenAny.get(member.id) ?? [])].sort(sortPersons);
  const visibleChildren = showAllChildren ? children : children.slice(0, 8);
  const grandchildren = useMemo(() => {
    const kids = index.childrenAny.get(member.id) ?? [];
    return kids
      .filter((child) => clan.roleOf(child.id) === "clan")
      .reduce((sum, child) => sum + (index.childrenAny.get(child.id)?.length ?? 0), 0);
  }, [index, clan, member.id]);
  const siblings = tree.members
    .filter(
      (p) =>
        p.id !== member.id &&
        ((member.fatherId && p.fatherId === member.fatherId) || (member.motherId && p.motherId === member.motherId)),
    )
    .sort(sortPersons);
  const generationBadgeValue = generationKnown ? generationTag(generation) : "Chưa rõ";
  const aliasLine = nameAliases(member);
  const hasLineageInfo = Boolean(
    member.generationNote || member.tabooName || member.courtesyName || member.styleName || member.posthumousName,
  );
  const hasCareerInfo = Boolean(member.officeTitle || member.mandarinRank || member.honors);
  const biographyPreview = member.biography?.replace(/\s+/g, " ").trim() ?? "";
  const hasBiography = Boolean(biographyPreview || member.notes);

  const linkWarnings: string[] = [];
  if (ancestorLinkTarget) {
    if (member.fatherId || member.motherId) {
      linkWarnings.push("Hồ sơ đã có cha/mẹ trực tiếp; liên kết tiền tổ chỉ dùng khi thiếu đời nối tiếp.");
    }
    if (member.ancestorOrder && ancestorLinkTarget.ancestorOrder) {
      if (ancestorLinkTarget.ancestorOrder >= member.ancestorOrder) {
        linkWarnings.push("Người được nối không ở bậc tiền tổ cao hơn.");
      } else {
        const expectedGap = member.ancestorOrder - ancestorLinkTarget.ancestorOrder;
        if (member.ancestorLinkGap && member.ancestorLinkGap !== expectedGap) {
          linkWarnings.push(
            `Số bậc đang ghi là ${member.ancestorLinkGap} nhưng theo bậc tiền tổ phải là ${expectedGap}.`,
          );
        }
      }
    }
  }

  const primarySpouse = spouses[0];
  const childDefaults = {
    fatherId: member.gender === "male" ? member.id : primarySpouse?.gender === "male" ? primarySpouse.id : undefined,
    motherId: member.gender === "female" ? member.id : primarySpouse?.gender === "female" ? primarySpouse.id : undefined,
    branchId: member.gender === "male" ? member.branchId : undefined,
    birthOrder: children.length + 1,
  };
  const spouseDefaults = {
    spouseIds: [member.id],
    gender: (member.gender === "male" ? "female" : "male") as "male" | "female",
    branchId: member.branchId,
  };

  const goMember = (id: string) => router.push(`/gia-pha/${tree.id}/thanh-vien/${id}`);
  const openEdit = (tab: FormTab = "basic") => {
    setEditTab(tab);
    setEditOpen(true);
  };

  const copyValue = async (label: string, text?: string) => {
    if (!text?.trim()) return;
    const ok = await writeClipboard(text);
    showToast(ok ? `Đã sao chép ${label}.` : "Trình duyệt không cho phép sao chép tự động.");
  };

  const copyButton = (label: string, text?: string) =>
    text?.trim() ? (
      <button
        type="button"
        onClick={() => void copyValue(label, text)}
        className="pat-tip inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pat-line)] bg-white/70 text-[var(--pat-muted)] transition hover:text-[var(--pat-red)]"
        aria-label={`Sao chép ${label}`}
        data-tip="Sao chép"
      >
        <Copy size={11} />
      </button>
    ) : null;

  const printProfile = () => {
    setMenuOpen(false);
    window.print();
  };

  const exportPdf = () => {
    setMenuOpen(false);
    showToast("Trong hộp thoại in, chọn “Lưu thành PDF” để nhận tệp PDF.");
    window.setTimeout(() => window.print(), 300);
  };

  const openDelete = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    deleteMember(tree.id, member.id);
    router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`);
  };

  const removeAncestorLink = () => {
    updateMember(tree.id, member.id, {
      ancestorLinkId: undefined,
      ancestorLinkRelation: undefined,
      ancestorLinkGap: undefined,
      ancestorLinkConfidence: undefined,
      ancestorLinkNote: undefined,
    });
    setUnlinkConfirm(false);
    showToast("Đã gỡ liên kết tiền tổ.");
  };

  const contactBlock = (
    <>
      <div>
        <InfoRow
          label="Điện thoại"
          value={
            member.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <a className="text-[var(--pat-red)] underline underline-offset-2" href={`tel:${member.phone}`}>
                  {member.phone}
                </a>
                {copyButton("số điện thoại", member.phone)}
              </span>
            ) : undefined
          }
        />
        <InfoRow
          label="Địa chỉ"
          value={
            member.address ? (
              <span className="inline-flex items-center gap-1.5">
                <a
                  className="text-[var(--pat-red)] underline underline-offset-2"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {member.address}
                </a>
                {copyButton("địa chỉ", member.address)}
              </span>
            ) : undefined
          }
        />
        <InfoRow label="Học vấn" value={member.education} />
      </div>
      {!member.phone && !member.address && !member.education ? (
        <p className="mt-2 text-xs text-[var(--pat-muted)]">Chưa có thông tin liên hệ.</p>
      ) : null}
    </>
  );

  return (
    <TreeShell
      tree={tree}
      section="thanh-vien"
      title={member.name}
      subtitle={`${generationTag(generation)}${branch ? ` · ${branch.name}` : ""}`}
      actions={
        <>
          <button
            type="button"
            onClick={printProfile}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="In hồ sơ"
          >
            <Printer size={16} />
          </button>
          <button
            type="button"
            onClick={() => openEdit("basic")}
            className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
          >
            <PencilLine size={14} /> Sửa
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Thêm thao tác"
          >
            <MoreHorizontal size={17} />
          </button>
        </>
      }
    >
      <div className="no-print space-y-4">
        <section className="pat-card relative overflow-hidden px-4 py-5">
          <div aria-hidden className="pat-ornament absolute inset-x-6 top-3 opacity-60" />
          <div className="flex items-start gap-4">
            {member.avatar ? (
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="relative shrink-0 rounded-full"
                aria-label="Xem ảnh chân dung lớn"
              >
                <Avatar person={member} size={80} className="border-2 border-[#f2d27c]" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--pat-line)] bg-white text-[var(--pat-red)] shadow-sm">
                  <ZoomIn size={12} />
                </span>
              </button>
            ) : (
              <Avatar person={member} size={80} className="border-2 border-[#f2d27c]" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {member.title ? <Badge tone="gold">{member.title}</Badge> : null}
                <Badge tone={statusTone}>{LIFE_STATUS_LABELS[lifeStatus]}</Badge>
                <Badge tone={generationKnown ? "red" : "gold"}>{generationTag(generation)}</Badge>
                <Badge tone="muted">{CLAN_ROLE_LABELS[role]}</Badge>
                {member.nameIsConventional ? <Badge tone="muted">Tên quy ước</Badge> : null}
              </div>
              <h1 className="pat-serif mt-1 text-xl font-bold leading-tight text-[var(--pat-red)]">
                {member.name}
              </h1>
              {aliasLine || member.nameNote ? (
                <p className="text-[0.72rem] italic leading-snug text-[#7a5a10]">
                  {aliasLine}
                  {aliasLine && member.nameNote ? " · " : ""}
                  {member.nameNote}
                </p>
              ) : null}
              <p className="text-xs text-[var(--pat-muted)]">
                {lifeSpan(member)}
                {ageText(member) ? ` · ${ageText(member)}` : ""}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.7rem] text-[var(--pat-muted)]">
                <span className="inline-flex items-center gap-1">
                  <UserRound size={12} /> {member.gender === "male" ? "Nam" : "Nữ"}
                </span>
                {member.hometown ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {member.hometown}
                  </span>
                ) : null}
                {branch ? (
                  <span className="font-semibold" style={{ color: branch.color }}>
                    {branch.name}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 divide-x divide-[var(--pat-line)] rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/80 py-2.5">
            <Stat value={spouses.length} label="Vợ/chồng" />
            <Stat value={children.length} label="Con" tone="red" />
            <Stat value={grandchildren} label="Cháu nội tộc" />
            <Stat value={generationBadgeValue} label="Vị trí" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push(`/gia-pha/${tree.id}/ve-pha-do?focus=${member.id}`)}
              className="pat-btn pat-btn-red h-10 text-xs"
            >
              <Network size={14} /> Xem trên phả đồ
            </button>
            <button type="button" onClick={() => setKinOpen(true)} className="pat-btn pat-btn-outline h-10 text-xs">
              <HeartHandshake size={14} /> Cách xưng hô
            </button>
          </div>

          <button
            type="button"
            onClick={() => setBiographyOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/70 px-3 py-2.5 text-left transition hover:border-[var(--pat-gold)] hover:bg-[#fdf4e0]"
          >
            <BookOpen size={16} className="shrink-0 text-[var(--pat-gold)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[var(--pat-ink)]">Đọc tiểu sử</span>
              <span className="block truncate text-[0.68rem] text-[var(--pat-muted)]">
                {hasBiography
                  ? biographyPreview.slice(0, 90) || member.notes?.slice(0, 90)
                  : "Chưa có tiểu sử — chạm để viết"}
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-[var(--pat-muted)]" />
          </button>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle
            icon={<UserRound size={13} />}
            title="Thông tin cá nhân"
            action={
              <button
                type="button"
                onClick={() => openEdit("basic")}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <PencilLine size={12} /> Sửa
              </button>
            }
          />
          <div>
            <InfoRow label="Họ tên" value={member.name} />
            <InfoRow label="Giới tính" value={member.gender === "male" ? "Nam" : "Nữ"} />
            <InfoRow label="Sinh" value={birthText} />
            <InfoRow
              label="Mất"
              value={
                lifeStatus === "alive"
                  ? "Còn sống"
                  : lifeStatus === "missing"
                    ? "Mất tích"
                    : lifeStatus === "unknown"
                      ? "Chưa rõ"
                      : deathText
              }
            />
            <InfoRow label="Tuổi" value={ageText(member)} hint={TERM_HINTS["Tuổi"]} />
            <InfoRow label="Quê quán" value={member.hometown} />
            <InfoRow label="Nghề nghiệp" value={member.occupation} />
            <InfoRow label="Hôn nhân" value={member.maritalStatus} />
            <InfoRow label="Thứ tự sinh" value={`Con thứ ${member.birthOrder}`} />
          </div>
          {!member.birthDate && !member.hometown && !member.occupation ? (
            <p className="mt-2 text-xs text-[var(--pat-muted)]">
              Chưa có thông tin cá nhân.{" "}
              <button type="button" className="font-semibold text-[var(--pat-red)]" onClick={() => openEdit("basic")}>
                Bổ sung ngay
              </button>
            </p>
          ) : null}
          <p className="mt-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
            Ngày sinh, ngày mất ghi kèm loại lịch (dương/âm/chưa rõ). Tuổi tính theo năm mất hoặc năm hiện tại trừ năm
            sinh, chưa xét ngày sinh nhật.
          </p>
          {member.code ? (
            <details className="mt-2 text-[0.68rem] text-[var(--pat-muted)]">
              <summary className="cursor-pointer font-semibold">Thông tin nội bộ</summary>
              <p className="mt-1">
                Mã thành viên: <strong className="text-[var(--pat-ink)]">{member.code}</strong> — dùng khi nhập Excel,
                không in trên hồ sơ.
              </p>
            </details>
          ) : null}
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle
            icon={<UsersRound size={13} />}
            title="Quan hệ gia đình"
            action={
              <button
                type="button"
                onClick={() => openEdit("relations")}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <PencilLine size={12} /> Sửa
              </button>
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                Cha & mẹ
              </p>
              <div className="grid gap-1.5">
                {father ? (
                  <PersonChip person={father} onClick={() => goMember(father.id)} />
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--pat-line)] px-2.5 py-2 text-xs text-[var(--pat-muted)]">
                    Chưa xác định cha
                  </p>
                )}
                {mother ? (
                  <PersonChip person={mother} onClick={() => goMember(mother.id)} />
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--pat-line)] px-2.5 py-2 text-xs text-[var(--pat-muted)]">
                    Chưa xác định mẹ
                  </p>
                )}
              </div>
              <p className="mt-2 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">{CLAN_ROLE_HINTS[role]}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={!canAddChild}
                  title={
                    canAddChild
                      ? undefined
                      : "Chỉ thêm con từ người thuộc nội tộc. Con của con gái hiển thị một đời; dâu/rể và hồ sơ tham khảo không mở đời mới."
                  }
                  className="pat-btn pat-btn-outline h-8 flex-1 text-[0.68rem] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setAddChildOpen(true)}
                >
                  <Baby size={13} /> Thêm con
                </button>
                <button
                  type="button"
                  className="pat-btn pat-btn-outline h-8 flex-1 text-[0.68rem]"
                  onClick={() => setAddSpouseOpen(true)}
                >
                  <HeartHandshake size={13} /> Thêm vợ/chồng
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                Vợ / chồng ({spouses.length})
              </p>
              <div className="grid gap-1.5">
                {spouses.length ? (
                  spouses.map((spouse) => (
                    <PersonChip
                      key={spouse.id}
                      person={spouse}
                      onClick={() => goMember(spouse.id)}
                      rank={
                        member.spouseRank?.[spouse.id] ? SPOUSE_RANK_LABELS[member.spouseRank[spouse.id]] : undefined
                      }
                    />
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--pat-line)] px-2.5 py-2 text-xs text-[var(--pat-muted)]">
                    Chưa ghi nhận hôn nhân
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 flex items-center justify-between text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
              <span>Con ({children.length})</span>
              {children.length > 8 ? (
                <button
                  type="button"
                  className="text-[0.66rem] font-semibold normal-case tracking-normal text-[var(--pat-red)]"
                  onClick={() => setShowAllChildren((prev) => !prev)}
                >
                  {showAllChildren ? "Thu gọn" : `Xem thêm ${children.length - 8}`}
                </button>
              ) : null}
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {children.length ? (
                visibleChildren.map((child) => (
                  <PersonChip
                    key={child.id}
                    person={child}
                    onClick={() => goMember(child.id)}
                    note={`Con thứ ${child.birthOrder}`}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--pat-line)] px-2.5 py-2 text-xs text-[var(--pat-muted)] sm:col-span-2">
                  Chưa có con trong gia phả.
                </p>
              )}
            </div>
            <p className="mt-2 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
              Con được sắp theo thứ tự sinh. Con gái vẫn thuộc dòng họ nhưng gia phả chỉ hiển thị một đời; con của con
              gái thuộc dòng họ bên chồng nên không nối tiếp các đời sau.
            </p>
          </div>

          {siblings.length ? (
            <div className="mt-4">
              <p className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                Anh chị em ({siblings.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {siblings.slice(0, 10).map((sibling) => (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => goMember(sibling.id)}
                    className="rounded-full bg-[#f6e9c8]/80 px-2.5 py-1 text-[0.7rem] font-medium text-[#7a5a10]"
                  >
                    {sibling.name}
                  </button>
                ))}
                {siblings.length > 10 ? (
                  <span className="px-1 py-1 text-[0.7rem] text-[var(--pat-muted)]">+{siblings.length - 10}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle
            icon={<Network size={13} />}
            title="Vị trí & liên kết phả hệ"
            action={
              <button
                type="button"
                onClick={() => openEdit("relations")}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <PencilLine size={12} /> Sửa
              </button>
            }
          />
          <div className="grid gap-x-4 md:grid-cols-2">
            <div>
              <InfoRow label="Đời / bậc tổ" value={generationTag(generation)} />
              <InfoRow label="Phạm vi" value={CLAN_ROLE_LABELS[role]} />
              <InfoRow
                label="Bậc tiền tổ"
                value={member.ancestorOrder ? `Bậc ${member.ancestorOrder} (1 = xa nhất)` : undefined}
              />
              <InfoRow label="Tên quy ước" value={member.nameIsConventional ? "Có" : undefined} />
            </div>
            <div>
              <InfoRow
                label="Liên kết tiền tổ"
                value={
                  ancestorLinkTarget ? (
                    <button
                      type="button"
                      className="font-semibold text-[var(--pat-red)] underline underline-offset-2"
                      onClick={() => goMember(ancestorLinkTarget.id)}
                    >
                      {ancestorLinkTarget.name}
                    </button>
                  ) : undefined
                }
              />
              <InfoRow label="Quan hệ" value={member.ancestorLinkRelation} />
              <InfoRow
                label="Cách mấy bậc"
                value={member.ancestorLinkGap ? `${member.ancestorLinkGap} bậc` : undefined}
              />
              <InfoRow
                label="Độ tin cậy"
                value={
                  member.ancestorLinkConfidence
                    ? LINK_CONFIDENCE_LABELS[member.ancestorLinkConfidence]
                    : undefined
                }
              />
              <InfoRow label="Ghi chú" value={member.ancestorLinkNote} />
            </div>
          </div>

          {ancestorLinkTarget ? (
            <div className="mt-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-3">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                Đường nối tiền tổ
              </p>
              <div className="mt-2 flex flex-col items-start gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--pat-line)] bg-white/80 px-2 py-1 text-[0.7rem] font-semibold">
                  {ancestorLinkTarget.name}
                  {ancestorLinkTarget.ancestorOrder ? (
                    <span className="font-normal text-[var(--pat-muted)]">Bậc {ancestorLinkTarget.ancestorOrder}</span>
                  ) : null}
                </span>
                <span className="ml-3 flex items-center gap-2 text-[0.68rem] text-[var(--pat-muted)]">
                  <span className="h-7 border-l-2 border-dashed border-[var(--pat-gold)]" />
                  Cách {member.ancestorLinkGap ?? 2} bậc
                  {member.ancestorLinkGap && member.ancestorLinkGap > 1
                    ? ` · thiếu ${member.ancestorLinkGap - 1} bậc ở giữa`
                    : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--pat-red)]/40 bg-white/80 px-2 py-1 text-[0.7rem] font-semibold">
                  {member.name}
                  {member.ancestorOrder ? (
                    <span className="font-normal text-[var(--pat-muted)]">Bậc {member.ancestorOrder}</span>
                  ) : null}
                </span>
              </div>
              {linkWarnings.length ? (
                <ul className="mt-2 space-y-1 text-[0.68rem] font-semibold text-[#8a1c15]">
                  {linkWarnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-1.5">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {warning}
                    </li>
                  ))}
                </ul>
              ) : null}
              {unlinkConfirm ? (
                <div className="mt-2 rounded-lg border border-[#e6b7ad] bg-[#f9e3df] px-2.5 py-2">
                  <p className="text-[0.68rem] font-semibold text-[#8a1c15]">
                    Gỡ liên kết tới {ancestorLinkTarget.name}? Thông tin cha/mẹ trực tiếp không thay đổi.
                  </p>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      className="pat-btn pat-btn-outline h-7 flex-1 text-[0.66rem]"
                      onClick={() => setUnlinkConfirm(false)}
                    >
                      Giữ liên kết
                    </button>
                    <button
                      type="button"
                      className="pat-btn pat-btn-red h-7 flex-1 text-[0.66rem]"
                      onClick={removeAncestorLink}
                    >
                      Gỡ liên kết
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setUnlinkConfirm(true)}
                  className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold text-[#a3271d]"
                >
                  <Link2Off size={12} /> Gỡ liên kết tiền tổ
                </button>
              )}
            </div>
          ) : null}

          <p className="mt-2 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
            {role === "reference"
              ? "Hồ sơ tham khảo chỉ để tra cứu, không hiện trên phả đồ và không tham gia tính đời."
              : role === "inLaw"
                ? "Dâu/rể hiển thị cạnh vợ/chồng; đời lấy theo vợ/chồng, cha mẹ chỉ là thông tin tham khảo."
                : role === "maternal"
                  ? "Con của con gái thuộc dòng họ bên chồng nên chỉ hiển thị một đời, không nối tiếp các đời sau."
                  : "Liên kết tiền tổ chỉ nối các bậc trên Khởi Tổ khi thiếu đời nối tiếp và được vẽ bằng nét đứt trên phả đồ."}
          </p>
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle
            icon={<Award size={13} />}
            title="Gia thế & công danh"
            action={
              <button
                type="button"
                onClick={() => openEdit("basic")}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <PencilLine size={12} /> Sửa
              </button>
            }
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <div>
              <InfoRow label="Thế thứ" value={member.generationNote} hint={TERM_HINTS["Thế thứ"]} />
              <InfoRow label="Tên húy" value={member.tabooName} hint={TERM_HINTS["Tên húy"]} />
              <InfoRow label="Tên tự" value={member.courtesyName} hint={TERM_HINTS["Tên tự"]} />
              <InfoRow label="Tên hiệu" value={member.styleName} hint={TERM_HINTS["Tên hiệu"]} />
              <InfoRow label="Thụy hiệu" value={member.posthumousName} hint={TERM_HINTS["Thụy hiệu"]} />
            </div>
            <div>
              <InfoRow label="Chức tước" value={member.officeTitle} hint={TERM_HINTS["Chức tước"]} />
              <InfoRow label="Phẩm hàm" value={member.mandarinRank} hint={TERM_HINTS["Phẩm hàm"]} />
              <InfoRow label="Khoa bảng" value={member.honors} hint={TERM_HINTS["Khoa bảng"]} />
              <InfoRow label="Danh xưng" value={member.title} hint={TERM_HINTS["Danh xưng"]} />
            </div>
          </div>
          {member.nameIsConventional ? (
            <div className="mt-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.72rem] leading-relaxed text-[var(--pat-muted)]">
              <span className="font-semibold text-[var(--pat-ink)]">Nguồn tên quy ước: </span>
              {member.nameNote || "chưa ghi nguồn."}{" "}
              <button
                type="button"
                className="font-semibold text-[var(--pat-red)] underline underline-offset-2"
                onClick={() => openEdit("relations")}
              >
                Bổ sung nguồn
              </button>
            </div>
          ) : null}
          {!hasLineageInfo && !hasCareerInfo ? (
            <p className="mt-2 text-xs text-[var(--pat-muted)]">
              Chưa chép tên húy, tự, hiệu và công danh.{" "}
              <button type="button" className="font-semibold text-[var(--pat-red)]" onClick={() => openEdit("basic")}>
                Bổ sung ngay
              </button>
            </p>
          ) : null}
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle
            icon={<Flower2 size={13} />}
            title="Thờ tự & an táng"
            action={
              <button
                type="button"
                onClick={() => openEdit("rites")}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <PencilLine size={12} /> Sửa
              </button>
            }
          />
          <div>
            <InfoRow label="Ngày giỗ" value={member.deathAnniversary} hint="Ngày giỗ ghi theo âm lịch." />
            <InfoRow
              label="Nơi thờ tự"
              value={
                member.worshipPlace ? (
                  <span className="inline-flex items-center gap-1.5">
                    {member.worshipPlace}
                    {copyButton("nơi thờ tự", member.worshipPlace)}
                  </span>
                ) : undefined
              }
            />
            <InfoRow label="Bản đồ nơi thờ" value={<MapLink url={member.worshipMapUrl} label="Mở bản đồ nơi thờ" />} />
            <InfoRow
              label="Nơi an nghỉ"
              value={
                member.restingPlace ? (
                  <span className="inline-flex items-center gap-1.5">
                    {member.restingPlace}
                    {copyButton("nơi an nghỉ", member.restingPlace)}
                  </span>
                ) : undefined
              }
            />
            <InfoRow
              label="Vị trí mộ"
              value={
                member.graveAddress ? (
                  <span className="inline-flex items-center gap-1.5">
                    {member.graveAddress}
                    {copyButton("vị trí mộ", member.graveAddress)}
                  </span>
                ) : undefined
              }
            />
            <InfoRow label="Bản đồ phần mộ" value={<MapLink url={member.graveMapUrl} label="Mở bản đồ phần mộ" />} />
            <InfoRow label="Tình trạng" value={LIFE_STATUS_LABELS[lifeStatus]} />
          </div>
          {!member.deathAnniversary &&
          !member.worshipPlace &&
          !member.restingPlace &&
          !member.graveAddress &&
          !member.worshipMapUrl &&
          !member.graveMapUrl ? (
            <p className="mt-2 text-xs text-[var(--pat-muted)]">Chưa ghi nhận thông tin thờ tự, phần mộ.</p>
          ) : null}
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle
            icon={<Phone size={13} />}
            title="Liên hệ"
            action={
              <button
                type="button"
                onClick={() => openEdit("rites")}
                className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--pat-red)]"
              >
                <PencilLine size={12} /> Sửa
              </button>
            }
          />
          {contactBlock}
          <p className="mt-2 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
            <Info size={12} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            Thông tin liên hệ của người còn sống được ẩn tự động trong bản in và hồ sơ chia sẻ.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2 pb-2">
          <button
            type="button"
            className="pat-btn pat-btn-outline h-10 text-xs"
            onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`)}
          >
            <Users size={14} /> Về danh sách
          </button>
          <button type="button" className="pat-btn pat-btn-outline h-10 text-xs text-[#a3271d]" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Xoá thành viên
          </button>
        </div>
      </div>

      <div className="print-only p-6 text-[#1a1a1a]">
        <p className="text-[0.7rem] uppercase tracking-[0.18em]">{tree.name} · Hồ sơ thành viên</p>
        <div className="mt-2 flex items-start gap-4">
          <Avatar person={member} size={64} />
          <div>
            <h1 className="pat-serif text-2xl font-bold">{member.name}</h1>
            <p className="text-sm">
              {member.title ? `${member.title} · ` : ""}
              {generationTag(generation)}
              {branch ? ` · ${branch.name}` : ""} · {CLAN_ROLE_LABELS[role]}
            </p>
            <p className="text-sm">
              {lifeSpan(member)}
              {ageText(member) ? ` · ${ageText(member)}` : ""}
            </p>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-xs">
          <tbody>
            <tr className="border-b border-[#ddd]">
              <td className="w-36 py-1 pr-2 font-semibold">Giới tính</td>
              <td className="py-1">{member.gender === "male" ? "Nam" : "Nữ"}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Sinh</td>
              <td className="py-1">{birthText ?? "Chưa rõ"}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Mất</td>
              <td className="py-1">
                {lifeStatus === "alive"
                  ? "Còn sống"
                  : lifeStatus === "missing"
                    ? "Mất tích"
                    : lifeStatus === "unknown"
                      ? "Chưa rõ"
                      : deathText ?? "Chưa rõ"}
              </td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Quê quán</td>
              <td className="py-1">{member.hometown ?? ""}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Cha</td>
              <td className="py-1">{father?.name ?? "Chưa xác định"}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Mẹ</td>
              <td className="py-1">{mother?.name ?? "Chưa xác định"}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Vợ / chồng</td>
              <td className="py-1">{spouses.map((spouse) => spouse.name).join(", ") || ""}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Con</td>
              <td className="py-1">{children.map((child) => child.name).join(", ") || ""}</td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">Thờ tự</td>
              <td className="py-1">
                {[member.deathAnniversary ? `Giỗ ${member.deathAnniversary}` : "", member.worshipPlace]
                  .filter(Boolean)
                  .join(" · ") || "Chưa ghi"}
              </td>
            </tr>
            <tr className="border-b border-[#ddd]">
              <td className="py-1 pr-2 font-semibold">An táng</td>
              <td className="py-1">
                {[member.restingPlace, member.graveAddress].filter(Boolean).join(" · ") || "Chưa ghi"}
              </td>
            </tr>
            {!member.alive && (member.phone || member.address) ? (
              <tr className="border-b border-[#ddd]">
                <td className="py-1 pr-2 font-semibold">Liên hệ</td>
                <td className="py-1">{[member.phone, member.address].filter(Boolean).join(" · ")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {member.alive && (member.phone || member.address) ? (
          <p className="mt-3 text-[0.7rem] italic">
            Thông tin liên hệ của người còn sống được ẩn khỏi bản in để bảo vệ quyền riêng tư.
          </p>
        ) : null}

        {member.biography ? (
          <>
            <h2 className="mt-4 text-sm font-bold">Tiểu sử</h2>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{member.biography}</p>
          </>
        ) : null}
        {member.notes ? (
          <>
            <h2 className="mt-4 text-sm font-bold">Ghi chú</h2>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{member.notes}</p>
          </>
        ) : null}
        <p className="mt-6 text-[0.65rem] text-[#666]">Bản in từ Tiểu Phạm — Gia Phả. Chỉ in những thông tin đã được gia đình đồng ý chia sẻ.</p>
      </div>

      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[var(--pat-gold)]/60 bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[var(--pat-red)] shadow-lg no-print md:bottom-6">
          {toast}
        </div>
      ) : null}

      {editOpen ? (
        <MemberFormSheet
          key={`edit-${member.id}-${editTab}`}
          tree={tree}
          open
          member={member}
          initialTab={editTab}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      {addChildOpen ? (
        <MemberFormSheet key="add-child" tree={tree} open defaults={childDefaults} onClose={() => setAddChildOpen(false)} />
      ) : null}
      {addSpouseOpen ? (
        <MemberFormSheet
          key="add-spouse"
          tree={tree}
          open
          defaults={spouseDefaults}
          onClose={() => setAddSpouseOpen(false)}
        />
      ) : null}
      {kinOpen ? (
        <KinshipSheet
          tree={tree}
          open
          onClose={() => setKinOpen(false)}
          initialA={member.id}
          initialB={spouses[0]?.id ?? children[0]?.id ?? tree.members.find((m) => m.id !== member.id)?.id}
        />
      ) : null}

      <Sheet
        open={biographyOpen}
        onClose={() => setBiographyOpen(false)}
        title="Tiểu sử"
        subtitle={member.name}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="pat-btn pat-btn-outline h-10 flex-1 text-sm"
              onClick={() => setBiographyOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="pat-btn pat-btn-red h-10 flex-1 text-sm"
              onClick={() => {
                setBiographyOpen(false);
                openEdit("rites");
              }}
            >
              <PencilLine size={14} /> Sửa tiểu sử
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {member.biography ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--pat-ink)]">{member.biography}</p>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--pat-line)] px-3 py-4 text-sm text-[var(--pat-muted)]">
              Chưa có tiểu sử. Ghi lại cuộc đời, công đức với dòng họ để con cháu đời sau tra cứu.
            </p>
          )}
          {member.notes ? (
            <div className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-xs leading-relaxed text-[var(--pat-muted)]">
              <span className="font-semibold text-[var(--pat-ink)]">Ghi chú: </span>
              {member.notes}
            </div>
          ) : null}
          <p className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
            <ScrollText size={13} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            Tiểu sử được đọc trong màn hình riêng để dễ theo dõi; nội dung vẫn lưu cùng hồ sơ thành viên.
          </p>
        </div>
      </Sheet>

      <Sheet open={avatarOpen} onClose={() => setAvatarOpen(false)} title="Ảnh chân dung" subtitle={member.name}>
        {member.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatar} alt={member.name} className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain" />
        ) : null}
      </Sheet>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Thao tác hồ sơ"
        subtitle={member.name}
      >
        <div className="space-y-1">
          <SheetRow
            icon={<Printer size={17} />}
            title="In hồ sơ"
            subtitle="Bố cục gọn cho một trang A4"
            onClick={printProfile}
          />
          <SheetRow
            icon={<FileDown size={17} />}
            title="Xuất PDF"
            subtitle="Chọn “Lưu thành PDF” trong hộp thoại in"
            onClick={exportPdf}
          />
          <SheetRow
            icon={<Trash2 size={17} />}
            title="Xoá thành viên"
            subtitle="Gỡ khỏi gia phả và các liên kết"
            danger
            onClick={openDelete}
          />
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
          Bản in và PDF tự ẩn số điện thoại, địa chỉ của người còn sống. Nên xuất sao lưu gia phả trước khi xoá thành
          viên.
        </p>
      </Sheet>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Xoá thành viên?"
        subtitle={member.name}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="pat-btn pat-btn-outline h-10 flex-1 text-sm"
              onClick={() => setDeleteOpen(false)}
            >
              Giữ lại
            </button>
            <button type="button" className="pat-btn pat-btn-red h-10 flex-1 text-sm" onClick={confirmDelete}>
              <Trash2 size={14} /> Chuyển vào Thùng rác
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-[var(--pat-ink)]">
          <p>
            Hồ sơ <strong>{member.name}</strong> sẽ rồi khỏi gia phả cùng các liên kết cha mẹ, vợ/chồng, liên kết tiền tổ, và nằm trong <strong>Thùng rác</strong> của gia phả.
          </p>
          <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-xs text-[var(--pat-muted)]">
            {children.length
              ? `${children.length} người con vẫn ở lại gia phả nhưng mất liên kết cha/mẹ với người này.`
              : "Người này không có con trong gia phả."}{" "}
            Thùng rác giữ 30 ngày, sau đó tự động dọn; có thể khôi phục hàng loạt từ trang chủ gia phả.
          </p>
          <p className="text-xs text-[var(--pat-muted)]">
            Nếu chỉ muốn ẩn khỏi phả đồ, hãy sửa hồ sơ và đánh dấu “Hồ sơ tham khảo” thay vì xoá.
          </p>
        </div>
      </Sheet>
    </TreeShell>
  );
}
