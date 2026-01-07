"use client";

import Image from "next/image";
import Link from "next/link";

export default function AdminHeader({ user, onToggleSidebar }) {
    // Fallback to localStorage if user prop isn't provided (client-side only)
    let displayUser = user;
    if (typeof window !== 'undefined' && !displayUser) {
        try {
            const storedAdmin = localStorage.getItem('adminData');
            if (storedAdmin) {
                displayUser = JSON.parse(storedAdmin);
            }
        } catch (e) {
            console.error("Failed to parse admin data", e);
        }
    }

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full max-w-full">
            <div>
                <h1 className="text-2xl font-bold text-[#1E4032]">
                    Hello {displayUser?.name ? displayUser.name.split(' ')[0] : 'Admin'}
                </h1>
            </div>

            <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle Button */}
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-[#1E4032] hover:opacity-90 transition-opacity shadow-sm"
                    aria-label="Toggle Dashboard Menu"
                >
                    <Image
                        src="/assets/userDashboard/dashboard.svg"
                        alt="Menu"
                        width={20}
                        height={20}
                        className="brightness-0 invert"
                    />
                </button>

                {/* Settings and Bell Icons */}
                <div className="flex gap-3">
                    <Link
                        href="/admin-dashboard/settings"
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#C0934B] hover:opacity-90 transition-opacity shadow-sm"
                        aria-label="Settings"
                    >
                        <Image
                            src="/assets/setting.svg"
                            alt="Settings"
                            width={20}
                            height={20}
                            className="brightness-0 invert"
                        />
                    </Link>

                    <Link
                        href="/admin-dashboard/notifications"
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#C0934B] hover:opacity-90 transition-opacity shadow-sm"
                        aria-label="Notifications"
                    >
                        <Image
                            src="/assets/bell.svg"
                            alt="Notifications"
                            width={20}
                            height={20}
                            className="brightness-0 invert"
                        />
                    </Link>
                </div>
            </div>
        </div>
    );
}
