"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { adminAdvertisementsData } from "../../data/adminAdvertisementsData";
import GlobalLoader from "@/app/components/GlobalLoader";
import { Search } from "lucide-react";

export default function AdvertisementManagementPage() {
    // Default fallback data if import fails
    const fallbackData = {
        pageHeader: { title: "Advertisements", subtitle: "Manage your ad spaces" },
        searchPlaceholder: "Search ads...",
        filterOptions: [
            { label: "All Status", value: "all" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" }
        ],
        addButtonText: "Add Advertisement",
        modalConfig: {
            add: { title: "Add New Advertisement", submitButton: "Create Ad" },
            edit: { title: "Edit Advertisement", submitButton: "Update Ad" }
        }
    };

    const {
        pageHeader = fallbackData.pageHeader,
        searchPlaceholder = fallbackData.searchPlaceholder,
        addButtonText = fallbackData.addButtonText,
        modalConfig = fallbackData.modalConfig
    } = adminAdvertisementsData || {};

    // Client-side States
    const [allAdvertisements, setAllAdvertisements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all"); // 'all', 'active', 'inactive'
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
    const [selectedAd, setSelectedAd] = useState(null);

    const [totalUsers, setTotalUsers] = useState(0);


    // Fetch advertisements from API (Fetch ALL for client-filtering)
    const fetchAdvertisements = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/advertisements?limit=1000');
            const data = await response.json();
            if (data.success) {
                setAllAdvertisements(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch advertisements", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch total users for CTR calculation
    const fetchTotalUsers = async () => {
        try {
            const response = await fetch('/api/admin/dashboard/stats');
            const data = await response.json();
            if (data.success) {
                setTotalUsers(data.stats.totalActiveUsers || 0);
            }
        } catch (error) {
            console.error("Failed to fetch total users", error);
        }
    };

    useEffect(() => {
        fetchAdvertisements();
        fetchTotalUsers();
    }, []);

    // Helper to calculate CTR percentage based on total users
    const calculateCTR = (uniqueClicks) => {
        if (!totalUsers || totalUsers === 0) return 0;
        return Math.round((uniqueClicks / totalUsers) * 100);
    };

    // Derived: Filtered Ads
    const filteredAdvertisements = useMemo(() => {
        if (!allAdvertisements) return [];

        return allAdvertisements.filter(ad => {
            // 1. Tab Filter
            let matchesTab = true;
            if (activeTab === 'active') matchesTab = ad.isActive;
            else if (activeTab === 'inactive') matchesTab = !ad.isActive;

            if (!matchesTab) return false;

            // 2. Search Filter
            if (!searchQuery) return true;
            const lowerQuery = searchQuery.toLowerCase();
            return (
                ad.name.toLowerCase().includes(lowerQuery) ||
                ad.position.toLowerCase().includes(lowerQuery) ||
                (ad.link && ad.link.toLowerCase().includes(lowerQuery))
            );
        });
    }, [allAdvertisements, activeTab, searchQuery]);

    // Derived: Visible Ads (Pagination)
    const visibleAdvertisements = useMemo(() => {
        if (itemsPerPage === 'All') return filteredAdvertisements;
        return filteredAdvertisements.slice(0, itemsPerPage);
    }, [filteredAdvertisements, itemsPerPage]);

    // Derived: Counts for tabs
    const stats = useMemo(() => {
        return {
            all: allAdvertisements.length,
            active: allAdvertisements.filter(a => a.isActive).length,
            inactive: allAdvertisements.filter(a => !a.isActive).length
        };
    }, [allAdvertisements]);


    // Handle toggle switch
    const handleToggle = async (id) => {
        // Optimistic update
        const ad = allAdvertisements.find(a => a.id === id);
        if (!ad) return;

        try {
            const response = await fetch(`/api/admin/advertisements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !ad.isActive })
            });

            if (response.ok) {
                fetchAdvertisements();
            }
        } catch (error) {
            console.error("Failed to toggle status", error);
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this advertisement?")) return;
        try {
            const response = await fetch(`/api/admin/advertisements/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchAdvertisements();
            }
        } catch (error) {
            console.error("Failed to delete advertisement", error);
        }
    };

    // Handle add button click
    const handleAdd = () => {
        setModalMode("add");
        setSelectedAd(null);
        setIsModalOpen(true);
    };

    // Handle edit button click
    const handleEdit = (ad) => {
        setModalMode("edit");
        setSelectedAd(ad);
        setIsModalOpen(true);
    };

    // Handle add/update advertisement
    const handleSubmitAd = async (id, payload) => {
        try {
            let response;
            if (modalMode === "add") {
                response = await fetch('/api/admin/advertisements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`/api/admin/advertisements/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await response.json();
            if (data.success) {
                setIsModalOpen(false);
                setSelectedAd(null);
                fetchAdvertisements();
            } else {
                alert(data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Submit error", error);
            alert("An error occurred");
        }
    };

    // Get position badge color
    const getPositionColor = (position) => {
        const colors = {
            Left: "bg-yellow-100 text-yellow-700",
            Right: "bg-blue-100 text-blue-700",
            Top: "bg-purple-100 text-purple-700",
            Center: "bg-green-100 text-green-700",
            Bottom: "bg-gray-100 text-gray-700"
        };
        // Normalize position (Capitalized first letter)
        const key = position.charAt(0).toUpperCase() + position.slice(1);
        return colors[key] || "bg-gray-100 text-gray-700";
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
                    <p className="text-gray-500 mt-1">{pageHeader.subtitle}</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors"
                >
                    <span className="text-lg">+</span> {addButtonText}
                </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Controls Bar: Tabs, Rows, Search */}
                <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-100 gap-4">

                    {/* Tabs */}
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide w-full md:w-auto">
                        {[
                            { id: 'all', label: 'All Ads', count: stats.all },
                            { id: 'active', label: 'Active', count: stats.active },
                            { id: 'inactive', label: 'Inactive', count: stats.inactive }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-2 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab.id
                                    ? "text-[#C0934B]"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {tab.label}
                                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                    {tab.count}
                                </span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C0934B] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>

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
                    </div>
                </div>

                {/* Advertisement Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#CFA56B] text-white">
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap first:rounded-tl-none last:rounded-tr-none">Image</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Advertisement</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Position</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Details</th>
                                <th className="px-6 py-4 text-center text-sm font-medium whitespace-nowrap">CTR</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleAdvertisements.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? "No matching advertisements found." : "No advertisements found."}
                                    </td>
                                </tr>
                            ) : (
                                visibleAdvertisements.map((ad) => (
                                    <tr key={ad.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Image */}
                                        <td className="px-6 py-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative border border-gray-200">
                                                {ad.imageUrl ? (
                                                    <Image
                                                        src={ad.imageUrl}
                                                        alt={ad.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>

                                        {/* Name */}
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 text-sm max-w-[200px] truncate" title={ad.name}>
                                                {ad.name}
                                            </div>
                                        </td>

                                        {/* Position */}
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(ad.position)}`}>
                                                {ad.position}
                                            </span>
                                        </td>

                                        {/* Details */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-500 max-w-[150px] truncate" title={ad.imageFilename}>
                                                    {ad.imageFilename || '-'}
                                                </div>
                                                {ad.link && (
                                                    <a
                                                        href={ad.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-[#C0934B] hover:underline block max-w-[150px] truncate"
                                                        title={ad.link}
                                                    >
                                                        {ad.link}
                                                    </a>
                                                )}
                                            </div>
                                        </td>

                                        {/* CTR */}
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <CTRProgress percentage={calculateCTR(ad.uniqueClicks || 0)} />
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ad.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}>
                                                {ad.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => handleEdit(ad)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(ad.id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>

                                                {/* Toggle Switch */}
                                                <button
                                                    onClick={() => handleToggle(ad.id)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:ring-offset-2 ${ad.isActive ? "bg-green-500" : "bg-gray-300"
                                                        }`}
                                                    title={ad.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${ad.isActive ? "translate-x-5" : "translate-x-1"
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Advertisement Modal (Add/Edit) */}
            <AnimatePresence>
                {isModalOpen && (
                    <AdvertisementModal
                        mode={modalMode}
                        ad={selectedAd}
                        modalConfig={modalConfig}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedAd(null);
                        }}
                        onSubmit={handleSubmitAd}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// CTR Progress Component
function CTRProgress({ percentage }) {
    const radius = 14; // Smaller radius for table
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-10 h-10 flex items-center justify-center group cursor-default">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
                {/* Background Circle */}
                <circle
                    cx="20"
                    cy="20"
                    r={radius}
                    stroke="#E5E7EB"
                    strokeWidth="3"
                    fill="transparent"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="20"
                    cy="20"
                    r={radius}
                    stroke="#C0934B"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    strokeLinecap="round"
                />
            </svg>

            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-[#C0934B]">{percentage}%</span>
            </div>

            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                CTR: {percentage}%
            </div>
        </div>
    );
}

// Advertisement Modal Component (Add/Edit)
function AdvertisementModal({ mode, ad, modalConfig, onClose, onSubmit }) {
    const config = modalConfig[mode];

    const [formData, setFormData] = useState({
        id: ad?.id || null,
        name: ad?.name || "",
        position: ad?.position || "top", // lowercase to match API enum
        link: ad?.link || "",
        width: ad?.width || "",
        height: ad?.height || "",
        title: ad?.title || "",
        description: ad?.description || "",
        isActive: ad?.isActive !== undefined ? ad.isActive : true,
    });
    const [imagePreview, setImagePreview] = useState(ad?.imageUrl || null);
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Position options
    const positionOptions = [
        { label: "Top Banner (1600 x 300)px", value: "top", width: 1600, height: 300 },
        { label: "Left Banner (200 x 800)px", value: "left", width: 200, height: 800 },
        { label: "Right Banner (200 x 800)px", value: "right", width: 200, height: 800 },
        { label: "Center Hero (1200 x flexible)px", value: "center", width: 1200, height: 600 },
        { label: "Bottom Cards (400 x 300)px", value: "bottom", width: 400, height: 300 }
    ];

    // Auto-fill width/height on position change
    const handlePositionChange = (e) => {
        const selectedPosition = e.target.value;
        const positionData = positionOptions.find(opt => opt.value === selectedPosition);
        setFormData(prev => ({
            ...prev,
            position: selectedPosition,
            width: positionData?.width || "",
            height: positionData?.height || ""
        }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleImageDelete = () => {
        setImagePreview(null);
        setImageFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageGridfsId = ad?.imageGridfsId;
            let imageFilename = ad?.imageFilename;
            let imageContentType = ad?.imageContentType;
            let imageSize = ad?.imageSize;

            // Upload new image if selected
            if (imageFile) {
                const uploadData = new FormData();
                uploadData.append('file', imageFile);

                const uploadRes = await fetch('/api/admin/advertisements/upload', {
                    method: 'POST',
                    body: uploadData
                });
                const uploadResult = await uploadRes.json();

                if (!uploadResult.success) throw new Error(uploadResult.error);

                imageGridfsId = uploadResult.data.gridfsId;
                imageFilename = uploadResult.data.filename;
                imageContentType = uploadResult.data.contentType;
                imageSize = uploadResult.data.size;
            } else if (mode === 'add' && !imageGridfsId) {
                // Warning if adding new ad without image
                if (!confirm("Are you sure you want to create an ad without an image?")) {
                    setUploading(false);
                    return;
                }
            }

            const payload = {
                name: formData.name,
                position: formData.position,
                link: formData.link,
                title: formData.title,
                description: formData.description,
                width: Number(formData.width),
                height: Number(formData.height),
                isActive: formData.isActive,
                imageGridfsId,
                imageFilename,
                imageContentType,
                imageSize
            };

            await onSubmit(formData.id, payload);

        } catch (error) {
            console.error("Error submitting form", error);
            alert("Failed to save advertisement: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                data-lenis-prevent
                className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Image Upload/Preview */}
                    <div className={`relative border-2 border-dashed rounded-lg p-4 h-48 flex items-center justify-center bg-gray-50 transition-colors ${imagePreview ? 'border-[#C0934B]' : 'border-gray-300 hover:border-[#C0934B]'}`}>
                        {imagePreview ? (
                            <>
                                <img
                                    src={imagePreview}
                                    alt="Ad preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                                <button
                                    type="button"
                                    onClick={handleImageDelete}
                                    className="absolute bottom-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
                                <div className="text-gray-400 mb-2">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-gray-500 font-medium">Click to upload ad image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Name and Position Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm text-gray-600 mb-2 font-medium">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Position */}
                        <div>
                            <label className="block text-sm text-gray-600 mb-2 font-medium">Position</label>
                            <select
                                value={formData.position}
                                onChange={handlePositionChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent appearance-none bg-white"
                                required
                            >
                                {positionOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Link */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Link URL</label>
                        <input
                            type="url"
                            value={formData.link}
                            onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            placeholder="https://www.example.com"
                        />
                    </div>

                    {/* Title (optional) */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Title <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            placeholder="Ad headline"
                        />
                    </div>

                    {/* Description (optional) */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent resize-none"
                            placeholder="Brief description for internal reference"
                        />
                    </div>

                    {/* Active Status Checkbox */}
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="active-status"
                            checked={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-5 h-5 text-[#C0934B] border-gray-300 rounded focus:ring-[#C0934B] accent-[#C0934B] cursor-pointer"
                        />
                        <label htmlFor="active-status" className="text-sm text-gray-700 cursor-pointer select-none">Active immediately</label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Saving...' : config.submitButton}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
