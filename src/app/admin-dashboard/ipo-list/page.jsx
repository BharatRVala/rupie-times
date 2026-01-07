"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { adminIPOData } from "../../data/adminIPOData";
import { motion, AnimatePresence } from "framer-motion";
import GlobalLoader from "@/app/components/GlobalLoader";
import { Search } from "lucide-react";

export default function IPOManagementPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [ipos, setIpos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
    const [selectedIPO, setSelectedIPO] = useState(null);

    const { pageHeader, searchPlaceholder, addButtonText, modalConfig } = adminIPOData;

    // Fetch All IPOs
    const fetchIPOs = async () => {
        setLoading(true);
        try {
            // Fetch all records by setting a large limit
            const params = new URLSearchParams({
                limit: 10000, 
            });

            const response = await fetch(`/api/admin/ipos?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setIpos(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch IPOs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchIPOs();
    }, []);

    // Filter and Slice Data
    const filteredIPOs = useMemo(() => {
        if (!searchQuery) return ipos;
        const lowerQuery = searchQuery.toLowerCase();
        return ipos.filter(ipo => 
            (ipo.company && ipo.company.toLowerCase().includes(lowerQuery)) ||
            (ipo.issuePrice && ipo.issuePrice.toLowerCase().includes(lowerQuery))
        );
    }, [ipos, searchQuery]);

    const visibleIPOs = useMemo(() => {
        if (itemsPerPage === 'All') return filteredIPOs;
        return filteredIPOs.slice(0, itemsPerPage);
    }, [filteredIPOs, itemsPerPage]);


    // Handle add button click
    const handleAdd = () => {
        setModalMode("add");
        setSelectedIPO(null);
        setIsModalOpen(true);
    };

    // Handle edit button click
    const handleEdit = (ipo) => {
        setModalMode("edit");
        setSelectedIPO(ipo);
        setIsModalOpen(true);
    };

    // Handle delete button click
    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this IPO?")) return;

        try {
            const response = await fetch(`/api/admin/ipos/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                // Remove from local state to avoid refetch
                setIpos(prev => prev.filter(item => item._id !== id));
            } else {
                alert(data.message || "Failed to delete IPO");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("An error occurred while deleting");
        }
    };

    // Handle add/update IPO
    const handleSubmitIPO = async (ipoData) => {
        try {
            const url = modalMode === "add"
                ? '/api/admin/ipos'
                : `/api/admin/ipos/${ipoData.id}`;

            const method = modalMode === "add" ? 'POST' : 'PUT';

            // Format dates for API
            const payload = {
                company: ipoData.companyName,
                openingDate: ipoData.openingDate,
                closingDate: ipoData.closingDate,
                issuePrice: ipoData.issuePrice,
                link: ipoData.link
            };

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                setIsModalOpen(false);
                setSelectedIPO(null);
                fetchIPOs(); // Refetch to ensure sync/sorting
            } else {
                alert(data.message || "Failed to save IPO");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("An error occurred while saving");
        }
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
                {/* Controls Bar: Rows, Search */}
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
                    </div>
                </div>

                {/* IPO Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                         <thead>
                            <tr className="bg-[#CFA56B] text-white">
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap first:rounded-tl-none last:rounded-tr-none">Company</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Opening Date</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Closing Date</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Issue Price</th>
                                <th className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-gray-100">
                             {visibleIPOs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? "No matching IPOs found." : "No IPOs found."}
                                    </td>
                                </tr>
                             ) : (
                                visibleIPOs.map((ipo) => (
                                    <tr key={ipo._id || ipo.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Company Name */}
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 text-sm max-w-[200px] truncate" title={ipo.company}>
                                                {ipo.company}
                                            </div>
                                        </td>

                                        {/* Opening Date */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {formatDate(ipo.openingDate)}
                                            </div>
                                        </td>

                                        {/* Closing Date */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {formatDate(ipo.closingDate)}
                                            </div>
                                        </td>

                                        {/* Issue Price */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 truncate" title={ipo.issuePrice}>
                                                {ipo.issuePrice}
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => handleEdit({
                                                        id: ipo._id,
                                                        companyName: ipo.company,
                                                        openingDate: ipo.openingDate,
                                                        closingDate: ipo.closingDate,
                                                        issuePrice: ipo.issuePrice,
                                                        link: ipo.link
                                                    })}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(ipo._id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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

            {/* IPO Modal (Add/Edit) */}
            <AnimatePresence>
                {isModalOpen && (
                    <IPOModal
                        mode={modalMode}
                        ipo={selectedIPO}
                        modalConfig={modalConfig}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedIPO(null);
                        }}
                        onSubmit={handleSubmitIPO}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '-';
    // Ensure date is parsed correctly regardless of timezone
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// IPO Modal Component (Add/Edit)
function IPOModal({ mode, ipo, modalConfig, onClose, onSubmit }) {
    const config = modalConfig[mode]; // Get config for current mode (add or edit)

    const [formData, setFormData] = useState({
        id: ipo?.id || null,
        companyName: ipo?.companyName || "",
        openingDate: ipo?.openingDate ? new Date(ipo.openingDate).toISOString().split('T')[0] : "",
        closingDate: ipo?.closingDate ? new Date(ipo.closingDate).toISOString().split('T')[0] : "",
        issuePrice: ipo?.issuePrice || "",
        link: ipo?.link || ""
    });

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
                    {/* Company Name */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Company Name</label>
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            placeholder="Enter Company Name"
                            required
                        />
                    </div>

                    {/* Opening Date and Closing Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Opening Date */}
                        <div>
                            <label className="block text-sm text-gray-600 mb-2 font-medium">Opening Date</label>
                            <input
                                type="date"
                                value={formData.openingDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, openingDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Closing Date */}
                        <div>
                            <label className="block text-sm text-gray-600 mb-2 font-medium">Closing Date</label>
                            <input
                                type="date"
                                value={formData.closingDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, closingDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Issue Price */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Issue Price</label>
                        <input
                            type="text"
                            value={formData.issuePrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, issuePrice: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            placeholder="e.g., ₹ 48-52"
                            required
                        />
                    </div>

                    {/* Link */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">External Link <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                            type="url"
                            value={formData.link}
                            onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:border-transparent"
                            placeholder="https://example.com"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors font-medium"
                        >
                            {config.submitButton}
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
