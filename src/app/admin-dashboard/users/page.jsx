"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function AdminUsersPage() {
    const [activeTab, setActiveTab] = useState("active");
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]); // Renamed from allUsers to users (current page)
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [stats, setStats] = useState({
        totalActiveUsers: 0,
        totalDeletedUsers: 0,
        subscriptionStats: {
            active: 0,
            expiringSoon: 0,
            expired: 0
        }
    });

    // Add User State
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [addUserFormData, setAddUserFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        password: ""
    });

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1); // Reset to page 1 on search
            fetchUsers();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch on Tab/Page/Limit change
    useEffect(() => {
        // We don't want to trigger double fetch if search changes (handled above)
        // But we need to fetch if these change
        fetchUsers();
    }, [activeTab, currentPage, itemsPerPage]);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/dashboard/stats', { cache: 'no-store' });
            const data = await response.json();
            if (data.success) {
                setStats({
                    totalActiveUsers: data.stats.totalActiveUsers,
                    totalDeletedUsers: data.stats.totalDeletedUsers,
                    subscriptionStats: data.subscriptionStats || { active: 0, expiringSoon: 0, expired: 0 }
                });
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        }
    };

    // Initial Stats Fetch
    useEffect(() => {
        fetchStats();
    }, []);

    const handleAddUserChange = (e) => {
        const { name, value } = e.target;
        setAddUserFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addUserFormData)
            });
            const data = await response.json();

            if (data.success) {
                alert("User created successfully!");
                setIsAddUserModalOpen(false);
                setAddUserFormData({ name: "", email: "", mobile: "", password: "" });
                fetchUsers();
                fetchStats();
            } else {
                alert(data.error || "Failed to create user");
            }
        } catch (error) {
            console.error("Create user error:", error);
            alert("An error occurred while creating user");
        }
    };

    // Server-Side Fetch
    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Map tab ID to API status param
            let statusParam = activeTab;
            if (activeTab === 'active') statusParam = 'active'; // or 'unified' if you want backend to filter

            // NOTE: The current backend API has specific handling for 'active', 'deleted', 'unified', etc.
            // If activeTab is 'active', we want strictly active users.
            // If activeTab is 'deleted', we want deleted users.
            // However, the backend 'unified' logic complicates things if we mix them.
            // Let's stick to passing the activeTab as 'status' since backend handles:
            // 'active', 'deleted', 'subscription_active', etc.

            // Special case: optimize "All" view if it existed, but here we have specific tabs.

            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage === 'All' ? 10000 : itemsPerPage,
                status: activeTab,
                search: searchQuery
            });

            const response = await fetch(`/api/admin/users?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setUsers(data.users);
                if (data.pagination) {
                    setTotalPages(data.pagination.pages);
                    setTotalUsers(data.pagination.total);
                }
            } else {
                setUsers([]); // fallback
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle delete user
    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                fetchUsers();
                fetchStats();
            } else {
                alert(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("An error occurred while deleting");
        }
    };

    // Update Export to fetch ALL for current filter
    const handleExportCSV = async () => {
        try {
            // Fetch all matching users for export
            const params = new URLSearchParams({
                limit: 10000,
                status: activeTab,
                search: searchQuery
            });

            const response = await fetch(`/api/admin/users?${params.toString()}`);
            const data = await response.json();

            if (data.success && data.users.length > 0) {
                const headers = ['S.No', 'Name', 'Email', 'Mobile', 'Joined Date', 'Status'];
                const rows = data.users.map((user, index) => [
                    index + 1,
                    `"${user.userName || user.firstName || ''}"`,
                    `"${user.email || ''}"`,
                    `"${user.phone || ''}"`,
                    `"${user.joinedDate || ''}"`,
                    `"${user.status || ''}"`
                ]);

                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `users_export_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("No users found to export");
            }
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export CSV");
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Use stats from API directly for tabs
    const tabCounts = {
        active: stats.totalActiveUsers,
        deleted: stats.totalDeletedUsers,
        subscription_active: stats.subscriptionStats.active,
        subscription_expiresoon: stats.subscriptionStats.expiringSoon,
        subscription_expired: stats.subscriptionStats.expired
    };

    return (
        <div className="w-full space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All User List</h1>
                    <p className="text-gray-500 mt-1">Manage user access and details</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#C0934B] text-[#C0934B] rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        <span>Add User</span>
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors text-sm font-medium">
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs & Filters Control Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-100 gap-4">
                    {/* Tabs */}
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide w-full md:w-auto">
                        {[
                            { id: 'active', label: 'Active User' },
                            { id: 'deleted', label: 'Deleted User' },
                            { id: 'subscription_active', label: 'Subscription Active' },
                            { id: 'subscription_expiresoon', label: 'Expires Soon' },
                            { id: 'subscription_expired', label: 'Expired' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                                className={`pb-2 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab.id
                                    ? "text-[#C0934B]"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {tab.label}
                                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                    {tabCounts[tab.id] || 0}
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
                                onChange={(e) => { setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value)); setCurrentPage(1); }}
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
                                placeholder="Search user..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] transition-colors text-sm"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#CFA56B] text-white">
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap first:rounded-tl-none last:rounded-tr-none">User</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Contact</th>
                                <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Joined Date</th>
                                {activeTab === 'active' && <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Progress</th>}
                                {(activeTab.startsWith('subscription')) && <th className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap">Status</th>}
                                <th className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex justify-center"><GlobalLoader fullScreen={false} /></div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        {searchQuery ? "No matching users found." : "No users found."}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* User Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#faeccd] flex items-center justify-center text-[#C0934B] font-semibold text-lg flex-shrink-0">
                                                    {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">{user.userName}</div>
                                                    <div className="text-xs text-gray-500">{user.role}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact Column */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            <div className="text-xs text-gray-500">{user.phone}</div>
                                        </td>

                                        {/* Joined Column */}
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.joinedDate}
                                        </td>

                                        {/* Progress Column (Only Active Users Tab) */}
                                        {activeTab === 'active' && (
                                            <td className="px-6 py-4">
                                                <div className="scale-75 origin-left">
                                                    <ProgressCup percentage={user.progress} />
                                                </div>
                                            </td>
                                        )}

                                        {/* Subscription Status Badge Column (Only Subscription Tabs) */}
                                        {(activeTab.startsWith('subscription')) && (
                                            <td className="px-6 py-4">
                                                {user.subscriptionStatus === 'active' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                )}
                                                {user.subscriptionStatus === 'expiresoon' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                        Expires Soon
                                                    </span>
                                                )}
                                                {user.subscriptionStatus === 'expired' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Expired
                                                    </span>
                                                )}
                                            </td>
                                        )}

                                        {/* Action Column */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link href={`/admin-dashboard/users/${user.id}`}>
                                                    <button className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm" title="View">
                                                        <Image src="/assets/eye.svg" alt="View" width={16} height={16} className="brightness-0 invert" />
                                                    </button>
                                                </Link>
                                                {activeTab === 'active' && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-[#C0934B] hover:bg-[#a17a3e] rounded-md transition-colors shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <Image src="/assets/delete.svg" alt="Delete" width={16} height={16} className="brightness-0 invert" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {itemsPerPage !== 'All' && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Previous
                            </button>

                            {/* Simple Page Numbers (can be enhanced) */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show window of pages centered on current
                                let p = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    p = currentPage - 3 + i;
                                }
                                if (p > totalPages) return null;
                                // Simple fallback for now

                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${currentPage === p
                                                ? "bg-[#C0934B] text-white"
                                                : "hover:bg-gray-50 text-gray-700"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddUserModalOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10"
                    >
                        <button
                            onClick={() => setIsAddUserModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-semibold text-[#1E4032] mb-6">Add New User</h3>

                        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm text-gray-600 mb-2 block">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={addUserFormData.name}
                                    onChange={handleAddUserChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-[#C0934B] focus:border-[#C0934B]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 mb-2 block">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={addUserFormData.email}
                                    onChange={handleAddUserChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-[#C0934B] focus:border-[#C0934B]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 mb-2 block">Phone Number</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={addUserFormData.mobile}
                                    onChange={handleAddUserChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-[#C0934B] focus:border-[#C0934B]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 mb-2 block">Password</label>
                                <input
                                    type="text"
                                    name="password"
                                    value={addUserFormData.password}
                                    onChange={handleAddUserChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-[#C0934B] focus:border-[#C0934B]"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button type="submit" className="flex-1 px-6 py-2.5 bg-[#C0934B] text-white rounded-lg hover:bg-[#a17a3e] transition-colors">
                                    Create User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAddUserModalOpen(false)}
                                    className="flex-1 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

// Reusable Circular Progress Component (Cup)
function ProgressCup({ percentage }) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-12 h-12 flex items-center justify-center group cursor-pointer">
            <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="#E5E7EB"
                    strokeWidth="2"
                    fill="transparent"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="#C0934B"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    strokeLinecap="round"
                />
            </svg>

            {/* Cup Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                <Image
                    src="/assets/userDashboard/win.svg"
                    alt="Achievement"
                    width={18}
                    height={18}
                />
            </div>

            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {percentage}%
            </div>
        </div>
    );
}
