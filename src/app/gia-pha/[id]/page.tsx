import { redirect } from "next/navigation";

export default async function TreeIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/gia-pha/${id}/trang-chu`);
}
