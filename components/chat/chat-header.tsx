"use client";

import { PanelLeftIcon, PenSquareIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * The top bar exists only on phones, where it holds the button that opens
 * the sidebar. Sharing lives in each chat's menu in the sidebar.
 */
function PureChatHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-20 grid h-14 grid-cols-[2.5rem_1fr_2.5rem] items-center border-border/40 border-b bg-sidebar/90 px-2 backdrop-blur-xl md:hidden">
      <Button
        aria-label="Open sidebar"
        className="size-10 rounded-xl"
        onClick={toggleSidebar}
        size="icon"
        variant="ghost"
      >
        <PanelLeftIcon className="size-[18px]" />
      </Button>
      <Link
        aria-label="Able home"
        className="mx-auto rounded-lg px-2 py-1 transition-opacity active:opacity-60"
        href="/"
      >
        <Logo size={22} />
      </Link>
      <Button
        aria-label="New chat"
        asChild
        className="size-10 rounded-xl"
        size="icon"
        variant="ghost"
      >
        <Link href="/">
          <PenSquareIcon className="size-[18px]" />
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
