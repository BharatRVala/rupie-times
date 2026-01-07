"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminUsersData } from "../../../../data/adminUsersData";

export default function EditUserPage() {
    const params = useParams();
    const router = useRouter();
    const userId = parseInt(params.id);

    // Find the user by ID
    const user = adminUsersData.users.find(u => u.id === userId);

    // Form state
    const [formData, setFormData] = useState({
        fullName: user?.userName || "",
        mobile: user?.phone || "",
        email: user?.email || "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission logic here
        console.log("Form submitted:", formData);
        // Navigate back to user details
        router.push(`/admin-dashboard/users/${userId}`);
    };

    const handleCancel = () => {
        router.push(`/admin-dashboard/users/${userId}`);
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500">User not found</p>
                <button
                    onClick={() => router.push('/admin-dashboard/users')}
                    className="mt-4 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors"
                >
                    Back to Users
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl">
            {/* Page Title */}
            <h1 className="text-2xl font-bold text-[#1E4032]">Edit Profile</h1>

            {/* Form Card */}
            <div className="border border-gray-200 rounded-lg p-8 bg-white">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Full Name */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="fullName" className="text-sm text-gray-600">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="John doe"
                            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Mobile and Email Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Mobile */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="mobile" className="text-sm text-gray-600">
                                Mobile
                            </label>
                            <input
                                type="tel"
                                id="mobile"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleChange}
                                placeholder="9899153953"
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm text-gray-600">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="test@gmail.com"
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Password and Confirm Password Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Password */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="password" className="text-sm text-gray-600">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="confirmPassword" className="text-sm text-gray-600">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-2">
                        <button
                            type="submit"
                            className="px-6 py-3 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium"
                        >
                            Update Profile
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
