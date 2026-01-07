"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function EditArticlePage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [formData, setFormData] = useState({
        mainHeading: "",
        description: "",
        category: "",
        accessType: "withoutlogin",
        coverImage: null,
        coverFile: null
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);
    const searchParamsHook = useSearchParams();
    const type = searchParamsHook.get('type');
    const prodId = searchParamsHook.get('productId');

    const [updating, setUpdating] = useState(false);

    // Fetch article details
    useEffect(() => {
        const fetchArticle = async () => {
            try {
                let url = `/api/admin/articles/${id}`;
                if (type === 'product' && prodId) {
                    url = `/api/admin/products/${prodId}/articles/${id}`;
                }
                const response = await fetch(url);
                const data = await response.json();

                if (data.success && data.article) {
                    const article = data.article;
                    setFormData({
                        mainHeading: article.mainHeading || "",
                        description: article.description || "",
                        category: article.category || "",
                        accessType: article.accessType || "withoutlogin",
                        coverImage: article.coverImage || null
                    });
                    if (article.coverImage) {
                        setImagePreview(article.coverImage);
                    }
                } else {
                    alert("Article not found");
                    router.push('/admin-dashboard/articles');
                }
            } catch (error) {
                console.error("Error fetching article:", error);
                alert("Error fetching article details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchArticle();
        }
    }, [id, router, type, prodId]);

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle image upload
    const handleImageUpload = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData(prev => ({
                    ...prev,
                    coverImage: reader.result,
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
        setUpdating(true);

        try {
            let imageData = formData.coverImage; // Default to existing image (which might be null or object)

            // 1. Upload new image if selected
            // We differentiate by checking if coverFile is set. 
            // If coverFile is set, it means a new file was chosen.
            if (formData.coverFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', formData.coverFile);

                const uploadEndpoint = formData.accessType === 'login'
                    ? '/api/admin/products/upload-article-image'
                    : '/api/admin/articles/upload';

                uploadFormData.append('type', 'featured');

                const uploadRes = await fetch(uploadEndpoint, {
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

            // 2. Update Article
            const payload = {
                mainHeading: formData.mainHeading,
                description: formData.description,
                category: formData.category,
                accessType: formData.accessType,
                featuredImage: imageData, // Using consistent key 'featuredImage'
                coverImage: imageData // Sending both keys just in case, but backend looks for featuredImage
            };

            let updateUrl = `/api/admin/articles/${id}`;
            if (type === 'product' && prodId) {
                updateUrl = `/api/admin/products/${prodId}/articles/${id}`;
            }

            const response = await fetch(updateUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                alert("Article updated successfully");
                if (type === 'product' && prodId) {
                    router.push(`/admin-dashboard/product/${prodId}/articles`);
                } else {
                    router.push('/admin-dashboard/articles');
                }
            } else {
                alert(data.error || "Failed to update article");
            }

        } catch (error) {
            console.error("Update error:", error);
            alert("An error occurred while updating: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading article details...</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-4xl">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-bold text-[#1E4032]">Edit Article</h1>
                <p className="text-gray-500 mt-1">Update Article Details</p>
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

                    {/* Article Cover Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Article cover Image
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
                                            setFormData(prev => ({ ...prev, coverImage: null, coverFile: null }));
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

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={updating}
                            className="px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium disabled:opacity-50"
                        >
                            {updating ? 'Updating...' : 'Update Article'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (type === 'product' && prodId) {
                                    router.push(`/admin-dashboard/product/${prodId}/articles`);
                                } else {
                                    router.push('/admin-dashboard/articles');
                                }
                            }}
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
