"use client";

import { useState, useEffect } from 'react';
import { adminDashboardData } from '@/data/adminDashboardData';
import StatsCard from '@/app/components/admin/dashboard/StatsCard';
import RepeatCustomerChart from '@/app/components/admin/dashboard/RepeatCustomerChart';
import RevenueChart from '@/app/components/admin/dashboard/RevenueChart';
import SubscribedProductChart from '@/app/components/admin/dashboard/SubscribedProductChart';
import DashboardList from '@/app/components/admin/dashboard/DashboardList';

import GlobalLoader from '@/app/components/GlobalLoader';

export default function AdminDashboard() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState(adminDashboardData.stats);
    const [notifications, setNotifications] = useState([]); // ✅ Dynamic notifications
    const [supportTickets, setSupportTickets] = useState([]); // ✅ Dynamic support tickets
    const [chartData, setChartData] = useState({
        repeatCustomerData: adminDashboardData.repeatCustomerData,
        subscribedProductData: adminDashboardData.subscribedProductData,
        totalRepeatCustomers: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Check role
                const storedAdmin = localStorage.getItem('adminData');
                if (storedAdmin) {
                    const admin = JSON.parse(storedAdmin);
                    const role = admin.role?.toLowerCase() || '';
                    if (role === 'super-admin' || role === 'superadmin' || role === 'super_admin') {
                        setIsSuperAdmin(true);
                    }
                }

                // Fetch real stats
                try {
                    const response = await fetch('/api/admin/dashboard/stats');
                    const data = await response.json();

                    if (data.success) {
                        setDashboardStats(prevStats => prevStats.map(stat => {
                            let newCount = stat.count;
                            switch (stat.id) {
                                case 1: // Total Products
                                    newCount = data.stats.totalProducts;
                                    break;
                                case 2: // Total Users
                                    newCount = data.stats.totalUsers;
                                    break;
                                case 3: // Total Orders
                                    newCount = data.stats.totalOrders;
                                    break;
                                case 4: // Total Articles
                                    newCount = data.stats.totalArticles;
                                    break;
                                default:
                                    break;
                            }
                            return { ...stat, count: newCount };
                        }));

                        if (data.charts) {
                            setChartData(prev => ({
                                ...prev,
                                repeatCustomerData: {
                                    ...prev.repeatCustomerData,
                                    weekly: data.charts.repeatCustomerData.weekly,
                                    ...data.charts.repeatCustomerData // Merge other periods if available
                                },
                                subscribedProductData: data.charts.subscribedProductData,
                                totalRepeatCustomers: data.stats.totalRepeatCustomers || 0
                            }));
                        }
                    }
                } catch (err) {
                    console.error("Error fetching stats:", err);
                }

                // ✅ Fetch Admin Broadcast Notifications (Real Data)
                try {
                    const notifResponse = await fetch('/api/admin/notifications?limit=3');
                    const notifData = await notifResponse.json();
                    if (notifData.success) {
                        setNotifications(notifData.data || []);
                    }
                } catch (err) {
                    console.error("Error fetching notifications:", err);
                }

                // ✅ Fetch Support Tickets (Real Data)
                try {
                    const supportResponse = await fetch('/api/admin/support/tickets?limit=3');
                    const supportData = await supportResponse.json();
                    if (supportData.success) {
                        const formattedTickets = supportData.tickets.map(ticket => {
                            const date = new Date(ticket.createdAt);
                            const formattedDate = date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: true
                            });

                            return {
                                id: ticket._id,
                                title: ticket.user?.name || "Unknown User", // Show User Name
                                message: ticket.subject, // Show Subject in message body
                                time: formattedDate, // Show Date on right side
                                canReply: true,
                                // Add logic for user initial/color if needed, or rely on DashboardList random color
                            };
                        });
                        setSupportTickets(formattedTickets);
                    }
                } catch (err) {
                    console.error("Error fetching support tickets:", err);
                }

            } catch (error) {
                console.error("Error in dashboard initialization:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="h-[calc(100vh-200px)] w-full relative">
                <GlobalLoader fullScreen={false} />
            </div>
        );
    }

    // Super Admin Layout
    if (isSuperAdmin) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

                {/* Row 1: Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dashboardStats.map((stat) => (
                        <StatsCard key={stat.id} {...stat} />
                    ))}
                </div>

                {/* Row 2: Revenue & Repeat Customer Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[400px]">
                        <RevenueChart initialData={adminDashboardData.revenueData} />
                    </div>
                    <div className="h-[400px]">
                        <RepeatCustomerChart data={chartData.repeatCustomerData} totalCount={chartData.totalRepeatCustomers} />
                    </div>
                </div>

                {/* Row 3: Subscribed Product, Notifications, Support */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="h-[400px]">
                        <SubscribedProductChart data={chartData.subscribedProductData} />
                    </div>
                    <div className="h-[400px]">
                        {/* ✅ Use dynamic notifications */}
                        <DashboardList
                            title="Notification"
                            items={notifications}
                            seeAllLink="/admin-dashboard/notifications"
                            type="notification"
                        />
                    </div>
                    <div className="h-[400px]">
                        {/* ✅ Use dynamic support tickets */}
                        <DashboardList
                            title="Support Ticket"
                            items={supportTickets}
                            seeAllLink="/admin-dashboard/support"
                            type="support"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Standard Admin Layout (Existing)
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat) => (
                    <StatsCard key={stat.id} {...stat} />
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 h-[400px]">
                    <RepeatCustomerChart data={chartData.repeatCustomerData} totalCount={chartData.totalRepeatCustomers} />
                </div>
                <div className="lg:col-span-2 h-[400px]">
                    <SubscribedProductChart data={chartData.subscribedProductData} />
                </div>
            </div>

            {/* Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[400px]">
                    {/* ✅ Use dynamic notifications */}
                    <DashboardList
                        title="Notification"
                        items={notifications}
                        seeAllLink="/admin-dashboard/notifications"
                        type="notification"
                    />
                </div>
                <div className="h-[400px]">
                    {/* ✅ Use dynamic support tickets */}
                    <DashboardList
                        title="Support Ticket"
                        items={supportTickets}
                        seeAllLink="/admin-dashboard/support"
                        type="support"
                    />
                </div>
            </div>
        </div>
    );
}
