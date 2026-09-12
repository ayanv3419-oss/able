import { ArrowLeftIcon, ArrowRightIcon, FolderIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  startNewChatInProjectAction,
  updateProjectInstructionsAction,
} from "@/app/project/actions";
import { ProjectActions } from "@/components/project/project-actions";
import { ProjectLoading } from "@/components/project/project-loading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countChatsInProject, getProject } from "@/lib/db/project-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return { title: "Project" };
  }
  const session = await auth();

  if (!session?.user?.id) {
    return { title: "Project" };
  }

  const project = await getProject({ id, userId: session.user.id });

  return { title: project?.name ?? "Project" };
}

async function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const project = await getProject({ id, userId });

  if (!project) {
    notFound();
  }

  const chatCount = await countChatsInProject({
    projectId: project.id,
    userId,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 py-12">
      <Link
        className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href="/projects"
      >
        <ArrowLeftIcon className="size-4" />
        Back to projects
      </Link>
      <div>
        <p className="text-muted-foreground text-sm">Project</p>
        <h1 className="break-words font-semibold text-2xl tracking-tight">
          {project.name}
        </h1>
        <div className="mt-4">
          <ProjectActions project={project} />
        </div>
      </div>

      <Link
        aria-label={`Open ${project.name} folder`}
        className="group flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
        href={`/project/${project.id}/folder`}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          <FolderIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-lg">Project folder</h2>
          <p className="text-muted-foreground text-sm">
            {chatCount} {chatCount === 1 ? "conversation" : "conversations"}
          </p>
          <p className="mt-2 text-sm">Open project conversations</p>
        </div>
        <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>

      <form
        action={updateProjectInstructionsAction}
        className="flex flex-col gap-3"
      >
        <input name="id" type="hidden" value={project.id} />
        <Label htmlFor="instructions">Instructions</Label>
        <p className="text-muted-foreground text-sm">
          Able reads this before every chat in this project, after your custom
          instructions in Settings.
        </p>
        <Textarea
          defaultValue={project.instructions ?? ""}
          id="instructions"
          maxLength={1500}
          name="instructions"
          placeholder="e.g. Answer using SI units. Keep citations in APA format."
          rows={6}
        />
        <Button className="self-start" type="submit" variant="secondary">
          Save instructions
        </Button>
      </form>

      <form action={startNewChatInProjectAction}>
        <input name="projectId" type="hidden" value={project.id} />
        <Button type="submit" variant="outline">
          New chat in this project
        </Button>
      </form>
    </div>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProjectLoading />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}
