"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserX } from "lucide-react";
import { MemberDetailView } from "@/components/sites/PAT/member-detail-view";
import { TreeShell } from "@/components/sites/PAT/app-shell";
import { EmptyState } from "@/components/sites/PAT/ui";
import { treePath } from "@/components/sites/PAT/routes";
import { LoadingTree, MissingTree, useTreeFromRoute } from "@/components/sites/PAT/tree-route";

export function MemberScreen() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get("member") ?? "";
  const { tree, hydrated } = useTreeFromRoute();
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [memberId]);

  if (!hydrated) return <LoadingTree />;
  if (!tree) return <MissingTree />;

  const member = tree.members.find((item) => item.id === memberId);
  if (!member) {
    return (
      <TreeShell tree={tree} section="thanh-vien" title="Thành viên" subtitle={tree.name}>
        <EmptyState
          icon={<UserX size={30} />}
          title="Không tìm thấy thành viên"
          description="Thành viên này có thể đã bị xoá khỏi gia phả."
          action={
            <button
              type="button"
              className="pat-btn pat-btn-red h-9 text-xs"
              onClick={() => router.push(treePath(tree.id, "danh-sach-thanh-vien"))}
            >
              Về danh sách thành viên
            </button>
          }
        />
      </TreeShell>
    );
  }

  return <MemberDetailView tree={tree} member={member} />;
}