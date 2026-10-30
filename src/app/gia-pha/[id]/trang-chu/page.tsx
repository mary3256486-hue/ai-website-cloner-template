"use client";

import { TreeHomeView } from "@/components/sites/phatue/tree-home-view";
import { LoadingTree, MissingTree, useTreeFromRoute } from "@/components/sites/phatue/tree-route";

export default function TreeDashboardPage() {
  const { tree, hydrated } = useTreeFromRoute();
  if (!hydrated) return <LoadingTree />;
  if (!tree) return <MissingTree />;
  return <TreeHomeView tree={tree} />;
}
