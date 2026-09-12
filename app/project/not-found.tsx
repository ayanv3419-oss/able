import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-3 px-5 py-20">
      <h1 className="font-semibold text-xl">Project not found</h1>
      <p className="text-muted-foreground text-sm">
        It may have been deleted, or it belongs to another account.
      </p>
      <Link className="text-sm underline" href="/projects">
        Back to projects
      </Link>
    </div>
  );
}
