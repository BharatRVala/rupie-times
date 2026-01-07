import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Payment from '@/app/lib/models/Payment';
import { authenticateSuperAdmin } from '@/app/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        // Authenticate Super Admin
        const authResult = await authenticateSuperAdmin(req);
        if (!authResult) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'weekly';

        const now = new Date();
        let matchStage = {
            status: 'captured'
        };

        let groupStage = {};
        let projectStage = {};
        let dataMap = []; // To fill gaps

        // Range Logic
        if (range === 'today') {
            // IST Adjustment (UTC+5:30) to assume "Today" means "India Today"
            const offset = 5.5 * 60 * 60 * 1000;
            const now = new Date();
            const istDate = new Date(now.getTime() + offset);
            istDate.setUTCHours(0, 0, 0, 0); // Use UTC to ensure consistent 00:00 relative to the shifted time
            const istMidnightUtc = new Date(istDate.getTime() - offset); // Convert back to UTC

            matchStage.createdAt = { $gte: istMidnightUtc };

            groupStage = {
                _id: { $hour: { date: "$createdAt", timezone: "+05:30" } }, // Group by IST hour
                total: { $sum: "$amount" }
            };

            // Prepare 24 hour slots
            const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
            dataMap = hours.map(h => {
                const hourStr = h % 12 === 0 ? 12 : h % 12;
                const ampm = h < 12 ? 'AM' : 'PM';
                return { id: h, name: `${hourStr} ${ampm}`, value: 0 };
            });

        } else if (range === 'weekly') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            matchStage.createdAt = { $gte: sevenDaysAgo };

            groupStage = {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total: { $sum: "$amount" }
            };

            // Prepare last 7 days
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dataMap = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dataMap.push({
                    id: d.toISOString().split('T')[0],
                    name: days[d.getDay()],
                    value: 0
                });
            }

        } else if (range === 'monthly') {
            // Last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            matchStage.createdAt = { $gte: thirtyDaysAgo };

            groupStage = {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total: { $sum: "$amount" }
            };

            dataMap = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dataMap.push({
                    id: d.toISOString().split('T')[0],
                    name: d.getDate().toString(), // Just the day number
                    value: 0
                });
            }

        } else if (range === 'sixMonthly') {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            matchStage.createdAt = { $gte: sixMonthsAgo };

            groupStage = {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                total: { $sum: "$amount" }
            };

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            dataMap = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toISOString().slice(0, 7);
                dataMap.push({
                    id: key,
                    name: monthNames[d.getMonth()],
                    value: 0
                });
            }

        } else if (range === 'yearly') {
            // Last 5 Years Logic
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 4); // 4 years ago + current year = 5 years
            fiveYearsAgo.setMonth(0, 1); // Start of that year
            matchStage.createdAt = { $gte: fiveYearsAgo };

            groupStage = {
                _id: { $dateToString: { format: "%Y", date: "$createdAt" } }, // Group by Year
                total: { $sum: "$amount" }
            };

            dataMap = [];
            const currentYear = new Date().getFullYear();
            for (let i = 4; i >= 0; i--) {
                const year = currentYear - i;
                const key = year.toString();
                dataMap.push({
                    id: key,
                    name: key, // Label is just the year (e.g., "2024")
                    value: 0
                });
            }
        }

        // Database Aggregation
        const results = await Payment.aggregate([
            { $match: matchStage },
            { $group: groupStage }
        ]);

        // Merge DB results into dataMap
        const finalData = dataMap.map(slot => {
            const found = results.find(r => r._id === slot.id);
            // Handle Decimal128 or Number from Mongo
            let val = found ? found.total : 0;
            if (val && typeof val === 'object' && val.toString) val = parseFloat(val.toString());

            return {
                name: slot.name,
                value: val || 0
            };
        });

        return NextResponse.json({
            success: true,
            data: finalData
        });

    } catch (error) {
        console.error("Revenue API Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
