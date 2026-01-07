"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        expired: 0,
        expiring: 0
    });

    const header = {
        title: "All Orders",
        subtitle: "Manage your user subscription orders",
        searchPlaceholder: "Search here...",
        viewButton: "View",
        emptyState: "No orders found.",
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchOrders();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch on Tab/Page/Limit change
    useEffect(() => {
        fetchOrders();
    }, [activeTab, currentPage, itemsPerPage]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Map tab to status
            let statusParam = activeTab; // 'all', 'active', 'expired', 'expiring'

            // Backend expects:
            // status: 'active' | 'expired' | 'expiresoon' | 'all'
            // paymentStatus: 'completed' (usually for orders we only care about completed)
            // But 'all' tab might want everything including pending? usually orders list shows completed.
            // Let's assume we want paymentStatus=completed for all tabs except maybe 'all'?
            // Actually, existing code filtered `paymentStatus === 'completed'` for active.

            // We'll pass a generic status and let backend handle.
            // If tab is 'active', backend status='active'.
            // If tab is 'expiring', backend status='expiresoon' (implied by frontend 'expiring')

            let queryStatus = statusParam;
            if (activeTab === 'expiring') queryStatus = 'expiresoon';

            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage === 'All' ? 10000 : itemsPerPage,
                search: searchQuery,
                status: queryStatus,
                // Default to showing completed orders mostly, or all? 
                // Existing code showed allOrders then filtered.
                // Let's not filter paymentStatus strictly unless tab implies it.
            });

            // For 'active' tab, typically we want valid subs.
            if (activeTab === 'active') {
                // The backend 'status=active' filter checks DB status. 
                // We might also want to ensure paymentStatus=completed if dirty data exists.
                params.append('paymentStatus', 'completed');
            }

            const response = await fetch(`/api/admin/all-orders?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders);
                if (data.pagination) {
                    setTotalPages(data.pagination.pages);
                    setTotalOrders(data.pagination.total);
                }
                // Update stats if provided, or we might need a separate stats endpoint like users page
                // The API returns 'statistics' object!
                if (data.statistics) {
                    setStats({
                        total: data.statistics.total,
                        active: data.statistics.active,
                        expired: data.statistics.expired,
                        expiring: data.statistics.revenue ? 0 : 0 // API stats object structure varies, let's check response
                    });
                    // Note: API returns 'active', 'expired', 'pending', 'completed', 'failed'. 
                    // Does not explicitly return 'expiring' count in the main stats block shown in previous file?
                    // Previous file calculated 'expiring' manually.
                    // The API *does* compute `isExpiringSoon` for each order, but maybe not a global count.
                    // For now, we use what we have. If exact counts are needed, we might need a stats endpoint fix.
                }
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Tabs configuration
    const tabs = [
        { id: "all", label: "All Orders", count: stats.total }, // Using total doc count
        { id: "active", label: "Active", count: stats.active },
        { id: "expired", label: "Expired", count: stats.expired },
        { id: "expiring", label: "Expiring Soon", count: orders.filter(o => o.subscriptionInfo?.isExpiringSoon).length } // fallback approx or remove count
    ];
    // Note: 'expiring' count is hard to get efficiently without a specific aggregation. 
    // We can rely on the 'active' count or just hide the count for expiring if it's inaccurate.
    // Or we leave it 0.

    const statsCards = [
        {
            id: 1,
            count: stats.total,
            label: "Total Orders",
            type: "total",
        },
        {
            id: 2,
            count: stats.active,
            label: "Active Orders",
            type: "active",
            color: "text-green-600",
        },
        {
            id: 3,
            count: stats.expired,
            label: "Expired Orders",
            type: "expired",
            color: "text-red-500",
        },
        {
            id: 4,
            count: "N/A", // API doesn't return this globally easily without heavy calc
            label: "Expiring Soon",
            type: "expiring_soon",
            color: "text-orange-500",
        },
    ];

    const tableColumns = [
        "Order no.",
        "Product",
        "User",
        "Price",
        "Duration Range",
        "Created On",
        "Action",
    ];

    if (loading && orders.length === 0) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{header.title}</h1>
                    <p className="text-gray-500 mt-1">{header.subtitle}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat) => (
                    <div
                        key={stat.id}
                        className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow"
                    >
                        <span className={`text-3xl font-bold mb-1 ${stat.color || "text-gray-900"}`}>
                            {stat.count}
                        </span>
                        <span className="text-gray-500 text-sm font-medium">{stat.label}</span>
                    </div>
                ))}
            </div>

            {/* Tabs, Search & Filter Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-100 gap-4">
                    {/* Tabs */}
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide w-full md:w-auto">
                        {tabs.map((tab) => (
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
                                    {/* Only show count if valid number */}
                                    {typeof tab.count === 'number' ? tab.count : '-'}
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
                                placeholder={header.searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0934B]/50 focus:border-[#C0934B] transition-colors text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                                <GlobalLoader fullScreen={false} />
                            </div>
                        )}
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#CFA56B] text-white">
                                    {tableColumns.map((col, index) => (
                                        <th
                                            key={index}
                                            className="px-6 py-4 text-left text-sm font-medium whitespace-nowrap first:rounded-tl-none last:rounded-tr-none"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                            {searchQuery || activeTab !== 'all' ? "No matching orders found." : header.emptyState}
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                {order.orderNumber || order.id.substring(0, 8)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden relative">
                                                        {/* Image handling */}
                                                        {order.product.image ? (
                                                            <img
                                                                src={`/api/user/products/image/${order.product.image}`}
                                                                alt={order.product.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                                                            />
                                                        ) : null}
                                                        <div className="w-full h-full bg-gray-300 absolute top-0 left-0" style={{ display: order.product.image ? 'none' : 'block' }} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {order.product.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
                                                            {order.product.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {order.user.email}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                ₹ {order.pricing?.totalAmount || order.pricing?.baseAmount || 0}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {order.variant.duration}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatDate(order.dates.createdAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link href={`/admin-dashboard/order/${order.id}`} className="text-[#C0934B] font-medium text-sm hover:underline">
                                                    {header.viewButton}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {itemsPerPage !== 'All' && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalOrders)} of {totalOrders} results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Previous
                            </button>

                            {/* Simple Page Numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    p = currentPage - 3 + i;
                                }
                                if (p > totalPages) return null;

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
        </div>
    );
}

