import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import News from '@/app/lib/models/news';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// PUT - Update a section
export async function PUT(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();

        const { id, sectionId } = await params; // Await params for Next.js 15+

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(sectionId)) {
            return NextResponse.json({ success: false, error: 'Invalid news ID or section ID' }, { status: 400 });
        }

        const body = await request.json();
        const { heading, contentBlocks = [] } = body;

        // Validation for section
        if (!heading && (!contentBlocks || contentBlocks.length === 0)) {
            return NextResponse.json({ success: false, error: 'Section must have a heading or content blocks' }, { status: 400 });
        }

        const newsItem = await News.findById(id);
        if (!newsItem) {
            return NextResponse.json({ success: false, error: `News not found with ID: ${id}` }, { status: 404 });
        }

        const section = newsItem.sections.id(sectionId);
        if (!section) {
            return NextResponse.json({ success: false, error: `Section not found with ID: ${sectionId}` }, { status: 404 });
        }

        // Validate content blocks
        if (contentBlocks && Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
                if (!block.blockType && !block.type) {
                    return NextResponse.json({ success: false, error: 'Each content block must have a type' }, { status: 400 });
                }
            }
        }

        section.heading = heading;
        section.contentBlocks = contentBlocks.map((block) => ({
            _id: block._id && mongoose.Types.ObjectId.isValid(block._id) ? new mongoose.Types.ObjectId(block._id) : new mongoose.Types.ObjectId(),
            blockType: block.blockType,
            content: block.content || '',
            image: block.image || null,
            listConfig: block.listConfig || { type: 'bullet' },
            linkConfig: block.linkConfig || null,
            order: block.order !== undefined ? block.order : 0,
            style: block.style || {},
            createdAt: block.createdAt ? new Date(block.createdAt) : new Date(),
            updatedAt: new Date()
        }));
        section.updatedAt = new Date();
        newsItem.updatedAt = new Date();

        await newsItem.save();

        const updatedNews = await News.findById(id);
        const updatedSection = updatedNews.sections.id(sectionId);

        return NextResponse.json({
            success: true,
            message: 'Section updated successfully',
            section: { ...updatedSection.toObject(), _id: updatedSection._id.toString() }
        });

    } catch (error) {
        if (error.code === 11000) {
            // Handle duplicate key error if any, though less likely in subdocs unless unique indexed
        }
        console.error('Error updating news section:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Get single section
export async function GET(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();

        const { id, sectionId } = await params; // Await params for Next.js 15+

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(sectionId)) {
            return NextResponse.json({ success: false, error: 'Invalid news ID or section ID' }, { status: 400 });
        }

        const newsItem = await News.findById(id);
        if (!newsItem) {
            return NextResponse.json({ success: false, error: `News not found` }, { status: 404 });
        }

        const section = newsItem.sections.id(sectionId);
        if (!section) {
            return NextResponse.json({ success: false, error: `Section not found` }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            section: { ...section.toObject(), _id: section._id.toString() },
            article: { id: newsItem._id.toString(), mainHeading: newsItem.mainHeading }
        });

    } catch (error) {
        console.error('Error fetching news section:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a section
export async function DELETE(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();
        const { id, sectionId } = await params; // Await params for Next.js 15+

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(sectionId)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        const newsItem = await News.findById(id);
        if (!newsItem) {
            return NextResponse.json({ success: false, error: `News not found` }, { status: 404 });
        }

        const section = newsItem.sections.id(sectionId);
        if (!section) {
            return NextResponse.json({ success: false, error: `Section not found` }, { status: 404 });
        }

        newsItem.sections.pull(sectionId);
        newsItem.updatedAt = new Date();
        await newsItem.save();

        return NextResponse.json({
            success: true,
            message: 'Section deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting news section:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
