"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { dashboardMenu } from "../data/dashboardMenu";
import { HiMenuAlt2, HiX, HiChevronLeft, HiChevronRight } from "react-icons/hi";

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState({
    firstName: "User",
    lastName: "",
    name: "",
    email: "",
  });

  useEffect(() => {
    // Fetch User Profile
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user/auth/profile');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || { firstName: "Admin", lastName: "", name: "Admin", email: "" });
        }
      } catch (err) {
        console.error("Failed to fetch sidebar user:", err);
      }
    };
    fetchUser();
  }, []);

  const getInitials = (first, last, fullName) => {
    if (fullName) {
      const parts = fullName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return fullName.charAt(0).toUpperCase();
    }
    return `${(first || "U").charAt(0)}${(last || "").charAt(0)}`.toUpperCase();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Call the logout API
      const response = await fetch("/api/user/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        // Clear any client-side user state if needed
        localStorage.removeItem("user"); // Remove if you store user data in localStorage

        // Redirect to login page or homepage
        router.push("/auth"); // Change this to your login route
        router.refresh(); // Refresh to clear any cached data
      } else {
        console.error("Logout failed:", data.message);
        // Optionally show an error message to the user
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("An error occurred during logout. Please try again.");
    } finally {
      setIsLoggingOut(false);
      if (setMobileOpen) setMobileOpen(false); // Close mobile sidebar if open
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/60 border-r border-gray-200 transition-all duration-300 ease-in-out transform
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
          w-64 flex flex-col top-16 h-[calc(100vh-4rem)] lg:top-20 lg:h-[calc(100vh-5rem)]
        `}
      >
        {/* Collapse Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-[#1E4032] shadow-sm z-50"
        >
          {isCollapsed ? <HiChevronRight size={16} /> : <HiChevronLeft size={16} />}
        </button>

        {/* User Profile Section */}
        <div className={`p-6 ${isCollapsed ? "px-2" : ""}`}>
          <div className={`flex items-center gap-3 mb-6 ${isCollapsed ? "justify-center" : ""}`}>
            <div className={`w-12 h-12 rounded-xl bg-[#FFF8DC] flex items-center justify-center text-[#C0934B] font-medium border border-[#C0934B]/20 shrink-0 ${isCollapsed ? "text-xl" : "text-2xl"}`}>
              {getInitials(user.firstName, user.lastName, user.name)}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex flex-col justify-center">
                <h3 className="text-base font-semibold text-[#1E4032] truncate leading-tight">
                  {user.name || `${user.firstName} ${user.lastName}` || "User"}
                </h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          <div className="h-px bg-gray-200 w-full" />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overscroll-contain overflow-x-hidden" data-lenis-prevent>
          {dashboardMenu.map((item) => {
            const isActive = item.path === '/user-dashboard'
              ? pathname === item.path
              : pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive
                  ? "bg-[#0B2B20] text-white"
                  : "text-[#1E4032] hover:bg-gray-50"
                  } ${isCollapsed ? "justify-center px-2" : ""}`}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.title : ""}
              >
                <div className="shrink-0">
                  <Image
                    src={item.source === 'assets' ? `/assets/${item.icon}` : `/assets/userDashboard/${item.icon}`}
                    alt={item.title}
                    width={20}
                    height={20}
                    className={`${isActive ? "brightness-0 invert" : ""}`}
                  />
                </div>
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 mt-auto border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-[#1E4032] hover:bg-gray-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isCollapsed ? "justify-center px-2" : ""
              }`}
            title={isCollapsed ? "Log out" : ""}
          >
            <div className="shrink-0">
              <Image
                src="/assets/userDashboard/logout.svg"
                alt="Logout"
                width={20}
                height={20}
              />
            </div>
            {!isCollapsed && (
              <span>
                {isLoggingOut ? "Logging out..." : "Log out"}
              </span>
            )}
          </button>
        </div>
      </aside >
    </>
  );
}