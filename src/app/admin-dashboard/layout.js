"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";
import AdminNavbar from "../components/admin/AdminNavbar";
import GlobalLoader from "../components/GlobalLoader";

export default function AdminDashboardLayout({ children }) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Fetch admin profile to verify session and get role
                const response = await fetch('/api/admin/auth/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setUser(data.admin);
                    } else {
                        // For now redirecting to admin login, if validation fails
                        router.push('/auth/admin/login');
                    }
                } else {
                    router.push('/auth/admin/login');
                }
            } catch (error) {
                console.error("Auth check failed", error);
                router.push('/auth/admin/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <GlobalLoader />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminNavbar />
            <AdminSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                mobileOpen={mobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
                userRole={user.role}
                user={user}
            />
            <div className="flex pt-16 lg:pt-20 min-h-screen">
                <div className={`flex-1 flex flex-col ml-0 transition-all duration-300 overflow-x-hidden ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                    <div className="px-4 sm:px-6 lg:px-8 py-7 w-full">
                        <div className="max-w-7xl mx-auto w-full">
                            <AdminHeader
                                user={user}
                                onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            />
                        </div>
                    </div>
                    <div className="h-px bg-gray-200 w-full" />
                    <main className="p-4 sm:p-6 lg:p-8 w-full flex-1">
                        <div className="max-w-7xl mx-auto w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
