import { redirect } from "next/navigation";
import { Suspense } from "react";

/**
 * A project's page now lists its chats directly, so the old folder address
 * forwards there. The project page does the ownership check.
 */
async function RedirectToProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return redirect(`/project/${encodeURIComponent(id)}`);
}

export default function ProjectFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <RedirectToProject params={params} />
    </Suspense>
  );
}
