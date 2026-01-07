// src/app/api/admin/articles/[id]/sections/[sectionId]/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import FreeArticle from '@/app/lib/models/article';
import Product from '@/app/lib/models/product';
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

// PUT - Update a section
export async function PUT(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    await dbConnect();
    const { id, sectionId } = await params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json({ success: false, error: 'Invalid article ID or section ID' }, { status: 400 });
    }

    const body = await request.json();
    const { heading, contentBlocks = [] } = body;

    // Minimal validation (matches POST)
    if (!heading && (!contentBlocks || contentBlocks.length === 0)) {
      return NextResponse.json({ success: false, error: 'Section must have a heading or content blocks' }, { status: 400 });
    }

    // Find Context
    const context = await findArticleContext(id);
    if (!context) {
      return NextResponse.json({ success: false, error: `Article not found with ID: ${id}` }, { status: 404 });
    }

    const { type, parent, article } = context;

    // Find Section
    const section = article.sections.id(sectionId);
    if (!section) {
      return NextResponse.json({ success: false, error: `Section not found with ID: ${sectionId}` }, { status: 404 });
    }

    // Update Section
    section.heading = heading;
    try {
      section.contentBlocks = contentBlocks.map((block) => ({
        _id: block._id && mongoose.Types.ObjectId.isValid(block._id)
          ? new mongoose.Types.ObjectId(block._id)
          : new mongoose.Types.ObjectId(),
        blockType: block.blockType || 'paragraph',
        content: block.content || '',
        image: block.image || null,
        listConfig: block.listConfig || { type: 'bullet' },
        linkConfig: block.linkConfig || null,
        order: block.order !== undefined ? block.order : 0,
        style: block.style || {},
        createdAt: block.createdAt ? new Date(block.createdAt) : new Date(),
        updatedAt: new Date()
      }));
    } catch (err) {
      console.error("Mapping error:", err);
      return NextResponse.json({ success: false, error: 'Invalid content block data: ' + err.message }, { status: 400 });
    }

    section.updatedAt = new Date();
    article.updatedAt = new Date();

    // Save Parent
    await parent.save();

    // Re-fetch for response (clean updated state)
    // We can just return what we have if save was successful, but re-fetching ensures consistency
    // Optimization: Just return the modified object to avoid another DB call if desired, BUT
    // for subdocuments, re-fetching parent is safest to get processed virtuals etc. 
    // Let's re-fetch context efficiently.
    const updatedContext = await findArticleContext(id);
    const updatedSection = updatedContext.article.sections.id(sectionId);

    return NextResponse.json({
      success: true,
      message: 'Section updated successfully',
      admin: { id: authResult.id, name: authResult.name, email: authResult.email },
      section: {
        ...updatedSection.toObject(),
        _id: updatedSection._id.toString(),
        contentBlocks: updatedSection.contentBlocks.map(cb => ({
          ...cb.toObject(),
          _id: cb._id.toString()
        }))
      },
      article: {
        id: updatedContext.article._id.toString(),
        mainHeading: updatedContext.article.mainHeading
      }
    });

  } catch (error) {
    console.error("PUT Section Error:", error);
    if (error.message.includes('authentication failed')) {
      return NextResponse.json({ success: false, error: 'Admin authentication required' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update section: ' + error.message }, { status: 500 });
  }
}

// GET - Get single section
export async function GET(request, { params }) {
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

    const { id, sectionId } = await params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid article ID or section ID'
        },
        { status: 400 }
      );
    }

    const article = await FreeArticle.findById(id);
    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: `Article not found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    const section = article.sections.id(sectionId);
    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: `Section not found with ID: ${sectionId}`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      section: {
        ...section.toObject(),
        _id: section._id.toString(),
        contentBlocks: section.contentBlocks.map(cb => ({
          ...cb.toObject(),
          _id: cb._id.toString()
        }))
      },
      article: {
        id: article._id.toString(),
        mainHeading: article.mainHeading
      }
    });

  } catch (error) {
    // Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to access sections'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch section: ' + error.message
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a section
export async function DELETE(request, { params }) {
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

    const { id, sectionId } = await params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid article ID or section ID'
        },
        { status: 400 }
      );
    }

    const article = await FreeArticle.findById(id);
    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: `Article not found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    const section = article.sections.id(sectionId);
    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: `Section not found with ID: ${sectionId}`
        },
        { status: 404 }
      );
    }

    // Remove the section
    article.sections.pull(sectionId);
    article.updatedAt = new Date();
    await article.save();

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      article: {
        id: article._id.toString(),
        mainHeading: article.mainHeading,
        sectionsCount: article.sections.length
      }
    });

  } catch (error) {
    // Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to delete sections'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete section: ' + error.message
      },
      { status: 500 }
    );
  }
}