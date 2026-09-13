"use client";

import { PanelLeftIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * The top bar exists only on phones, where it holds the button that opens
 * the sidebar. Sharing lives in each chat's menu in the sidebar.
 */
function PureChatHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3 md:hidden">
      <Button
        aria-label="Open sidebar"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
