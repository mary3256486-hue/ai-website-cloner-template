"use client";

import { Hammer } from "lucide-react";
import type { FamilyTree } from "./types";
import { TreeShell } from "./app-shell";
import { EmptyState } from "./ui";

const labels: Record<string, string> = {
  "danh-sach-thanh-vien": "Danh sách thành viên",
  "danh-sach-nhanh": "Danh sách nhánh",
  "chinh-sua-voi-cay-gia-pha": "Cây phả hệ",
  "ve-pha-do": "Tạo phả đồ",
  "giao-dien": "Thiết kế phả đồ",
  "pha-ky": "Phả ký",
};

export function ComingSoon({ tree, section }: { tree: FamilyTree; section: string }) {
  return (
    <TreeShell tree={tree} section={section} title={labels[section] ?? "Gia phả"} subtitle={tree.name}>
      <EmptyState
        icon={<Hammer size={30} />}
        title="Tính năng đang được dựng"
        description={`Phần "${labels[section] ?? section}" sẽ xuất hiện ở đây.`}
      />
    </TreeShell>
  );
}
