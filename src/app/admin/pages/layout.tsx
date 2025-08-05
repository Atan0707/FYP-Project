"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, 
  // Settings, 
  LogOut, FileText, Gavel, Shield, UserCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { adminLogout } from "../actions";

const Logo = () => {
  return (
    <Link
      href="/admin/pages/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border">
        <img 
          src="/logo1.png" 
          alt="WEMSP Admin Logo"
          className="h-full w-full object-contain"
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Admin Panel
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/admin/pages/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border">
        <img 
          src="/logo1.png" 
          alt="WEMSP Admin Logo"
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
  const [open, setOpen] = useState(true); // Default to open for admin
  const [isRootAdmin, setIsRootAdmin] = useState(false);

  useEffect(() => {
    // Check if current admin is root
    const checkIfRootAdmin = async () => {
      try {
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          setIsRootAdmin(data.admin.username === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkIfRootAdmin();
  }, []);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setOpen(true); // Keep open on desktop for admin
      } else {
        setOpen(false); // Close on mobile by default
      }
    };

    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const links = [
    {
      label: "Dashboard",
      href: "/admin/pages/dashboard",
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Users",
      href: "/admin/pages/users",
      icon: (
        <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Agreements",
      href: "/admin/pages/agreements",
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Assets Approval",
      href: "/admin/pages/assets-approval",
      icon: (
        <Gavel className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    // Only show Admin Management link for root admin
    ...(isRootAdmin ? [
      {
        label: "Admin Management",
        href: "/admin/pages/admin",
        icon: (
          <Shield className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
        ),
      }
    ] : []),
    {
      label: "Profile",
      href: "/admin/pages/profile",
      icon: (
        <UserCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => adminLogout(),
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              {open ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-2">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            <div>
              <SidebarLink
                link={{
                  label: "Admin",
                  href: "/admin/pages/profile",
                  icon: (
                    <div className="h-7 w-7 rounded-full bg-neutral-800 dark:bg-neutral-200" />
                  ),
                }}
              />
            </div>
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
              <div className="p-4">
                <Logo />
                <nav className="mt-8 flex flex-col gap-3">
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
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border-l-4 border-l-blue-500' 
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        <div className={`transition-colors duration-200 ${
                          isActive ? 'text-blue-600 dark:text-blue-400' : ''
                        }`}>
                          {link.icon}
                        </div>
                        <span className={`text-sm font-medium ${
                          isActive ? 'font-semibold' : ''
                        }`}>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
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