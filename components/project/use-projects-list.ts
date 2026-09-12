"use client";

import useSWR from "swr";
import { listProjectsForSidebar } from "@/app/project/actions";
import type { Project } from "@/lib/db/schema";

/**
 * Shared SWR key for the student's project list. Every component that shows
 * or changes projects (the sidebar section, the chat "move" menu, the create
 * and rename dialogs) reads or revalidates this same key, so a change in one
 * place is reflected everywhere without a dedicated API route.
 */
export const PROJECTS_SWR_KEY = "able:projects";

export function useProjectsList(enabled: boolean) {
  return useSWR<Project[]>(
    enabled ? PROJECTS_SWR_KEY : null,
    listProjectsForSidebar,
    { revalidateOnFocus: false }
  );
}
