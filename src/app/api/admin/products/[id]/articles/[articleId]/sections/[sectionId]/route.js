// src/app/api/admin/products/[id]/articles/[articleId]/sections/[sectionId]/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

// PUT - Update a section
export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const { id, articleId, sectionId } = await params;

    // ✅ Check admin authentication (updated pattern)
    const admin = authenticateAdmin(request);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { heading, contentBlocks = [] } = body;

    // Heading validation removed as per user request
    // if (!heading) { ... }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: `Product not found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    // Find the article
    const article = product.articles.id(articleId);
    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: `Article not found with ID: ${articleId} in product: ${id}`
        },
        { status: 404 }
      );
    }

    // Find the section
    const section = article.sections.id(sectionId);
    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: `Section not found with ID: ${sectionId} in article: ${articleId}`
        },
        { status: 404 }
      );
    }

    // Validate content blocks
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

        // FIXED: Validate list configuration
        if (block.blockType === 'list' && block.listConfig) {
          if (!['bullet', 'number', 'custom'].includes(block.listConfig.type)) {
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

        // FIXED: Validate link configuration
        if (block.blockType === 'link' && block.linkConfig) {
          if (!block.linkConfig.url) {
            return NextResponse.json(
              {
                success: false,
                error: 'Link blocks must have a URL'
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // FIXED: Update the section with proper handling of listConfig and linkConfig
    section.heading = heading;


    section.contentBlocks = contentBlocks.map((block) => {
      const baseBlock = {
        _id: block._id && mongoose.Types.ObjectId.isValid(block._id)
          ? new mongoose.Types.ObjectId(block._id)
          : new mongoose.Types.ObjectId(),
        blockType: block.blockType,
        content: block.content || '',
        image: block.image || null,
        // ✅ REMOVED: order: block.order !== undefined ? block.order : 0,
        style: block.style || {},
        createdAt: block.createdAt ? new Date(block.createdAt) : new Date(),
        updatedAt: new Date()
      };

      // Add listConfig if it exists
      if (block.listConfig) {
        baseBlock.listConfig = {
          type: block.listConfig.type || 'bullet',
          customSymbol: block.listConfig.customSymbol || '→',
          customImage: block.listConfig.customImage || null
        };
      }

      // Add linkConfig if it exists
      if (block.linkConfig) {
        baseBlock.linkConfig = {
          url: block.linkConfig.url || '',
          target: block.linkConfig.target || '_self',
          title: block.linkConfig.title || ''
        };
      }

      return baseBlock;
    });

    section.updatedAt = new Date();
    section.updatedBy = admin.email; // ✅ Track who updated the section
    article.updatedAt = new Date();
    article.updatedBy = admin.email; // ✅ Track who updated the article

    // Save the product
    await product.save();

    // Get the updated section
    const updatedArticle = product.articles.id(articleId);
    const updatedSection = updatedArticle.sections.id(sectionId);

    return NextResponse.json({
      success: true,
      message: 'Section updated successfully',
      section: {
        ...updatedSection.toObject(),
        _id: updatedSection._id.toString(),
        contentBlocks: updatedSection.contentBlocks.map(cb => ({
          ...cb.toObject(),
          _id: cb._id.toString()
        }))
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
    });

  } catch (error) {
    console.error('Error updating section:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to update sections'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update section: ' + error.message
      },
      { status: 500 }
    );
  }
}

// GET - Get single section (No authentication required)
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { id, articleId, sectionId } = await params;

    // ✅ No authentication required for GET requests

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(articleId) ||
      !mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID, article ID, or section ID'
        },
        { status: 400 }
      );
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: `Product not found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    const article = product.articles.id(articleId);
    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: `Article not found with ID: ${articleId}`
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
      },
      product: {
        id: product._id.toString(),
        heading: product.heading
      }
    });

  } catch (error) {
    console.error('Error fetching section:', error);
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
    await dbConnect();

    const { id, articleId, sectionId } = await params;

    // ✅ Check admin authentication (updated pattern)
    const admin = authenticateAdmin(request);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(articleId) ||
      !mongoose.Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID, article ID, or section ID'
        },
        { status: 400 }
      );
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: `Product not found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    const article = product.articles.id(articleId);
    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: `Article not found with ID: ${articleId}`
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
    article.updatedBy = admin.email; // ✅ Track who updated the article
    await product.save();

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
      article: {
        id: article._id.toString(),
        mainHeading: article.mainHeading,
        sectionsCount: article.sections.length
      },
      admin: { // ✅ Added admin info
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Error deleting section:', error);

    // ✅ Handle authentication errors specifically
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