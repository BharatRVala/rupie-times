import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import News from '@/app/lib/models/news';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// GET: List all news
export async function GET(request) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';

        const query = {};

        if (search) {
            query.$or = [
                { mainHeading: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } }
            ];
        }

        if (status !== 'all') {
            query.isActive = status === 'active';
        }

        const total = await News.countDocuments(query);
        const articles = await News.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('mainHeading description category author createdAt isActive isImportant')
            .lean();

        return NextResponse.json({
            success: true,
            articles,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            admin: {
                id: authResult.id,
                name: authResult.name,
                email: authResult.email
            }
        });

    } catch (error) {
        console.error('Error fetching news:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create news - Aligned with Articles Logic
export async function POST(request) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();
        const body = await request.json();
        const {
            mainHeading,
            description,
            category,
            newsType,
            isActive = true,
            isImportant = false,
            featuredImage = null
        } = body;

        // Validation
        if (!mainHeading || !description) {
            return NextResponse.json({ success: false, error: 'Main heading and description are required' }, { status: 400 });
        }

        // Handle isImportant logic (Max 4 active important news)
        if (isImportant) {
            const importantCount = await News.countDocuments({ isImportant: true });
            
            if (importantCount >= 4) {
                // Find the oldest important news to unmark
                const oldestImportant = await News.findOne({ isImportant: true })
                    .sort({ createdAt: 1 })
                    .select('_id');
                
                if (oldestImportant) {
                    await News.findByIdAndUpdate(oldestImportant._id, { isImportant: false });
                }
            }
        }

        const newNews = new News({
            mainHeading: mainHeading.trim(),
            description: description.trim(),
            category: (category || 'News').trim(),
            newsType: newsType ? newsType.trim() : undefined,
            author: authResult.name || 'Rupie Times',
            createdBy: authResult.email,
            isActive,
            isImportant,
            featuredImage,
            sections: []
        });

        await newNews.save();

        return NextResponse.json({
            success: true,
            message: 'News created successfully',
            admin: {
                id: authResult.id,
                name: authResult.name,
                email: authResult.email
            },
            article: {
                ...newNews.toObject(),
                _id: newNews._id.toString()
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating news:', error);
        return NextResponse.json({ success: false, error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}
