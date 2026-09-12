import { Skeleton } from "@/components/ui/skeleton";

export function ProjectLoading({
  label = "Loading project…",
}: {
  label?: string;
}) {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-12"
      role="status"
    >
      <p className="text-muted-foreground text-sm">{label}</p>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
