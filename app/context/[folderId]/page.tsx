import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderOpenIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ContextFolderSettings } from "@/components/context/folder-settings";
import { StudyContextForm } from "@/components/context/study-context-form";
import { TeachMenu } from "@/components/context/teach-menu";
import { ProjectLoading } from "@/components/project/project-loading";
import { gateStudent } from "@/lib/access";
import { getContextFolder, listStudyContexts } from "@/lib/db/context-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folderId: string }>;
}): Promise<Metadata> {
  const { folderId } = await params;
  if (!z.uuid().safeParse(folderId).success) {
    return { title: "Context" };
  }
  const session = await auth();
  const folder = session?.user?.id
    ? await getContextFolder({ id: folderId, userId: session.user.id })
    : null;
  return { title: folder?.name ?? "Context" };
}

async function FolderContent({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  if (!z.uuid().safeParse(folderId).success) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  await gateStudent(session.user.id, "projects");
  const folder = await getContextFolder({
    id: folderId,
    userId: session.user.id,
  });
  if (!folder) {
    notFound();
  }
  const materials = await listStudyContexts({
    folderId,
    userId: session.user.id,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-12">
      <Link
        className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href="/context"
      >
        <ArrowLeftIcon className="size-4" /> Back to Context
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
            <FolderOpenIcon className="size-4" /> Subject
          </p>
          <h1 className="break-words font-semibold text-2xl tracking-tight">
            {folder.name}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {materials.length} {materials.length === 1 ? "Context" : "Contexts"}
          </p>
        </div>
        <TeachMenu disabled={materials.length === 0} folderId={folder.id} />
      </div>

      <details
        className="group rounded-xl border px-4 py-3"
        open={materials.length === 0}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-sm [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" />
          Add study material
        </summary>
        <div className="mt-5">
          <StudyContextForm folderId={folder.id} />
        </div>
      </details>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-12 text-center">
          <BookOpenIcon className="size-8 text-muted-foreground" />
          <h2 className="font-medium text-lg">This subject is empty</h2>
          <p className="max-w-sm text-muted-foreground text-sm">
            Paste a title and study text above. Saving starts the first lesson
            automatically.
          </p>
        </div>
      ) : (
        <ul
          aria-label="Study material"
          className="divide-y divide-border rounded-xl border"
        >
          {materials.map((material) => (
            <li
              className="flex items-center gap-3 p-4 sm:p-5"
              key={material.id}
            >
              <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
              <Link
                className="min-w-0 flex-1"
                href={`/context/${folder.id}/${material.id}`}
              >
                <h2 className="break-words font-medium text-sm">
                  {material.title}
                </h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  {material.content.length.toLocaleString("en-IN")} characters
                </p>
              </Link>
              <TeachMenu folderId={folder.id} studyContextId={material.id} />
            </li>
          ))}
        </ul>
      )}

      <ContextFolderSettings folder={folder} materialCount={materials.length} />
    </div>
  );
}

export default function ContextFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  return (
    <Suspense fallback={<ProjectLoading label="Loading subject…" />}>
      <FolderContent params={params} />
    </Suspense>
  );
}
