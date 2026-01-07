"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function AdminProfilePage() {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/admin/auth/profile');
                const data = await res.json();

                if (data.success) {
                    setAdmin(data.admin);
                    // Update localStorage for other components if needed
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('adminData', JSON.stringify(data.admin));
                    }
                } else {
                    setError(data.message || "Failed to load profile");
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
                setError("Network error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const getRoleLabel = (role) => {
        if (!role) return "ADMIN";
        return role.replace(/[-_]/g, ' ').toUpperCase();
    };

    const fieldMapping = [
        { label: "Full Name", value: loading ? "Loading..." : (admin?.name || "N/A"), isBadge: false },
        { label: "Phone Number", value: loading ? "Loading..." : (admin?.mobile || "N/A"), isBadge: false },
        { label: "Email Address", value: loading ? "Loading..." : (admin?.email || "N/A"), isBadge: false },
        { label: "Role", value: loading ? "Loading..." : getRoleLabel(admin?.role), isBadge: true }
    ];

    if (loading) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-4xl p-8 bg-red-50 text-red-700 rounded-lg">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl">

            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
                    <p className="text-gray-600 text-sm mt-1">View and manage your account details</p>
                </div>
                <Link
                    href="/admin-dashboard/profile/edit"
                    className="px-6 py-2 bg-[#C19A5B] text-white rounded-md hover:bg-[#a8864f] transition-colors"
                >
                    Edit Profile
                </Link>
            </div>

            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-8">Personal Information</h3>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar Circle */}
                    <div className="w-32 h-32 bg-[#FFF8E1] rounded-lg flex items-center justify-center border border-[#FFE082] flex-shrink-0">
                        <span className="text-4xl text-[#C19A5B] font-bold">
                            {loading ? "..." : (admin?.name ? admin.name.charAt(0).toUpperCase() : "A")}
                        </span>
                    </div>

                    {/* Personal Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 flex-1">
                        {fieldMapping.map((field, index) => (
                            <div key={index} className="flex flex-col">
                                <span className="text-gray-500 text-sm mb-1">{field.label}</span>
                                {field.isBadge ? (
                                    <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full w-fit">
                                        {field.value}
                                    </span>
                                ) : (
                                    <span className="text-gray-900 font-medium text-lg">{field.value}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
