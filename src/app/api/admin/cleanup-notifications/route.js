
import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import Notification from '@/app/lib/models/Notification';

export async function POST(request) {
    try {
        await dbConnect();

        // Find all notifications with emojis in title
        // Regex matches common emojis or starts with non-alphanumeric chars that are not brackets/parentheses
        // Simplified: just match the specific ones we know: ⏰, ❌, ✅
        const regex = /⏰|❌|✅/g;

        const notifications = await Notification.find({
            title: { $regex: regex }
        });

        let updatedCount = 0;

        for (const notification of notifications) {
            const oldTitle = notification.title;
            const newTitle = oldTitle.replace(regex, '').trim();

            if (oldTitle !== newTitle) {
                notification.title = newTitle;
                await notification.save();
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${updatedCount} notifications`,
            updatedCount
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
