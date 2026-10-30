"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Info, UserRound } from "lucide-react";
import type { FamilyTree } from "./types";
import { computeGenerations, kinship, kinshipText, sortPersons } from "./utils";
import { Avatar, Badge, Field, Sheet } from "./ui";

export function KinshipSheet({
  tree,
  open,
  onClose,
  initialA,
  initialB,
}: {
  tree: FamilyTree;
  open: boolean;
  onClose: () => void;
  initialA?: string;
  initialB?: string;
}) {
  const generations = useMemo(() => computeGenerations(tree.members), [tree.members]);
  const options = useMemo(
    () => [...tree.members].sort((a, b) => (generations.get(a.id) ?? 1) - (generations.get(b.id) ?? 1) || sortPersons(a, b)),
    [tree.members, generations],
  );
  const [aId, setAId] = useState(initialA ?? tree.members[0]?.id ?? "");
  const [bId, setBId] = useState(initialB ?? tree.members[1]?.id ?? "");
  const [region, setRegion] = useState<"north" | "south">("north");

  const a = tree.members.find((m) => m.id === aId);
  const b = tree.members.find((m) => m.id === bId);
  const result = a && b ? kinship(tree.members, a.id, b.id) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tra cứu cách xưng hô"
      subtitle={`${tree.name} · tính theo vai vế dòng họ`}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="space-y-2">
            <Field label="Người thứ nhất">
              <select className="pat-input" value={aId} onChange={(event) => setAId(event.target.value)}>
                <option value="">Chọn thành viên</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · đời {generations.get(p.id) ?? 1}
                  </option>
                ))}
              </select>
            </Field>
            {a ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-2.5 py-2">
                <Avatar person={a} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="text-[0.66rem] text-[var(--pat-muted)]">
                    Đời {generations.get(a.id) ?? 1} · {a.gender === "male" ? "Nam" : "Nữ"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setAId(bId);
              setBId(aId);
            }}
            className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--pat-line)] bg-[#f6e9c8] text-[var(--pat-red)] transition hover:rotate-180"
            aria-label="Đổi chỗ hai người"
          >
            <ArrowLeftRight size={16} />
          </button>

          <div className="space-y-2">
            <Field label="Người thứ hai">
              <select className="pat-input" value={bId} onChange={(event) => setBId(event.target.value)}>
                <option value="">Chọn thành viên</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · đời {generations.get(p.id) ?? 1}
                  </option>
                ))}
              </select>
            </Field>
            {b ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-2.5 py-2">
                <Avatar person={b} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  <p className="text-[0.66rem] text-[var(--pat-muted)]">
                    Đời {generations.get(b.id) ?? 1} · {b.gender === "male" ? "Nam" : "Nữ"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="pat-chip"
            data-active={region === "north"}
            onClick={() => setRegion("north")}
          >
            Miền Bắc
          </button>
          <button
            type="button"
            className="pat-chip"
            data-active={region === "south"}
            onClick={() => setRegion("south")}
          >
            Miền Nam
          </button>
        </div>

        {result && a && b ? (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-2xl border border-[var(--pat-gold)]/50 bg-[#fbf1d8] p-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/70 px-3 py-3 text-center">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                  {a.name} gọi {b.name} là
                </p>
                <p className="pat-serif mt-1 text-2xl font-bold text-[var(--pat-red)]">
                  {kinshipText(result, region)}
                </p>
              </div>
              <div className="rounded-xl bg-white/70 px-3 py-3 text-center">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[var(--pat-muted)]">
                  {b.name} gọi {a.name} là
                </p>
                <p className="pat-serif mt-1 text-2xl font-bold text-[var(--pat-red)]">
                  {region === "north" ? result.bToA.north : result.bToA.south}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-white/60 px-3 py-2.5 text-xs leading-relaxed text-[var(--pat-muted)]">
              <Info size={15} className="mt-0.5 shrink-0 text-[var(--pat-gold)]" />
              <p>{result.explanation}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--pat-line)] px-4 py-8 text-center">
            <UserRound size={26} className="mx-auto text-[var(--pat-gold)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--pat-red)]">
              {a && b ? "Chưa xác định được quan hệ" : "Chọn đủ hai thành viên"}
            </p>
            <p className="mt-1 text-xs text-[var(--pat-muted)]">
              {a && b
                ? "Hai người chưa có liên kết cha mẹ hoặc hôn nhân trong cây. Hãy bổ sung quan hệ rồi tra lại."
                : "Chọn hai người trong danh sách để xem cách gọi theo vai vế."}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-[var(--pat-line)] bg-[#fffaf0]/70 px-3 py-2.5 text-[0.7rem] text-[var(--pat-muted)]">
          <Badge tone="gold">Tục lệ</Badge>
          <p>
            Người Việt tính vai vế theo ngành và thứ tự sinh trong gia phả, không chỉ theo tuổi. Cách gọi có thể khác
            nhau giữa miền Bắc và miền Nam.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
