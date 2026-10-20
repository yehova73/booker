"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Collections", href: "/dashboard/collections", icon: FolderOpen },
  { label: "Ebooks", href: "/dashboard/ebooks", icon: BookOpen },
  { label: "AI Studio", href: "/dashboard/ai-studio", icon: Sparkles },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider className="min-h-svh">
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 py-1 text-lg font-semibold">Booker</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map(({ label, href, icon: Icon }) => {
                  const isActive =
                    pathname === href ||
                    (href === "/dashboard/ai-studio" &&
                      pathname.startsWith("/dashboard/ai-studio/"));

                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
