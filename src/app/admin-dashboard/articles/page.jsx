"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { adminArticlesData } from "../../data/adminArticlesData";
import { IoRocketSharp } from "react-icons/io5";
import GlobalLoader from "@/app/components/GlobalLoader";
import { Search } from "lucide-react";

export default function ArticlesManagementPage() {
    const router = useRouter();
    
    // Client-side States
    const [allArticles, setAllArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { pageHeader, searchPlaceholder, filterOptions, addButtonText } = adminArticlesData;

    // Fetch All Articles
    const fetchArticles = async () => {
        setLoading(true);
        try {
            // Fetch all records for client-side filtering
            const params = new URLSearchParams({
                limit: 10000 
            });
            const response = await fetch(`/api/admin/articles?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                const mappedArticles = data.articles.map(article => ({
                    id: article._id,
                    title: article.mainHeading,
                    subtitle: article.description,
                    category: article.category,
                    author: article.author || 'Admin',
                    uploadDate: article.createdAt,
                    isActive: article.isActive,
                    // Normalized for filter
                    status: article.isActive ? "active" : "inactive" 
                }));
                setAllArticles(mappedArticles);
            }
        } catch (error) {
            console.error("Failed to fetch articles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    // Filter Logic
    const filteredArticles = useMemo(() => {
        if (!allArticles) return [];

        return allArticles.filter(article => {
            // 1. Status Filter
            if (statusFilter !== 'all') {
                const isActive = statusFilter === 'active';
                if (article.isActive !== isActive) return false;
            }

            // 2. Search Filter
            if (!searchQuery) return true;
            const lowerQuery = searchQuery.toLowerCase();
            return (
                article.title?.toLowerCase().includes(lowerQuery) ||
                article.subtitle?.toLowerCase().includes(lowerQuery) ||
                article.category?.toLowerCase().includes(lowerQuery) ||
                article.author?.toLowerCase().includes(lowerQuery)
            );
        });
    }, [allArticles, statusFilter, searchQuery]);

    // Pagination Logic
    const visibleArticles = useMemo(() => {
        if (itemsPerPage === 'All') return filteredArticles;
        return filteredArticles.slice(0, itemsPerPage);
    }, [filteredArticles, itemsPerPage]);

    // Handle toggle switch
    const handleToggle = async (id) => {
        const article = allArticles.find(a => a.id === id);
        if (!article) return;

        const newStatus = !article.isActive;

        // Optimistic update
        setAllArticles(prev => prev.map(a => a.id === id ? { ...a, isActive: newStatus, status: newStatus ? "active" : "inactive" } : a));

        try {
            const response = await fetch(`/api/admin/articles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newStatus })
            });

            if (!response.ok) {
                // Revert on failure
                fetchArticles();
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Toggle error:", error);
            fetchArticles();
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this article?")) return;

        // Optimistic update
        const previousArticles = [...allArticles];
        setAllArticles(prev => prev.filter(a => a.id !== id));

        try {
            const response = await fetch(`/api/admin/articles/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (!data.success) {
                setAllArticles(previousArticles);
                alert(data.message || "Failed to delete article");
            }
        } catch (error) {
            console.error("Delete error:", error);
            setAllArticles(previousArticles);
            alert("An error occurred while deleting");
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E4032]">{pageHeader.title}</h1>
                </div>
                <button
                    onClick={() => router.push('/admin-dashboard/articles/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors"
                >
                    <span className="text-lg">+</span> {addButtonText}
                </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Controls Bar: Items Per Page, Search, Filter */}
                <div className="flex flex-col md:flex-row justify-end items-center p-4 border-b border-gray-100 gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        
                         {/* Rows Per Page */}
                         <div className="relative">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                                className="appearance-none px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] bg-white cursor-pointer text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] transition-colors text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>

                         {/* Filter Dropdown */}
                         <div className="relative w-full sm:w-40">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] appearance-none bg-white cursor-pointer text-sm"
                            >
                                {filterOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Articles List */}
                <div className="flex flex-col divide-y divide-gray-100">
                    {visibleArticles.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                             {searchQuery ? "No matching articles found." : "No articles found."}
                        </div>
                    ) : (
                        visibleArticles.map((article) => (
                            <div
                                key={article.id}
                                className="p-4 hover:bg-gray-50/50 transition-colors"
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
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{article.category}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">By</span>
                                                <span>{article.author}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{formatDate(article.uploadDate)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col items-end gap-3 ml-4">
                                        {/* Toggle Switch */}
                                        <button
                                            onClick={() => handleToggle(article.id)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:ring-offset-2 ${article.isActive ? "bg-green-500" : "bg-gray-300"
                                                }`}
                                            title={article.isActive ? "Deactivate" : "Activate"}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${article.isActive ? "translate-x-6" : "translate-x-1"
                                                    }`}
                                            />
                                        </button>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            {/* Plus Button - Create Sections */}
                                            <button
                                                onClick={() => router.push(`/admin-dashboard/articles/sections/${article.id}`)}
                                                className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                title="Add Sections"
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>

                                            {/* View Button */}
                                            <button
                                                onClick={() => router.push(`/admin-dashboard/articles/view/${article.id}`)}
                                                className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                title="View Article"
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>

                                            {/* Edit Button */}
                                            <button
                                                onClick={() => router.push(`/admin-dashboard/articles/edit/${article.id}`)}
                                                className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(article.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
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
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
