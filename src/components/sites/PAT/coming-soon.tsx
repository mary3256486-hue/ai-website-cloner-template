"use client";

import { Hammer } from "lucide-react";
import type { FamilyTree } from "./types";
import { TreeShell } from "./app-shell";
import { EmptyState } from "./ui";

const labels: Record<string, string> = {
  "danh-sach-thanh-vien": "Danh sách thành viên",
  "danh-sach-nhanh": "Danh sách chi phái",
  "chinh-sua-voi-cay-gia-pha": "Cây gia phả",
  "ve-pha-do": "Vẽ phả đồ",
  "giao-dien": "Thiết kế bản in",
  "tu-lieu": "Tư liệu",
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
