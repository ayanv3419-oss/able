import { ArrowLeftIcon, LockIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { MaterialManagement } from "@/components/context/material-management";
import { StudyContextForm } from "@/components/context/study-context-form";
import { TeachMenu } from "@/components/context/teach-menu";
import { ProjectLoading } from "@/components/project/project-loading";
import { gateStudent } from "@/lib/access";
import {
  getContextFolder,
  getStudyContext,
  listContextFolders,
} from "@/lib/db/context-queries";
import { canEditStudyContext } from "@/lib/study-context";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folderId: string; materialId: string }>;
}): Promise<Metadata> {
  const { materialId } = await params;
  const session = await auth();
  const material =
    session?.user?.id && z.uuid().safeParse(materialId).success
      ? await getStudyContext({ id: materialId, userId: session.user.id })
      : null;
  return { title: material?.title ?? "Context" };
}

async function MaterialContent({
  params,
}: {
  params: Promise<{ folderId: string; materialId: string }>;
}) {
  const { folderId, materialId } = await params;
  if (
    !z.uuid().safeParse(folderId).success ||
    !z.uuid().safeParse(materialId).success
  ) {
    notFound();
  }
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  await gateStudent(session.user.id, "projects");
  const [folder, material, folders] = await Promise.all([
    getContextFolder({ id: folderId, userId: session.user.id }),
    getStudyContext({ id: materialId, userId: session.user.id }),
    listContextFolders(session.user.id),
  ]);
  if (!folder || !material || material.folderId !== folder.id) {
    notFound();
  }
  const canEdit = canEditStudyContext(material.createdAt);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-12">
      <Link
        className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={`/context/${folder.id}`}
      >
        <ArrowLeftIcon className="size-4" /> Back to {folder.name}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
            {canEdit ? (
              <PencilIcon className="size-4" />
            ) : (
              <LockIcon className="size-4" />
            )}
            {canEdit
              ? "Editable for 10 minutes after saving"
              : "Locked permanently"}
          </p>
          <h1 className="break-words font-semibold text-2xl tracking-tight">
            {material.title}
          </h1>
        </div>
        <TeachMenu folderId={folder.id} studyContextId={material.id} />
      </div>

      {canEdit ? (
        <div className="rounded-xl border p-4 sm:p-5">
          <StudyContextForm folderId={folder.id} material={material} />
        </div>
      ) : (
        <div className="rounded-xl border p-4 sm:p-5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {material.content}
          </p>
        </div>
      )}

      <MaterialManagement
        canEdit={canEdit}
        currentFolderId={folder.id}
        folders={folders}
        materialId={material.id}
      />
    </div>
  );
}

export default function StudyContextPage({
  params,
}: {
  params: Promise<{ folderId: string; materialId: string }>;
}) {
  return (
    <Suspense fallback={<ProjectLoading label="Loading Context…" />}>
      <MaterialContent params={params} />
    </Suspense>
  );
}
