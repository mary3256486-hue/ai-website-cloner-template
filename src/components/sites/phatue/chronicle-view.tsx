"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Check, Feather, GitBranch, Printer, Sparkles, Users } from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree, Person } from "./types";
import { buildFamilyIndex, computeGenerations, getGenerationStats, getStats, lifeSpan, sortPersons } from "./utils";
import { TreeShell } from "./app-shell";
import { Badge } from "./ui";

function printBook() {
  const style = document.createElement("style");
  style.id = "phatue-chronicle-print";
  style.textContent = "@page { size: A4 portrait; margin: 12mm; }";
  document.head.appendChild(style);
  window.print();
  window.setTimeout(() => style.remove(), 2000);
}

function draftHistory(tree: FamilyTree) {
  const index = buildFamilyIndex(tree.members);
  const gens = computeGenerations(tree.members);
  const stats = getStats(tree);
  const founder = tree.members
    .filter((member) => index.bloodline.has(member.id) && (gens.get(member.id) ?? 1) === 1)
    .sort(sortPersons)[0];
  const branchLines = tree.branches
    .map((branch) => {
      const head = tree.members.find((member) => member.id === branch.headId);
      const count = tree.members.filter((member) => member.branchId === branch.id).length;
      return `${branch.name}${head ? ` do ${head.name} làm trưởng nhánh` : ""} gồm ${count} người`;
    })
    .join("; ");
  const origin = founder
    ? `Cụ ${founder.title || "Thủy tổ"} ${founder.name}${
        founder.hometown ? ` quê ở ${founder.hometown}` : ""
      }, sinh năm ${founder.birthDate || "chưa rõ"}${founder.alive ? "" : `, mất năm ${founder.deathDate || "chưa rõ"}`}.`
    : "Cội nguồn dòng họ được con cháu ghi chép lại qua các đời.";
  const firstParagraph = `Dòng họ ${tree.name}${tree.address ? ` hiện cư trú tại ${tree.address}` : ""}. ${origin} Từ thuở khai cơ lập nghiệp, tổ tiên đã dựng nhà, mở đất, truyền lại nếp sống cần kiệm, hiếu học và trọng tình nghĩa để con cháu đời sau noi theo.`;
  const secondParagraph = `Trải qua ${stats.generations} đời, dòng họ hiện có ${stats.total} thành viên, trong đó ${stats.male} nam và ${stats.female} nữ${
    stats.alive ? `, ${stats.alive} người còn sống` : ""
  }. ${branchLines ? `Các chi, cành trong họ gồm: ${branchLines}.` : "Dòng họ chưa tách thành các chi, cành riêng."}`;
  const thirdParagraph =
    "Gia phả này được biên soạn nhằm ghi nhớ công lao sinh thành, dưỡng dục của tổ tiên và giữ gìn mối dây gắn bó giữa các thế hệ. Mong rằng con cháu muôn đời ghi lòng tạc dạ cội nguồn, tiếp nối truyền thống tốt đẹp của gia tộc và cùng nhau vun đắp cho dòng họ ngày càng hưng thịnh.";
  return [firstParagraph, secondParagraph, thirdParagraph].join("\n\n");
}

function Page({ children }: { children: ReactNode }) {
  return (
    <article className="chronicle-page phatue-paper relative mx-auto w-full max-w-3xl overflow-hidden rounded-sm border border-[#d9c39a] px-5 py-7 shadow-[0_18px_50px_-32px_rgba(90,15,10,0.55)] sm:px-10 sm:py-11">
      <div aria-hidden className="pointer-events-none absolute inset-2.5 rounded-sm border border-[#c9a227]/35" />
      <div aria-hidden className="pointer-events-none absolute inset-3.5 rounded-sm border border-[#8a1c15]/10" />
      <div className="relative">{children}</div>
    </article>
  );
}

function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-6 text-center">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-[#8a6a52]">{eyebrow}</p>
      <h2 className="phatue-serif mt-1 text-2xl font-bold text-[var(--phatue-red)] sm:text-3xl">{title}</h2>
      <div className="mx-auto mt-3 flex items-center justify-center gap-2">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#c9a227]" />
        <span className="h-1.5 w-1.5 rotate-45 border border-[#c9a227]" />
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#c9a227]" />
      </div>
    </header>
  );
}

