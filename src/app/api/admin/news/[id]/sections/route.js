import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import News from '@/app/lib/models/news';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// POST - Add section to news (Aligned with FreeArticle Logic)
export async function POST(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid news ID' }, { status: 400 });
        }

        const body = await request.json();
        const { heading, contentBlocks = [], position } = body;

        // Validation for section
        if (!heading && (!contentBlocks || contentBlocks.length === 0)) {
            return NextResponse.json({ success: false, error: 'Section must have a heading or content blocks' }, { status: 400 });
        }

        // Validate content blocks structure
        if (contentBlocks && Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
                if (!block.blockType && !block.type) {
                    return NextResponse.json({ success: false, error: 'Each content block must have a type' }, { status: 400 });
                }
            }
        }

        const newSection = {
            heading: heading || '',
            contentBlocks: contentBlocks.map((block, idx) => ({
                blockType: block.blockType || block.type || 'paragraph',
                content: block.content || '',
                image: block.image || null,
                listConfig: block.listConfig || { type: 'bullet' },
                linkConfig: block.linkConfig || null,
                order: block.order !== undefined ? block.order : idx,
                style: block.style || {}
            }))
        };

        // If position is specified, we need to handle insertion
        if (position !== undefined && position !== null) {
            const insertIdx = parseInt(position);

            const newsItem = await News.findOneAndUpdate(
                { _id: id },
                {
                    $push: {
                        sections: {
                            $each: [newSection],
                            $position: insertIdx
                        }
                    },
                    $set: { updatedAt: new Date() }
                },
                { new: true, runValidators: true, lean: true }
            );

            if (!newsItem) {
                return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
            }

            const addedSection = newsItem.sections[insertIdx];

            return NextResponse.json({
                success: true,
                message: 'Section inserted successfully',
                admin: {
                    id: authResult.id,
                    name: authResult.name,
                    email: authResult.email
                },
                section: { ...addedSection, _id: addedSection._id.toString() },
                article: {
                    id: newsItem._id.toString(),
                    mainHeading: newsItem.mainHeading
                }
            }, { status: 201 });
        }

        // Default: push at the end
        const newsItem = await News.findOneAndUpdate(
            { _id: id },
            {
                $push: { sections: newSection },
                $set: { updatedAt: new Date() }
            },
            { new: true, runValidators: true, lean: true }
        );

        if (!newsItem) {
            return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
        }

        const addedSection = newsItem.sections[newsItem.sections.length - 1];

        return NextResponse.json({
            success: true,
            message: 'Section added successfully',
            admin: {
                id: authResult.id,
                name: authResult.name,
                email: authResult.email
            },
            section: { ...addedSection, _id: addedSection._id.toString() },
            article: { // Return 'article' key context, same as articles API
                id: newsItem._id.toString(),
                mainHeading: newsItem.mainHeading
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error adding section to news:', error);
        if (error.name === 'ValidationError') {
            console.error('Mongoose Validation Error Details:', JSON.stringify(error.errors, null, 2));
            return NextResponse.json({ success: false, error: 'Validation failed: ' + Object.values(error.errors).map(e => e.message).join(', ') }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}

// GET - Get all sections for news
export async function GET(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await dbConnect();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid news ID' }, { status: 400 });
        }

        const newsItem = await News.findById(id).lean();

        if (!newsItem) {
            return NextResponse.json({ success: false, error: 'News not found' }, { status: 404 });
        }

        const sections = newsItem.sections.map(section => ({
            ...section,
            _id: section._id.toString(),
            contentBlocks: section.contentBlocks.map(cb => ({
                ...cb,
                _id: cb._id.toString()
            }))
        }));

        return NextResponse.json({
            success: true,
            admin: {
                id: authResult.id,
                name: authResult.name,
                email: authResult.email
            },
            article: {
                id: newsItem._id.toString(),
                mainHeading: newsItem.mainHeading,
                description: newsItem.description
            },
            sections: sections
        });

    } catch (error) {
        console.error('Error fetching news sections:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
