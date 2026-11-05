"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BookOpen, Check, Feather, GitBranch, Printer, Sparkles, Users } from "lucide-react";
import Image from "next/image";
import { useGenealogy } from "./store";
import type { FamilyTree, Person } from "./types";
import { generationTag } from "./types";
import {
  branchHeadcounts,
  buildFamilyIndex,
  careerSummary,
  computeGenerations,
  getGenerationStats,
  getStats,
  displayLifeSpan,
  nameAliases,
  sortGenerations,
  sortPersons,
} from "./utils";
import { classifyClan } from "./clan";
import { TreeShell } from "./app-shell";
import { Badge, Field, Segmented, Sheet } from "./ui";

function printBook() {
  window.print();
}

const draftKey = (treeId: string) => `phatue.chronicleDraft.${treeId}`;

function readDraft(treeId: string, history: string) {
  try {
    const stored = window.localStorage.getItem(draftKey(treeId));
    if (stored != null && stored.trim() !== history.trim()) return stored;
  } catch {
    /* bỏ qua khi trình duyệt chặn localStorage */
  }
  return history;
}

const DEFAULT_MARGINS = { top: 25, right: 20, bottom: 25, left: 25 } as const;

const DEFAULT_TEXTS = {
  coverEyebrow: "Gia phả dòng họ",
  tocTitle: "Mục lục",
  prefaceEyebrow: "Phần mở đầu",
  prefaceTitle: "Lời tựa",
  originsEyebrow: "Cội nguồn",
  originsTitle: "Khổi tổ và các đời",
  colophonEyebrow: "Kết thúc",
  colophonTitle: "Lời bạt",
} as const;

const DEFAULT_COLOPHON = [
  "Gia phả là tấm gương phản chiếu truyền thống của một dòng họ. Mỗi trang sách là một lời nhắc để con cháu nhớ về công lao khai cơ lập nghiệp của tổ tiên, về những người đã đi trước và vun đắp nên ngôi nhà chung của gia tộc.",
  "Ghi chép gia phả không chỉ là việc lưu danh tính, mà còn là cách trao truyền đạo lý “uống nước nhớ nguồn”. Mong rằng các thế hệ mai sau tiếp tục bổ sung, chỉnh sửa để cuốn phả ký ngày càng đầy đủ và gắn bó hơn.",
  "Trân trộng ghi nhận công sức của những người đã cung cấp tư liệu, hình ảnh và góp ý cho cuốn sách nhỏ này.",
].join("\n\n");

function draftHistory(tree: FamilyTree) {
  const index = buildFamilyIndex(tree.members, tree.founderId);
  const gens = computeGenerations(tree.members, tree.founderId);
  const stats = getStats(tree);
  const founder = tree.members
    .filter((member) => index.bloodline.has(member.id) && (gens.get(member.id) ?? 1) >= 0)
    .sort((a, b) => (gens.get(a.id) ?? 1) - (gens.get(b.id) ?? 1) || sortPersons(a, b))[0];
  const branchMen = branchHeadcounts(tree).byBranch;
  const branchLines = tree.branches
    .map((branch) => {
      const head = tree.members.find((member) => member.id === branch.headId);
      const count = branchMen.get(branch.id)?.length ?? 0;
      return `${branch.name}${head ? ` do ${head.name} làm trưởng chi phái` : ""} gồm ${count} nam`;
    })
    .join("; ");
  const origin = founder
    ? `Cụ ${founder.title || "Thủy tổ"} ${founder.name}${
        nameAliases(founder) ? ` (${nameAliases(founder)})` : ""
      }${founder.hometown ? ` quê ở ${founder.hometown}` : ""}, sinh năm ${founder.birthDate || "chưa rõ"}${
        founder.alive ? "" : `, mất năm ${founder.deathDate || "chưa rõ"}`
      }${founder.officeTitle ? `, từng giữ chức ${founder.officeTitle}` : ""}.`
    : "Cội nguồn dòng họ được con cháu ghi chép lại qua các đời.";
  const firstParagraph = `Dòng họ ${tree.name}${tree.address ? ` hiện cư trú tại ${tree.address}` : ""}. ${origin} Từ thuở khai cơ lập nghiệp, tổ tiên đã dựng nhà, mở đất, truyền lại nếp sống cần kiệm, hiếu học và trộng tình nghĩa để con cháu đời sau noi theo.`;
  const secondParagraph = `Trải qua ${stats.generations} đời${
    stats.ancestorTiers ? ` cùng ${stats.ancestorTiers} bậc tiền tổ` : ""
  }, dòng họ hiện có ${stats.total} thành viên, trong đó ${stats.male} nam và ${stats.female} nữ${
    stats.alive ? `, ${stats.alive} người còn sống` : ""
  }. ${branchLines ? `Các chi phái trong họ gồm: ${branchLines}.` : "Dòng họ chưa tách thành các chi phái riêng."}`;
  const thirdParagraph =
    "Gia phả này được biên soạn nhằm ghi nhớ công lao sinh thành, dưỡng dục của tổ tiên và giữ gìn mối dây gắn bó giữa các thế hệ. Mong rằng con cháu muôn đời ghi lòng tạc dạ cội nguồn, tiếp nối truyền thống tốt đẹp của gia tộc và cùng nhau vun đắp cho dòng họ ngày càng hưng thịnh.";
  return [firstParagraph, secondParagraph, thirdParagraph].join("\n\n");
}