function MemberLine({ person, generation }: { person: Person; generation: number }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#c9a227]/25 py-1.5 text-sm">
      <span className="min-w-0">
        <span className="font-semibold text-[var(--phatue-ink)]">{person.name}</span>
        {person.title ? <span className="ml-1.5 text-[0.68rem] text-[#8a6a52]">({person.title})</span> : null}
      </span>
      <span className="shrink-0 text-[0.7rem] text-[var(--phatue-muted)]">
        Đời {generation} · {lifeSpan(person)}
      </span>
    </li>
  );
}

export function ChronicleView({ tree }: { tree: FamilyTree }) {
  const { updateTree } = useGenealogy();
  const [mode, setMode] = useState<"read" | "write">("read");
  const [draft, setDraft] = useState(tree.history);
  const [saved, setSaved] = useState(false);

  const gens = useMemo(() => computeGenerations(tree.members), [tree.members]);
  const index = useMemo(() => buildFamilyIndex(tree.members), [tree.members]);
  const stats = useMemo(() => getStats(tree), [tree]);
  const generationStats = useMemo(() => getGenerationStats(tree), [tree]);

  const founder = useMemo(
    () =>
      tree.members
        .filter((member) => index.bloodline.has(member.id) && (gens.get(member.id) ?? 1) === 1)
        .sort(sortPersons)[0],
    [tree.members, index, gens],
  );

  const generationMembers = useMemo(() => {
    const rows = new Map<number, Person[]>();
    for (const member of tree.members) {
      const generation = gens.get(member.id) ?? 1;
      const list = rows.get(generation) ?? [];
      list.push(member);
      rows.set(generation, list);
    }
    for (const list of rows.values()) list.sort(sortPersons);
    return Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
  }, [tree.members, gens]);

  const paragraphs = tree.history
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const year = new Date().getFullYear();
  const founderSpouses = founder
    ? founder.spouseIds
        .map((id) => tree.members.find((member) => member.id === id))
        .filter((person): person is Person => Boolean(person))
    : [];

  const handlePrint = () => {
    if (mode === "write") {
      setMode("read");
      window.setTimeout(printBook, 350);
      return;
    }
    printBook();
  };

  const saveHistory = () => {
    updateTree(tree.id, { history: draft.trim() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <TreeShell
      tree={tree}
      section="pha-ky"
      title="Phả ký"
      subtitle={`${tree.name} · ${stats.generations} đời`}
      actions={
        <button
          type="button"
          onClick={handlePrint}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
          aria-label="In phả ký"
        >
          <Printer size={17} />
        </button>
      }
    >
      <div className="space-y-4">
        <section className="phatue-card no-print px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6e9c8] text-[var(--phatue-red)]">
                <BookOpen size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold">Sách phả ký dòng họ</p>
                <p className="text-[0.68rem] text-[var(--phatue-muted)]">
                  {paragraphs.length ? `${paragraphs.length} đoạn lời tựa` : "Chưa có lời tựa"} ·{" "}
                  {generationMembers.length} trang thế thứ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-[var(--phatue-line)] bg-[#fffaf0] p-0.5">
                {(
                  [
                    { value: "read", label: "Đọc bản in" },
                    { value: "write", label: "Soạn nội dung" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      mode === option.value
                        ? "bg-[var(--phatue-red)] text-[#fff4df] shadow-sm"
                        : "text-[var(--phatue-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={handlePrint} className="phatue-btn phatue-btn-red h-9 text-xs">
                <Printer size={14} /> In / PDF
              </button>
            </div>
          </div>
        </section>

        {mode === "write" ? (
          <section className="phatue-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="phatue-serif text-lg font-semibold text-[var(--phatue-red)]">Lời tựa phả ký</p>
                <p className="text-[0.68rem] text-[var(--phatue-muted)]">
                  Phần này in ở đầu sách. Mỗi đoạn cách nhau bằng một dòng trống.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(draftHistory(tree))}
                className="phatue-btn phatue-btn-outline h-8 text-xs"
              >
                <Sparkles size={13} /> Gợi ý bản thảo
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Viết về cội nguồn, công lao tổ tiên, truyền thống dòng họ…"
              className="phatue-input min-h-[320px] resize-y text-sm leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.68rem] text-[var(--phatue-muted)]">
                {draft.trim().length.toLocaleString("vi-VN")} ký tự ·{" "}
                {draft.split(/\n{2,}/).filter((part) => part.trim()).length} đoạn
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(tree.history);
                    setMode("read");
                  }}
                  className="phatue-btn phatue-btn-ghost h-9 text-xs"
                >
                  Hoàn tác
                </button>
                <button type="button" onClick={saveHistory} className="phatue-btn phatue-btn-red h-9 text-xs">
                  {saved ? <Check size={14} /> : <Feather size={14} />} {saved ? "Đã lưu" : "Lưu nội dung"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="chronicle-pages print-area space-y-4">
          <Page>
            <div className="flex min-h-[480px] flex-col items-center justify-center text-center sm:min-h-[560px]">
              {tree.sample ? <Badge tone="red">BẢN MẪU</Badge> : null}
              <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.4em] text-[#8a6a52]">
                Gia phả dòng họ
              </p>
              <h1 className="phatue-serif mt-3 text-4xl font-bold leading-tight text-[var(--phatue-red)] sm:text-5xl">
                {tree.name}
              </h1>
              <p className="mt-3 text-sm text-[var(--phatue-muted)]">{tree.address || "Chưa cập nhật địa chỉ"}</p>
              <div className="my-8 flex items-center gap-3">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a227]" />
                <span className="text-[#c9a227]">❖</span>
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a227]" />
              </div>
              <div className="grid w-full max-w-sm grid-cols-3 divide-x divide-[#c9a227]/30">
                {[
                  [stats.generations, "Đời"],
                  [stats.total, "Thành viên"],
                  [tree.branches.length, "Chi, cành"],
                ].map(([value, label]) => (
                  <div key={String(label)} className="px-2">
                    <p className="phatue-serif text-2xl font-bold text-[var(--phatue-red)]">{value}</p>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-10 space-y-1 text-xs text-[var(--phatue-muted)]">
                <p>
                  Người biên soạn: <strong className="text-[var(--phatue-ink)]">{tree.ownerName || "Chủ gia phả"}</strong>
                </p>
                <p>Hoàn thành năm {year}</p>
              </div>
            </div>
          </Page>

          <Page>
            <PageHeading eyebrow="Phần mở đầu" title="Lời tựa" />
            {tree.description ? (
              <p className="mb-4 text-center text-sm italic text-[var(--phatue-muted)]">{tree.description}</p>
            ) : null}
            {paragraphs.length ? (
              <div className="space-y-4 text-justify text-sm leading-7 text-[var(--phatue-ink)] sm:text-[0.95rem]">
                {paragraphs.map((paragraph, position) => (
                  <p key={position} className={position === 0 ? "first-letter:phatue-serif first-letter:float-left first-letter:mr-2 first-letter:text-4xl first-letter:font-bold first-letter:leading-[0.9] first-letter:text-[var(--phatue-red)]" : ""}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#c9a227]/50 bg-[#fffaf0]/60 px-5 py-8 text-center">
                <Feather size={22} className="mx-auto text-[#c9a227]" />
                <p className="mt-2 text-sm font-semibold text-[var(--phatue-red)]">Chưa có lời tựa</p>
                <p className="mt-1 text-xs text-[var(--phatue-muted)]">
                  Chuyển sang “Soạn nội dung” để viết lời tựa hoặc dùng gợi ý bản thảo.
                </p>
              </div>
            )}
            <div className="mt-10 text-right text-xs text-[var(--phatue-muted)]">
              <p className="phatue-serif text-sm font-semibold text-[var(--phatue-ink)]">
                {tree.ownerName || "Chủ gia phả"}
              </p>
              <p>Người biên soạn</p>
            </div>
          </Page>

          <Page>
            <PageHeading eyebrow="Cội nguồn" title="Thủy tổ và các đời" />
            {founder ? (
              <div className="mb-6 rounded-lg border border-[#c9a227]/40 bg-[#fffaf0]/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="phatue-serif text-lg font-bold text-[var(--phatue-red)]">{founder.name}</p>
                  {founder.title ? <Badge tone="gold">{founder.title}</Badge> : null}
                  <Badge tone="muted">Đời 1</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--phatue-muted)]">
                  {lifeSpan(founder)}
                  {founder.hometown ? ` · ${founder.hometown}` : ""}
                  {founder.occupation ? ` · ${founder.occupation}` : ""}
                </p>
                {founderSpouses.length ? (
                  <p className="mt-1 text-xs text-[var(--phatue-muted)]">
                    Phối ngẫu: {founderSpouses.map((person) => person.name).join(", ")}
                  </p>
                ) : null}
                {founder.biography ? (
                  <p className="mt-2 text-justify text-sm leading-relaxed text-[var(--phatue-ink)]">
                    {founder.biography}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              {generationStats.map((row) => (
                <div
                  key={row.generation}
                  className="flex items-center justify-between gap-3 rounded-md border-b border-dashed border-[#c9a227]/30 pb-2 text-sm"
                >
                  <p className="font-semibold text-[var(--phatue-ink)]">Đời thứ {row.generation}</p>
                  <p className="text-xs text-[var(--phatue-muted)]">
                    {row.total} người · {row.male} nam · {row.female} nữ
                  </p>
                </div>
              ))}
              {generationStats.length === 0 ? (
                <p className="text-sm text-[var(--phatue-muted)]">Chưa có dữ liệu thành viên.</p>
              ) : null}
            </div>
          </Page>

          {generationMembers.map(([generation, members]) => (
            <Page key={`gen-${generation}`}>
              <PageHeading eyebrow={`Thế thứ · ${members.length} người`} title={`Đời thứ ${generation}`} />
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {members.map((person) => (
                  <MemberLine key={person.id} person={person} generation={generation} />
                ))}
              </ul>
            </Page>
          ))}

          {tree.branches.length ? (
            <Page>
              <PageHeading eyebrow="Chi, cành trong họ" title="Các nhánh họ" />
              <div className="space-y-4">
                {tree.branches.map((branch) => {
                  const head = tree.members.find((member) => member.id === branch.headId);
                  const count = tree.members.filter((member) => member.branchId === branch.id).length;
                  return (
                    <div key={branch.id} className="rounded-lg border border-[#c9a227]/35 bg-[#fffaf0]/60 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-5 w-1.5 rounded-full" style={{ background: branch.color }} />
                        <p className="font-semibold text-[var(--phatue-red)]">{branch.name}</p>
                        <span className="text-[0.68rem] text-[var(--phatue-muted)]">{count} người</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--phatue-muted)]">
                        {head ? `Trưởng nhánh: ${head.name}` : "Chưa chọn trưởng nhánh"}
                      </p>
                      {branch.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-[var(--phatue-ink)]">{branch.description}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Page>
          ) : null}

          <Page>
            <PageHeading eyebrow="Kết thúc" title="Lời bạt" />
            <div className="space-y-4 text-justify text-sm leading-7 text-[var(--phatue-ink)] sm:text-[0.95rem]">
              <p>
                Gia phả là tấm gương phản chiếu truyền thống của một dòng họ. Mỗi trang sách là một lời nhắc để con
                cháu nhớ về công lao khai cơ lập nghiệp của tổ tiên, về những người đã đi trước và vun đắp nên ngôi
                nhà chung của gia tộc.
              </p>
              <p>
                Ghi chép gia phả không chỉ là việc lưu danh tính, mà còn là cách trao truyền đạo lý “uống nước nhớ
                nguồn”. Mong rằng các thế hệ mai sau tiếp tục bổ sung, chỉnh sửa để cuốn phả ký ngày càng đầy đủ và
                gắn bó hơn.
              </p>
              <p>
                Trân trọng ghi nhận công sức của những người đã cung cấp tư liệu, hình ảnh và góp ý cho cuốn sách nhỏ
                này.
              </p>
            </div>
            <div className="mt-10 text-right">
              <p className="text-xs text-[var(--phatue-muted)]">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {year}</p>
              <p className="phatue-serif mt-3 text-base font-semibold text-[var(--phatue-ink)]">
                {tree.ownerName || "Chủ gia phả"}
              </p>
              <p className="text-[0.68rem] text-[var(--phatue-muted)]">Người biên soạn</p>
            </div>
          </Page>
        </div>

        <footer className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--phatue-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.68rem] text-[var(--phatue-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} className="text-[var(--phatue-gold)]" /> {stats.total} thành viên ·{" "}
            <GitBranch size={13} className="text-[var(--phatue-gold)]" /> {tree.branches.length} nhánh
          </span>
          <span>In khổ A4, mỗi trang phả ký ngắt trang tự động.</span>
        </footer>
      </div>
    </TreeShell>
  );
}
