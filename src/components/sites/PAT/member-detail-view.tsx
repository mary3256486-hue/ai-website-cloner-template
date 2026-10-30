"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Baby,
  Ban,
  CalendarHeart,
  ChevronRight,
  Flower2,
  HeartHandshake,
  Home,
  Info,
  MapPin,
  Network,
  PencilLine,
  Phone,
  Plus,
  ScrollText,
  Trash2,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree, Person } from "./types";
import {
  ageText,
  buildFamilyIndex,
  computeGenerations,
  grandchildrenCount,
  lifeSpan,
  nameAliases,
  sortPersons,
  spouseNames,
} from "./utils";
import { TreeShell } from "./app-shell";
import { Avatar, Badge, EmptyState, SectionTitle, Stat } from "./ui";
import { MemberFormSheet } from "./member-form-sheet";
import { KinshipSheet } from "./kinship-sheet";

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-dashed border-[var(--pat-line)] py-1.5 text-sm last:border-b-0">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--pat-muted)]">{label}</span>
      <span className="min-w-0 break-words text-[var(--pat-ink)]">{value}</span>
    </div>
  );
}

function PersonChip({
  person,
  onClick,
  tone = "gold",
}: {
  person: Person;
  onClick: () => void;
  tone?: "gold" | "red" | "muted";
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
        <span className="block truncate text-[0.62rem] text-[var(--pat-muted)]">
          {lifeSpan(person)} · {person.gender === "male" ? "Nam" : "Nữ"}
        </span>
      </span>
      {tone === "red" ? <Ban size={13} className="text-[var(--pat-muted)]" /> : null}
      <ChevronRight size={13} className="shrink-0 text-[var(--pat-muted)]" />
    </button>
  );
}

