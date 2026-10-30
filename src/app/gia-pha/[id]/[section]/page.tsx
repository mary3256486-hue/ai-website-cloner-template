"use client";

import { useParams } from "next/navigation";
import { BranchesView } from "@/components/sites/phatue/branches-view";
import { ChronicleView } from "@/components/sites/phatue/chronicle-view";
import { ComingSoon } from "@/components/sites/phatue/coming-soon";
import { DesignView } from "@/components/sites/phatue/design-view";
import { DiagramEditorView } from "@/components/sites/phatue/diagram-editor-view";
import { MembersView } from "@/components/sites/phatue/members-view";
import { TreeEditorView } from "@/components/sites/phatue/tree-editor-view";
import { LoadingTree, MissingTree, useTreeFromRoute } from "@/components/sites/phatue/tree-route";

export default function TreeSectionPage() {
  const params = useParams<{ section: string }>();
  const section = Array.isArray(params.section) ? params.section[0] : params.section;
  const { tree, hydrated } = useTreeFromRoute();
  if (!hydrated) return <LoadingTree />;
  if (!tree) return <MissingTree />;
  if (section === "danh-sach-thanh-vien") return <MembersView tree={tree} />;
  if (section === "danh-sach-nhanh") return <BranchesView tree={tree} />;
  if (section === "chinh-sua-voi-cay-gia-pha") return <TreeEditorView tree={tree} />;
  if (section === "ve-pha-do") return <DiagramEditorView tree={tree} />;
  if (section === "giao-dien") return <DesignView tree={tree} />;
  if (section === "pha-ky") return <ChronicleView tree={tree} />;
  return <ComingSoon tree={tree} section={section ?? ""} />;
}
