"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import { dashboardData } from "../data/dashboardData";

export default function DashboardLayout({ children }) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if user is logged in
        const checkAuthStatus = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/user/auth/check', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.isLoggedIn) {
                        setIsLoggedIn(true);
                    } else {
                        // Not logged in, redirect to auth page
                        router.push('/auth');
                    }
                } else {
                    // API error, redirect to auth page
                    router.push('/auth');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/auth');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, [router]);

    // Don't render dashboard if not logged in
    if (!isLoggedIn) {
        return null; // Return null instead of Loader based on user request code
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                mobileOpen={mobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
            />
            <div className={`flex-1 flex flex-col ml-0 transition-all duration-300 overflow-x-hidden ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-6 w-full">
                    <div className="max-w-7xl mx-auto w-full">
                        <DashboardHeader
                            data={dashboardData.header}
                            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                        />
                    </div>
                </div>
                <div className="h-px bg-gray-200 w-full" />
                <main className="p-4 sm:p-6 lg:p-8 w-full">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
                <div className="w-full">
                    <Footer showInDashboard={true} />
                </div>
            </div>
        </div>
    );
}