"use client";

import { useState, useEffect, useMemo } from "react";
import { IoAdd, IoEye, IoTrash } from "react-icons/io5";
import AddJobPopup from "../../components/admin/careers/AddJobPopup";
import ViewJobPopup from "../../components/admin/careers/ViewJobPopup";
import GlobalLoader from "@/app/components/GlobalLoader";
import { Search } from "lucide-react";

export default function CareersPage() {
    // Client-side States
    const [allJobs, setAllJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    // Static Config
    const pageHeader = { title: "Careers", subtitle: "Add the position available for applicants." };
    const searchPlaceholder = "Search positions...";
    const addButtonText = "Add Job";
    const filterOptions = [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" }
    ];

    // Fetch Jobs
    const fetchJobs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/careers');
            const data = await res.json();
            if (data.success) {
                // Normalize data structure if needed
                const mappedJobs = (data.data || []).map(job => ({
                    ...job,
                    // Ensure status is derived for filter if not present
                    status: job.isActive ? "active" : "inactive"
                }));
                setAllJobs(mappedJobs);
            }
        } catch (error) {
            console.error("Error fetching careers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    // Filter Logic
    const filteredJobs = useMemo(() => {
        if (!allJobs) return [];

        return allJobs.filter(job => {
            // 1. Status Filter
            if (statusFilter !== 'all') {
                const isActive = statusFilter === 'active';
                if (job.isActive !== isActive) return false;
            }

            // 2. Search Filter
            if (!searchQuery) return true;
            const lowerQuery = searchQuery.toLowerCase();
            return (
                (job.jobPosition || "").toLowerCase().includes(lowerQuery) ||
                (job.location || "").toLowerCase().includes(lowerQuery) ||
                (job.experience || "").toLowerCase().includes(lowerQuery)
            );
        });
    }, [allJobs, statusFilter, searchQuery]);

    // Pagination Logic
    const visibleJobs = useMemo(() => {
        if (itemsPerPage === 'All') return filteredJobs;
        return filteredJobs.slice(0, itemsPerPage);
    }, [filteredJobs, itemsPerPage]);

    // Add Job
    const handleAddJob = async (newJobData) => {
        try {
            const res = await fetch('/api/admin/careers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newJobData)
            });
            const data = await res.json();
            if (data.success) {
                fetchJobs(); // Refresh list to get new ID and data
                setIsAddModalOpen(false);
            } else {
                alert("Failed to add job: " + data.message);
            }
        } catch (error) {
            console.error("Error adding job:", error);
            alert("Error adding job");
        }
    };

    // Toggle Status
    const handleToggleStatus = async (id, currentStatus) => {
        // Optimistic update
        setAllJobs(prev => prev.map(job =>
            job._id === id ? { ...job, isActive: !currentStatus, status: !currentStatus ? "active" : "inactive" } : job
        ));

        try {
            const res = await fetch(`/api/admin/careers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            const data = await res.json();
            if (!data.success) {
                // Revert
                fetchJobs(); // Re-fetch to be safe
                alert("Failed to update status: " + data.message);
            }
        } catch (error) {
            // Revert
            fetchJobs();
            console.error("Error toggling status:", error);
        }
    };

    // Delete Job
    const handleDeleteJob = async (id) => {
        if (!window.confirm("Are you sure you want to delete this job position?")) return;

        // Optimistic update
        const previousJobs = [...allJobs];
        setAllJobs(prev => prev.filter(job => job._id !== id));

        try {
            const res = await fetch(`/api/admin/careers/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (!data.success) {
                setAllJobs(previousJobs); // Revert
                alert("Failed to delete job: " + data.message);
            }
        } catch (error) {
            setAllJobs(previousJobs); // Revert
            console.error("Error deleting job:", error);
            alert("Error deleting job");
        }
    };

    // View Job
    const handleViewJob = (job) => {
        setSelectedJob(job);
        setIsViewModalOpen(true);
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString("en-GB", options); // Matching user's preferred format
        } catch (e) {
            return dateString;
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
                    <p className="text-gray-500 text-sm mt-1">{pageHeader.subtitle}</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a57e3f] transition-colors shadow-sm text-sm font-medium"
                >
                    <IoAdd size={20} />
                    <span>{addButtonText}</span>
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

                {/* Job List Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#C9A25D] text-white">
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Job Position</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Locations</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Experience</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap">Posted On</th>
                                <th className="px-6 py-4 font-medium text-sm whitespace-nowrap text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {visibleJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                         {searchQuery ? "No matching positions found." : "No job positions found. Click \"Add Job\" to create one."}
                                    </td>
                                </tr>
                            ) : (
                                visibleJobs.map((job) => (
                                    <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-[#1E4032] font-medium text-sm">
                                            {job.jobPosition}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {job.location}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {job.experience}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {formatDate(job.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* View Button */}
                                                <button
                                                    onClick={() => handleViewJob(job)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] text-white rounded hover:bg-[#a57e3f] transition-colors"
                                                    title="View Details"
                                                >
                                                    <IoEye size={16} />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDeleteJob(job._id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-[#C0934B] text-white rounded hover:bg-[#a57e3f] transition-colors"
                                                    title="Delete Job"
                                                >
                                                    <IoTrash size={16} />
                                                </button>

                                                {/* Toggle Switch */}
                                                <button
                                                    onClick={() => handleToggleStatus(job._id, job.isActive)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C0934B] focus:ring-offset-2 ${job.isActive ? "bg-[#1E4032]" : "bg-gray-300"
                                                        }`}
                                                    title={job.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${job.isActive ? "translate-x-6" : "translate-x-1"
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

            {/* Modals */}
            <AddJobPopup
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddJob}
            />

            <ViewJobPopup
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                job={selectedJob}
            />
        </div>
    );
}
