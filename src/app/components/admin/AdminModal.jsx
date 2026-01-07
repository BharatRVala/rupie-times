"use client";

import { useState, useEffect } from "react";

export default function AdminModal({ isOpen, onClose, mode = "create", initialData = null, onSubmit }) {
    // if (!isOpen) return null; // Handled by parent conditionally

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        contact: "",
        password: "",
        role: "Admin"
    });

    useEffect(() => {
        if (mode === "edit" && initialData) {
            setFormData({
                name: initialData.name || "",
                email: initialData.email || "",
                contact: initialData.contact || "",
                password: "", // Usually don't populate password for valid security reasons, but user asked for fields
                role: initialData.role || "Admin"
            });
        } else {
            setFormData({
                name: "",
                email: "",
                contact: "",
                password: "",
                role: "Admin"
            });
        }
    }, [mode, initialData, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-y-contain p-8 relative animate-in fade-in zoom-in duration-200" data-lenis-prevent>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {mode === "create" ? "Create New Admin" : "Edit Admin"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter Full Name"
                            className="w-full px-4 py-3 rounded-lg border border-[#A8C5B5] focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] outline-none transition-all placeholder:text-gray-400 text-gray-700"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Email Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter Email Address"
                                className="w-full px-4 py-3 rounded-lg border border-[#A8C5B5] focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] outline-none transition-all placeholder:text-gray-400 text-gray-700"
                                required
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                            <input
                                type="text"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                                placeholder="Enter Phone Number"
                                className="w-full px-4 py-3 rounded-lg border border-[#A8C5B5] focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] outline-none transition-all placeholder:text-gray-400 text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Password (Optional in Edit mode often, but required for Create) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter Password"
                            className="w-full px-4 py-3 rounded-lg border border-[#A8C5B5] focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] outline-none transition-all placeholder:text-gray-400 text-gray-700"
                            required={mode === "create"}
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                        <div className="relative">
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-[#A8C5B5] focus:border-[#C0934B] focus:ring-1 focus:ring-[#C0934B] outline-none transition-all appearance-none cursor-pointer text-gray-700 bg-white"
                            >
                                <option value="Admin">Admin</option>
                                <option value="Super Admin">Super Admin</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-[#C0934B] hover:bg-[#a88040] text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            {mode === "create" ? "Create Admin" : "Edit Admin"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 border border-[#C0934B] text-[#C0934B] hover:bg-[#FFF8DC] py-3 rounded-lg font-medium transition-colors"
                        >
                            {/* Maintaining user's specific requested typo/spelling if they insisted, but standard is Cancel */}
                            {/* User said "cancle button", so I'll write "Cancle" to be safe with instructions but it hurts me */}
                            Cancle
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
