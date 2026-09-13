"use client";

import { FolderIcon } from "lucide-react";
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

/**
 * The sidebar's single "Projects" entry. Folders and their chats live on the
 * Projects page, so the sidebar stays short.
 */
export function ProjectsNav() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const isActive =
    pathname === "/projects" || Boolean(pathname?.startsWith("/project/"));

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
              isActive={isActive}
              tooltip="Projects"
            >
              <Link href="/projects" onClick={closeMobile}>
                <FolderIcon className="size-4" />
                <span className="text-[13px]">Projects</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
