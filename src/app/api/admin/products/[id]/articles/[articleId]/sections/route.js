// src/app/api/admin/products/[id]/articles/[articleId]/sections/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// POST - Add section to existing article
export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { id, articleId } = await params;

    // ✅ Check admin authentication (updated pattern)
    const admin = authenticateAdmin(request);

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID or article ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      heading,
      contentBlocks = [],
      position
    } = body;

    // Validation for section
    // Validation for section: Heading is optional now
    // if (!heading) { ... } removed

    // Validate content blocks structure
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

        // Validate image block structure
        if (block.blockType === 'image' && block.image) {
          if (!block.image.filename || !block.image.contentType || !block.image.gridfsId) {
            return NextResponse.json(
              {
                success: false,
                error: 'Image blocks must have filename, contentType, and gridfsId'
              },
              { status: 400 }
            );
          }
        }

        if (block.blockType === 'list' && block.listConfig) {
          if (!['bullet', 'number', 'custom', 'disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'].includes(block.listConfig.type)) {
            return NextResponse.json(
              {
                success: false,
                error: 'List type must be bullet, number, or custom'
              },
              { status: 400 }
            );
          }

          if (block.listConfig.type === 'custom' && block.listConfig.customImage) {
            if (!block.listConfig.customImage.filename || !block.listConfig.customImage.contentType || !block.listConfig.customImage.gridfsId) {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Custom list image must have filename, contentType, and gridfsId'
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // src/app/api/admin/products/[id]/articles/[articleId]/sections/route.js
    // In the POST method, update the contentBlocks creation:

    const newSection = {
      _id: new mongoose.Types.ObjectId(),
      heading,
      contentBlocks: contentBlocks.map((block) => ({
        _id: new mongoose.Types.ObjectId(),
        blockType: block.blockType,
        content: block.content || '',
        image: block.image || null,
        listConfig: block.listConfig || { type: 'bullet', customSymbol: '→', customImage: null },
        linkConfig: block.linkConfig || null,
        // ✅ REMOVED: order: block.order !== undefined ? block.order : 0,
        style: block.style || {},
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: admin.email
    };

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        'articles._id': articleId
      },
      {
        $push: {
          'articles.$.sections': {
            $each: [newSection],
            $position: (position !== undefined && position !== null) ? position : undefined
          }
        },
        $set: {
          'articles.$.updatedAt': new Date(),
          'articles.$.updatedBy': admin.email // ✅ Track who updated the article
        }
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product or article not found'
        },
        { status: 404 }
      );
    }

    const updatedArticle = product.articles.id(articleId);
    const addedSection = updatedArticle.sections.id(newSection._id);

    return NextResponse.json({
      success: true,
      message: 'Section added successfully to article',
      section: {
        ...addedSection.toObject(),
        _id: addedSection._id.toString()
      },
      article: {
        id: updatedArticle._id.toString(),
        mainHeading: updatedArticle.mainHeading
      },
      admin: { // ✅ Added admin info
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding section to article:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to add sections'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add section: ' + error.message
      },
      { status: 500 }
    );
  }
}

// GET - Get all sections for an article
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { id, articleId } = await params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID or article ID'
        },
        { status: 400 }
      );
    }

    const product = await Product.findOne(
      {
        _id: id,
        'articles._id': articleId
      }
    ).select('articles heading category');

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product or article not found'
        },
        { status: 404 }
      );
    }

    const article = product.articles.id(articleId);

    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found'
        },
        { status: 404 }
      );
    }

    // Get all sections (no sorting by order since order field is removed)
    const sections = article.sections.map(section => ({
      ...section.toObject(),
      _id: section._id.toString(),
      contentBlocks: section.contentBlocks.map(cb => ({
        ...cb.toObject(),
        _id: cb._id.toString()
      }))
    }));

    return NextResponse.json({
      success: true,
      product: {
        id: product._id.toString(),
        heading: product.heading,
        category: product.category
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch article sections: ' + error.message
      },
      { status: 500 }
    );
  }
}