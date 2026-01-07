import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/app/lib/utils/dbConnect';
import SiteSettings from '@/app/lib/models/SiteSettings';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// GET /api/admin/settings
export async function GET(request) {
    try {
        // Check authentication
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 });
        }

        await dbConnect();

        // Get settings or create default if none exist
        let settings = await SiteSettings.getSettings();

        // Convert to plain object to modify response
        const settingsObj = settings.toObject ? settings.toObject() : settings;

        // Migration/Fallback: If header/footer logos are missing, use the legacy logo
        if (settingsObj.general) {
            if (!settingsObj.general.headerLogo && settingsObj.general.logo) {
                settingsObj.general.headerLogo = settingsObj.general.logo;
            }
            if (!settingsObj.general.footerLogo && settingsObj.general.logo) {
                settingsObj.general.footerLogo = settingsObj.general.logo;
            }
        }

        return NextResponse.json({
            success: true,
            data: settingsObj
        });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/settings
export async function PUT(request) {
    try {
        // Check authentication
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 });
        }

        await dbConnect();
        const body = await request.json();

        // We'll update the singleton settings document
        // We can use findOneAndUpdate since getSettings ensures one exists, 
        // or just updateOne on the first found document.
        // For safety, let's fetch the ID or use upsert logic just in case.

        // First, ensure it exists
        const existing = await SiteSettings.getSettings();

        const updatedSettings = await SiteSettings.findByIdAndUpdate(
            existing._id,
            { $set: body },
            { new: true, runValidators: true }
        );

        // Revalidate the layout and all pages to reflect changes immediately
        revalidatePath('/', 'layout');

        return NextResponse.json({
            success: true,
            data: updatedSettings,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating site settings:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
