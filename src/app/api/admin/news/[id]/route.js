import { NextResponse } from 'next/server';
import dbConnect from '@/app/lib/utils/dbConnect';
import News from '@/app/lib/models/news';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

// GET: Fetch single news details
export async function GET(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params;
        await dbConnect();

        // Use findOne with lean() and exclude internal fields
        const article = await News.findOne({ _id: id })
            .select('-__v')
            .lean();

        if (!article) {
            return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            article: {
                ...article,
                _id: article._id.toString()
            }
        });

    } catch (error) {
        console.error('Error fetching news details:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update news
export async function PUT(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params; // Await params for Next.js 15+
        await dbConnect();
        const body = await request.json();
        const { mainHeading, description, category, newsType, sections, isActive, isImportant, featuredImage } = body;

        const updateFields = {};
        if (mainHeading) updateFields.mainHeading = mainHeading;
        if (description) updateFields.description = description;
        if (category) updateFields.category = category;
        if (newsType !== undefined) {
            // If newsType is empty string, set it to null to avoid enum validation error
            updateFields.newsType = newsType === "" ? null : newsType;
        }
        if (sections !== undefined) updateFields.sections = sections;
        if (isActive !== undefined) updateFields.isActive = isActive;
        if (featuredImage !== undefined) updateFields.featuredImage = featuredImage;

        // Handle isImportant logic (Max 4 active important news)
        if (isImportant !== undefined) {
            if (isImportant === true) {
                // Check currently important count (excluding current article)
                const currentImportantCount = await News.countDocuments({
                    _id: { $ne: id },
                    isImportant: true
                });

                if (currentImportantCount >= 4) {
                    // Find the oldest important news to unmark (excluding current)
                    const oldestImportant = await News.findOne({
                        _id: { $ne: id },
                        isImportant: true
                    })
                        .sort({ createdAt: 1 })
                        .select('_id');

                    if (oldestImportant) {
                        await News.findByIdAndUpdate(oldestImportant._id, { isImportant: false });
                    }
                }
            }
            updateFields.isImportant = isImportant;
        }

        const updatedArticle = await News.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true, lean: true }
        );

        if (!updatedArticle) {
            return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, article: updatedArticle });

    } catch (error) {
        console.error('Error updating news:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove news
export async function DELETE(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        const { id } = await params; // Await params for Next.js 15+
        await dbConnect();

        const deletedArticle = await News.findByIdAndDelete(id);
        if (!deletedArticle) {
            return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'News deleted successfully' });

    } catch (error) {
        console.error('Error deleting news:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
