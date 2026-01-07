import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import News from '@/app/lib/models/news';

export async function GET(request, { params }) {
    try {
        const { id } = await params; // Await params for Next.js 15+
        await dbConnect();

        // Only fetch if active (unless we want to allow direct link previews, usually only active is safe)
        console.log(`[NewsDetailAPI] Fetching news: ${id}`);
        const article = await News.findOne({ _id: id, isActive: true }).lean();
        console.log(`[NewsDetailAPI] Found:`, article ? 'Yes' : 'No');

        if (!article) {
            const adminCheck = await News.findOne({ _id: id }).lean();
            console.log(`[NewsDetailAPI] Admin check (ignoring isActive):`, adminCheck ? 'Found (Inactive)' : 'Not Found');
            return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, article });

    } catch (error) {
        console.error('Error fetching news details:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
