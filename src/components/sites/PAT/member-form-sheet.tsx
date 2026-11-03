"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Save, Trash2, Users } from "lucide-react";
import { useGenealogy } from "./store";
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

interface FormDefaults {
  fatherId?: string;
  motherId?: string;
  spouseIds?: string[];
  branchId?: string;
  title?: string;
  birthOrder?: number;
  gender?: Gender;
}

export function MemberFormSheet({
  tree,
  open,
  onClose,
  member,
  defaults,
  onSaved,
}: {
  tree: FamilyTree;
  open: boolean;
  onClose: () => void;
  member?: Person;
  defaults?: FormDefaults;
  onSaved?: (id: string) => void;
}) {
  const { addMember, updateMember } = useGenealogy();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(() => ({
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
    deathDate: member?.deathDate ?? "",
    deathCalendar: (member?.deathCalendar ?? "") as CalendarKind | "",
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
  }));
  const [error, setError] = useState("");

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const setLifeStatus = (status: LifeStatus) =>
    setValues((prev) => ({ ...prev, lifeStatus: status, alive: status === "alive" }));

  const nameParts = useMemo(() => splitFullName(values.name), [values.name]);

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
    () => tree.members.filter((p) => p.id !== member?.id).sort(sortPersons),
    [tree.members, member?.id],
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

  const upload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("avatar", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!values.name.trim()) {
      setError("Vui lòng nhập họ tên thành viên.");
      return;
    }
    const payload = {
      code: values.code.trim() || undefined,
      name: values.name.trim(),
      gender: values.gender,
      lifeStatus: values.lifeStatus,
      birthCalendar: values.birthCalendar || undefined,
      deathCalendar: values.deathCalendar || undefined,
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
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={member ? "Sửa thành viên" : "Thêm thành viên"}
      subtitle={member ? member.name : tree.name}
      wide
      footer={
        <div className="flex gap-2">
          <button type="button" className="pat-btn pat-btn-outline h-11 flex-1 text-sm" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="pat-btn pat-btn-red h-11 flex-[2] text-sm" onClick={submit}>
            <Save size={15} /> {member ? "Lưu thay đổi" : "Thêm thành viên"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="flex items-center gap-4 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-4 py-3">
          <Avatar person={{ name: values.name || "?", gender: values.gender, avatar: values.avatar, alive: values.alive }} size={62} />
          <div className="min-w-0 flex-1">
            <p className="pat-serif text-base font-semibold text-[var(--pat-red)]">
              {values.name || "Thành viên mới"}
            </p>
            <p className="text-xs text-[var(--pat-muted)]">Ảnh chân dung hiển thị trên phả đồ khi bật ảnh đại diện.</p>
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" className="pat-btn pat-btn-outline h-8 text-xs" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={13} /> Chọn ảnh
            </button>
            {values.avatar ? (
              <button type="button" className="pat-btn pat-btn-ghost h-7 text-[0.68rem] text-[#a3271d]" onClick={() => set("avatar", "")}>
                <Trash2 size={12} /> Bỏ ảnh
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </section>

        <section className="space-y-3">
          <p className="pat-form-section">Thông tin cơ bản</p>
          {member?.code ? (
            <p className="text-[0.7rem] text-[var(--pat-muted)]">
              Mã thành viên: <strong className="text-[var(--pat-ink)]">{member.code}</strong> — dùng cột này khi nhập
              Excel để cập nhật đúng người.
            </p>
          ) : null}
          <Field label="Họ và tên *" hint="Tên hiển thị trên phả đồ và sổ gia phả.">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Danh xưng / thế thứ" hint="Vị trí của người ấy trong dòng họ qua các đời.">
              <input
                className="pat-input"
                list="member-ancestor-titles"
                value={values.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder="Thủy tổ, Khởi tổ, Cao tổ…"
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
            <Field label="Giới tính">
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
          <Field label="Tình trạng" hint="Mất tích và Chưa rõ không bị coi là đã mất; giới tính vẫn giữ nguyên.">
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
            <Field label="Sinh" hint="Nhập năm hoặc ngày; chọn loại lịch bên cạnh.">
              <div className="flex gap-2">
                <input
                  className="pat-input min-w-0 flex-1"
                  value={values.birthDate}
                  onChange={(event) => set("birthDate", event.target.value)}
                  placeholder="1850 hoặc 12/03/1950"
                />
                <select
                  className="pat-input w-28 shrink-0"
                  value={values.birthCalendar}
                  onChange={(event) => set("birthCalendar", event.target.value as CalendarKind | "")}
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
            </Field>
            <Field label="Mất" hint="Chỉ dùng khi đã mất; chọn loại lịch nếu là âm lịch.">
              <div className="flex gap-2">
                <input
                  className="pat-input min-w-0 flex-1"
                  value={values.deathDate}
                  disabled={values.lifeStatus === "alive"}
                  onChange={(event) => set("deathDate", event.target.value)}
                  placeholder="12/03/1990"
                />
                <select
                  className="pat-input w-28 shrink-0"
                  value={values.deathCalendar}
                  disabled={values.lifeStatus === "alive"}
                  onChange={(event) => set("deathCalendar", event.target.value as CalendarKind | "")}
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
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="pat-form-section">Tên húy, tự, hiệu, thụy</p>
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
            Gia phả xưa thường chép đủ “húy – tự – hiệu – thụy” để con cháu kiêng tên và hiểu rõ lai lịch. Mục nào chưa
            rõ có thể để trống.
          </p>
        </section>

        <section className="space-y-3">
          <p className="pat-form-section">Quan hệ gia đình</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cha">
              <select className="pat-input" value={values.fatherId} onChange={(event) => set("fatherId", event.target.value)}>
                <option value="">— Chưa rõ —</option>
                {fatherOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.birthDate ? ` (${p.birthDate})` : ""}
                    {clan.roleOf(p.id) === "reference" ? " · tham khảo" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mẹ">
              <select className="pat-input" value={values.motherId} onChange={(event) => set("motherId", event.target.value)}>
                <option value="">— Chưa rõ —</option>
                {motherOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.birthDate ? ` (${p.birthDate})` : ""}
                    {clan.roleOf(p.id) === "reference" ? " · tham khảo" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
            Với dâu/rể, cha mẹ chỉ là thông tin tham khảo nên hãy tạo hồ sơ “Hồ sơ tham khảo” rồi chọn
            ở đây. Người được chọn làm cha/mẹ của dâu/rể sẽ tự động nằm ngoài phả đồ.
          </p>
          <Field label="Vợ / chồng" hint="Chọn một hoặc nhiều người. Liên kết được tạo cả hai chiều.">
            <div className="pat-scroll max-h-36 space-y-1 overflow-y-auto rounded-xl border border-[var(--pat-line)] bg-white/60 p-2">
              {spouseOptions.length === 0 ? (
                <p className="px-1 py-2 text-xs text-[var(--pat-muted)]">Chưa có thành viên khác.</p>
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
                        {p.code ? <span className="mr-1 text-[0.62rem] text-[var(--pat-muted)]">{p.code}</span> : null}
                        {p.name}
                      </span>
                      <span className="text-[0.66rem] text-[var(--pat-muted)]">{p.gender === "male" ? "Nam" : "Nữ"}</span>
                    </label>
                  );
                })
              )}
            </div>
          </Field>
          {orderedSpousePeople.length ? (
            <div className="space-y-1.5 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 p-2.5">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-red)]">
                Thứ tự & vai vế vợ/chồng
              </p>
              <p className="text-[0.66rem] leading-relaxed text-[var(--pat-muted)]">
                Dùng mũi tên để đổi thứ tự hiển thị; chọn Chánh thất, Kế thất, Thứ thất hoặc Khác.
              </p>
              {orderedSpousePeople.map((spouse, index) => (
                <div key={spouse.id} className="flex items-center gap-1.5 rounded-lg border border-[var(--pat-line)] bg-white/70 px-2 py-1.5">
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
                      : "0 = Khởi Tổ, 1.. là các đời sau. Bậc trước Khởi Tổ dùng ô Bậc tiền tổ bên cạnh."
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
            <Field label="Bậc tiền tổ" hint="1 = xa nhất, tăng dần về phía Khởi Tổ. Ưu tiên hơn ô Đời.">
              <input
                className="pat-input"
                type="number"
                min={1}
                value={values.ancestorOrder}
                onChange={(event) => set("ancestorOrder", event.target.value)}
                placeholder="Chỉ dùng cho bậc trên Khởi Tổ"
              />
            </Field>
          </div>
          {showAncestorLink ? (
            <>
              <Field
                label="Liên kết tiền tổ"
                hint="Chỉ nối giữa các bậc trên Khởi Tổ khi gia phả thiếu thông tin các đời nối tiếp."
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
              <span className="block text-xs font-semibold text-[var(--pat-ink)]">
                Hồ sơ tham khảo
              </span>
              <span className="block text-[0.68rem] leading-relaxed text-[var(--pat-muted)]">
                Dùng cho cha/mẹ của dâu/rể hoặc người chỉ cần tra cứu. Hồ sơ này không hiện trên phả
                đồ và không ảnh hưởng cách tính đời.
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
            <Field label="Nguồn hoặc lý do dùng tên quy ước" hint="Ví dụ: chưa tìm được tên thật, tài liệu chỉ chép thứ tự, tên do họ hàng gọi…">
              <input
                className="pat-input"
                value={values.nameNote}
                onChange={(event) => set("nameNote", event.target.value)}
                placeholder="Nguồn tên, người cung cấp, lý do tạm gọi"
              />
            </Field>
          ) : null}
          <p className="rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--pat-muted)]">
            Bậc tiền tổ dành cho các cụ ở trên Khởi Tổ; mỗi bậc có thể đặt danh xưng riêng như Đại
            Tổ, Thượng Tổ, Thủy Tổ. Liên kết tiền tổ chỉ nối các bậc trên Khởi Tổ và được vẽ bằng nét
            đứt trên phả đồ.
          </p>
        </section>

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

        <section className="space-y-3">
          <p className="pat-form-section">Thờ tự & an táng</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày giỗ (âm lịch)">
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
            <Field label="Bản đồ nơi thờ" hint="Dán liên kết Google Maps. Chỉ nơi thờ và phần mộ có bản đồ.">
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
            <Field label="Bản đồ phần mộ" hint="Dán liên kết Google Maps tới mộ.">
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
              <input className="pat-input" value={values.phone} onChange={(event) => set("phone", event.target.value)} />
            </Field>
            <Field label="Địa chỉ hiện tại">
              <input className="pat-input" value={values.address} onChange={(event) => set("address", event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="pat-form-section">Tiểu sử & tư liệu</p>
          <Field label="Tiểu sử">
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
          Chọn cha/mẹ và vợ/chồng để phả đồ tự sắp xếp đời và chi phái. Con của con gái chỉ hiển thị một
          đời; cha mẹ của dâu/rể nên ghi thành hồ sơ tham khảo. Chỉ khai báo “Bậc tiền tổ” hoặc “Liên
          kết tiền tổ” khi gia phả thiếu thông tin các đời trước.
        </p>
      </div>
    </Sheet>
  );
}
