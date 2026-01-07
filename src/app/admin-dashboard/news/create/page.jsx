"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

export default function CreateNewsPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        mainHeading: "",
        description: "",
        category: "",
        newsType: "",
        isActive: true,
        isImportant: false,
        featuredImage: null, // Store metadata here if needed, or just rely on file
        coverFile: null // Store original file for upload
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Handle image upload preview
    const handleImageUpload = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData(prev => ({
                    ...prev,
                    coverFile: file
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle file input change
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    // Handle drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageData = null;

            // 1. Upload Image First if exists
            if (formData.coverFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', formData.coverFile);

                const uploadRes = await fetch('/api/admin/news/upload', {
                    method: 'POST',
                    body: uploadFormData
                });
                const uploadData = await uploadRes.json();

                if (!uploadData.success) {
                    throw new Error(uploadData.error || "Image upload failed");
                }

                imageData = {
                    filename: uploadData.filename,
                    contentType: uploadData.contentType,
                    size: uploadData.size,
                    gridfsId: uploadData.gridfsId
                };
            }

            // 2. Create News
            const payload = {
                mainHeading: formData.mainHeading,
                description: formData.description,
                category: formData.category,
                newsType: formData.newsType,
                isActive: formData.isActive,
                isImportant: formData.isImportant,
                featuredImage: imageData,
                sections: []
            };

            const response = await fetch('/api/admin/news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                toast.success("News created successfully!");
                router.push('/admin-dashboard/news');
            } else {
                toast.error(data.error || "Failed to create news");
            }

        } catch (error) {
            console.error("Create news error:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        router.push('/admin-dashboard/news');
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-4xl">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-bold text-[#1E4032]">Create New News</h1>
                <p className="text-gray-500 mt-1">Add New News</p>
            </div>

            {/* Form Container */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Main Heading */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Main Heading
                        </label>
                        <input
                            type="text"
                            name="mainHeading"
                            value={formData.mainHeading}
                            onChange={handleInputChange}
                            placeholder="Enter Main heading ...."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter description ...."
                            rows={4}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent resize-none"
                            required
                        />
                    </div>

                    {/* News Cover Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            News cover Image
                        </label>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${isDragging
                                ? 'border-[#C0934B] bg-[#C0934B]/5'
                                : 'border-gray-300 bg-gray-50'
                                }`}
                        >
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Cover preview"
                                        className="max-h-64 mx-auto rounded-lg object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreview(null);
                                            setFormData(prev => ({ ...prev, coverFile: null }));
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center">
                                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-sm text-gray-500">Click to upload or drag and drop</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                        </label>
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            placeholder="Enter your Category ...."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            required
                        />
                    </div>

                    {/* News Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            News Type
                        </label>
                        <div className="relative">
                            <select
                                name="newsType"
                                value={formData.newsType}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent appearance-none bg-white font-medium"
                            >
                                <option value="">Select News Type (Optional)</option>
                                <option value="Business & Entrepreneur Playbook">Business & Entrepreneur Playbook</option>
                                <option value="Economy & Policy Lens">Economy & Policy Lens</option>
                                <option value="Smart Money Habits">Smart Money Habits</option>
                            </select>
                            <svg
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Options: Active & Important */}
                    <div className="flex items-center gap-12 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:bg-[#C0934B] checked:border-[#C0934B] focus:outline-none transition-all"
                                />
                                <svg
                                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                >
                                    <path
                                        d="M10 3L4.5 8.5L2 6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                                Active (Visible to Public)
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    name="isImportant"
                                    checked={formData.isImportant}
                                    onChange={handleInputChange}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:bg-[#C0934B] checked:border-[#C0934B] focus:outline-none transition-all"
                                />
                                <svg
                                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                >
                                    <path
                                        d="M10 3L4.5 8.5L2 6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                                Important (One item only)
                            </span>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create News'}
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
