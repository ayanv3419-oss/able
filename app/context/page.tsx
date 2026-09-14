import { FolderIcon, LibraryBigIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { CreateContextFolderDialog } from "@/components/context/create-folder-dialog";
import { ProjectLoading } from "@/components/project/project-loading";
import { gateStudent } from "@/lib/access";
import { listContextFolders } from "@/lib/db/context-queries";

export const metadata: Metadata = { title: "Context" };

async function ContextContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  await gateStudent(session.user.id, "projects");
  const folders = await listContextFolders(session.user.id);

  return (
    <div className="@container mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-muted-foreground text-sm">
            <LibraryBigIcon className="size-4" /> Context
          </p>
          <h1 className="font-semibold text-2xl tracking-tight">
            Your subjects
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Paste your study material, and Able teaches you from it.
          </p>
        </div>
        <CreateContextFolderDialog />
      </div>

      {folders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-14 text-center">
          <FolderIcon className="size-8 text-muted-foreground" />
          <h2 className="font-medium text-lg">No subjects yet</h2>
          <p className="max-w-sm text-muted-foreground text-sm">
            Create a subject folder, then paste the material you want Able to
            teach.
          </p>
        </div>
      ) : (
        <ul
          aria-label="Your Context folders"
          className="grid grid-cols-3 gap-x-2 gap-y-3 @lg:grid-cols-4 @xl:grid-cols-5"
        >
          {folders.map((folder) => (
            <li className="group relative" key={folder.id}>
              <Link
                aria-label={`Open subject: ${folder.name}`}
                className="flex h-full flex-col items-center gap-2 rounded-xl px-2 pt-4 pb-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted group-hover:bg-muted/60"
                href={`/context/${folder.id}`}
                title={folder.name}
              >
                <FolderIcon
                  aria-hidden
                  className="size-16 shrink-0 fill-muted-foreground/20 text-muted-foreground transition-colors group-hover:fill-muted-foreground/30"
                  strokeWidth={1.25}
                />
                <span className="line-clamp-2 w-full break-words font-medium text-sm leading-snug">
                  {folder.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ContextPage() {
  return (
    <Suspense fallback={<ProjectLoading label="Loading Context…" />}>
      <ContextContent />
    </Suspense>
  );
}