export function MemberDetailView({ tree, member }: { tree: FamilyTree; member: Person }) {
  const router = useRouter();
  const { deleteMember } = useGenealogy();
  const [editOpen, setEditOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [addSpouseOpen, setAddSpouseOpen] = useState(false);
  const [kinOpen, setKinOpen] = useState(false);

  const index = useMemo(() => buildFamilyIndex(tree.members), [tree.members]);
  const gens = useMemo(() => computeGenerations(tree.members), [tree.members]);
  const generation = gens.get(member.id) ?? 1;
  const branch = tree.branches.find((b) => b.id === member.branchId);
  const father = tree.members.find((m) => m.id === member.fatherId);
  const mother = tree.members.find((m) => m.id === member.motherId);
  const spouses = spouseNames(tree, member);
  const children = index.childrenAny.get(member.id) ?? [];
  const grandchildren = grandchildrenCount(tree, member);
  const siblings = tree.members
    .filter(
      (p) =>
        p.id !== member.id &&
        ((member.fatherId && p.fatherId === member.fatherId) || (member.motherId && p.motherId === member.motherId)),
    )
    .sort(sortPersons);
  const photos = member.photos ?? [];
  const aliasLine = nameAliases(member);
  const hasLineageInfo = Boolean(
    member.generationNote || member.tabooName || member.courtesyName || member.styleName || member.posthumousName,
  );
  const hasCareerInfo = Boolean(member.officeTitle || member.mandarinRank || member.honors);

  const primarySpouse = spouses[0];
  const childDefaults = {
    fatherId: member.gender === "male" ? member.id : primarySpouse?.gender === "male" ? primarySpouse.id : undefined,
    motherId: member.gender === "female" ? member.id : primarySpouse?.gender === "female" ? primarySpouse.id : undefined,
    branchId: member.branchId,
    birthOrder: children.length + 1,
  };
  const spouseDefaults = {
    spouseIds: [member.id],
    gender: (member.gender === "male" ? "female" : "male") as "male" | "female",
    branchId: member.branchId,
  };

  const goMember = (id: string) => router.push(`/gia-pha/${tree.id}/thanh-vien/${id}`);

  const remove = () => {
    if (!window.confirm(`Xoá "${member.name}" khỏi gia phả? Các liên kết cha mẹ, vợ/chồng sẽ được gỡ bỏ.`)) return;
    deleteMember(tree.id, member.id);
    router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`);
  };

  return (
    <TreeShell
      tree={tree}
      section="thanh-vien"
      title={member.name}
      subtitle={`Đời ${generation}${branch ? ` · ${branch.name}` : ""}`}
      backHref={`/gia-pha/${tree.id}/danh-sach-thanh-vien`}
      actions={
        <>
          <button
            type="button"
            onClick={() => setKinOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
            aria-label="Tra cứu xưng hô"
          >
            <HeartHandshake size={17} />
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex h-9 items-center gap-1 rounded-full border border-[rgba(231,206,139,0.5)] bg-[#8f2018] px-3 text-xs font-semibold text-[#fff4df]"
          >
            <PencilLine size={14} /> Sửa
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="pat-card relative overflow-hidden px-4 py-5">
          <div aria-hidden className="pat-ornament absolute inset-x-6 top-3 opacity-60" />
          <div className="flex items-start gap-4">
            <Avatar person={member} size={72} className="border-2 border-[#f2d27c]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {member.title ? <Badge tone="gold">{member.title}</Badge> : null}
                <Badge tone={member.alive ? "green" : "muted"}>{member.alive ? "Còn sống" : "Đã mất"}</Badge>
                <Badge tone="red">Đời {generation}</Badge>
              </div>
              <h1 className="pat-serif mt-1 text-xl font-bold leading-tight text-[var(--pat-red)]">
                {member.name}
              </h1>
              {aliasLine ? (
                <p className="text-[0.72rem] italic leading-snug text-[#7a5a10]">{aliasLine}</p>
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
                {branch ? <span className="font-semibold" style={{ color: branch.color }}>{branch.name}</span> : null}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 divide-x divide-[var(--pat-line)] rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/80 py-2.5">
            <Stat value={spouses.length} label="Vợ/chồng" />
            <Stat value={children.length} label="Con" tone="red" />
            <Stat value={grandchildren} label="Cháu" />
            <Stat value={photos.length} label="Ảnh" />
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
        </section>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<Award size={13} />} title="Gia thế & công danh" />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <div>
              <InfoRow label="Thế thứ" value={member.generationNote} />
              <InfoRow label="Tên húy" value={member.tabooName} />
              <InfoRow label="Tên tự" value={member.courtesyName} />
              <InfoRow label="Tên hiệu" value={member.styleName} />
              <InfoRow label="Thụy hiệu" value={member.posthumousName} />
            </div>
            <div>
              <InfoRow label="Chức tước" value={member.officeTitle} />
              <InfoRow label="Phẩm hàm" value={member.mandarinRank} />
              <InfoRow label="Khoa bảng" value={member.honors} />
              <InfoRow label="Danh xưng" value={member.title} />
            </div>
          </div>
          {!hasLineageInfo && !hasCareerInfo ? (
            <p className="mt-2 text-xs text-[var(--pat-muted)]">
              Chưa chép tên húy, tự, hiệu và công danh.{" "}
              <button type="button" className="font-semibold text-[var(--pat-red)]" onClick={() => setEditOpen(true)}>
                Bổ sung ngay
              </button>
            </p>
          ) : null}
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<UserRound size={13} />} title="Thông tin cá nhân" />
            <div>
              <InfoRow label="Họ tên" value={member.name} />
              <InfoRow label="Giới tính" value={member.gender === "male" ? "Nam" : "Nữ"} />
              <InfoRow label="Sinh" value={member.birthDate} />
              <InfoRow label="Mất" value={member.alive ? "Còn sống" : member.deathDate} />
              <InfoRow label="Tuổi" value={ageText(member)} />
              <InfoRow label="Quê quán" value={member.hometown} />
              <InfoRow label="Nghề nghiệp" value={member.occupation} />
              <InfoRow label="Hôn nhân" value={member.maritalStatus} />
              <InfoRow label="Thứ tự sinh" value={`Con thứ ${member.birthOrder}`} />
            </div>
            {!member.birthDate && !member.hometown && !member.occupation ? (
              <p className="mt-2 text-xs text-[var(--pat-muted)]">
                Chưa có thông tin cá nhân.{" "}
                <button type="button" className="font-semibold text-[var(--pat-red)]" onClick={() => setEditOpen(true)}>
                  Bổ sung ngay
                </button>
              </p>
            ) : null}
          </section>

          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<Flower2 size={13} />} title="Thờ tự & an táng" />
            <div>
              <InfoRow label="Ngày giỗ" value={member.deathAnniversary} />
              <InfoRow label="Nơi thờ tự" value={member.worshipPlace} />
              <InfoRow label="Nơi an nghỉ" value={member.restingPlace} />
              <InfoRow label="Vị trí mộ" value={member.graveAddress} />
              <InfoRow label="Tình trạng" value={member.alive ? "Đang sinh sống" : "Đã khuất"} />
            </div>
            {!member.deathAnniversary && !member.worshipPlace && !member.restingPlace && !member.graveAddress ? (
              <p className="mt-2 text-xs text-[var(--pat-muted)]">Chưa ghi nhận thông tin thờ tự, phần mộ.</p>
            ) : null}
          </section>
        </div>

        <section className="pat-card px-4 py-4">
          <SectionTitle icon={<UsersRound size={13} />} title="Quan hệ gia đình" />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
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
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="pat-btn pat-btn-outline h-8 flex-1 text-[0.68rem]"
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
              <p className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                Vợ / chồng ({spouses.length})
              </p>
              <div className="grid gap-1.5">
                {spouses.length ? (
                  spouses.map((spouse) => <PersonChip key={spouse.id} person={spouse} onClick={() => goMember(spouse.id)} />)
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--pat-line)] px-2.5 py-2 text-xs text-[var(--pat-muted)]">
                    Chưa ghi nhận hôn nhân
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 flex items-center justify-between text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
              <span>Con ({children.length})</span>
              {children.length > 8 ? <span className="normal-case tracking-normal">Hiển thị 8 đầu</span> : null}
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {children.length ? (
                children
                  .slice(0, 8)
                  .map((child) => <PersonChip key={child.id} person={child} onClick={() => goMember(child.id)} />)
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--pat-line)] px-2.5 py-2 text-xs text-[var(--pat-muted)] sm:col-span-2">
                  Chưa có con trong gia phả.
                </p>
              )}
            </div>
          </div>

          {siblings.length ? (
            <div className="mt-4">
              <p className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
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

        <div className="grid gap-3 md:grid-cols-2">
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<Phone size={13} />} title="Liên hệ" />
            <div>
              <InfoRow
                label="Điện thoại"
                value={
                  member.phone ? (
                    <a className="text-[var(--pat-red)] underline underline-offset-2" href={`tel:${member.phone}`}>
                      {member.phone}
                    </a>
                  ) : undefined
                }
              />
              <InfoRow
                label="Địa chỉ"
                value={
                  member.address ? (
                    <a
                      className="text-[var(--pat-red)] underline underline-offset-2"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {member.address}
                    </a>
                  ) : undefined
                }
              />
              <InfoRow label="Học vấn" value={member.education} />
            </div>
            {!member.phone && !member.address && !member.education ? (
              <p className="mt-2 text-xs text-[var(--pat-muted)]">Chưa có thông tin liên hệ.</p>
            ) : null}
          </section>

          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<ScrollText size={13} />} title="Tiểu sử & ghi chú" />
            {member.biography ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--pat-ink)]">{member.biography}</p>
            ) : (
              <p className="text-xs text-[var(--pat-muted)]">
                Chưa có tiểu sử.{" "}
                <button type="button" className="font-semibold text-[var(--pat-red)]" onClick={() => setEditOpen(true)}>
                  Viết tiểu sử
                </button>
              </p>
            )}
            {member.notes ? (
              <div className="mt-3 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2 text-xs leading-relaxed text-[var(--pat-muted)]">
                <span className="font-semibold text-[var(--pat-ink)]">Ghi chú: </span>
                {member.notes}
              </div>
            ) : null}
          </section>
        </div>

        {photos.length ? (
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<CalendarHeart size={13} />} title={`Ảnh tư liệu (${photos.length})`} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt={`${member.name} — ảnh ${i + 1}`}
                  className="aspect-[4/3] w-full rounded-xl border border-[var(--pat-line)] object-cover"
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="pat-card px-4 py-4">
            <SectionTitle icon={<CalendarHeart size={13} />} title="Ảnh tư liệu" />
            <EmptyState
              icon={<Home size={24} />}
              title="Chưa có ảnh"
              description="Thêm ảnh chân dung hoặc ảnh tư liệu trong phần sửa thành viên."
              action={
                <button type="button" className="pat-btn pat-btn-outline h-8 text-xs" onClick={() => setEditOpen(true)}>
                  <Plus size={13} /> Thêm ảnh
                </button>
              }
            />
          </section>
        )}

        {member.biography || member.notes ? null : (
          <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-xs text-[var(--pat-muted)]">
            <Info size={15} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
            <p>
              Ghi lại tiểu sử, công đức và ngày giỗ để con cháu đời sau tra cứu. Mọi thay đổi được lưu ngay trên thiết bị.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pb-2">
          <button
            type="button"
            className="pat-btn pat-btn-outline h-10 text-xs"
            onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`)}
          >
            <Users size={14} /> Về danh sách
          </button>
          <button type="button" className="pat-btn pat-btn-outline h-10 text-xs text-[#a3271d]" onClick={remove}>
            <Trash2 size={14} /> Xoá thành viên
          </button>
        </div>
      </div>

      {editOpen ? (
        <MemberFormSheet key={`edit-${member.id}`} tree={tree} open member={member} onClose={() => setEditOpen(false)} />
      ) : null}
      {addChildOpen ? (
        <MemberFormSheet
          key="add-child"
          tree={tree}
          open
          defaults={childDefaults}
          onClose={() => setAddChildOpen(false)}
        />
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
    </TreeShell>
  );
}
