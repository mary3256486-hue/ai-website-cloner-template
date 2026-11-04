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
  { key: "trang-chu", label: "Tổng quan", icon: Home, short: "Tổng quan" },
  { key: "danh-sach-thanh-vien", label: "Phả hệ", icon: Users, short: "Phả hệ" },
  { key: "danh-sach-nhanh", label: "Chi phái", icon: GitBranch, short: "Chi phái" },
  { key: "chinh-sua-voi-cay-gia-pha", label: "Cây gia phả", icon: Network, short: "Cây gia phả" },
  { key: "ve-pha-do", label: "Vẽ phả đồ", icon: PenTool, short: "Vẽ phả đồ" },
  { key: "giao-dien", label: "Thiết kế bản in", icon: Palette, short: "Bản in" },
  { key: "pha-ky", label: "Phả ký", icon: BookOpen, short: "Phả ký" },
];

export function TreeShell({
  tree,
  section,
  title,
  subtitle,
  actions,
  children,
  wide,
}: {
  tree: FamilyTree;
  section: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const home = `/gia-pha/${tree.id}/trang-chu`;
  const go = (key: string) => {
    setMoreOpen(false);
    router.push(`/gia-pha/${tree.id}/${key}`);
  };

  return (
    <div className="pat-shell flex min-h-dvh flex-col">
      <header className="pat-header sticky top-0 z-30 no-print">
        <div className="mx-auto flex min-h-[76px] w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="pat-tip flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 transition hover:bg-white/20"
            aria-label="Về trang chủ"
            data-tip="Về trang chủ"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="pat-serif line-clamp-2 text-base font-semibold leading-snug text-[#fff7e8] sm:text-lg md:line-clamp-1">
              {title}
            </h1>
            {subtitle ? <p className="truncate text-[0.72rem] text-[#f0d9bd]/90">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {actions}
            <Link
              href="/"
              className="pat-tip flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 transition hover:bg-white/20"
              aria-label="Về danh sách gia phả"
              data-tip="Danh sách gia phả"
            >
              <Home size={17} />
            </Link>
          </div>
        </div>
        <nav className="mx-auto hidden w-full max-w-6xl gap-1 overflow-x-auto px-3 pb-1 md:flex xl:gap-1.5">
          {sections.map((item) => {
            const active = pathname?.includes(`/${item.key}`) || section === item.key;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={`/gia-pha/${tree.id}/${item.key}`}
                title={item.label}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-t-lg border-b-2 px-2 py-2 text-[0.7rem] font-semibold transition xl:gap-1.5 xl:px-2.5 xl:text-xs",
                  active
                    ? "border-[var(--pat-gold)] bg-white/10 text-white"
                    : "border-transparent text-[#f3ddc2]/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={14} className="hidden xl:block" />
                <span className="xl:hidden">{item.short}</span>
                <span className="hidden xl:inline">{item.label}</span>
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
            label="Chi phái"
            active={section === "danh-sach-nhanh"}
          />
          <BottomLink
            href={`/gia-pha/${tree.id}/ve-pha-do`}
            icon={<PenTool size={19} />}
            label="Vẽ phả đồ"
            active={section === "ve-pha-do"}
          />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem] font-semibold text-[var(--pat-muted)]"
          >
            <Menu size={19} />
            Công cụ
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Công cụ gia phả" subtitle={tree.name}>
        <div className="grid gap-3">
          <SheetGroup label="Dựng cây">
            <SheetRow icon={<Network size={18} />} title="Cây gia phả" subtitle="Xem và chỉnh sửa trực tiếp trên cây" onClick={() => go("chinh-sua-voi-cay-gia-pha")} />
            <SheetRow icon={<PenTool size={18} />} title="Vẽ phả đồ" subtitle="Kéo thả bố cục, xuất PNG/PDF" onClick={() => go("ve-pha-do")} />
          </SheetGroup>
          <SheetGroup label="Bản in">
            <SheetRow icon={<Palette size={18} />} title="Thiết kế bản in" subtitle="Khổ giấy, lề, màu sắc, xem trước in" onClick={() => go("giao-dien")} />
            <SheetRow icon={<BookOpen size={18} />} title="Phả ký" subtitle="Viết lịch sử dòng họ" onClick={() => go("pha-ky")} />
          </SheetGroup>
          <SheetGroup label="Dữ liệu">
            <SheetRow icon={<Download size={18} />} title="Xuất dữ liệu" subtitle="Excel (CSV), JSON, GEDCOM" onClick={() => go("danh-sach-thanh-vien")} />
          </SheetGroup>
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
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem] font-semibold transition",
        active ? "text-[var(--pat-red)]" : "text-[var(--pat-muted)]",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function SheetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="pat-overline mb-1 px-1">{label}</p>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}
