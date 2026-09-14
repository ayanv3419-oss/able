import { FolderIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectActions } from "@/components/project/project-actions";
import { ProjectLoading } from "@/components/project/project-loading";
import { gateStudent } from "@/lib/access";
import { listProjects } from "@/lib/db/project-queries";

export const metadata: Metadata = { title: "Projects" };

/** A to Z, ignoring case, with "Unit 2" before "Unit 10". */
const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * The Projects page is a grid of gray folders, each showing only its name.
 * A folder opens its chats. Its "…" button, shown on hover and always on
 * touch screens, renames or deletes it.
 */
async function ProjectsContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  await gateStudent(session.user.id, "projects");
  const projects = (await listProjects(session.user.id)).sort((a, b) =>
    byName.compare(a.name, b.name)
  );
  return (
    <div className="@container mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Projects</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Keep your conversations and instructions together.
          </p>
        </div>
        <CreateProjectDialog compact={false} />
      </div>
      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-14 text-center">
          <FolderIcon className="size-8 text-muted-foreground" />
          <h2 className="font-medium text-lg">No projects yet</h2>
          <p className="text-muted-foreground text-sm">
            Create a project to organise related conversations.
          </p>
        </div>
      ) : (
        <ul
          aria-label="Your projects"
          className="grid grid-cols-3 gap-x-2 gap-y-3 @lg:grid-cols-4 @xl:grid-cols-5"
        >
          {projects.map((project) => (
            <li className="group relative" key={project.id}>
              <Link
                aria-label={`Open project: ${project.name}`}
                className="flex h-full flex-col items-center gap-2 rounded-xl px-2 pt-4 pb-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted group-hover:bg-muted/60"
                href={`/project/${project.id}`}
                title={project.name}
              >
                <FolderIcon
                  aria-hidden
                  className="size-16 shrink-0 fill-muted-foreground/20 text-muted-foreground transition-colors group-hover:fill-muted-foreground/30"
                  strokeWidth={1.25}
                />
                <span className="line-clamp-2 w-full break-words font-medium text-sm leading-snug">
                  {project.name}
                </span>
              </Link>
              <ProjectActions
                label={`Options for ${project.name}`}
                project={project}
                triggerClassName="absolute top-1 right-1 size-7 opacity-0 transition-opacity focus-visible:opacity-100 disabled:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
                variant="ghost"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectLoading label="Loading projects…" />}>
      <ProjectsContent />
    </Suspense>
  );
}
