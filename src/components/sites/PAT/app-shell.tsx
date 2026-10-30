"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Download,
  GitBranch,
  Home,
  Menu,
  Network,
  Palette,
  PenTool,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FamilyTree } from "./types";
import { Sheet, SheetRow } from "./ui";

const sections = [
  { key: "trang-chu", label: "Tổng quan", icon: Home },
  { key: "danh-sach-thanh-vien", label: "Phả hệ", icon: Users },
  { key: "danh-sach-nhanh", label: "Nhánh", icon: GitBranch },
  { key: "chinh-sua-voi-cay-gia-pha", label: "Cây phả hệ", icon: Network },
  { key: "ve-pha-do", label: "Phả đồ", icon: PenTool },
  { key: "giao-dien", label: "Thiết kế", icon: Palette },
  { key: "pha-ky", label: "Phả ký", icon: BookOpen },
];

export function TreeShell({
  tree,
  section,
  title,
  subtitle,
  actions,
  children,
  wide,
  backHref,
}: {
  tree: FamilyTree;
  section: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  backHref?: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const home = `/gia-pha/${tree.id}/trang-chu`;

  return (
    <div className="pat-shell flex min-h-dvh flex-col">
      <header className="pat-header sticky top-0 z-30 no-print">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pb-3 pt-3">
          <Link
            href={backHref ?? home}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 transition hover:bg-white/20"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate pat-serif text-lg font-semibold leading-tight text-[#fff7e8]">{title}</p>
            {subtitle ? <p className="truncate text-[0.68rem] text-[#f0d9bd]/85">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        </div>
        <nav className="mx-auto hidden w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-1 md:flex">
          {sections.map((item) => {
            const active = pathname?.includes(`/${item.key}`) || section === item.key;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={`/gia-pha/${tree.id}/${item.key}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition",
                  active
                    ? "border-[var(--pat-gold)] bg-white/10 text-white"
                    : "border-transparent text-[#f3ddc2]/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={cn("mx-auto w-full flex-1 px-3 pb-28 pt-4 sm:px-5 md:pb-10", wide ? "max-w-[1600px]" : "max-w-6xl")}>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--pat-line)] bg-[#fffaf0]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-20px_rgba(90,15,10,0.4)] backdrop-blur md:hidden no-print">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          <BottomLink href={home} icon={<Home size={19} />} label="Gia phả" active={section === "trang-chu"} />
          <BottomLink
            href={`/gia-pha/${tree.id}/danh-sach-thanh-vien`}
            icon={<Users size={19} />}
            label="Phả hệ"
            active={section === "danh-sach-thanh-vien" || section === "thanh-vien"}
          />
          <BottomLink
            href={`/gia-pha/${tree.id}/danh-sach-nhanh`}
            icon={<GitBranch size={19} />}
            label="Nhánh"
            active={section === "danh-sach-nhanh"}
          />
          <BottomLink
            href={`/gia-pha/${tree.id}/ve-pha-do`}
            icon={<PenTool size={19} />}
            label="Phả đồ"
            active={section === "ve-pha-do"}
          />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.62rem] font-semibold text-[var(--pat-muted)]"
          >
            <Menu size={19} />
            Thêm
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Công cụ gia phả" subtitle={tree.name}>
        <div className="grid gap-1">
          <SheetRow icon={<Network size={18} />} title="Cây phả hệ" subtitle="Xem và chỉnh sửa trực tiếp trên cây" onClick={() => { setMoreOpen(false); router.push(`/gia-pha/${tree.id}/chinh-sua-voi-cay-gia-pha`); }} />
          <SheetRow icon={<Palette size={18} />} title="Thiết kế phả đồ" subtitle="Khổ giấy, giao diện, hoa văn, xuất in" onClick={() => { setMoreOpen(false); router.push(`/gia-pha/${tree.id}/giao-dien`); }} />
          <SheetRow icon={<BookOpen size={18} />} title="Phả ký" subtitle="Viết lịch sử dòng họ" onClick={() => { setMoreOpen(false); router.push(`/gia-pha/${tree.id}/pha-ky`); }} />
          <SheetRow icon={<Download size={18} />} title="Xuất dữ liệu" subtitle="Excel, JSON, PDF, PNG" onClick={() => { setMoreOpen(false); router.push(`/gia-pha/${tree.id}/ve-pha-do`); }} />
        </div>
      </Sheet>
    </div>
  );
}

function BottomLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.62rem] font-semibold transition",
        active ? "text-[var(--pat-red)]" : "text-[var(--pat-muted)]",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
