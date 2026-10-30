"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Save, Trash2, Users } from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree, Gender, Person } from "./types";
import { ANCESTOR_TITLES, HONORS, MANDARIN_RANKS, NOBLE_TITLES } from "./types";
import { descendants, sortPersons } from "./utils";
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
    name: member?.name ?? "",
    gender: (member?.gender ?? defaults?.gender ?? "male") as Gender,
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
    deathDate: member?.deathDate ?? "",
    alive: member?.alive ?? true,
    birthOrder: String(member?.birthOrder ?? defaults?.birthOrder ?? 1),
    fatherId: member?.fatherId ?? defaults?.fatherId ?? "",
    motherId: member?.motherId ?? defaults?.motherId ?? "",
    spouseIds: member?.spouseIds ?? defaults?.spouseIds ?? [],
    branchId: member?.branchId ?? defaults?.branchId ?? "",
    hometown: member?.hometown ?? "",
    occupation: member?.occupation ?? "",
    maritalStatus: member?.maritalStatus ?? "",
    deathAnniversary: member?.deathAnniversary ?? "",
    restingPlace: member?.restingPlace ?? "",
    graveAddress: member?.graveAddress ?? "",
    worshipPlace: member?.worshipPlace ?? "",
    phone: member?.phone ?? "",
    address: member?.address ?? "",
    education: member?.education ?? "",
    biography: member?.biography ?? "",
    notes: member?.notes ?? "",
    avatar: member?.avatar ?? "",
    photosText: (member?.photos ?? []).join("\n"),
  }));
  const [error, setError] = useState("");

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const blocked = useMemo(() => {
    if (!member) return new Set<string>();
    const set = descendants(tree.members, member.id);
    set.add(member.id);
    return set;
  }, [member, tree.members]);

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
      name: values.name.trim(),
      gender: values.gender,
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
      deathDate: values.deathDate,
      alive: values.alive,
      birthOrder: Number(values.birthOrder) || 1,
      fatherId: values.fatherId || undefined,
      motherId: values.motherId || undefined,
      spouseIds: values.spouseIds,
      branchId: values.branchId || undefined,
      hometown: values.hometown,
      occupation: values.occupation,
      maritalStatus: values.maritalStatus,
      deathAnniversary: values.deathAnniversary,
      restingPlace: values.restingPlace,
      graveAddress: values.graveAddress,
      worshipPlace: values.worshipPlace,
      phone: values.phone,
      address: values.address,
      education: values.education,
      biography: values.biography,
      notes: values.notes,
      avatar: values.avatar || undefined,
      photos: values.photosText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
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
          <button type="button" className="phatue-btn phatue-btn-outline h-11 flex-1 text-sm" onClick={onClose}>
            Huỷ
          </button>
          <button type="button" className="phatue-btn phatue-btn-red h-11 flex-[2] text-sm" onClick={submit}>
            <Save size={15} /> {member ? "Lưu thay đổi" : "Thêm thành viên"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="flex items-center gap-4 rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-4 py-3">
          <Avatar person={{ name: values.name || "?", gender: values.gender, avatar: values.avatar, alive: values.alive }} size={62} />
          <div className="min-w-0 flex-1">
            <p className="phatue-serif text-base font-semibold text-[var(--phatue-red)]">
              {values.name || "Thành viên mới"}
            </p>
            <p className="text-xs text-[var(--phatue-muted)]">Ảnh chân dung hiển thị trên phả đồ khi bật ảnh đại diện.</p>
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" className="phatue-btn phatue-btn-outline h-8 text-xs" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={13} /> Chọn ảnh
            </button>
            {values.avatar ? (
              <button type="button" className="phatue-btn phatue-btn-ghost h-7 text-[0.68rem] text-[#a3271d]" onClick={() => set("avatar", "")}>
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
          <p className="phatue-form-section">Thông tin cơ bản</p>
          <Field label="Họ và tên *" hint="Tên hiển thị trên phả đồ và sổ gia phả.">
            <input
              className="phatue-input"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Họ tên đầy đủ"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Danh xưng / thế thứ" hint="Vị trí của người ấy trong dòng họ qua các đời.">
              <input
                className="phatue-input"
                list="member-ancestor-titles"
                value={values.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder="Thủy tổ, Khởi tổ, Cao tổ…"
              />
            </Field>
            <Field label="Ghi chú thế thứ" hint="Đích tôn, trưởng nam, con thứ, chi trưởng…">
              <input
                className="phatue-input"
                value={values.generationNote}
                onChange={(event) => set("generationNote", event.target.value)}
                placeholder="Đích tôn chi trưởng"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Giới tính">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="phatue-chip flex-1 justify-center"
                  data-active={values.gender === "male"}
                  onClick={() => set("gender", "male")}
                >
                  Nam
                </button>
                <button
                  type="button"
                  className="phatue-chip flex-1 justify-center"
                  data-active={values.gender === "female"}
                  onClick={() => set("gender", "female")}
                >
                  Nữ
                </button>
              </div>
            </Field>
            <Field label="Thứ tự sinh">
              <input
                className="phatue-input"
                type="number"
                min={1}
                value={values.birthOrder}
                onChange={(event) => set("birthOrder", event.target.value)}
              />
            </Field>
            <Field label="Trạng thái">
              <button
                type="button"
                className="phatue-chip w-full justify-center"
                data-active={values.alive}
                onClick={() => set("alive", !values.alive)}
              >
                {values.alive ? "Còn sống" : "Đã mất"}
              </button>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Năm sinh / ngày sinh" hint="Ghi năm âm lịch hoặc dương lịch nếu biết.">
              <input
                className="phatue-input"
                value={values.birthDate}
                onChange={(event) => set("birthDate", event.target.value)}
                placeholder="1850 hoặc 12/03/1950"
              />
            </Field>
            <Field label="Ngày mất">
              <input
                className="phatue-input"
                value={values.deathDate}
                disabled={values.alive}
                onChange={(event) => set("deathDate", event.target.value)}
                placeholder="12/03/1990"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="phatue-form-section">Tên húy, tự, hiệu, thụy</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên húy" hint="Tên thật, con cháu kiêng gọi khi cúng tế.">
              <input
                className="phatue-input"
                value={values.tabooName}
                onChange={(event) => set("tabooName", event.target.value)}
                placeholder="Tên kiêng"
              />
            </Field>
            <Field label="Tên tự" hint="Tên chữ do cha mẹ hoặc thầy đặt.">
              <input
                className="phatue-input"
                value={values.courtesyName}
                onChange={(event) => set("courtesyName", event.target.value)}
                placeholder="Tên tự"
              />
            </Field>
            <Field label="Tên hiệu" hint="Biệt hiệu người ấy tự đặt khi trưởng thành.">
              <input
                className="phatue-input"
                value={values.styleName}
                onChange={(event) => set("styleName", event.target.value)}
                placeholder="Hiệu, biệt hiệu"
              />
            </Field>
            <Field label="Thụy hiệu" hint="Tên đặt sau khi mất, ghi trên thần chủ, bia mộ.">
              <input
                className="phatue-input"
                value={values.posthumousName}
                onChange={(event) => set("posthumousName", event.target.value)}
                placeholder="Thụy hiệu"
              />
            </Field>
          </div>
          <p className="rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] leading-relaxed text-[var(--phatue-muted)]">
            Gia phả xưa thường chép đủ “húy – tự – hiệu – thụy” để con cháu kiêng tên và hiểu rõ lai lịch. Mục nào chưa
            rõ có thể để trống.
          </p>
        </section>

        <section className="space-y-3">
          <p className="phatue-form-section">Quan hệ gia đình</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cha">
              <select className="phatue-input" value={values.fatherId} onChange={(event) => set("fatherId", event.target.value)}>
                <option value="">— Chưa rõ —</option>
                {fatherOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.birthDate ? ` (${p.birthDate})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mẹ">
              <select className="phatue-input" value={values.motherId} onChange={(event) => set("motherId", event.target.value)}>
                <option value="">— Chưa rõ —</option>
                {motherOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.birthDate ? ` (${p.birthDate})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Vợ / chồng" hint="Chọn một hoặc nhiều người. Liên kết được tạo cả hai chiều.">
            <div className="phatue-scroll max-h-36 space-y-1 overflow-y-auto rounded-xl border border-[var(--phatue-line)] bg-white/60 p-2">
              {spouseOptions.length === 0 ? (
                <p className="px-1 py-2 text-xs text-[var(--phatue-muted)]">Chưa có thành viên khác.</p>
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
                        onChange={() =>
                          set(
                            "spouseIds",
                            checked ? values.spouseIds.filter((id) => id !== p.id) : [...values.spouseIds, p.id],
                          )
                        }
                        className="h-4 w-4 accent-[var(--phatue-red)]"
                      />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-[0.66rem] text-[var(--phatue-muted)]">{p.gender === "male" ? "Nam" : "Nữ"}</span>
                    </label>
                  );
                })
              )}
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nhánh họ">
              <select className="phatue-input" value={values.branchId} onChange={(event) => set("branchId", event.target.value)}>
                <option value="">— Chưa xếp nhánh —</option>
                {tree.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hôn nhân" hint="Chánh thất, kế thất, thứ thất hoặc năm kết hôn.">
              <input
                className="phatue-input"
                value={values.maritalStatus}
                onChange={(event) => set("maritalStatus", event.target.value)}
                placeholder="Chánh thất, kết hôn năm…"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="phatue-form-section">Thân thế & công danh</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Chức tước" hint="Tước vị, chức quan thời trước.">
              <input
                className="phatue-input"
                list="member-noble-titles"
                value={values.officeTitle}
                onChange={(event) => set("officeTitle", event.target.value)}
                placeholder="Quận công, Tri huyện, Huấn đạo…"
              />
            </Field>
            <Field label="Phẩm hàm" hint="Phẩm cấp được phong, từ chánh nhất đến tòng cửu phẩm.">
              <input
                className="phatue-input"
                list="member-mandarin-ranks"
                value={values.mandarinRank}
                onChange={(event) => set("mandarinRank", event.target.value)}
                placeholder="Chánh tam phẩm…"
              />
            </Field>
            <Field label="Khoa bảng / danh hiệu" hint="Thi cử, đỗ đạt hoặc danh hiệu được ban.">
              <input
                className="phatue-input"
                list="member-honors"
                value={values.honors}
                onChange={(event) => set("honors", event.target.value)}
                placeholder="Tiến sĩ, Cử nhân, Tú tài…"
              />
            </Field>
            <Field label="Nghề nghiệp">
              <input
                className="phatue-input"
                value={values.occupation}
                onChange={(event) => set("occupation", event.target.value)}
                placeholder="Nông nghiệp, giáo viên…"
              />
            </Field>
            <Field label="Quê quán" hint="Nguyên quán của gia đình.">
              <input
                className="phatue-input"
                value={values.hometown}
                onChange={(event) => set("hometown", event.target.value)}
                placeholder="Xã, huyện, tỉnh"
              />
            </Field>
            <Field label="Học vấn" hint="Học vấn hiện đại, khác với khoa bảng thời trước.">
              <input
                className="phatue-input"
                value={values.education}
                onChange={(event) => set("education", event.target.value)}
                placeholder="Cao đẳng, đại học…"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="phatue-form-section">Thờ tự & an táng</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày giỗ (âm lịch)">
              <input
                className="phatue-input"
                value={values.deathAnniversary}
                onChange={(event) => set("deathAnniversary", event.target.value)}
                placeholder="12 tháng 3"
              />
            </Field>
            <Field label="Nơi thờ tự" hint="Từ đường, nhà thờ họ hoặc nơi thờ riêng.">
              <input
                className="phatue-input"
                value={values.worshipPlace}
                onChange={(event) => set("worshipPlace", event.target.value)}
                placeholder="Từ đường dòng họ"
              />
            </Field>
            <Field label="Nơi an nghỉ">
              <input
                className="phatue-input"
                value={values.restingPlace}
                onChange={(event) => set("restingPlace", event.target.value)}
                placeholder="Nghĩa trang dòng họ"
              />
            </Field>
            <Field label="Vị trí mộ">
              <input
                className="phatue-input"
                value={values.graveAddress}
                onChange={(event) => set("graveAddress", event.target.value)}
                placeholder="Lô, khu, thôn…"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="phatue-form-section">Liên hệ</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Điện thoại">
              <input className="phatue-input" value={values.phone} onChange={(event) => set("phone", event.target.value)} />
            </Field>
            <Field label="Địa chỉ hiện tại">
              <input className="phatue-input" value={values.address} onChange={(event) => set("address", event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <p className="phatue-form-section">Tiểu sử & tư liệu</p>
          <Field label="Tiểu sử">
            <textarea
              className="phatue-input min-h-24"
              value={values.biography}
              onChange={(event) => set("biography", event.target.value)}
              placeholder="Ghi chép về cuộc đời, công đức với dòng họ…"
            />
          </Field>
          <Field label="Ghi chú">
            <textarea
              className="phatue-input min-h-16"
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>
          <Field label="Ảnh tư liệu" hint="Mỗi dòng một đường dẫn ảnh (URL).">
            <textarea
              className="phatue-input min-h-16"
              value={values.photosText}
              onChange={(event) => set("photosText", event.target.value)}
              placeholder="https://…"
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

        <p className="flex items-start gap-2 rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-3 py-2 text-[0.7rem] text-[var(--phatue-muted)]">
          <Users size={14} className="mt-0.5 shrink-0 text-[var(--phatue-gold)]" />
          Chọn cha/mẹ và vợ/chồng để phả đồ tự sắp xếp đời và nhánh. Không cần nhập thủ công đời.
        </p>
      </div>
    </Sheet>
  );
}
