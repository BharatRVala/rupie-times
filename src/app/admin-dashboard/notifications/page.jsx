"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NotificationItem from "../../components/dashboard/NotificationItem";
import Pagination from "../../components/Pagination";
import GlobalLoader from "@/app/components/GlobalLoader";

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 8; // Slightly fewer for admin as they are larger items potentially

    useEffect(() => {
        fetchNotifications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/notifications?page=${currentPage}&limit=${itemsPerPage}`);
            const data = await res.json();

            if (data.success) {
                setNotifications(data.data || []);
                setTotalPages(data.pagination?.pages || 1);
            } else {
                setError("Failed to load notifications");
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
            setError("An error occurred loading notifications");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Helper to group notifications
    const groupNotifications = (list) => {
        const sections = {
            today: [],
            yesterday: [],
            earlier: []
        };

        const now = new Date();
        const todayStr = now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        list.forEach(item => {
            const date = new Date(item.createdAt);
            const dateStr = date.toDateString();

            if (dateStr === todayStr) {
                sections.today.push(item);
            } else if (dateStr === yesterdayStr) {
                sections.yesterday.push(item);
            } else {
                sections.earlier.push(item);
            }
        });

        return sections;
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this notification?')) return;

        try {
            // Optimistic update
            setNotifications(prev => prev.filter(item => item._id !== id));

            const response = await fetch(`/api/admin/notifications/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error("Failed to delete notification");
                fetchNotifications(); // Revert
                setError("Failed to delete notification");
            }
        } catch (err) {
            console.error("Error deleting notification:", err);
            fetchNotifications(); // Revert
        }
    };

    const grouped = groupNotifications(notifications);

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
                <Link
                    href="/admin-dashboard/notifications/create"
                    className="px-6 py-2 bg-[#C19A5B] text-white rounded-md hover:bg-[#a8864f] transition-colors flex items-center gap-2"
                >
                    + Send Notification
                </Link>
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <GlobalLoader fullScreen={false} />
                </div>
            ) : error ? (
                <div className="py-10 text-center text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-lg border border-gray-100">
                    <p className="text-gray-500">No broadcast notifications sent yet.</p>
                </div>
            ) : (
                <div className="space-y-8 min-h-[50vh]">
                    {/* Today */}
                    {grouped.today.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-gray-500 text-sm font-medium">Today</h3>
                            <div className="space-y-4">
                                {grouped.today.map(item => (
                                    <NotificationItem
                                        key={item._id}
                                        notification={{
                                            ...item,
                                            type: item.notificationType || 'general',
                                            description: item.message,
                                            time: item.createdAt,
                                            isRead: true
                                        }}
                                        variant="full"
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Yesterday */}
                    {grouped.yesterday.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-gray-500 text-sm font-medium">Yesterday</h3>
                            <div className="space-y-4">
                                {grouped.yesterday.map(item => (
                                    <NotificationItem
                                        key={item._id}
                                        notification={{
                                            ...item,
                                            type: item.notificationType || 'general',
                                            description: item.message,
                                            time: item.createdAt,
                                            isRead: true
                                        }}
                                        variant="full"
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Earlier */}
                    {grouped.earlier.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-gray-500 text-sm font-medium">Earlier</h3>
                            <div className="space-y-4">
                                {grouped.earlier.map(item => (
                                    <NotificationItem
                                        key={item._id}
                                        notification={{
                                            ...item,
                                            type: item.notificationType || 'general',
                                            description: item.message,
                                            time: item.createdAt,
                                            isRead: true
                                        }}
                                        variant="full"
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pt-8 pb-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
