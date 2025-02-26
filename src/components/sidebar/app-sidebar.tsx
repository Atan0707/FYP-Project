"use client"

import * as React from "react"
import {
  // AudioWaveform,
  BookOpen,
  Bot,
  // Command,
  Frame,
  GalleryVerticalEnd,
  // GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
// import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/sidebar/nav-user"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
// Fix the import to only include what's exported
import { Sidebar, SidebarBody } from "@/components/ui/sidebar"
// import Image from "next/image"
import { useQuery } from "@tanstack/react-query"

// The user object should have this shape
type User = {
  name: string;
  email: string;
  avatar: string;
}

// Make sure your API returns data in this format
const getUser = async () => {
  try {
    // Add a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/user?t=${timestamp}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    // The response should match the User type
    return await response.json() as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error; // We throw the error so Tanstack Query can handle it
  }
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "i-FAMS",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/pages/dashboard",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Family",
      url: "/pages/family",
      icon: Bot,
    },
    {
      title: "Assets",
      url: "/pages/assets",
      icon: BookOpen,
    },
    {
      title: "Agreements",
      url: "/pages/agreements",
      icon: Settings2,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Add a key to force refetch when component mounts
  const [refreshKey, setRefreshKey] = React.useState(0);

  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['user', refreshKey], // Add refreshKey to queryKey to force refetch
    queryFn: getUser,
    initialData: data.user, // Use the static data as initial data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
    staleTime: 0, // Consider data stale immediately
  });

  // Force refetch when component mounts
  React.useEffect(() => {
    setRefreshKey(prev => prev + 1);
    
    // Set up an interval to refresh the data periodically
    const intervalId = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Show loading state if needed
  if (isLoading) {
    console.log('Loading user data...');
  }

  // Handle error state if needed
  if (error) {
    console.error('Error fetching user data:', error);
  }

  return (
    <Sidebar {...props}>
      <SidebarBody className="flex flex-col h-full justify-between">
        <div className="flex flex-col flex-1">
          <TeamSwitcher teams={data.teams} />
          <div className="mt-8">
            <NavMain items={data.navMain} />
          </div>
        </div>
        <div className="mt-auto">
          <NavUser user={userData} />
        </div>
      </SidebarBody>
    </Sidebar>
  )
}
