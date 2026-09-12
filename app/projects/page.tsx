import { ChevronRightIcon, FolderIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectLoading } from "@/components/project/project-loading";
import { listProjectsWithChatCounts } from "@/lib/db/project-queries";

export const metadata: Metadata = { title: "Projects" };

async function ProjectsContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const projects = await listProjectsWithChatCounts(session.user.id);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-12">
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
        <ul aria-label="Your projects" className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                aria-label={`Open project: ${project.name}`}
                className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/project/${project.id}`}
              >
                <FolderIcon className="size-6 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-medium">{project.name}</h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {project.chatCount}{" "}
                    {project.chatCount === 1 ? "conversation" : "conversations"}
                  </p>
                  {project.instructions ? (
                    <p className="mt-2 line-clamp-2 break-words text-muted-foreground text-sm">
                      {project.instructions}
                    </p>
                  ) : null}
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
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
