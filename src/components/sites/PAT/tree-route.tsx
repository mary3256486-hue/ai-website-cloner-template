"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, House, SearchX } from "lucide-react";
import { useGenealogy } from "./store";
import type { FamilyTree } from "./types";

export function useTreeFromRoute(): { tree?: FamilyTree; hydrated: boolean; id: string } {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const { getTree, hydrated } = useGenealogy();
  return { tree: id ? getTree(id) : undefined, hydrated, id };
}

export function LoadingTree() {
  return (
    <div className="pat-shell flex min-h-dvh items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--pat-line)] border-t-[var(--pat-red)]" />
        <p className="mt-3 text-sm text-[var(--pat-muted)]">Đang mở gia phả…</p>
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
