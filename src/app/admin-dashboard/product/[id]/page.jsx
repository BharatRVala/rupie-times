"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import CreateArticlePopup from "../../../components/admin/CreateArticlePopup";
import GlobalLoader from "../../../components/GlobalLoader";
import { IoRocketSharp, IoArrowBack } from "react-icons/io5";

export default function ProductArticlesPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id;

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [articles, setArticles] = useState([]);
    const [productName, setProductName] = useState("");
    const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [editingArticle, setEditingArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [globalDurations, setGlobalDurations] = useState([]);

    const searchPlaceholder = "Search articles...";
    const filterOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    // Fetch product details and articles
    const fetchData = async () => {
        if (!productId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);

            // Parallel fetch: Product articles AND global durations
            const [productRes, globalRes] = await Promise.all([
                fetch(`/api/admin/products/${productId}/articles`),
                fetch(`/api/admin/products?globalDurations=true`)
            ]);

            const data = await productRes.json();
            const globalData = await globalRes.json();

            if (data.success) {
                setProductName(data.product.heading);
                setCurrentProduct(data.product);

                // Map API articles to UI structure
                setArticles(data.articles.map(a => ({
                    id: a._id,
                    title: a.mainHeading,
                    subtitle: a.description,
                    category: a.category,
                    author: a.author || "Admin", // Fallback if author is missing
                    uploadDate: a.createdAt,
                    isActive: a.isActive,
                    status: a.isActive ? 'active' : 'inactive',
                    issueDate: a.issueDate,
                    issueEndDate: a.issueEndDate,
                    isFreeTrial: a.isFreeTrial,
                    // Include raw image data for editing reference if needed
                    coverImage: a.image
                })));
            } else {
                setError(data.error || 'Failed to fetch data');
            }

            if (globalData.success && globalData.durations) {
                const durations = globalData.durations.map(d => {
                    const formatDate = (dateStr) => {
                        const date = new Date(dateStr);
                        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    };
                    return {
                        issueDate: d.issueDate,
                        issueEndDate: d.issueEndDate,
                        label: `${formatDate(d.issueDate)} - ${formatDate(d.issueEndDate)}`
                    };
                });
                setGlobalDurations(durations);
            }

        } catch (err) {
            console.error(err);
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [productId]);

    // Filter articles based on search query and status filter
    const filteredArticles = articles.filter(article => {
        const matchesSearch = (
            (article.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (article.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (article.category?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (article.author?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        const matchesStatus = statusFilter === "all" || article.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handle toggle switch
    const handleToggle = async (id) => {
        // Find the article to toggle
        const article = articles.find(a => a.id === id);
        if (!article) return;

        // Optimistic Update
        const newStatus = !article.isActive;
        setArticles(prevArticles =>
            prevArticles.map(a =>
                a.id === id
                    ? {
                        ...a,
                        isActive: newStatus,
                        status: newStatus ? "active" : "inactive"
                    }
                    : a
            )
        );

        try {
            // API Call to update status
            await fetch(`/api/admin/products/${productId}/articles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newStatus })
            });
        } catch (error) {
            console.error("Toggle failed, reverting", error);
            // Revert on error could be implemented here
            fetchData();
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to delete this article?")) {
            // Optimistic
            setArticles(prevArticles => prevArticles.filter(article => article.id !== id));
            try {
                // Assuming DELETE endpoint aligns with standard layout
                // Since user didn't explicitly ask for delete fix, I'll stick to provided pattern or simple API call
                // But let's try to do it right if endpoint exists. 
                // Using generic delete or specific?
                // For now, keeping optimistic mainly as requested for "edit" fix.
                // If endpoint is needed:
                await fetch(`/api/admin/products/${productId}/articles/${id}`, { method: 'DELETE' });
            } catch (e) {
                console.error("Delete failed", e);
                fetchData();
            }
        }
    };

    const handleCreateArticle = async (articleData) => {
        console.log("handleCreateArticle received:", articleData); // DEBUG
        setLoading(true);
        try {
            let imageData = null;

            // 1. Upload Image (if provided and is a File)
            if (articleData.image instanceof File) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', articleData.image);

                const uploadRes = await fetch('/api/admin/products/upload-article-image', {
                    method: 'POST',
                    body: uploadFormData
                });

                const uploadResult = await uploadRes.json();

                if (!uploadResult.success) {
                    throw new Error(uploadResult.error || "Image upload failed");
                }

                imageData = {
                    filename: uploadResult.filename,
                    contentType: uploadResult.contentType,
                    size: uploadResult.size,
                    gridfsId: uploadResult.gridfsId
                };
            } else if (editingArticle && articleData.image) {
                // Keep existing image if not changed (and it's not a File)
                // Assuming initialData populates it
                imageData = articleData.image;
            }

            // Payload common fields
            const payload = {
                mainHeading: articleData.heading,
                description: articleData.description,
                category: articleData.category,
                category: articleData.category,
                image: imageData,
                issueDate: articleData.issueDate,
                issueEndDate: articleData.issueEndDate,
                isFreeTrial: articleData.isFreeTrial
                // isActive: true // Default true on create, preserve on edit
            };

            let response;
            if (editingArticle) {
                // UPDATE Existing Article
                response = await fetch(`/api/admin/products/${productId}/articles/${editingArticle.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // CREATE New Article
                payload.isActive = true;
                payload.sections = [];
                response = await fetch(`/api/admin/products/${productId}/articles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await response.json();

            if (data.success) {
                // Redirect immediately if creating a new article for better UX
                if (!editingArticle && data.article?._id) {
                    router.push(`/admin-dashboard/product/${productId}/sections/${data.article._id}`);
                    return; // Exit early as we are navigating away
                }

                await fetchData();
                setIsCreatePopupOpen(false);
                setEditingArticle(null);
            } else {
                alert(data.error || "Failed to save article");
            }

        } catch (err) {
            console.error("Error saving article:", err);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (article) => {
        setEditingArticle(article);
        setIsCreatePopupOpen(true);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    if (loading && !articles.length && !productName) return <GlobalLoader />;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>; // Keep UI loaded

    // Use fetched global durations
    const existingDurations = globalDurations;

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Back to Products"
                    >
                        <IoArrowBack className="text-xl text-[#1E4032]" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1E4032]">
                            Articles for <span className="text-[#C0934B]">{productName}</span>
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage articles for this product</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingArticle(null);
                        setIsCreatePopupOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New Article</span>
                </button>
            </div>

            {/* Search and Filter Section */}
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3">
                {/* Search Box */}
                <div className="relative w-full sm:w-44">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Filter Dropdown */}
                <div className="relative w-full sm:w-36">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent appearance-none bg-white cursor-pointer"
                    >
                        {filterOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Articles List */}
            <div className="flex flex-col gap-4">
                {filteredArticles.map((article) => (
                    <div
                        key={article.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="shrink-0 pt-1">
                                <IoRocketSharp className="text-[#C0934B] text-2xl" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {article.title}
                                </h3>

                                {/* Subtitle */}
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {article.subtitle}
                                </p>

                                {/* Meta Information */}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">Category:</span>
                                        <span>{article.category}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">By</span>
                                        <span>{article.author}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>{formatDate(article.uploadDate)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col items-end gap-3">
                                {/* Toggle Switch */}
                                <button
                                    onClick={() => handleToggle(article.id)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:ring-offset-2 ${article.isActive ? "bg-green-500" : "bg-gray-300"
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${article.isActive ? "translate-x-6" : "translate-x-1"
                                            }`}
                                    />
                                </button>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    {/* Plus Button */}
                                    <button
                                        onClick={() => router.push(`/admin-dashboard/product/${productId}/sections/${article.id}`)}
                                        className="w-9 h-9 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                        title="Add Sections"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>

                                    {/* View Button */}
                                    <button
                                        onClick={() => router.push(`/admin-dashboard/product/${productId}/view/${article.id}`)}
                                        className="w-9 h-9 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                        title="Preview Article"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                        onClick={() => handleEdit(article)}
                                        className="w-9 h-9 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                        title="Edit"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(article.id)}
                                        className="w-9 h-9 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                        title="Delete"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredArticles.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                        No articles found for this product.
                    </div>
                )}
            </div>

            {/* Create Article Popup */}
            <CreateArticlePopup
                isOpen={isCreatePopupOpen}
                onClose={() => {
                    setIsCreatePopupOpen(false);
                    setEditingArticle(null);
                }}
                productName={productName}
                initialData={editingArticle}
                onSubmit={handleCreateArticle}
                existingDurations={existingDurations}
            />
        </div>
    );
}
