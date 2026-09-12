import {
  ArrowLeftIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  MessageSquareIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { startNewChatInProjectAction } from "@/app/project/actions";
import { ProjectLoading } from "@/components/project/project-loading";
import { Button } from "@/components/ui/button";
import { getProject, listChatsInProject } from "@/lib/db/project-queries";

export const metadata: Metadata = { title: "Project conversations" };

async function FolderContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }
  const userId = session.user.id;
  const project = await getProject({ id, userId });
  if (!project) {
    notFound();
  }
  const chats = await listChatsInProject({ projectId: id, userId });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-12">
      <Link
        className="flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={`/project/${id}`}
      >
        <ArrowLeftIcon className="size-4" />
        Back to project
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-muted-foreground text-sm">
            <FolderOpenIcon className="size-4" />
            Project folder
          </p>
          <h1 className="break-words font-semibold text-2xl tracking-tight">
            {project.name}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {chats.length}{" "}
            {chats.length === 1 ? "conversation" : "conversations"}
          </p>
        </div>
        <form action={startNewChatInProjectAction}>
          <input name="projectId" type="hidden" value={id} />
          <Button type="submit">New chat in this project</Button>
        </form>
      </div>
      {chats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-14 text-center">
          <MessageSquareIcon className="size-8 text-muted-foreground" />
          <h2 className="font-medium text-lg">No conversations yet</h2>
          <p className="max-w-sm text-muted-foreground text-sm">
            Start a conversation in this project and it will appear here. You
            can also move an existing chat from its sidebar menu.
          </p>
        </div>
      ) : (
        <ul
          aria-label="Project conversations"
          className="divide-y divide-border rounded-xl border border-border"
        >
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link
                aria-label={`Open chat: ${chat.title}`}
                className="flex min-w-0 items-center gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"
                href={`/chat/${chat.id}`}
              >
                <MessageSquareIcon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-medium text-sm">
                    {chat.title}
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
                    <span>
                      Created{" "}
                      <time dateTime={chat.createdAt.toISOString()}>
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Kolkata",
                        }).format(chat.createdAt)}{" "}
                        IST
                      </time>
                    </span>
                    <span>
                      {chat.visibility === "public" ? "Shared" : "Private"}
                    </span>
                  </p>
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

export default function ProjectFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProjectLoading label="Loading conversations…" />}>
      <FolderContent params={params} />
    </Suspense>
  );
}
