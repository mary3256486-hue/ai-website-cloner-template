export type TreeQuery = Record<string, string | number | undefined>;

/** Route tĩnh + query để build dạng static export chạy trong vỏ app (Capacitor/Tauri). */
export function treePath(treeId: string, section = "trang-chu", extra?: TreeQuery): string {
  const params = new URLSearchParams({ tree: treeId, section });
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return `/gia-pha/?${params.toString()}`;
}

export function memberPath(treeId: string, memberId: string): string {
  const params = new URLSearchParams({ tree: treeId, member: memberId });
  return `/gia-pha/thanh-vien/?${params.toString()}`;
}