import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import News from '@/app/lib/models/news';
import Admin from '@/app/lib/models/Admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const newsType = searchParams.get('newsType');

        // Only show active news to users
        const query = { isActive: true };

        if (newsType) {
            query.newsType = newsType;
        }

        const sortConfig = {};
        if (sortBy === 'isImportant') {
            // Handle important sorting if requested, though mostly we might rely on default behavior
            sortConfig.isImportant = sortOrder === 'asc' ? 1 : -1;
        }
        sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Ensure createdAt is always a secondary sort for consistent paging
        if (sortBy !== 'createdAt') {
            sortConfig.createdAt = -1;
        }

        const total = await News.countDocuments(query);
        const articles = await News.find(query)
            .sort(sortConfig)
            .skip((page - 1) * limit)
            .limit(limit)
            .select('mainHeading description featuredImage category createdAt isImportant createdBy') // Select necessary fields for list view
            .lean();

        // Get unique creator emails
        const emails = [...new Set(articles.map(a => a.createdBy).filter(c => c && c.includes('@')))];

        if (emails.length > 0) {
            try {
                const admins = await Admin.find({ email: { $in: emails } }).select('email name').lean();
                const adminMap = admins.reduce((acc, admin) => {
                    acc[admin.email] = admin.name;
                    return acc;
                }, {});

                // Replace email with name
                articles.forEach(article => {
                    if (article.createdBy && adminMap[article.createdBy]) {
                        article.createdBy = adminMap[article.createdBy];
                    }
                });
            } catch (err) {
                console.error("Error fetching admin names:", err);
            }
        }

        return NextResponse.json({
            success: true,
            articles,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching user news:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
