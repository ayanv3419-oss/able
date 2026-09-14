"use client";

import {
  BookOpenIcon,
  BrainIcon,
  ClipboardListIcon,
  HelpCircleIcon,
  ListChecksIcon,
} from "lucide-react";
import { startContextTeachingAction } from "@/app/context/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import type { TeachingMode } from "@/lib/study-context";

const choices: Array<{
  icon: typeof BookOpenIcon;
  label: string;
  mode: TeachingMode;
}> = [
  { icon: BookOpenIcon, label: "Start lesson", mode: "lesson" },
  { icon: BrainIcon, label: "Explain simply", mode: "explain" },
  { icon: ClipboardListIcon, label: "Summary", mode: "summary" },
  { icon: HelpCircleIcon, label: "Quiz me", mode: "quiz" },
  { icon: ListChecksIcon, label: "Important questions", mode: "important" },
];

export function TeachMenu({
  folderId,
  studyContextId,
  disabled = false,
}: {
  folderId: string;
  studyContextId?: string;
  disabled?: boolean;
}) {
  const hydrated = useHydrated();

  return (
    <form action={startContextTeachingAction}>
      <input name="folderId" type="hidden" value={folderId} />
      <input name="studyContextId" type="hidden" value={studyContextId ?? ""} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={!hydrated || disabled} type="button">
            <BookOpenIcon /> Teach me
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Choose how Able teaches</DropdownMenuLabel>
          {choices.map(({ icon: Icon, label, mode }) => (
            <DropdownMenuItem asChild key={mode}>
              <button className="w-full" name="mode" type="submit" value={mode}>
                <Icon /> {label}
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </form>
  );
}
