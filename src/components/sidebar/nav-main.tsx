"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  const isActiveRoute = (url: string) => {
    if (pathname === url) return true
    // Check if current path starts with the url (for nested routes)
    if (pathname.startsWith(url) && url !== '/') return true
    return false
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = isActiveRoute(item.url)
          const hasActiveSubItem = item.items?.some(subItem => isActiveRoute(subItem.url))
          
          return (
            // If there are no sub-items, render a direct link
            !item.items?.length ? (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    "transition-all duration-200 hover:bg-sidebar-accent/50",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm border-l-2 border-l-primary"
                  )}
                >
                  <a href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              // If there are sub-items, render a collapsible menu
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={hasActiveSubItem || item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      tooltip={item.title}
                      isActive={isActive || hasActiveSubItem}
                      className={cn(
                        "transition-all duration-200 hover:bg-sidebar-accent/50",
                        (isActive || hasActiveSubItem) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm border-l-2 border-l-primary"
                      )}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isSubActive = isActiveRoute(subItem.url)
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton 
                              asChild
                              isActive={isSubActive}
                              className={cn(
                                "transition-all duration-200 hover:bg-sidebar-accent/30",
                                isSubActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                              )}
                            >
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
