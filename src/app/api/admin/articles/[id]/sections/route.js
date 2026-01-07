import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import FreeArticle from '@/app/lib/models/article';
import Product from '@/app/lib/models/product'; // Import Product model
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// Helper to find article context (either in Product or FreeArticle)
async function findArticleContext(articleId) {
  // 1. Try to find in Products (as subdocument)
  const product = await Product.findOne({ 'articles._id': articleId });

  if (product) {
    const article = product.articles.id(articleId);
    return { type: 'product', parent: product, article };
  }

  // 2. Try to find as FreeArticle
  const freeArticle = await FreeArticle.findById(articleId);
  if (freeArticle) {
    return { type: 'free', parent: freeArticle, article: freeArticle };
  }

  return null;
}

// POST - Add section to article
export async function POST(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error
        },
        { status: authResult.status }
      );
    }

    await dbConnect();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid article ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      heading,
      contentBlocks = [],
      position // Get position from body
    } = body;

    console.log("POST /articles/sections - Received Body:", body);
    console.log("POST - extracted position:", position, "typeof:", typeof position);

    // Validation for section
    if (!heading && (!contentBlocks || contentBlocks.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Section must have a heading or content blocks'
        },
        { status: 400 }
      );
    }

    // Validate content blocks structure (Simplified for brevity as logic is same)
    if (contentBlocks && Array.isArray(contentBlocks)) {
      for (const block of contentBlocks) {
        if (!block.blockType || block.content === undefined) {
          return NextResponse.json(
            {
              success: false,
              error: 'Each content block must have blockType and content'
            },
            { status: 400 }
          );
        }
      }
    }

    const context = await findArticleContext(id);

    if (!context) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found'
        },
        { status: 404 }
      );
    }

    const { type, parent, article } = context;

    const newSection = {
      _id: new mongoose.Types.ObjectId(),
      heading,
      contentBlocks: contentBlocks.map((block) => ({
        _id: new mongoose.Types.ObjectId(),
        blockType: block.blockType,
        content: block.content || '',
        image: block.image || null,
        listConfig: block.listConfig || { type: 'bullet' },
        linkConfig: block.linkConfig || null,
        order: block.order !== undefined ? block.order : 0,
        style: block.style || {},
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate insertion index
    // If position is provided and valid (>= 0 and <= length), use it. Otherwise, defaults to append (push).
    // Note: $position requires $each.

    const insertIndex = (typeof position === 'number' && position >= 0) ? position : undefined;

    // Add section based on type
    if (type === 'product') {
      if (insertIndex !== undefined && insertIndex < article.sections.length) {
        article.sections.splice(insertIndex, 0, newSection);
      } else {
        article.sections.push(newSection);
      }
      await parent.save();
    } else {
      // Free Article - Use atomic update with $position if needed
      if (insertIndex !== undefined) {
        await FreeArticle.findOneAndUpdate(
          { _id: article._id },
          {
            $push: {
              sections: {
                $each: [newSection],
                $position: insertIndex
              }
            }
          }
        );
      } else {
        await FreeArticle.findOneAndUpdate(
          { _id: article._id },
          { $push: { sections: newSection } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Section added successfully',
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      section: {
        ...newSection,
        _id: newSection._id.toString()
      },
      article: {
        id: article._id.toString(),
        mainHeading: article.mainHeading
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding section to article:', error);
    if (error.message.includes('authentication failed')) {
      return NextResponse.json({ success: false, error: 'Auth failed' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to add section: ' + error.message }, { status: 500 });
  }
}

// GET - Get all sections for an article
export async function GET(request, { params }) {
  try {
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid article ID' }, { status: 400 });
    }

    const context = await findArticleContext(id);

    if (!context) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    const { article } = context;

    // Get all sections
    const sections = article.sections ? article.sections.map(section => ({
      ...section.toObject(),
      _id: section._id.toString(),
      contentBlocks: section.contentBlocks.map(cb => ({
        ...cb.toObject(),
        _id: cb._id.toString()
      }))
    })) : [];

    return NextResponse.json({
      success: true,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      article: {
        id: article._id.toString(),
        mainHeading: article.mainHeading,
        description: article.description
      },
      sections: sections
    });

  } catch (error) {
    console.error('Error fetching article sections:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch article sections: ' + error.message }, { status: 500 });
  }
}