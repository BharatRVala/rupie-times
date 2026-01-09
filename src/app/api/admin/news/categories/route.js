import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import News from '@/app/lib/models/news';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(request) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();

        // distinct categories
        // distinct categories
        const dbCategories = await News.distinct('category');

        const defaultCategories = ["Corporate Wire", "Inside IPOs", "Market Snapshot", "Daily Brew"];

        // Merge and unique
        const allCategories = [...new Set([...defaultCategories, ...dbCategories])];

        // Filter out empty/null and sort
        const cleanCategories = allCategories.filter(c => c && c.trim() !== "").sort();

        return NextResponse.json({
            success: true,
            categories: cleanCategories
        });

    } catch (error) {
        console.error('Error fetching news categories:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
