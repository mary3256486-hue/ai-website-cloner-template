"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, House, SearchX } from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree } from "./types";

export function useTreeFromRoute(): { tree?: FamilyTree; hydrated: boolean; id: string } {
  const searchParams = useSearchParams();
  const id = searchParams.get("tree") ?? "";
  const { getTree, hydrated } = useGenealogy();
  return { tree: id ? getTree(id) : undefined, hydrated, id };
}

export function LoadingTree() {
  return (
    <div className="pat-shell min-h-dvh">
      <div className="pat-header flex min-h-[76px] items-center gap-3 px-4">
        <div className="h-11 w-11 animate-pulse rounded-full bg-white/20" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/25" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-white/15" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-10 pt-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Đang mở gia phả…</span>
        <div className="pat-card h-28 animate-pulse bg-[#f6ecd8]" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="pat-card h-40 animate-pulse bg-[#f6ecd8]" />
          <div className="pat-card h-40 animate-pulse bg-[#f6ecd8]" />
        </div>
        <div className="pat-card h-52 animate-pulse bg-[#f6ecd8]" />
      </div>
    </div>
  );
}

export function MissingTree() {
  return (
    <div className="pat-shell flex min-h-dvh items-center justify-center px-6">
      <div className="pat-card w-full max-w-sm px-6 py-8 text-center">
        <SearchX size={34} className="mx-auto text-[var(--pat-gold)]" />
        <h1 className="pat-serif mt-3 text-xl font-semibold text-[var(--pat-red)]">Không tìm thấy gia phả</h1>
        <p className="mt-1 text-sm text-[var(--pat-muted)]">
          Gia phả này không còn trên thiết bị. Có thể bạn đã xoá hoặc mở liên kết từ máy khác.
        </p>
        <Link href="/" className="pat-btn pat-btn-red mt-4 h-10 w-full text-sm">
          <House size={15} /> Về danh sách gia phả
        </Link>
      </div>
    </div>
  );
}

export function BackHome() {
  return (
    <Link
      href="/"
      className="flex h-9 items-center gap-1 rounded-full border border-[var(--pat-line)] bg-white/70 px-3 text-xs font-semibold text-[var(--pat-muted)]"
    >
      <ArrowLeft size={14} /> Gia phả
    </Link>
  );
}
