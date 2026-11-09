import { Suspense } from "react";
import { LoadingTree } from "@/components/sites/PAT/tree-route";
import { MemberScreen } from "./member-screen";

export default function ThanhVienPage() {
  return (
    <Suspense fallback={<LoadingTree />}>
      <MemberScreen />
    </Suspense>
  );
}