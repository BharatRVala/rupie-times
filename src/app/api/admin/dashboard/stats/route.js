import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product'; // Note lowercase 'product' based on file list
import Payment from '@/app/lib/models/Payment';
import Article from '@/app/lib/models/article'; // Note lowercase 'article' based on file list
import Subscription from '@/app/lib/models/Subscription';
import DeletedUser from '@/app/lib/models/deletedUser';

export const dynamic = 'force-dynamic'; // ✅ Prevent static caching

export async function GET() {
    try {
        await connectDB();

        // Fetch counts in parallel for performance
        const [
            totalUsers,
            totalActiveUsers,
            totalProducts,
            totalOrders,
            totalArticles,
            totalActiveSubscriptions,
            totalExpiringSoonSubscriptions,
            totalExpiredSubscriptions,
            totalDeletedUsers,
            totalRepeatCustomers
        ] = await Promise.all([
            User.countDocuments({}), // Count all users
            User.countDocuments({ isActive: true }), // Count active users
            Product.countDocuments({}),
            Payment.countDocuments({}), // Assuming Payment represents Orders
            Article.countDocuments({}),

            // Subscribed Product Stats
            Subscription.countDocuments({ status: 'active', isLatest: true }),
            Subscription.countDocuments({ status: 'expiresoon', isLatest: true }),
            Subscription.countDocuments({ status: 'expired', isLatest: true }),
            DeletedUser.countDocuments({}),
            Subscription.countDocuments({ isRenewal: true, paymentStatus: 'completed' })
        ]);

        // Repeat Customer (Renewals) Data - Last 7 Days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const renewals = await Subscription.aggregate([
            {
                $match: {
                    isRenewal: true,
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format weekly data (Day Name: Count)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyRenewals = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = days[d.getDay()];

            const found = renewals.find(r => r._id === dateStr);
            weeklyRenewals.push({
                name: dayName,
                value: found ? found.count : 0
            });
        }

        // --- Monthly Data (Last 4 Weeks) ---
        const monthlyRenewals = [];
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const monthlyRaw = await Subscription.aggregate([
            {
                $match: {
                    isRenewal: true,
                    createdAt: { $gte: fourWeeksAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $floor: {
                            $divide: [
                                { $subtract: ["$createdAt", fourWeeksAgo] },
                                1000 * 60 * 60 * 24 * 7
                            ]
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        for (let i = 0; i < 4; i++) {
            const found = monthlyRaw.find(r => r._id === i);
            monthlyRenewals.push({
                name: `Week ${i + 1}`,
                value: found ? found.count : 0
            });
        }

        // --- 6 Monthly Data ---
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // 5 months ago + current month = 6 months
        sixMonthsAgo.setDate(1); // Start of that month

        const sixMonthlyRaw = await Subscription.aggregate([
            {
                $match: {
                    isRenewal: true,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const sixMonthlyRenewals = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7); // YYYY-MM
            const label = monthNames[d.getMonth()];

            const found = sixMonthlyRaw.find(r => r._id === key);
            sixMonthlyRenewals.push({
                name: label,
                value: found ? found.count : 0
            });
        }

        // --- Yearly Data (Last 5 Years) ---
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 4); // 4 years ago + current year = 5 years

        const yearlyRaw = await Subscription.aggregate([
            {
                $match: {
                    isRenewal: true,
                    createdAt: { $gte: fiveYearsAgo } // Basic filter, refine if strict year boundaries needed
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const yearlyRenewals = [];
        const currentYear = new Date().getFullYear();
        for (let i = 4; i >= 0; i--) {
            const year = currentYear - i;
            const yearStr = year.toString();

            const found = yearlyRaw.find(r => r._id === yearStr);
            yearlyRenewals.push({
                name: yearStr,
                value: found ? found.count : 0
            });
        }

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers,
                totalActiveUsers,
                totalProducts,
                totalOrders,
                totalArticles,
                totalDeletedUsers,
                totalRepeatCustomers
            },
            subscriptionStats: {
                active: totalActiveSubscriptions,
                expiringSoon: totalExpiringSoonSubscriptions,
                expired: totalExpiredSubscriptions
            },
            charts: {
                subscribedProductData: [
                    { name: 'Active', value: totalActiveSubscriptions, color: '#1E4032' },
                    { name: 'Expiring soon', value: totalExpiringSoonSubscriptions, color: '#C0934B' },
                    { name: 'Expired', value: totalExpiredSubscriptions, color: '#A0AEC0' }
                ],
                repeatCustomerData: {
                    weekly: weeklyRenewals,
                    monthly: monthlyRenewals,
                    sixMonthly: sixMonthlyRenewals,
                    yearly: yearlyRenewals
                }
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch dashboard stats" },
            { status: 500 }
        );
    }
}