function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`chronicle-page pat-paper relative mx-auto overflow-hidden rounded-sm border border-[#d9c39a] shadow-[0_18px_50px_-32px_rgba(90,15,10,0.55)] ${className ?? ""}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-2.5 rounded-sm border border-[#c9a227]/35" />
      <div aria-hidden className="pointer-events-none absolute inset-3.5 rounded-sm border border-[#8a1c15]/10" />
      <div className="chronicle-body pat-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </article>
  );
}

function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-6 text-center">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-[#8a6a52]">{eyebrow}</p>
      <h2 className="pat-serif mt-1 text-2xl font-bold text-[var(--pat-red)] sm:text-3xl">{title}</h2>
      <div className="mx-auto mt-3 flex items-center justify-center gap-2">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#c9a227]" />
        <span className="h-1.5 w-1.5 rotate-45 border border-[#c9a227]" />
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#c9a227]" />
      </div>
    </header>
  );
}

function MemberLine({
  person,
  generation,
  measure,
  privacy,
}: {
  person: Person;
  generation: number;
  measure?: boolean;
  privacy?: FamilyTree["privacy"];
}) {
  return (
    <li
      data-measure-item={measure ? "" : undefined}
      className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#c9a227]/25 py-1.5 text-sm"
    >
      <span className="min-w-0">
        <span className="font-semibold text-[var(--pat-ink)]">{person.name}</span>
        {person.title ? <span className="ml-1.5 text-[0.68rem] text-[#8a6a52]">({person.title})</span> : null}
        {nameAliases(person) ? (
          <span className="ml-1.5 text-[0.72rem] italic text-[#8a6a52]">{nameAliases(person)}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-[0.7rem] text-[var(--pat-muted)]">
        {generationTag(generation)} · {displayLifeSpan(person, privacy)}
      </span>
    </li>
  );
}

function generationTitle(generation: number, members: Person[]) {
  if (generation === 0) return "Sơ tổ";
  if (generation > 0) return `Đời thứ ${generation}`;
  const titles = Array.from(
    new Set(
      members
        .map((member) => member.title?.trim())
        .filter((title): title is string => Boolean(title)),
    ),
  );
  return titles.length ? titles.slice(0, 2).join(" · ").toLocaleUpperCase("vi") : `Bậc tiền tổ ${-generation}`;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function Paragraphs({ text, style }: { text: string; style?: { fontSize: number; lineHeight: number } }) {
  const paragraphs = splitParagraphs(text);
  return (
    <div
      style={style}
      className="space-y-4 text-justify text-sm leading-7 text-[var(--pat-ink)] sm:text-[0.95rem]"
    >
      {paragraphs.map((paragraph, position) => (
        <p
          key={position}
          className={
            position === 0
              ? "first-letter:pat-serif first-letter:float-left first-letter:mr-2 first-letter:text-4xl first-letter:font-bold first-letter:leading-[0.9] first-letter:text-[var(--pat-red)]"
              : ""
          }
        >
          {paragraph.split("\n").map((line, index) => (
            <Fragment key={index}>
              {index > 0 ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

function GenerationPages({
  generation,
  members,
  onPageCount,
  privacy,
}: {
  generation: number;
  members: Person[];
  onPageCount: (generation: number, count: number) => void;
  privacy?: FamilyTree["privacy"];
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Person[][]>([members]);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const measure = () => {
      const body = node.querySelector<HTMLElement>(".chronicle-body");
      const heading = node.querySelector<HTMLElement>("[data-measure-heading]");
      const list = node.querySelector<HTMLElement>("[data-measure-list]");
      if (!body || !heading || !list) return;
      const items = Array.from(list.querySelectorAll<HTMLElement>("[data-measure-item]"));
      if (!items.length) return;
      const columns = getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
      const available = body.clientHeight - heading.offsetHeight - 16;
      if (available < 120) return;

      const rows: Person[][] = [];
      const rowHeights: number[] = [];
      for (let start = 0; start < members.length; start += columns) {
        const row = members.slice(start, start + columns);
        rows.push(row);
        let rowHeight = 0;
        for (let offset = 0; offset < row.length; offset += 1) {
          rowHeight = Math.max(rowHeight, items[start + offset]?.offsetHeight ?? 0);
        }
        rowHeights.push(rowHeight);
      }

      let pageCount = 1;
      let used = 0;
      for (const rowHeight of rowHeights) {
        if (used && used + rowHeight > available) {
          pageCount += 1;
          used = 0;
        }
        used += rowHeight;
      }
      // Spread rows evenly across the same number of pages so the last page never ends up nearly empty.
      const rowLimit = Math.ceil(rows.length / pageCount);

      const next: Person[][] = [];
      let current: Person[] = [];
      let currentRows = 0;
      used = 0;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowHeight = rowHeights[index];
        if (current.length && (currentRows >= rowLimit || used + rowHeight > available)) {
          next.push(current);
          current = [];
          currentRows = 0;
          used = 0;
        }
        current.push(...row);
        currentRows += 1;
        used += rowHeight;
      }
      if (current.length) next.push(current);

      setPages((previous) => {
        const unchanged =
          next.length === previous.length &&
          next.every(
            (page, index) =>
              page.length === previous[index]?.length &&
              page.every((person, position) => person.id === previous[index]?.[position]?.id),
          );
        return unchanged ? previous : next;
      });
      onPageCount(generation, Math.max(next.length, 1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [members, generation, onPageCount]);

  return (
    <div className="relative">
      <div ref={measureRef} aria-hidden className="no-print invisible pointer-events-none absolute inset-x-0 top-0">
        <Page>
          <div data-measure-heading>
            <PageHeading eyebrow="Thế thứ" title={generationTitle(generation, members)} />
          </div>
          <ul data-measure-list className="grid gap-x-8 sm:grid-cols-2">
            {members.map((person) => (
              <MemberLine key={person.id} person={person} generation={generation} measure privacy={privacy} />
            ))}
          </ul>
        </Page>
      </div>

      {pages.map((page, index) => (
        <Page key={index}>
          <PageHeading
            eyebrow={`Thế thứ · ${members.length} người${
              pages.length > 1 ? ` · ${index + 1}/${pages.length}` : ""
            }`}
            title={generationTitle(generation, members)}
          />
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {page.map((person) => (
              <MemberLine key={person.id} person={person} generation={generation} privacy={privacy} />
            ))}
          </ul>
        </Page>
      ))}
    </div>
  );
}

export function ChronicleView({ tree }: { tree: FamilyTree }) {
  const { updateTree } = useGenealogy();
  const [mode, setMode] = useState<"read" | "write">("read");
  const [draft, setDraft] = useState(() => readDraft(tree.id, tree.history));
  const [saved, setSaved] = useState(false);
  const [pendingAction, setPendingAction] = useState<"print" | "read" | null>(null);
  const [genPageCounts, setGenPageCounts] = useState<Record<number, number>>({});

  const clan = useMemo(() => classifyClan(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const gens = useMemo(() => computeGenerations(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const index = useMemo(() => buildFamilyIndex(tree.members, tree.founderId), [tree.members, tree.founderId]);
  const stats = useMemo(() => getStats(tree), [tree]);
  const generationStats = useMemo(() => getGenerationStats(tree), [tree]);

  const founder = useMemo(
    () =>
      tree.members
        .filter((member) => index.bloodline.has(member.id) && (gens.get(member.id) ?? 1) >= 0)
        .sort((a, b) => (gens.get(a.id) ?? 1) - (gens.get(b.id) ?? 1) || sortPersons(a, b))[0],
    [tree.members, index, gens],
  );

  const generationMembers = useMemo(() => {
    const rows = new Map<number, Person[]>();
    for (const member of tree.members) {
      if (!clan.isDisplayed(member.id)) continue;
      const generation = gens.get(member.id) ?? 1;
      const list = rows.get(generation) ?? [];
      list.push(member);
      rows.set(generation, list);
    }
    for (const list of rows.values()) list.sort(sortPersons);
    return Array.from(rows.entries()).sort((a, b) => sortGenerations(a[0], b[0]));
  }, [tree.members, gens, clan]);

  const dirty = draft.trim() !== tree.history.trim();

  // Tự lưu nháp khi đang viết để không mất nội dung khi đóng trang.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(tree.id), draft);
      } catch {
        /* bỏ qua khi bộ nhớ đầy */
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, tree.id]);

  const savedParagraphs = useMemo(() => splitParagraphs(tree.history), [tree.history]);
  const draftParagraphs = useMemo(() => splitParagraphs(draft), [draft]);
  const now = new Date();
  const year = now.getFullYear();
  const completedYear = tree.completedYear ?? year;
  const founderSpouses = founder
    ? founder.spouseIds
        .map((id) => tree.members.find((member) => member.id === id))
        .filter((person): person is Person => Boolean(person))
    : [];

  const showColophon = tree.showColophon !== false;
  const bookStyle = {
    fontSize: tree.chronicleStyle?.fontSize ?? 16,
    lineHeight: tree.chronicleStyle?.lineHeight ?? 1.9,
  };
  const format = tree.chronicleFormat ?? "a4";
  const clampMargin = (value: number | undefined, fallback: number) =>
    Math.min(60, Math.max(0, Math.round(value ?? fallback)));
  const margins: NonNullable<FamilyTree["chronicleMargins"]> = {
    ...DEFAULT_MARGINS,
    ...(tree.chronicleMargins ?? {}),
  };
  const marginTop = clampMargin(margins.top, DEFAULT_MARGINS.top);
  const marginRight = clampMargin(margins.right, DEFAULT_MARGINS.right);
  const marginBottom = clampMargin(margins.bottom, DEFAULT_MARGINS.bottom);
  const marginLeft = clampMargin(margins.left, DEFAULT_MARGINS.left);
  const sheetWidth = format === "a5" ? 148 : 210;
  const sheetHeight = format === "a5" ? 210 : 297;
  const pageVars = {
    "--chron-pt": `${(marginTop / 210) * 100}%`,
    "--chron-pr": `${(marginRight / 210) * 100}%`,
    "--chron-pb": `${(marginBottom / 210) * 100}%`,
    "--chron-pl": `${(marginLeft / 210) * 100}%`,
    "--chron-mt": `${marginTop}mm`,
    "--chron-mr": `${marginRight}mm`,
    "--chron-mb": `${marginBottom}mm`,
    "--chron-ml": `${marginLeft}mm`,
  } as CSSProperties;
  const texts = tree.chronicleTexts ?? {};
  const bookText = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  const coverEyebrow = bookText(texts.coverEyebrow, DEFAULT_TEXTS.coverEyebrow);
  const tocTitle = bookText(texts.tocTitle, DEFAULT_TEXTS.tocTitle);
  const prefaceEyebrow = bookText(texts.prefaceEyebrow, DEFAULT_TEXTS.prefaceEyebrow);
  const prefaceTitle = bookText(texts.prefaceTitle, DEFAULT_TEXTS.prefaceTitle);
  const originsEyebrow = bookText(texts.originsEyebrow, DEFAULT_TEXTS.originsEyebrow);
  const originsTitle = bookText(texts.originsTitle, DEFAULT_TEXTS.originsTitle);
  const colophonEyebrow = bookText(texts.colophonEyebrow, DEFAULT_TEXTS.colophonEyebrow);
  const colophonTitle = bookText(texts.colophonTitle, DEFAULT_TEXTS.colophonTitle);
  type TextKey = keyof NonNullable<FamilyTree["chronicleTexts"]>;
  const textFieldDefs: { key: TextKey; label: string; fallback: string }[] = [
    { key: "coverEyebrow", label: "Dòng trên trang bìa", fallback: DEFAULT_TEXTS.coverEyebrow },
    { key: "tocTitle", label: "Tựa mục lục", fallback: DEFAULT_TEXTS.tocTitle },
    { key: "prefaceEyebrow", label: "Dòng phụ phần tựa", fallback: DEFAULT_TEXTS.prefaceEyebrow },
    { key: "prefaceTitle", label: "Tựa phần mở đầu", fallback: DEFAULT_TEXTS.prefaceTitle },
    { key: "originsEyebrow", label: "Dòng phụ phần cội nguồn", fallback: DEFAULT_TEXTS.originsEyebrow },
    { key: "originsTitle", label: "Tựa phần cội nguồn", fallback: DEFAULT_TEXTS.originsTitle },
    { key: "colophonEyebrow", label: "Dòng phụ phần bạt", fallback: DEFAULT_TEXTS.colophonEyebrow },
    { key: "colophonTitle", label: "Tựa phần bạt", fallback: DEFAULT_TEXTS.colophonTitle },
  ];
  const setMargin = (side: "top" | "right" | "bottom" | "left", raw: string) => {
    const parsed = Number(raw);
    const value =
      raw === "" || !Number.isFinite(parsed) ? DEFAULT_MARGINS[side] : Math.min(60, Math.max(0, Math.round(parsed)));
    updateTree(tree.id, {
      chronicleMargins: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft, [side]: value },
    });
  };

  const handleGenPageCount = useCallback((generation: number, count: number) => {
    setGenPageCounts((previous) =>
      previous[generation] === count ? previous : { ...previous, [generation]: count },
    );
  }, []);

  // Số trang tính theo bản in: chương mới bắt đầu ở trang phải (trang lẻ), trang chẵn chèn trống.
  const toc = useMemo(() => {
    const nextRecto = (page: number) => (page % 2 === 1 ? page : page + 1);
    const entries: { label: string; page: number; indent?: boolean }[] = [
      { label: "Trang bìa", page: 1 },
      { label: "Mục lục", page: 2 },
    ];
    let cursor = 3;
    const preface = nextRecto(cursor);
    entries.push({ label: prefaceTitle, page: preface });
    cursor = preface + 1;
    const founderStart = nextRecto(cursor);
    entries.push({ label: originsTitle, page: founderStart });
    cursor = founderStart + 1;
    for (const [generation, members] of generationMembers) {
      entries.push({
        label: generationTitle(generation, members),
        page: cursor,
        indent: true,
      });
      cursor += Math.max(genPageCounts[generation] ?? 1, 1);
    }
    if (showColophon) {
      entries.push({ label: colophonTitle, page: nextRecto(cursor) });
    }
    return entries;
  }, [generationMembers, genPageCounts, showColophon, prefaceTitle, originsTitle, colophonTitle]);

  const doPrint = useCallback(() => {
    setPendingAction(null);
    setMode((current) => (current === "write" ? "read" : current));
    void document.fonts?.ready
      .catch(() => undefined)
      .then(() => {
        // Chờ bố cục ổn định (font nạp xong, hai khung hình vẽ lại) để tránh trang trắng khi in.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.setTimeout(printBook, 120)),
        );
      });
  }, []);

  const requestPrint = () => {
    if (mode === "write" && dirty) {
      setPendingAction("print");
      return;
    }
    doPrint();
  };

  const switchMode = (value: "read" | "write") => {
    if (value === "read" && dirty) {
      setPendingAction("read");
      return;
    }
    setMode(value);
  };

  const saveHistory = () => {
    updateTree(tree.id, { history: draft.trim() });
    try {
      window.localStorage.removeItem(draftKey(tree.id));
    } catch {
      /* bỏ qua */
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const discardDraft = () => {
    setDraft(tree.history);
    try {
      window.localStorage.removeItem(draftKey(tree.id));
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <TreeShell
      tree={tree}
      section="pha-ky"
      title="Phả ký"
      subtitle={`${tree.name} · ${stats.generations} đời${
        stats.ancestorTiers ? ` · ${stats.ancestorTiers} bậc tiền tổ` : ""
      }`}
      actions={
        <button
          type="button"
          onClick={requestPrint}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90"
          aria-label="In phả ký"
        >
          <Printer size={17} />
        </button>
      }
    >
      <style media="print">
        {`@page chronicle { size: ${format === "a5" ? "A5" : "A4"} portrait; margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
.chronicle-page { width: ${sheetWidth - marginLeft - marginRight}mm !important; height: ${sheetHeight - marginTop - marginBottom}mm !important; }`}
      </style>

      <div className="space-y-4">
        <section className="pat-card no-print px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6e9c8] text-[var(--pat-red)]">
                <BookOpen size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold">Sách phả ký dòng họ</p>
                <p className="text-[0.68rem] text-[var(--pat-muted)]">
                  {savedParagraphs.length ? `${savedParagraphs.length} đoạn lời tựa` : "Chưa có lời tựa"} ·{" "}
                  {generationMembers.length} bậc thế thứ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-[var(--pat-line)] bg-[#fffaf0] p-0.5">
                {(
                  [
                    { value: "read", label: "Đọc bản in" },
                    { value: "write", label: "Soạn nội dung" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => switchMode(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      mode === option.value
                        ? "bg-[var(--pat-red)] text-[#fff4df] shadow-sm"
                        : "text-[var(--pat-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={requestPrint} className="pat-btn pat-btn-red h-9 text-xs">
                <Printer size={14} /> In / PDF
              </button>
            </div>
          </div>
        </section>

        {mode === "write" ? (
          <>
            <section className="pat-card p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Lời tựa phả ký</p>
                  <p className="text-[0.68rem] text-[var(--pat-muted)]">
                    Nháp tự lưu sau khi ngừng gõ 1 giây; mỗi đoạn cách nhau bằng một dòng trống.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(draftHistory(tree))}
                  className="pat-btn pat-btn-outline h-8 text-xs"
                >
                  <Sparkles size={13} /> Gợi ý bản thảo
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Viết về cội nguồn, công lao tổ tiên, truyền thống dòng họ…"
                  className="pat-input min-h-[320px] resize-y text-base leading-relaxed"
                />
                <aside className="pat-scroll max-h-[420px] overflow-y-auto rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 p-4">
                  <p className="text-center text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-[#8a6a52]">
                    Xem trước bản in
                  </p>
                  <p className="pat-serif mt-1 text-center text-xl font-bold text-[var(--pat-red)]">{prefaceTitle}</p>
                  {tree.description ? (
                    <p className="mt-2 text-center text-[0.78rem] italic text-[var(--pat-muted)]">
                      {tree.description}
                    </p>
                  ) : null}
                  {draftParagraphs.length ? (
                    <div className="mt-3 text-justify text-[0.8rem] leading-6 text-[var(--pat-ink)]">
                      {draftParagraphs.map((paragraph, position) => (
                        <p key={position} className={position > 0 ? "mt-2" : ""}>
                          {paragraph.split("\n").map((line, index) => (
                            <Fragment key={index}>
                              {index > 0 ? <br /> : null}
                              {line}
                            </Fragment>
                          ))}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-center text-xs text-[var(--pat-muted)]">
                      Chưa có nội dung để xem trước.
                    </p>
                  )}
                </aside>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.68rem] text-[var(--pat-muted)]">
                  {draft.trim().length.toLocaleString("vi-VN")} ký tự · {draftParagraphs.length} đoạn
                  {dirty ? " · chưa lưu" : " · đã lưu"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      discardDraft();
                      setMode("read");
                    }}
                    className="pat-btn pat-btn-ghost h-9 text-xs"
                  >
                    Hoàn tác
                  </button>
                  <button type="button" onClick={saveHistory} className="pat-btn pat-btn-red h-9 text-xs">
                    {saved ? <Check size={14} /> : <Feather size={14} />} {saved ? "Đã lưu" : "Lưu nội dung"}
                  </button>
                </div>
              </div>
            </section>

            <section className="pat-card space-y-4 p-4 sm:p-5">
              <div>
                <p className="pat-serif text-lg font-semibold text-[var(--pat-red)]">Thiết lập sách in</p>
                <p className="text-[0.68rem] text-[var(--pat-muted)]">
                  Thay đổi áp dụng ngay cho bản xem trước và bản in.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên dòng họ (trang bìa)">
                  <input
                    className="pat-input"
                    value={tree.name}
                    onChange={(event) => updateTree(tree.id, { name: event.target.value })}
                  />
                </Field>
                <Field label="Địa chỉ (ẩn khi để trống)">
                  <input
                    className="pat-input"
                    value={tree.address ?? ""}
                    placeholder="Thôn, xã, tỉnh…"
                    onChange={(event) => updateTree(tree.id, { address: event.target.value || undefined })}
                  />
                </Field>
                <Field label="Người biên soạn">
                  <input
                    className="pat-input"
                    value={tree.ownerName ?? ""}
                    placeholder="Chủ gia phả"
                    onChange={(event) => updateTree(tree.id, { ownerName: event.target.value || undefined })}
                  />
                </Field>
                <Field label="Năm hoàn thành">
                  <input
                    type="number"
                    className="pat-input"
                    value={tree.completedYear ?? ""}
                    placeholder={String(year)}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const parsed = Number(raw);
                      const value = raw === "" || !Number.isFinite(parsed) ? undefined : Math.max(1, Math.round(parsed));
                      updateTree(tree.id, { completedYear: value });
                    }}
                  />
                </Field>
                <Field label="Nơi viết">
                  <input
                    className="pat-input"
                    value={tree.writtenPlace ?? ""}
                    placeholder="VD: Hà Nội"
                    onChange={(event) => updateTree(tree.id, { writtenPlace: event.target.value || undefined })}
                  />
                </Field>
                <Field label="Mô tả gia phả (in nghiêng dưới tựa “Lời tựa”)">
                  <textarea
                    rows={2}
                    className="pat-input resize-y text-base"
                    value={tree.description ?? ""}
                    placeholder="Một câu giời thiệu ngắn về dòng họ…"
                    onChange={(event) =>
                      updateTree(tree.id, { description: event.target.value || undefined })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Hoa văn trang bìa">
                  <Segmented
                    value={tree.coverEmblem ?? "none"}
                    onChange={(value) => updateTree(tree.id, { coverEmblem: value })}
                    options={[
                      { value: "none", label: "Không" },
                      { value: "jiapu", label: "Chữ 家譜" },
                      { value: "pham", label: "Chữ 范" },
                    ]}
                  />
                </Field>
                <Field label="Cỡ chữ nội dung">
                  <Segmented
                    value={String(tree.chronicleStyle?.fontSize ?? 16)}
                    onChange={(value) =>
                      updateTree(tree.id, {
                        chronicleStyle: {
                          fontSize: Number(value),
                          lineHeight: tree.chronicleStyle?.lineHeight ?? 1.9,
                        },
                      })
                    }
                    options={[
                      { value: "14", label: "14" },
                      { value: "15", label: "15" },
                      { value: "16", label: "16" },
                      { value: "17", label: "17" },
                      { value: "18", label: "18" },
                    ]}
                  />
                </Field>
                <Field label="Giãn dòng">
                  <Segmented
                    value={String(tree.chronicleStyle?.lineHeight ?? 1.9)}
                    onChange={(value) =>
                      updateTree(tree.id, {
                        chronicleStyle: {
                          fontSize: tree.chronicleStyle?.fontSize ?? 15,
                          lineHeight: Number(value),
                        },
                      })
                    }
                    options={[
                      { value: "1.7", label: "1,7" },
                      { value: "1.9", label: "1,9" },
                      { value: "2.1", label: "2,1" },
                    ]}
                  />
                </Field>
                <Field label="Ngày ghi trên lời bạt">
                  <Segmented
                    value={tree.colophonDate ?? "print"}
                    onChange={(value) => updateTree(tree.id, { colophonDate: value })}
                    options={[
                      { value: "print", label: "Ngày in" },
                      { value: "completed", label: "Năm hoàn thành" },
                    ]}
                  />
                </Field>
                <Field label="Trang lời bạt">
                  <Segmented
                    value={showColophon ? "show" : "hide"}
                    onChange={(value) => updateTree(tree.id, { showColophon: value === "show" })}
                    options={[
                      { value: "show", label: "In lời bạt" },
                      { value: "hide", label: "Ẩn" },
                    ]}
                  />
                </Field>
                <Field label="Khổ giấy in">
                  <Segmented
                    value={format}
                    onChange={(value) => updateTree(tree.id, { chronicleFormat: value })}
                    options={[
                      { value: "a4", label: "A4 dọc" },
                      { value: "a5", label: "A5 dọc" },
                    ]}
                  />
                </Field>
              </div>
              <Field label="Lề trang in (mm)" hint="Mặc định: trên 25 · phải 20 · dưới 25 · trái 25.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["top", "Trên", marginTop],
                      ["right", "Phải", marginRight],
                      ["bottom", "Dưới", marginBottom],
                      ["left", "Trái", marginLeft],
                    ] as const
                  ).map(([side, label, value]) => (
                    <label key={side} className="block">
                      <span className="mb-1 block text-[0.66rem] font-semibold uppercase tracking-wide text-[var(--pat-muted)]">
                        {label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        className="pat-input"
                        value={value}
                        onChange={(event) => setMargin(side, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </Field>
              <Field
                label="Nội dung mẫu trong sách (để trống để dùng chữ mặc định)"
                hint="Áp dụng cho trang bìa, mục lục và tựa các phần trong sách; mục lục tự cập nhật theo tựa mới."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {textFieldDefs.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-[0.66rem] font-semibold uppercase tracking-wide text-[var(--pat-muted)]">
                        {field.label}
                      </span>
                      <input
                        className="pat-input"
                        value={texts[field.key] ?? ""}
                        placeholder={field.fallback}
                        onChange={(event) =>
                          updateTree(tree.id, {
                            chronicleTexts: { ...texts, [field.key]: event.target.value || undefined },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </Field>
              <Field
                label="Lời bạt (để trống để dùng mẫu mặc định)"
                hint="Mỗi đoạn cách nhau bằng một dòng trống; giữ nguyên xuống dòng khi dán từ Word."
              >
                <textarea
                  rows={5}
                  className="pat-input resize-y text-base"
                  value={tree.colophon ?? ""}
                  placeholder={DEFAULT_COLOPHON}
                  onChange={(event) => updateTree(tree.id, { colophon: event.target.value || undefined })}
                />
              </Field>
            </section>
          </>
        ) : null}

        <div className="chronicle-pages print-area space-y-4" style={pageVars}>
          <Page>
            <div className="flex min-h-[480px] flex-col items-center justify-center text-center sm:min-h-[560px]">
              {tree.sample ? <Badge tone="red">BẢN MẪU</Badge> : null}
              <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.4em] text-[#8a6a52]">{coverEyebrow}</p>
              <h1 className="chronicle-book-title pat-serif mt-3 text-4xl font-bold leading-tight text-[var(--pat-red)] sm:text-5xl">
                {tree.name}
              </h1>
              {tree.coverEmblem && tree.coverEmblem !== "none" ? (
                <Image
                  src={
                    tree.coverEmblem === "pham"
                      ? "/sites/PAT/images/han-pham.png"
                      : "/sites/PAT/images/han-gia-pha.png"
                  }
                  alt=""
                  width={tree.coverEmblem === "pham" ? 585 : 1200}
                  height={tree.coverEmblem === "pham" ? 728 : 676}
                  priority
                  className="mt-5 h-20 w-auto object-contain opacity-90"
                />
              ) : null}
              {tree.address ? (
                <p className="mt-3 text-sm text-[var(--pat-muted)]">{tree.address}</p>
              ) : null}
              <div className="my-8 flex items-center gap-3">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a227]" />
                <span className="text-[#c9a227]">❖</span>
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a227]" />
              </div>
              <div className="grid w-full max-w-sm grid-cols-3 divide-x divide-[#c9a227]/30">
                {[
                  [stats.generations, "Đời"],
                  [stats.total, "Thành viên"],
                  [tree.branches.length, "Chi phái"],
                ].map(([value, label]) => (
                  <div key={String(label)} className="px-2">
                    <p className="pat-serif text-2xl font-bold text-[var(--pat-red)]">{value}</p>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              {stats.ancestorTiers ? (
                <p className="mt-3 text-[0.68rem] text-[#8a6a52]">
                  {stats.ancestorTiers} bậc tiền tổ · {stats.generations} đời từ Khổi Tổ
                </p>
              ) : null}
              <div className="mt-10 space-y-1 text-xs text-[var(--pat-muted)]">
                <p>
                  Người biên soạn:{" "}
                  <strong className="text-[var(--pat-ink)]">{tree.ownerName || "Chủ gia phả"}</strong>
                </p>
                <p>Hoàn thành năm {completedYear}</p>
              </div>
            </div>
          </Page>

          <Page>
            <PageHeading eyebrow="Nội dung" title={tocTitle} />
            <ul className="space-y-2.5 text-sm">
              {toc.map((entry) => (
                <li key={`${entry.label}-${entry.page}`} className={entry.indent ? "pl-6" : ""}>
                  <span className="flex items-baseline gap-2">
                    <span className="text-[var(--pat-ink)]">{entry.label}</span>
                    <span className="flex-1 border-b border-dotted border-[#c9a227]/60" />
                    <span className="pat-serif font-semibold text-[var(--pat-red)]">{entry.page}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-center text-[0.66rem] italic text-[var(--pat-muted)]">
              Số trang tính theo bản in; mỗi phần mở đầu bắt đầu ở trang phải.
            </p>
          </Page>

          <Page className="chronicle-recto">
            <PageHeading eyebrow={prefaceEyebrow} title={prefaceTitle} />
            {tree.description ? (
              <p
                className="mb-4 text-center italic text-[var(--pat-muted)]"
                style={{ fontSize: bookStyle.fontSize - 1 }}
              >
                {tree.description}
              </p>
            ) : null}
            {savedParagraphs.length ? (
              <Paragraphs text={tree.history} style={bookStyle} />
            ) : (
              <div className="rounded-lg border border-dashed border-[#c9a227]/50 bg-[#fffaf0]/60 px-5 py-8 text-center">
                <Feather size={22} className="mx-auto text-[#c9a227]" />
                <p className="mt-2 text-sm font-semibold text-[var(--pat-red)]">Chưa có lời tựa</p>
                <p className="mt-1 text-xs text-[var(--pat-muted)]">
                  Chuyển sang “Soạn nội dung” để viết lời tựa hoặc dùng gợi ý bản thảo.
                </p>
              </div>
            )}
            <div className="mt-10 text-right text-xs text-[var(--pat-muted)]">
              <p>
                {tree.writtenPlace ? `${tree.writtenPlace}, ` : ""}ngày {now.getDate()} tháng{" "}
                {now.getMonth() + 1} năm {year}
              </p>
              <p className="pat-serif mt-2 text-sm font-semibold text-[var(--pat-ink)]">
                {tree.ownerName || "Chủ gia phả"}
              </p>
              <p>Người biên soạn</p>
            </div>
          </Page>

          <Page className="chronicle-recto">
            <PageHeading eyebrow={originsEyebrow} title={originsTitle} />
            {founder ? (
              <div className="mb-4 rounded-lg border border-[#c9a227]/40 bg-[#fffaf0]/70 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="pat-serif text-lg font-bold text-[var(--pat-red)]">{founder.name}</p>
                  {founder.title ? <Badge tone="gold">{founder.title}</Badge> : null}
                  <Badge tone="muted">{generationTag(gens.get(founder.id) ?? 0)}</Badge>
                </div>
                {nameAliases(founder) ? (
                  <p className="mt-1 text-xs italic text-[#7a5a10]">{nameAliases(founder)}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--pat-muted)]">
                  {displayLifeSpan(founder, tree.privacy)}
                  {founder.hometown ? ` · ${founder.hometown}` : ""}
                  {founder.occupation ? ` · ${founder.occupation}` : ""}
                </p>
                {careerSummary(founder) ? (
                  <p className="mt-1 text-xs text-[var(--pat-muted)]">
                    Công danh: {careerSummary(founder)}
                  </p>
                ) : null}
                {founderSpouses.length ? (
                  <p className="mt-1 text-xs text-[var(--pat-muted)]">
                    Phối ngẫu: {founderSpouses.map((person) => person.name).join(", ")}
                  </p>
                ) : null}
                {founder.biography ? (
                  <p className="mt-2 text-justify text-[0.95rem] leading-relaxed text-[var(--pat-ink)]">
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
                  <p className="font-semibold text-[var(--pat-ink)]">{row.label}</p>
                  <p className="text-xs text-[var(--pat-muted)]">
                    {row.total} người · {row.male} nam · {row.female} nữ
                  </p>
                </div>
              ))}
              {generationStats.length === 0 ? (
                <p className="text-sm text-[var(--pat-muted)]">Chưa có dữ liệu thành viên.</p>
              ) : null}
            </div>
          </Page>

          {generationMembers.map(([generation, members]) => (
            <GenerationPages
              key={`gen-${generation}`}
              generation={generation}
              members={members}
              onPageCount={handleGenPageCount}
              privacy={tree.privacy}
            />
          ))}

          {showColophon ? (
            <Page className="chronicle-recto">
              <PageHeading eyebrow={colophonEyebrow} title={colophonTitle} />
              <Paragraphs text={tree.colophon?.trim() ? tree.colophon : DEFAULT_COLOPHON} style={bookStyle} />
              <div className="mt-10 text-right">
                <p className="text-xs text-[var(--pat-muted)]">
                  {tree.writtenPlace ? `${tree.writtenPlace}, ` : ""}
                  {tree.colophonDate === "completed"
                    ? `năm ${completedYear}`
                    : `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${year}`}
                </p>
                <p className="pat-serif mt-3 text-base font-semibold text-[var(--pat-ink)]">
                  {tree.ownerName || "Chủ gia phả"}
                </p>
                <p className="text-[0.68rem] text-[var(--pat-muted)]">Người biên soạn</p>
              </div>
            </Page>
          ) : null}
        </div>

        <footer className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.68rem] text-[var(--pat-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} className="text-[var(--pat-gold)]" /> {stats.total} thành viên ·{" "}
            <GitBranch size={13} className="text-[var(--pat-gold)]" /> {tree.branches.length} chi phái
          </span>
          <span>
            In khổ {format === "a5" ? "A5" : "A4"} dọc, ngắt trang tự đồng, có số trang và mục lục.
          </span>
        </footer>
      </div>

      <Sheet
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Thay đổi chưa lưu"
        subtitle="Nội dung đang soạn chưa được lưu vào gia phải."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="pat-btn pat-btn-ghost h-9 text-xs" onClick={() => setPendingAction(null)}>
              Huỷ
            </button>
            {pendingAction === "print" ? (
              <button type="button" className="pat-btn pat-btn-outline h-9 text-xs" onClick={doPrint}>
                In không lưu
              </button>
            ) : (
              <button
                type="button"
                className="pat-btn pat-btn-outline h-9 text-xs"
                onClick={() => {
                  discardDraft();
                  setMode("read");
                  setPendingAction(null);
                }}
              >
                Bỏ thay đổi
              </button>
            )}
            <button
              type="button"
              className="pat-btn pat-btn-red h-9 text-xs"
              onClick={() => {
                saveHistory();
                if (pendingAction === "print") doPrint();
                else {
                  setMode("read");
                  setPendingAction(null);
                }
              }}
            >
              {pendingAction === "print" ? "Lưu rồi in" : "Lưu và xem"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--pat-muted)]">
          {pendingAction === "print"
            ? "Bản in sẽ dùng nội dung đã lưu trong gia phải. Lưu trước khi in để giữ phần vừa soạn, hoặc in theo nội dung cũ."
            : "Chuyển sang “Đọc bản in” ngay bây giờ sẽ bỏ qua phần đang soạn. Lưu lại hoặc bỏ thay đổi trước khi chuyển."}
        </p>
      </Sheet>
    </TreeShell>
  );
}
