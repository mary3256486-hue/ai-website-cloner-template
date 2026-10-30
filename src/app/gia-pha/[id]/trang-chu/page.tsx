"use client";

import { TreeHomeView } from "@/components/sites/PAT/tree-home-view";
import { LoadingTree, MissingTree, useTreeFromRoute } from "@/components/sites/PAT/tree-route";

export default function TreeDashboardPage() {
  const { tree, hydrated } = useTreeFromRoute();
  if (!hydrated) return <LoadingTree />;
  if (!tree) return <MissingTree />;
  return <TreeHomeView tree={tree} />;
}
