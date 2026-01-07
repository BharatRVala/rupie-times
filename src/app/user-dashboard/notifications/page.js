"use client";

import { useEffect, useState } from 'react';
import NotificationItem from "@/app/components/dashboard/NotificationItem";
import { AnimatePresence } from 'framer-motion';
import GlobalLoader from "../../components/GlobalLoader";

export default function NotificationsPage() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await fetchNotifications();
            // Auto-mark as read on page open (background), preserve "NEW" labels
            markAllAsRead(false);
        };
        init();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/user/notifications', { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    groupNotifications(data.data || []);
                    // Mark all displayed notifications as read
                    // markAllAsRead(); // Moved this to happen when user opens page, optional but okay
                }
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async (shouldRefresh = true) => {
        // If triggered by event (not direct call) or no arg, default to true
        if (typeof shouldRefresh !== 'boolean') shouldRefresh = true;

        try {
            const response = await fetch('/api/user/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'mark_all_read' }),
            });

            if (response.ok) {
                // Refresh list to remove 'NEW' badges ONLY if requested
                if (shouldRefresh) {
                    fetchNotifications();
                }
                // Notify header to update badge count
                window.dispatchEvent(new Event('notificationUpdated'));
            }
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            // Optimistic update
            const updatedSections = sections.map(section => ({
                ...section,
                items: section.items.filter(item => item._id !== id)
            })).filter(section => section.items.length > 0);

            setSections(updatedSections);

            const response = await fetch('/api/user/notifications', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationId: id }),
            });

            if (!response.ok) {
                console.error('Failed to delete notification');
                fetchNotifications(); // Revert on failure
            } else {
                window.dispatchEvent(new Event('notificationUpdated'));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            fetchNotifications();
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear all notifications?')) return;

        try {
            // Optimistic update
            setSections([]);

            const response = await fetch('/api/user/notifications', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deleteAll: true }),
            });

            if (!response.ok) {
                console.error('Failed to clear notifications');
                fetchNotifications();
            } else {
                window.dispatchEvent(new Event('notificationUpdated'));
            }
        } catch (error) {
            console.error('Error clearing notifications:', error);
            fetchNotifications();
        }
    };

    const groupNotifications = (notifications) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            today: [],
            yesterday: [],
            older: {} // Object to store date-specific groups
        };

        notifications.forEach(item => {
            const date = new Date(item.createdAt);
            if (isSameDay(date, today)) {
                groups.today.push(item);
            } else if (isSameDay(date, yesterday)) {
                groups.yesterday.push(item);
            } else {
                const dateKey = date.toLocaleDateString('en-GB'); // DD/MM/YYYY
                if (!groups.older[dateKey]) {
                    groups.older[dateKey] = [];
                }
                groups.older[dateKey].push(item);
            }
        });

        const displaySections = [];
        if (groups.today.length > 0) displaySections.push({ title: "Today", items: groups.today });
        if (groups.yesterday.length > 0) displaySections.push({ title: "Yesterday", items: groups.yesterday });

        // Sort older dates descending (assuming input is already somewhat sorted, but keys need care)
        // Actually, object keys order isn't guaranteed. We should sort dates.
        // However, input `notifications` are likely sorted by date desc. So we can just iterate.
        // Better to be robust:
        const olderDates = Object.keys(groups.older).sort((a, b) => {
            // Convert DD/MM/YYYY to Date items for sorting
            const [d1, m1, y1] = a.split('/');
            const [d2, m2, y2] = b.split('/');
            return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
        });

        olderDates.forEach(date => {
            displaySections.push({ title: date, items: groups.older[date] });
        });

        setSections(displaySections);
    };

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    if (loading) {
        return <GlobalLoader fullScreen={false} className="min-h-[60vh]" />;
    }

    return (
        <div className="w-full space-y-6 p-4 md:p-8">
            {/* Page Title */}
            <div className="mb-8 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#1E4032]">Notifications</h2>
                {sections.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        Clear All
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="space-y-8">
                {sections.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No notifications yet
                    </div>
                ) : (
                    sections.map((section, idx) => (
                        <div key={idx} className="space-y-4">
                            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{section.title}</h3>

                            <div className="space-y-4">
                                <AnimatePresence mode='popLayout'>
                                    {section.items.map((item) => {
                                        // Use the type directly from the API if available, otherwise fallback to keyword matching
                                        let uiType = item.notificationType || item.type || 'info';
                                        const isBroadcast = item.isBroadcast || item.triggeredBy === 'admin';
                                        const titleLower = (item.title || '').toLowerCase();

                                        // Only perform keyword matching for non-broadcasts or if type is generic
                                        if (!isBroadcast || uiType === 'info' || uiType === 'general') {
                                            if (uiType === 'subscription_active' || titleLower.includes('activated') || titleLower.includes('active')) {
                                                uiType = 'success';
                                            } else if (uiType === 'subscription_expired' || titleLower.includes('expired')) {
                                                uiType = 'expired';
                                            } else if (uiType === 'subscription_expiring_soon' || titleLower.includes('expiring soon')) {
                                                uiType = 'warning';
                                            } else if (uiType === 'ticket_reply' || titleLower.includes('ticket')) {
                                                uiType = 'chat';
                                            }
                                        }

                                        return (
                                            <NotificationItem
                                                key={item._id}
                                                notification={{
                                                    ...item,
                                                    description: item.description || item.message || item.subtitle,
                                                    type: uiType
                                                }}
                                                variant="full"
                                                onDelete={handleDelete}
                                            />
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
