import { Suspense } from "react";
import { LoadingTree } from "@/components/sites/PAT/tree-route";
import { TreeScreen } from "./tree-screen";

export default function GiaPhaPage() {
  return (
    <Suspense fallback={<LoadingTree />}>
      <TreeScreen />
    </Suspense>
  );
}