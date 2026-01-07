import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import SiteSettings from '@/app/lib/models/SiteSettings';

// GET /api/settings
// Public route to fetch site configuration
export async function GET(request) {
    try {
        await dbConnect();

        // Get settings or create default if none exist
        const settings = await SiteSettings.getSettings();

        return NextResponse.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
