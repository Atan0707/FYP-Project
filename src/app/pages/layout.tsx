"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, LogOut, UserCircle, Briefcase, FileText } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { userLogout } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ErrorBoundary } from "react-error-boundary";
import { usePendingAgreements } from "@/hooks/use-pending-agreements";

// User type definition
type UserData = {
  name: string;
  email: string;
  photo: string;
};

// UserProfile component to display user information in the sidebar
const UserProfile = ({ open }: { open: boolean }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Remove the sessionStorage caching mechanism
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(false);
        // Add a cache-busting timestamp to prevent browser caching
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/user?t=${timestamp}`);
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // console.log('User data fetched:', userData);
          // Remove sessionStorage caching
        } else if (response.status === 401) {
          // Handle unauthorized - user not logged in
          setError(true);
          console.log('User not authenticated');
        } else {
          setError(true);
          console.error('Error fetching user:', response.statusText);
        }
      } catch (error) {
        setError(true);
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    
    // Add an interval to periodically refresh the user data
    const intervalId = setInterval(fetchUser, 30000); // Refresh every 30 seconds
    
    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center p-2 mt-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse"></div>
        {open && (
          <div className="ml-2 flex-1">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center p-2 mt-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center">
          <UserCircle className="h-6 w-6 text-neutral-400" />
        </div>
        {open && (
          <div className="ml-2 flex-1">
            <p className="text-sm text-neutral-500">Guest User</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href="/pages/profile" className="flex items-center mt-auto pt-2 border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
      <Avatar className="h-8 w-8 rounded-full">
        <AvatarImage src={user.photo} alt={user.name} className="object-cover" />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {user.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ml-2 flex-1 overflow-hidden"
        >
          <p className="font-medium text-sm truncate">{user.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
        </motion.div>
      )}
    </Link>
  );
};

// Fallback component for error boundary
const UserProfileFallback = ({ open }: { open: boolean }) => {
  return (
    <div className="flex items-center p-2 mt-auto border-t border-neutral-200 dark:border-neutral-800">
      <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center">
        <UserCircle className="h-6 w-6 text-neutral-400" />
      </div>
      {open && (
        <div className="ml-2 flex-1">
          <p className="text-sm text-neutral-500">User Profile</p>
        </div>
      )}
    </div>
  );
};

const Logo = () => {
  return (
    <Link
      href="/pages/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border">
        <img 
          src="/logo1.png" 
          alt="WEMSP Logo"
          className="h-full w-full object-contain"
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        WEMSP
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/pages/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border">
        <img 
          src="/logo1.png" 
          alt="WEMSP Logo"
          className="h-full w-full object-contain"
        />
      </div>
    </Link>
  );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false); // Start with false to avoid hydration mismatch
  const [isClient, setIsClient] = useState(false);
  const { data: pendingCount = 0, isLoading, error } = usePendingAgreements();

  // Set client flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close mobile sidebar when screen size changes to desktop
  useEffect(() => {
    if (!isClient) return; // Only run on client side

    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setOpen(true); // Keep open on desktop
      } else {
        setOpen(false); // Close on mobile by default
      }
    };

    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  // Only show badge if count is actually greater than 0 and not loading
  const shouldShowBadge = !isLoading && !error && pendingCount > 0;

  const links = [
    {
      label: "Dashboard",
      href: "/pages/dashboard",
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Family",
      href: "/pages/family",
      icon: (
        <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Assets",
      href: "/pages/assets",
      icon: (
        <Briefcase className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Agreements",
      href: "/pages/agreements",
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      badge: shouldShowBadge ? pendingCount : undefined,
    },
    {
      label: "Profile",
      href: "/pages/profile",
      icon: (
        <UserCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    // {
    //   label: "Settings",
    //   href: "/pages/settings",
    //   icon: (
    //     <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    //   ),
    // },
    {
      label: "Logout",
      href: "#",
      icon: (
        <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => userLogout(),
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="flex flex-col h-full justify-between">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              {open ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-2">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            <ErrorBoundary FallbackComponent={() => <UserProfileFallback open={open} />}>
              <UserProfile open={open} />
            </ErrorBoundary>
          </SidebarBody>
        </Sidebar>
      </div>

      {/* Mobile Header and Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Logo />
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 bg-background border-r shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-4 flex flex-col h-full">
                <Logo />
                <nav className="mt-8 flex flex-col gap-3 flex-1">
                  {links.map((link, idx) => {
                    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
                    const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/');
                    
                    return (
                      <Link
                        key={idx}
                        href={link.href}
                        onClick={(e) => {
                          if (link.onClick) {
                            e.preventDefault();
                            link.onClick();
                          }
                          setOpen(false);
                        }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${
                          isActive 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border-l-4 border-l-blue-500' 
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        <div className={`relative transition-colors duration-200 ${
                          isActive ? 'text-blue-600 dark:text-blue-400' : ''
                        }`}>
                          {link.icon}
                          {link.badge !== undefined && link.badge !== null && Number(link.badge) > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] text-[10px] font-bold shadow-lg">
                              {Number(link.badge) > 99 ? '99+' : link.badge}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          isActive ? 'font-semibold' : ''
                        }`}>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <ErrorBoundary FallbackComponent={() => <UserProfileFallback open={true} />}>
                  <UserProfile open={true} />
                </ErrorBoundary>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0">
        {children}
      </main>
    </div>
  );
}