"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import GlobalLoader from "../../../components/GlobalLoader";

export default function AdminEditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        password: "" // Optional: Only for updating
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/admin/auth/profile');
                const data = await res.json();
                if (data.success) {
                    setFormData(prev => ({
                        ...prev,
                        name: data.admin.name || "",
                        email: data.admin.email || "",
                        mobile: data.admin.mobile || ""
                    }));
                } else {
                    toast.error("Failed to load profile data");
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
                toast.error("Network error");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Prepare payload - only include password if it's set
            const payload = {
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile
            };
            if (formData.password) {
                payload.password = formData.password;
            }

            const res = await fetch('/api/admin/auth/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Profile updated successfully!");
                // Update local storage if used
                localStorage.setItem('adminData', JSON.stringify(data.admin));
                router.push("/admin-dashboard/profile");
            } else {
                toast.error(data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error("An error occurred while updating profile");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[80vh]" />;
    }

    return (
        <div className="w-full max-w-4xl">

            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                <p className="text-gray-600 text-sm mt-1">Update your personal information</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Name */}
                        <div className="md:col-span-2 flex flex-col">
                            <label className="text-gray-600 text-sm mb-2" htmlFor="name">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent"
                            />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col">
                            <label className="text-gray-600 text-sm mb-2" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent"
                            />
                        </div>

                        {/* Mobile */}
                        <div className="flex flex-col">
                            <label className="text-gray-600 text-sm mb-2" htmlFor="mobile">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                id="mobile"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent"
                            />
                        </div>

                        {/* Password */}
                        <div className="md:col-span-2 flex flex-col">
                            <label className="text-gray-600 text-sm mb-2" htmlFor="password">
                                New Password (Optional)
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Leave blank to keep current password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19A5B] focus:border-transparent"
                            />
                            <p className="text-xs text-gray-400 mt-1">Only enter a password if you want to change it.</p>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`px-6 py-2 bg-[#C19A5B] text-white rounded-md hover:bg-[#a8864f] transition-colors ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? "Saving..." : "Save Changes"}
                        </button>
                        <Link
                            href="/admin-dashboard/profile"
                            className="px-6 py-2 border border-[#C19A5B] text-[#C19A5B] rounded-md hover:bg-orange-50 transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
