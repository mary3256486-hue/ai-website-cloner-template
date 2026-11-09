"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BranchesView } from "@/components/sites/PAT/branches-view";
import { ComingSoon } from "@/components/sites/PAT/coming-soon";
import { DesignView } from "@/components/sites/PAT/design-view";
import { DocumentsView } from "@/components/sites/PAT/documents-view";
import { DiagramEditorView } from "@/components/sites/PAT/diagram-editor-view";
import { MembersView } from "@/components/sites/PAT/members-view";
import { ToolsView } from "@/components/sites/PAT/tools-view";
import { TreeEditorView } from "@/components/sites/PAT/tree-editor-view";
import { TreeHomeView } from "@/components/sites/PAT/tree-home-view";
import { LoadingTree, MissingTree, useTreeFromRoute } from "@/components/sites/PAT/tree-route";

export function TreeScreen() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "trang-chu";
  const { tree, hydrated } = useTreeFromRoute();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  if (!hydrated) return <LoadingTree />;
  if (!tree) return <MissingTree />;
  if (section === "trang-chu") return <TreeHomeView tree={tree} />;
  if (section === "danh-sach-thanh-vien") return <MembersView tree={tree} />;
  if (section === "danh-sach-nhanh") return <BranchesView tree={tree} />;
  if (section === "chinh-sua-voi-cay-gia-pha") return <TreeEditorView tree={tree} />;
  if (section === "ve-pha-do") return <DiagramEditorView tree={tree} />;
  if (section === "giao-dien") return <DesignView tree={tree} />;
  if (section === "tu-lieu") return <DocumentsView tree={tree} />;
  if (section === "cong-cu") return <ToolsView tree={tree} />;
  return <ComingSoon tree={tree} section={section} />;
}