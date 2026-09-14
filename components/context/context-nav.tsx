"use client";

import { LibraryBigIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function ContextNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const closeMobile = useCallback(() => setOpenMobile(false), [setOpenMobile]);

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
              isActive={
                pathname === "/context" || pathname.startsWith("/context/")
              }
              tooltip="Context"
            >
              <Link href="/context" onClick={closeMobile}>
                <LibraryBigIcon className="size-4" />
                <span className="text-[13px]">Context</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
