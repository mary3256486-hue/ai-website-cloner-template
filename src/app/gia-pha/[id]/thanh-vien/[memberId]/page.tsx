"use client";

import { useParams, useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { MemberDetailView } from "@/components/sites/phatue/member-detail-view";
import { TreeShell } from "@/components/sites/phatue/app-shell";
import { EmptyState } from "@/components/sites/phatue/ui";
import { LoadingTree, MissingTree, useTreeFromRoute } from "@/components/sites/phatue/tree-route";

export default function MemberDetailPage() {
  const params = useParams<{ memberId: string }>();
  const memberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const { tree, hydrated } = useTreeFromRoute();
  const router = useRouter();

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
              className="phatue-btn phatue-btn-red h-9 text-xs"
              onClick={() => router.push(`/gia-pha/${tree.id}/danh-sach-thanh-vien`)}
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
